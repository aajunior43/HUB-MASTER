from __future__ import annotations

import json
import logging

from superlog import SuperLogFormatter


def test_superlog_serializa_metadados_e_oculta_segredo():
    record = logging.LogRecord(
        "teste", logging.ERROR, "arquivo.py", 42, "Falha authorization=token-secreto", (), None
    )
    record.event = "teste_falha"
    record.edicao_id = 77

    linha = SuperLogFormatter().format(record)
    evento = json.loads(linha)

    assert evento["context"]["event"] == "teste_falha"
    assert evento["context"]["edicao_id"] == 77
    assert "token-secreto" not in evento["message"]
    assert "[REDACTED]" in evento["message"]
    assert evento["source"]["line"] == 42


def test_configure_superlog_silencia_pdfminer(tmp_path):
    import logging

    from superlog import configure_superlog

    configure_superlog(tmp_path)
    assert logging.getLogger("pdfminer.psparser").getEffectiveLevel() >= logging.WARNING
