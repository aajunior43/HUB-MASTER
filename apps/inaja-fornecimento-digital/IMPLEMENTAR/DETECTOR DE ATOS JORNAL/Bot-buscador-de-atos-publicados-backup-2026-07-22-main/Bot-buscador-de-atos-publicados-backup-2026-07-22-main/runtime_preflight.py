"""Validação do ambiente antes de consumir a fila de processamento."""

from __future__ import annotations

import os
import shutil
import sqlite3
import subprocess
from dataclasses import dataclass
from pathlib import Path

from config import SETTINGS


class RuntimeDependencyError(RuntimeError):
    """Dependência global ausente ou inválida; não é falha de uma edição."""


@dataclass(frozen=True)
class PreflightItem:
    nome: str
    ok: bool
    detalhe: str
    obrigatorio: bool = True


def _executavel(configurado: str, nome: str) -> str | None:
    if configurado:
        path = Path(configurado)
        return str(path) if path.is_file() else None
    return shutil.which(nome)


def _poppler_executable() -> str | None:
    if SETTINGS.poppler_path:
        base = Path(SETTINGS.poppler_path)
        candidato = base / ("pdfinfo.exe" if os.name == "nt" else "pdfinfo")
        return str(candidato) if candidato.is_file() else None
    return shutil.which("pdfinfo")


def _check_tesseract() -> PreflightItem:
    exe = _executavel(SETTINGS.tesseract_path, "tesseract")
    if not exe:
        return PreflightItem(
            "Tesseract",
            False,
            f"executável não encontrado: {SETTINGS.tesseract_path or 'PATH'}",
        )
    try:
        proc = subprocess.run(
            [exe, "--list-langs"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=15,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return PreflightItem("Tesseract", False, f"não pôde ser executado: {exc}")
    idiomas = {linha.strip() for linha in proc.stdout.splitlines()}
    idioma = SETTINGS.ocr_language
    if proc.returncode != 0:
        return PreflightItem("Tesseract", False, proc.stderr.strip() or "falha ao listar idiomas")
    if idioma not in idiomas:
        return PreflightItem(
            "Tesseract",
            False,
            f"idioma {idioma!r} não instalado; disponíveis: {', '.join(sorted(idiomas))}",
        )
    return PreflightItem("Tesseract", True, f"{exe} · idioma={idioma}")


def _check_poppler() -> PreflightItem:
    exe = _poppler_executable()
    if not exe:
        return PreflightItem(
            "Poppler",
            False,
            f"pdfinfo não encontrado: {SETTINGS.poppler_path or 'PATH'}",
        )
    try:
        proc = subprocess.run(
            [exe, "-v"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=15,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return PreflightItem("Poppler", False, f"pdfinfo não pôde ser executado: {exc}")
    if proc.returncode != 0:
        return PreflightItem("Poppler", False, proc.stderr.strip() or "pdfinfo falhou")
    return PreflightItem("Poppler", True, exe)


def _check_directories() -> list[PreflightItem]:
    items: list[PreflightItem] = []
    for nome, path in (
        ("Pasta de edições", SETTINGS.download_dir),
        ("Pasta de alertas", SETTINGS.alert_dir),
        ("Pasta de logs", SETTINGS.log_dir),
        ("Pasta de atos", SETTINGS.atos_dir),
    ):
        try:
            path.mkdir(parents=True, exist_ok=True)
            ok = path.is_dir() and os.access(path, os.W_OK)
        except OSError:
            ok = False
        items.append(PreflightItem(nome, ok, str(path)))
    return items


def _check_database() -> PreflightItem:
    try:
        SETTINGS.db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(SETTINGS.db_path, timeout=10) as conn:
            row = conn.execute("PRAGMA quick_check").fetchone()
        resultado = str(row[0]) if row else "sem resposta"
        return PreflightItem("SQLite", resultado.casefold() == "ok", resultado)
    except (OSError, sqlite3.Error) as exc:
        return PreflightItem("SQLite", False, str(exc))


def run_preflight(*, require_ocr: bool = True) -> list[PreflightItem]:
    """Executa checks locais e levanta erro antes de tocar na fila."""
    items = [*_check_directories(), _check_database()]
    if require_ocr:
        items.extend([_check_tesseract(), _check_poppler()])
    falhas = [item for item in items if item.obrigatorio and not item.ok]
    if falhas:
        detalhe = "; ".join(f"{item.nome}: {item.detalhe}" for item in falhas)
        raise RuntimeDependencyError(
            "Preflight falhou. A fila não será processada. " + detalhe
        )
    return items


def is_infrastructure_error(exc: BaseException) -> bool:
    """Classifica falhas que pertencem à máquina, não ao PDF atual."""
    if isinstance(exc, RuntimeDependencyError):
        return True
    texto = str(exc).casefold()
    marcadores = (
        "tesseract is not installed",
        "tesseract.exe is not installed",
        "unable to get page count",
        "is poppler installed",
        "pdfinfo",
        "poppler",
        "no such file or directory: 'tesseract",
        "failed loading language",
        "error opening data file",
    )
    return any(item in texto for item in marcadores)
