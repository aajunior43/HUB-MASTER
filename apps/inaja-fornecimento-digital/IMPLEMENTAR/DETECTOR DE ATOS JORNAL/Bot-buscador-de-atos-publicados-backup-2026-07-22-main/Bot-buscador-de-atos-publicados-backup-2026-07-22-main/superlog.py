"""Auditoria operacional detalhada, em JSON Lines e sem segredos."""

from __future__ import annotations

import asyncio
import faulthandler
import json
import logging
import os
import re
import sys
import threading
import traceback
from datetime import datetime
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path
from typing import Any

_HANDLER_MARKER = "_monitor_superlog_handler"
# O pdfminer (usado pelo pdfplumber) responde por mais de 99% do volume em DEBUG.
_LOGGERS_RUIDOSOS = {"pdfminer": logging.WARNING, "PIL": logging.INFO}
_SENSITIVE = re.compile(
    r"(?i)(bearer\s+|api[_-]?key[=:\s]+|authorization[=:\s]+|password[=:\s]+)([^\s,;]+)"
)
_STANDARD_RECORD_FIELDS = set(logging.makeLogRecord({}).__dict__) | {"message", "asctime"}
_fault_stream = None


def _redact(value: Any) -> Any:
    """Remove credenciais acidentais sem ocultar o restante do diagnostico."""
    if isinstance(value, str):
        return _SENSITIVE.sub(r"\1[REDACTED]", value)
    if isinstance(value, dict):
        return {str(k): _redact(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_redact(item) for item in value]
    return value


class SuperLogFormatter(logging.Formatter):
    """Um evento JSON por linha, facil de consultar e preservar."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now().astimezone().isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": _redact(record.getMessage()),
            "process_id": record.process,
            "thread": record.threadName,
            "source": {"file": record.pathname, "line": record.lineno, "function": record.funcName},
        }
        extras = {
            key: value
            for key, value in record.__dict__.items()
            if key not in _STANDARD_RECORD_FIELDS and not key.startswith("_")
        }
        if extras:
            payload["context"] = _redact(extras)
        if record.exc_info:
            payload["exception"] = _redact("".join(traceback.format_exception(*record.exc_info)))
        if record.stack_info:
            payload["stack"] = _redact(record.stack_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def _new_handler(log_dir: Path) -> TimedRotatingFileHandler:
    retention = max(1, int(os.getenv("SUPERLOG_RETENTION_DAYS", "90")))
    handler = TimedRotatingFileHandler(
        log_dir / "super.log.jsonl", when="midnight", backupCount=retention, encoding="utf-8"
    )
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(SuperLogFormatter())
    setattr(handler, _HANDLER_MARKER, True)
    return handler


def configure_superlog(log_dir: Path) -> None:
    """Captura DEBUG+ de toda a aplicacao em ``logs/super.log.jsonl``.

    A configuracao e idempotente para suportar reinicios, testes e reload da web.
    """
    if os.getenv("SUPERLOG_ENABLED", "true").strip().casefold() in {"0", "false", "nao", "off"}:
        return
    log_dir.mkdir(parents=True, exist_ok=True)
    root = logging.getLogger()
    if not any(getattr(handler, _HANDLER_MARKER, False) for handler in root.handlers):
        root.addHandler(_new_handler(log_dir))
    root.setLevel(logging.DEBUG)
    for nome, nivel in _LOGGERS_RUIDOSOS.items():
        logging.getLogger(nome).setLevel(nivel)
    logging.captureWarnings(True)
    _install_exception_hooks()
    _install_fault_handler(log_dir)
    logging.getLogger(__name__).info(
        "Super log operacional habilitado", extra={"event": "superlog_enabled", "path": str(log_dir)}
    )


def attach_logger(logger: logging.Logger, log_dir: Path) -> None:
    """Anexa o super log a loggers que nao propagam (ex.: uvicorn)."""
    if any(getattr(handler, _HANDLER_MARKER, False) for handler in logger.handlers):
        return
    logger.addHandler(_new_handler(log_dir))
    logger.setLevel(logging.DEBUG)


def event(name: str, **context: Any) -> None:
    # ``extra`` nao aceita nomes internos de LogRecord (ex.: ``args``). Em
    # vez de perder a auditoria, preservamos o dado com um prefixo seguro.
    safe_context = {
        (f"audit_{key}" if key in _STANDARD_RECORD_FIELDS else key): value
        for key, value in context.items()
    }
    logging.getLogger("audit").info(name, extra={"event": name, **safe_context})


def install_asyncio_exception_handler(loop: asyncio.AbstractEventLoop) -> None:
    """Audita excecoes de tarefas async que nao chegaram ao chamador."""
    if getattr(loop, "_monitor_superlog_exception_handler", False):
        return
    previous = loop.get_exception_handler()

    def handler(active_loop: asyncio.AbstractEventLoop, context: dict[str, Any]) -> None:
        exc = context.get("exception")
        logging.getLogger("audit.asyncio").error(
            context.get("message", "Falha assíncrona não tratada"),
            exc_info=(type(exc), exc, exc.__traceback__) if isinstance(exc, BaseException) else None,
            extra={"event": "asyncio_exception", "context_keys": sorted(context)},
        )
        if previous:
            previous(active_loop, context)
        else:
            active_loop.default_exception_handler(context)

    loop.set_exception_handler(handler)
    loop._monitor_superlog_exception_handler = True  # type: ignore[attr-defined]


def _install_fault_handler(log_dir: Path) -> None:
    """Registra rastros de falhas fatais nativas (segfault/abort) em arquivo próprio."""
    global _fault_stream
    if _fault_stream is not None:
        return
    try:
        _fault_stream = (log_dir / "fatal.log").open("a", encoding="utf-8")
        faulthandler.enable(file=_fault_stream, all_threads=True)
    except OSError:
        _fault_stream = None


def _install_exception_hooks() -> None:
    if getattr(_install_exception_hooks, "installed", False):
        return
    _install_exception_hooks.installed = True
    previous = sys.excepthook

    def excepthook(exc_type, exc_value, exc_traceback):  # type: ignore[no-untyped-def]
        if issubclass(exc_type, (KeyboardInterrupt, SystemExit)):
            previous(exc_type, exc_value, exc_traceback)
            return
        logging.getLogger("audit.unhandled").critical(
            "Excecao nao tratada", exc_info=(exc_type, exc_value, exc_traceback),
            extra={"event": "unhandled_exception"},
        )
        previous(exc_type, exc_value, exc_traceback)

    sys.excepthook = excepthook

    def thread_hook(args: threading.ExceptHookArgs) -> None:
        logging.getLogger("audit.thread").critical(
            "Excecao nao tratada em thread", exc_info=(args.exc_type, args.exc_value, args.exc_traceback),
            extra={"event": "thread_exception", "thread_name": args.thread.name if args.thread else None},
        )

    threading.excepthook = thread_hook
