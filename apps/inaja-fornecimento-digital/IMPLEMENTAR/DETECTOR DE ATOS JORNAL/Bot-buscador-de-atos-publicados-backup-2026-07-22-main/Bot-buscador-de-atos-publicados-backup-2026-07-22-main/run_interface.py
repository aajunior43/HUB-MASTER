from __future__ import annotations

import contextlib
import logging
import os
import socket
import sys
import webbrowser

from config import SETTINGS
from superlog import attach_logger, configure_superlog, event


class FiltroRuido(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        # Navegadores, scanners e proxies podem fechar o socket durante a
        # resposta. No Windows o Proactor registra isso como traceback
        # (WinError 10054), mas não é falha da aplicação nem requer restart.
        exc = record.exc_info[1] if record.exc_info else None
        if isinstance(exc, ConnectionResetError) or "WinError 10054" in msg:
            return False
        if "/api/atividade" in msg:
            return False
        if "/favicon.ico" in msg:
            return False
        return "/static/" not in msg


class FormatadorLimpo(logging.Formatter):
    CORES = {
        "INFO": "\033[92m",
        "WARNING": "\033[93m",
        "ERROR": "\033[91m",
        "CRITICAL": "\033[91m",
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        cor = self.CORES.get(record.levelname, "")
        nivel = f"{cor}{record.levelname:<8}{self.RESET}" if cor else record.levelname
        msg = record.getMessage()
        if "GET " in msg or "POST " in msg:
            partes = msg.split(" - ")
            if len(partes) >= 2:
                rota = partes[-1].strip('"').split(" ")[1] if '"' in partes[-1] else ""
                status_parts = partes[-1].split(" ")
                status = status_parts[-1] if status_parts else ""
                return f"  {nivel} {rota:<40} {status}"
        return f"{nivel} {msg}"


def configurar_logging() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    if sys.platform == "win32":
        import ctypes

        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)

    fmt = FormatadorLimpo("%(asctime)s %(levelname)s %(message)s")
    filtro = FiltroRuido()
    configure_superlog(SETTINGS.log_dir)

    for nome in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        logger = logging.getLogger(nome)
        logger.handlers.clear()
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(fmt)
        handler.addFilter(filtro)
        logger.handlers.append(handler)
        logger.propagate = False
        attach_logger(logger, SETTINGS.log_dir)


def _porta_em_uso(host: str, port: int) -> bool:
    """Evita iniciar outra interface e abrir abas em cascata."""
    probe_host = "127.0.0.1" if host in {"0.0.0.0", "::"} else host
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.3)
        return sock.connect_ex((probe_host, port)) == 0


def _reload_enabled() -> bool:
    return os.getenv("DEV_RELOAD", "0").strip().casefold() in {
        "1",
        "true",
        "sim",
        "yes",
        "on",
    }


def main() -> None:
    configurar_logging()
    host = SETTINGS.web_host
    port = SETTINGS.web_port
    browser_host = "127.0.0.1" if host in {"0.0.0.0", "::"} else host
    url = SETTINGS.web_public_url or f"http://{browser_host}:{port}"
    event("web_started", host=host, port=port, url=url)
    print("=" * 60)
    print("  Monitor de Atos - Interface Web")
    print(f"  Acesse: {url}")
    print("=" * 60)
    print()

    if _porta_em_uso(host, port):
        print(f"  A interface já está aberta em {url}.")
        print("  Nenhuma nova instância será iniciada.")
        if os.getenv("ABRIR_NAVEGADOR", "1").strip() in {"1", "true", "sim", "yes", "on"}:
            with contextlib.suppress(Exception):
                webbrowser.open(url, new=0, autoraise=True)
        return

    # Abre o navegador automaticamente (desativar com ABRIR_NAVEGADOR=0)
    if os.getenv("ABRIR_NAVEGADOR", "1").strip() in {"1", "true", "sim", "yes", "on"}:
        with contextlib.suppress(Exception):
            # Reutiliza a janela/aba atual do navegador; new=2 abre várias
            # janelas quando o serviço é reiniciado pelo launcher.
            webbrowser.open(url, new=0, autoraise=True)

    import uvicorn

    # Recarga automática é útil no desenvolvimento, mas provoca reinícios,
    # novas conexões e abas quando o arquivo é executado pelo usuário.
    reload = _reload_enabled()
    uvicorn.run(
        "webapp:app",
        host=host,
        port=port,
        log_level="info",
        access_log=True,
        reload=reload,
        reload_delay=1.5,
        reload_excludes=[
            "tests/*",
            "*.db",
            "*.db-*",
            "agent-tools/*",
            "terminals/*",
            ".omo/*",
            "logs/*",
            "alertas/*",
            "edicoes/*",
            "atos/*",
            "exportacoes/*",
            "relatorios/*",
            "scripts/__pycache__/*",
            "_tmp_*.py",
            "temp_*.py",
        ],
    )


if __name__ == "__main__":
    main()
