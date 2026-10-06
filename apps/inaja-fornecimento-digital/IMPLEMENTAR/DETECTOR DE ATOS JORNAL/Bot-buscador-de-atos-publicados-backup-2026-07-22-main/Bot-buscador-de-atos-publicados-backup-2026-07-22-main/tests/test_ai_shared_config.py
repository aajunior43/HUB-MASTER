from types import SimpleNamespace

import ai_processor


def test_chave_da_prefeitura_tem_precedencia(monkeypatch):
    monkeypatch.setattr(
        ai_processor,
        "SETTINGS",
        SimpleNamespace(
            ia_config_source="prefeitura",
            opencode_api_key="segredo-interno-prefeitura",
        ),
    )
    monkeypatch.setattr(
        ai_processor.db,
        "get_setting",
        lambda *_args: "chave-antiga-do-detector",
    )

    assert ai_processor._api_key() == "segredo-interno-prefeitura"


def test_token_da_ponte_interna_tem_precedencia(monkeypatch):
    monkeypatch.setenv("DETECTOR_ATOS_INTERNAL_TOKEN", "token-da-ponte-prefeitura")
    monkeypatch.setattr(
        ai_processor,
        "SETTINGS",
        SimpleNamespace(
            ia_config_source="prefeitura",
            opencode_api_key="chave-do-dotenv",
        ),
    )

    assert ai_processor._api_key() == "token-da-ponte-prefeitura"
