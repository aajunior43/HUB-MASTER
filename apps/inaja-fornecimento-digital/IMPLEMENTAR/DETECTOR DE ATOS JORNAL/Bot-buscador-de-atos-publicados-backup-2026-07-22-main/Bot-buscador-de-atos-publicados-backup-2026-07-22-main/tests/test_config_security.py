from __future__ import annotations

import pytest


@pytest.mark.parametrize(
    ("app_env", "webapp_user", "webapp_password", "admin_secret", "message"),
    (
        ("homologacao", "", "", "", "APP_ENV deve ser development ou production"),
        (
            "development",
            "operador",
            "",
            "",
            "WEBAPP_USER e WEBAPP_PASSWORD seguros são obrigatórios",
        ),
        (
            "production",
            "",
            "",
            "segredo-admin-longo",
            "WEBAPP_USER e WEBAPP_PASSWORD seguros são obrigatórios em produção",
        ),
        (
            "production",
            "admin",
            "senha-segura",
            "segredo-admin-longo",
            "WEBAPP_USER e WEBAPP_PASSWORD seguros são obrigatórios em produção",
        ),
        (
            "production",
            "operador-seguro",
            "senha-segura",
            "1999",
            "ADMIN_GATE_PASSWORD seguro é obrigatório em produção",
        ),
    ),
)
def test_validacao_runtime_rejeita_configuracao_critica_insegura(
    mock_settings, app_env, webapp_user, webapp_password, admin_secret, message
):
    import config

    object.__setattr__(mock_settings, "app_env", app_env)
    object.__setattr__(mock_settings, "webapp_user", webapp_user)
    object.__setattr__(mock_settings, "webapp_password", webapp_password)
    object.__setattr__(mock_settings, "admin_gate_password", admin_secret)

    with pytest.raises(config.RuntimeConfigError, match=message):
        config.validate_runtime_config(mock_settings)


def test_validacao_runtime_aceita_credenciais_explicitas_seguras(mock_settings):
    import config

    object.__setattr__(mock_settings, "app_env", "production")
    object.__setattr__(mock_settings, "webapp_user", "operador-seguro")
    object.__setattr__(mock_settings, "webapp_password", "senha-segura")
    object.__setattr__(mock_settings, "admin_gate_password", "segredo-admin-longo")

    config.validate_runtime_config(mock_settings)
