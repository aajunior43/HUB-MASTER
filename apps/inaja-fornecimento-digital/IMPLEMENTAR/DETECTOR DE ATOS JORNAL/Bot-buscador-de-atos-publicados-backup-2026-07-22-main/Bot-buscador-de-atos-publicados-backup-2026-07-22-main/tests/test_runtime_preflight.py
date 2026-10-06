from __future__ import annotations

from runtime_preflight import RuntimeDependencyError, is_infrastructure_error, run_preflight


def test_preflight_sem_ocr_valida_diretorios_e_sqlite(db):
    items = run_preflight(require_ocr=False)
    assert items
    assert all(item.ok for item in items)


def test_classifica_dependencias_globais():
    assert is_infrastructure_error(
        RuntimeError("Unable to get page count. Is poppler installed and in PATH?")
    )
    assert is_infrastructure_error(
        RuntimeError("tesseract.exe is not installed or it's not in your PATH")
    )
    assert not is_infrastructure_error(RuntimeError("PDF corrompido: EOF ausente"))


def test_runtime_dependency_error_e_especifico():
    assert issubclass(RuntimeDependencyError, RuntimeError)
