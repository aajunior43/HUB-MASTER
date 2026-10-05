"""
Testes unitários para notifier.py
Cobre montagem de mensagem e gravação em arquivo.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from detector import DetectionResult
from scraper import Edicao


def _make_resultado(publicacoes=None, trechos=None, encontrado=True):
    return DetectionResult(
        encontrado=encontrado,
        edicao_id=42,
        edicao_titulo="Edição 25/06/2026",
        paginas_com_mencao=[1, 3],
        trechos=trechos or [{"pagina": 1, "trecho": "...Inajá..."}],
        termos_encontrados=["Inajá"],
        mencoes_db=[],
        publicacoes=publicacoes or [],
    )


def _make_edicao():
    return Edicao(
        url="https://example.com/edicao25062026.pdf",
        titulo="Edição 25/06/2026",
        data_publicacao="2026-06-25",
    )


class TestMontarMensagem:
    def test_mensagem_com_publicacao_oficial(self):
        from notifier import montar_mensagem

        pubs = [
            {
                "orgao": "Prefeitura Municipal de Inajá",
                "tipo": "Decreto",
                "numero": "001/2026",
                "pagina": 1,
                "categoria": "publicacao_oficial",
            }
        ]
        resultado = _make_resultado(publicacoes=pubs)
        msg = montar_mensagem(resultado, _make_edicao())
        assert "Publicação oficial" in msg
        assert "Prefeitura" in msg

    def test_mensagem_sem_publicacao_oficial(self):
        from notifier import montar_mensagem

        resultado = _make_resultado(publicacoes=[])
        msg = montar_mensagem(resultado, _make_edicao())
        assert "Menção a Inajá detectada" in msg

    def test_mensagem_contem_url(self):
        from notifier import montar_mensagem

        resultado = _make_resultado()
        msg = montar_mensagem(resultado, _make_edicao())
        assert "https://example.com" in msg

    def test_mensagem_paginas(self):
        from notifier import montar_mensagem

        resultado = _make_resultado()
        msg = montar_mensagem(resultado, _make_edicao())
        assert "1" in msg and "3" in msg

    def test_mensagem_multiplas_publicacoes_truncada(self):
        from notifier import montar_mensagem

        pubs = [
            {
                "orgao": f"Órgão {i}",
                "tipo": "Decreto",
                "numero": f"00{i}/2026",
                "pagina": i,
                "categoria": "publicacao_oficial",
            }
            for i in range(8)
        ]
        resultado = _make_resultado(publicacoes=pubs)
        msg = montar_mensagem(resultado, _make_edicao())
        assert "omitida" in msg

    def test_mensagem_trechos_truncados(self):
        from notifier import montar_mensagem

        trechos = [{"pagina": i, "trecho": f"...trecho {i}..."} for i in range(15)]
        resultado = _make_resultado(trechos=trechos)
        msg = montar_mensagem(resultado, _make_edicao())
        assert "omitido" in msg


class TestTemPublicacaoOficial:
    def test_detecta_publicacao_com_orgao(self):
        from notifier import _tem_publicacao_oficial

        resultado = _make_resultado(
            publicacoes=[{"orgao": "Prefeitura", "tipo": None, "categoria": "publicacao_oficial"}]
        )
        assert _tem_publicacao_oficial(resultado) is True

    def test_detecta_publicacao_com_tipo(self):
        from notifier import _tem_publicacao_oficial

        resultado = _make_resultado(
            publicacoes=[{"orgao": None, "tipo": "Decreto", "categoria": "publicacao_oficial"}]
        )
        assert _tem_publicacao_oficial(resultado) is True

    def test_nao_detecta_sem_orgao_tipo(self):
        from notifier import _tem_publicacao_oficial

        resultado = _make_resultado(
            publicacoes=[{"orgao": None, "tipo": None, "categoria": "materia_jornalistica"}]
        )
        assert _tem_publicacao_oficial(resultado) is False

    def test_nao_detecta_sem_publicacoes(self):
        from notifier import _tem_publicacao_oficial

        resultado = _make_resultado(publicacoes=[])
        assert _tem_publicacao_oficial(resultado) is False


class TestNotificar:
    def test_nao_notifica_se_nao_encontrado(self, db):
        import database
        from notifier import notificar

        database.init_db()
        resultado = _make_resultado(encontrado=False)
        notificar(resultado, _make_edicao())
        notifs = database.get_notificacoes()
        assert len(notifs) == 0

    def test_notifica_salva_arquivo(self, db, tmp_path):
        import database
        from notifier import notificar

        database.init_db()
        resultado = _make_resultado(encontrado=True)
        notificar(resultado, _make_edicao())
        notifs = database.get_notificacoes()
        assert len(notifs) >= 1
        assert notifs[0]["canal"] == "arquivo"

    def test_envia_webhook(self, db):
        import database
        from notifier import notificar

        database.init_db()
        database.upsert_webhook("https://example.com/test", "Teste")
        resultado = _make_resultado(encontrado=True)
        with patch("notifier.requests.post") as mock_post:
            mock_post.return_value = MagicMock(status_code=200, raise_for_status=lambda: None)
            notificar(resultado, _make_edicao())
            import time

            time.sleep(0.2)
            mock_post.assert_called()


class TestSegurancaWebhook:
    def test_destinos_inseguros_nao_sao_disparados(self, monkeypatch):
        import notifier

        class ThreadSincrona:
            def __init__(self, target, args, daemon):
                self._args = args
                self._target = target

            def start(self):
                self._target(*self._args)

        monkeypatch.setattr(
            notifier.database,
            "get_webhooks",
            lambda: [{"url": "http://127.0.0.1:8000/segredo"}],
        )
        monkeypatch.setattr(notifier.threading, "Thread", ThreadSincrona)
        post = MagicMock()
        monkeypatch.setattr(notifier.requests, "post", post)

        notifier._disparar_webhooks({"evento": "teste"})

        post.assert_not_called()

    @pytest.mark.parametrize(
        "url",
        (
            "http://example.com/teste",
            "https://127.0.0.1/teste",
            "https://[::1]/teste",
            "https://usuario:senha@example.com/teste",
            "https://example.com:444/teste",
            "https://example.com/teste#fragmento",
            "https://example.com:porta/teste",
        ),
    )
    def test_url_invalida_e_ssrf_sao_rejeitados(self, url):
        from webhook_security import WebhookUrlError, validar_url_webhook

        with pytest.raises(WebhookUrlError):
            validar_url_webhook(url)

    def test_dns_privado_e_rejeitado(self, monkeypatch):
        from webhook_security import WebhookUrlError, validar_url_webhook

        monkeypatch.setattr(
            "webhook_security.socket.getaddrinfo",
            lambda *args, **kwargs: [(2, 1, 6, "", ("127.0.0.1", 443))],
        )

        with pytest.raises(WebhookUrlError):
            validar_url_webhook("https://webhook.example/teste")

    def test_dns_cgnat_e_rejeitado(self, monkeypatch):
        from webhook_security import WebhookUrlError, validar_url_webhook

        monkeypatch.setattr(
            "webhook_security.socket.getaddrinfo",
            lambda *args, **kwargs: [(2, 1, 6, "", ("100.64.0.1", 443))],
        )

        with pytest.raises(WebhookUrlError):
            validar_url_webhook("https://webhook.example/teste")

    def test_dns_rebinding_nao_dispara(self, monkeypatch):
        import notifier

        class ThreadSincrona:
            def __init__(self, target, args, daemon):
                self._args = args
                self._target = target

            def start(self):
                self._target(*self._args)

        destinos = iter(("1.1.1.1", "1.1.1.2"))
        monkeypatch.setattr(
            "webhook_security.socket.getaddrinfo",
            lambda *args, **kwargs: [(2, 1, 6, "", (next(destinos), 443))],
        )
        monkeypatch.setattr(
            notifier.database,
            "get_webhooks",
            lambda: [{"url": "https://webhook.example/teste"}],
        )
        monkeypatch.setattr(notifier.threading, "Thread", ThreadSincrona)
        post = MagicMock()
        monkeypatch.setattr(notifier.requests, "post", post)

        notifier._disparar_webhooks({"evento": "teste"})

        post.assert_not_called()

    def test_url_publica_https_e_normalizada(self, monkeypatch):
        from webhook_security import validar_url_webhook

        monkeypatch.setattr(
            "webhook_security.socket.getaddrinfo",
            lambda *args, **kwargs: [(2, 1, 6, "", ("1.1.1.1", 443))],
        )

        assert validar_url_webhook("https://Exemplo.com/teste") == "https://exemplo.com/teste"


class TestEnviarTeste:
    def test_enviar_teste_retorna_dict_arquivo(self, db, mock_settings):
        from notifier import enviar_teste

        with patch("notifier.SETTINGS", mock_settings), patch("notifier._disparar_webhooks"):
            info = enviar_teste()
        assert info["ok"] is True
        assert info["canal"] == "arquivo"
        assert "detalhe" in info


class TestAnomaliaMensagem:
    def test_prefixo_anomalia_na_mensagem(self, db, mock_settings):
        import notifier

        object.__setattr__(mock_settings, "ai_importancia", False)
        pubs = [
            {
                "tipo": "Dispensa",
                "orgao": "Prefeitura",
                "pagina": 1,
                "categoria": "publicacao_oficial",
                "anomalia": 1,
                "anomalia_motivo": "valor 3x mediana",
                "valor": "R$ 200.000,00",
            }
        ]
        resultado = _make_resultado(publicacoes=pubs)
        with patch("notifier.SETTINGS", mock_settings), patch("notifier._disparar_webhooks"):
            notifier.notificar(resultado, _make_edicao())
        import database

        notifs = database.get_notificacoes()
        assert notifs
        conteudo = notifs[0]["conteudo"] or ""
        assert "ANOMALIA" in conteudo or "anomalia" in conteudo.casefold()


class TestFiltroImportancia:
    def test_suprimir_baixa_importancia(self, mock_settings):
        from notifier import _publicacoes_para_alerta

        object.__setattr__(mock_settings, "ai_importancia", True)
        object.__setattr__(mock_settings, "ai_importancia_min_notificar", 3)
        pubs = [
            {"tipo": "Aviso", "importancia": 1, "notificar_ia": False},
            {"tipo": "Decreto", "importancia": 4, "notificar_ia": True},
        ]
        resultado = _make_resultado(publicacoes=pubs)
        with patch("notifier.SETTINGS", mock_settings):
            filtradas = _publicacoes_para_alerta(resultado)
        assert len(filtradas) == 1
        assert filtradas[0]["tipo"] == "Decreto"

    def test_desligado_retorna_todas(self, mock_settings):
        from notifier import _publicacoes_para_alerta

        object.__setattr__(mock_settings, "ai_importancia", False)
        pubs = [{"importancia": 1}, {"importancia": 5}]
        resultado = _make_resultado(publicacoes=pubs)
        with patch("notifier.SETTINGS", mock_settings):
            assert len(_publicacoes_para_alerta(resultado)) == 2

    def test_sem_campo_usa_limiar(self, mock_settings):
        from notifier import _publicacoes_para_alerta

        object.__setattr__(mock_settings, "ai_importancia", True)
        object.__setattr__(mock_settings, "ai_importancia_min_notificar", 3)
        pubs = [{"tipo": "Portaria"}]
        resultado = _make_resultado(publicacoes=pubs)
        with patch("notifier.SETTINGS", mock_settings):
            assert len(_publicacoes_para_alerta(resultado)) == 1


class TestAlertaSemEvidencia:
    def _jev(self, categoria="ato_oficial"):
        return {"modelo": "jev", "pertence_a_inaja": 0.7, "categoria": categoria}

    def test_suprime_materia_marcada_pelo_jev(self, mock_settings):
        from notifier import _publicacoes_para_alerta

        object.__setattr__(mock_settings, "ai_importancia", True)
        pubs = [{"tipo": "Lei", "notificar_ia": True, "jev_detalhe": self._jev("materia_jornalistica")}]
        with patch("notifier.SETTINGS", mock_settings):
            assert _publicacoes_para_alerta(_make_resultado(publicacoes=pubs)) == []

    def test_suprime_confianca_revisar_sem_importancia(self, mock_settings):
        from notifier import _publicacoes_para_alerta

        object.__setattr__(mock_settings, "ai_importancia", True)
        pubs = [
            {
                "tipo": "Lei",
                "notificar_ia": True,
                "confianca": 30,
                "confianca_nivel": "revisar",
                "jev_detalhe": self._jev(),
            }
        ]
        with patch("notifier.SETTINGS", mock_settings):
            assert _publicacoes_para_alerta(_make_resultado(publicacoes=pubs)) == []

    def test_mantem_ato_com_confianca_media(self, mock_settings):
        from notifier import _publicacoes_para_alerta

        object.__setattr__(mock_settings, "ai_importancia", True)
        pubs = [
            {
                "tipo": "Decreto",
                "numero": "123/2026",
                "notificar_ia": True,
                "confianca": 70,
                "confianca_nivel": "media",
                "jev_detalhe": self._jev(),
            }
        ]
        with patch("notifier.SETTINGS", mock_settings):
            assert len(_publicacoes_para_alerta(_make_resultado(publicacoes=pubs))) == 1

    def test_calcula_confianca_quando_ausente(self, mock_settings):
        from notifier import _publicacoes_para_alerta

        object.__setattr__(mock_settings, "ai_importancia", True)
        pubs = [{"notificar_ia": True, "trecho": "ica e uma empresa, alugar ou", "jev_detalhe": self._jev()}]
        with patch("notifier.SETTINGS", mock_settings):
            assert _publicacoes_para_alerta(_make_resultado(publicacoes=pubs), "2026-09-03") == []

    def test_importancia_definida_mantem_regra_anterior(self, mock_settings):
        from notifier import _publicacoes_para_alerta

        object.__setattr__(mock_settings, "ai_importancia", True)
        object.__setattr__(mock_settings, "ai_importancia_min_notificar", 3)
        pubs = [
            {
                "tipo": "Portaria",
                "importancia": 4,
                "notificar_ia": True,
                "confianca_nivel": "revisar",
                "jev_detalhe": self._jev(),
            }
        ]
        with patch("notifier.SETTINGS", mock_settings):
            assert len(_publicacoes_para_alerta(_make_resultado(publicacoes=pubs))) == 1


def test_alerta_suprimido_marca_o_inicio_do_texto(db):
    import database
    from notifier import notificar

    database.init_db()
    pubs = [
        {
            "tipo": "Lei",
            "pagina": 1,
            "notificar_ia": True,
            "confianca_nivel": "revisar",
            "categoria": "publicacao_oficial",
            "jev_detalhe": {"categoria": "ato_oficial", "pertence_a_inaja": 0.7},
        }
    ]
    notificar(_make_resultado(publicacoes=pubs, encontrado=True), _make_edicao())
    conteudo = database.get_notificacoes()[0]["conteudo"] or ""
    assert conteudo.startswith("[suprimido")


def test_suprime_publicacao_sem_tipo_mesmo_com_confianca_media(mock_settings):
    from notifier import _publicacoes_para_alerta

    object.__setattr__(mock_settings, "ai_importancia", True)
    pubs = [
        {
            "tipo": None,
            "numero": "01/2026",
            "notificar_ia": True,
            "confianca": 63,
            "confianca_nivel": "media",
            "assunto": "Câmara de Inajá dá andamento a processo de cassação",
            "jev_detalhe": {"categoria": "ato_oficial", "categoria_confianca": 0.65, "pertence_a_inaja": 0.97},
        }
    ]
    with patch("notifier.SETTINGS", mock_settings):
        assert _publicacoes_para_alerta(_make_resultado(publicacoes=pubs)) == []
