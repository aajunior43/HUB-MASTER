from __future__ import annotations

import logging

from run_interface import FiltroRuido, _reload_enabled


def test_filtro_silencia_reset_de_cliente_windows():
    filtro = FiltroRuido()
    try:
        raise ConnectionResetError(10054, "conexão encerrada pelo cliente")
    except ConnectionResetError:
        record = logging.LogRecord(
            "uvicorn.error",
            logging.ERROR,
            __file__,
            1,
            "Exception in callback _call_connection_lost()",
            (),
            __import__("sys").exc_info(),
        )

    assert filtro.filter(record) is False


def test_filtro_mantem_erros_reais():
    record = logging.LogRecord(
        "uvicorn.error",
        logging.ERROR,
        __file__,
        1,
        "Falha interna real",
        (),
        None,
    )

    assert FiltroRuido().filter(record) is True


def test_recarga_automatica_nao_fica_ativa_por_padrao(monkeypatch):
    monkeypatch.delenv("DEV_RELOAD", raising=False)

    assert _reload_enabled() is False
