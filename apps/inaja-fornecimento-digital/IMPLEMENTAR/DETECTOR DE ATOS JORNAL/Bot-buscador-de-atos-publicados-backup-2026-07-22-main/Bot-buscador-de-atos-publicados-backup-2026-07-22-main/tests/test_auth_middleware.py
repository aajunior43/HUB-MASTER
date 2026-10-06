"""Testes para o middleware de autenticacao HTTP Basic (auth_middleware.py)."""

from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request


def _client(db, mock_settings, monkeypatch, user: str, pwd: str) -> TestClient:
    object.__setattr__(mock_settings, "webapp_user", user)
    object.__setattr__(mock_settings, "webapp_password", pwd)
    import auth_middleware
    import webapp

    monkeypatch.setattr(webapp, "ADMIN_GATE_PASSWORD", "1999")
    monkeypatch.setattr(auth_middleware, "SETTINGS", mock_settings)
    return TestClient(webapp.app)


def _auth_header(user: str, pwd: str) -> dict[str, str]:
    token = base64.b64encode(f"{user}:{pwd}".encode()).decode()
    return {"Authorization": "Basic " + token}


def test_auth_desativada_libera_acesso(db, mock_settings, monkeypatch):
    client = _client(db, mock_settings, monkeypatch, "", "")
    assert client.get("/status").status_code == 200


def test_auth_ativada_bloqueia_sem_credencial(db, mock_settings, monkeypatch):
    client = _client(db, mock_settings, monkeypatch, "admin", "secret")
    resp = client.get("/status")
    assert resp.status_code == 401
    assert "Basic" in resp.headers.get("WWW-Authenticate", "")


@pytest.mark.parametrize(
    "user,pwd,esperado",
    [
        ("admin", "secret", 200),
        ("admin", "errada", 401),
        ("errado", "secret", 401),
    ],
)
def test_credencial_correta_e_errada(db, mock_settings, monkeypatch, user, pwd, esperado):
    client = _client(db, mock_settings, monkeypatch, "admin", "secret")
    resp = client.get("/status", headers=_auth_header(user, pwd))
    assert resp.status_code == esperado


def test_static_permanece_publico(db, mock_settings, monkeypatch):
    client = _client(db, mock_settings, monkeypatch, "admin", "secret")
    resp = client.get("/static/styles.css")
    assert resp.status_code != 401


@pytest.mark.parametrize(
    "authorization",
    (
        "Basic nao-e-base64!",
        "Basic /w==",
        "Basic " + base64.b64encode(b"sem-separador").decode(),
        "Bearer token-nao-basic",
    ),
)
def test_cabecalho_basic_malformado_rejeitado_sem_erro_500(
    db, mock_settings, monkeypatch, authorization
):
    client = _client(db, mock_settings, monkeypatch, "admin", "secret")

    response = client.get("/status", headers={"Authorization": authorization})

    assert response.status_code == 401
    assert "Basic" in response.headers["WWW-Authenticate"]


def test_require_auth_startup_falha_sem_credenciais(mock_settings):
    import webapp

    object.__setattr__(mock_settings, "require_webapp_auth", True)
    object.__setattr__(mock_settings, "webapp_user", "")
    object.__setattr__(mock_settings, "webapp_password", "")
    object.__setattr__(mock_settings, "app_env", "development")
    with pytest.raises(RuntimeError, match="obrigatória"):
        webapp._validar_auth_startup()


def test_production_exige_auth(mock_settings):
    import webapp

    object.__setattr__(mock_settings, "require_webapp_auth", False)
    object.__setattr__(mock_settings, "app_env", "production")
    object.__setattr__(mock_settings, "webapp_user", "")
    object.__setattr__(mock_settings, "webapp_password", "")
    with pytest.raises(
        RuntimeError, match="WEBAPP_USER e WEBAPP_PASSWORD seguros são obrigatórios"
    ):
        webapp._validar_auth_startup()


def test_configuracao_parcial_de_basic_auth_falha_na_validacao_de_startup(mock_settings):
    import webapp

    object.__setattr__(mock_settings, "webapp_user", "operador")
    object.__setattr__(mock_settings, "webapp_password", "")

    with pytest.raises(
        RuntimeError,
        match="WEBAPP_USER e WEBAPP_PASSWORD seguros são obrigatórios",
    ):
        webapp._validar_auth_startup()


def test_post_producao_rejeita_origin_estranha_por_testclient(db, mock_settings, monkeypatch):
    object.__setattr__(mock_settings, "app_env", "production")
    client = _client(db, mock_settings, monkeypatch, "operador-seguro", "senha-segura")

    response = client.post(
        "/admin/login",
        data={"senha": "1999"},
        headers={
            **_auth_header("operador-seguro", "senha-segura"),
            "Origin": "https://atacante.example",
        },
        follow_redirects=False,
    )

    assert response.status_code == 403


def test_post_producao_sem_origin_ou_referer_rejeitado(db, mock_settings, monkeypatch):
    object.__setattr__(mock_settings, "app_env", "production")
    client = _client(db, mock_settings, monkeypatch, "operador-seguro", "senha-segura")

    response = client.post(
        "/admin/login",
        data={"senha": "1999"},
        headers=_auth_header("operador-seguro", "senha-segura"),
        follow_redirects=False,
    )

    assert response.status_code == 403


def test_post_producao_com_origin_da_mesma_origem_preserva_login(db, mock_settings, monkeypatch):
    object.__setattr__(mock_settings, "app_env", "production")
    client = _client(db, mock_settings, monkeypatch, "operador-seguro", "senha-segura")

    response = client.post(
        "/admin/login",
        data={"senha": "1999"},
        headers={
            **_auth_header("operador-seguro", "senha-segura"),
            "Origin": "http://testserver",
        },
        follow_redirects=False,
    )

    assert response.status_code == 303


def test_forwarded_headers_de_origem_nao_confiavel_sao_ignorados(db, mock_settings, monkeypatch):
    object.__setattr__(mock_settings, "app_env", "production")
    client = _client(db, mock_settings, monkeypatch, "operador-seguro", "senha-segura")

    response = client.post(
        "/admin/login",
        data={"senha": "1999"},
        headers={
            **_auth_header("operador-seguro", "senha-segura"),
            "Origin": "https://testserver",
            "X-Forwarded-Proto": "https",
        },
        follow_redirects=False,
    )

    assert response.status_code == 403


@pytest.mark.parametrize(
    ("headers", "expected"),
    (
        ({"Origin": "https://testserver"}, 303),
        ({"Referer": "https://testserver/admin"}, 303),
        ({"Referer": "http://testserver/admin"}, 403),
        ({"Referer": "https://atacante.example/admin"}, 403),
    ),
)
def test_proxy_confiavel_aplica_origem_publica_e_referer_https(
    db, mock_settings, monkeypatch, headers, expected
):
    object.__setattr__(mock_settings, "app_env", "production")
    object.__setattr__(mock_settings, "trusted_proxy_cidrs", ["127.0.0.0/8"])
    import auth_middleware
    import webapp

    monkeypatch.setattr(auth_middleware, "SETTINGS", mock_settings)
    monkeypatch.setattr(auth_middleware, "peer_is_trusted", lambda _request: True)
    monkeypatch.setattr(webapp, "ADMIN_GATE_PASSWORD", "1999")
    client = TestClient(webapp.app)

    response = client.post(
        "/admin/login",
        data={"senha": "1999"},
        headers={
            **_auth_header("operador-seguro", "senha-segura"),
            "X-Forwarded-Proto": "https",
            **headers,
        },
        follow_redirects=False,
    )

    assert response.status_code == expected


def test_client_ip_ignora_x_forwarded_for_de_peer_nao_confiavel(mock_settings, monkeypatch):
    import auth_middleware
    import webapp

    monkeypatch.setattr(auth_middleware, "SETTINGS", mock_settings)

    request = Request(
        {
            "type": "http",
            "headers": [(b"x-forwarded-for", b"203.0.113.10")],
            "client": ("127.0.0.1", 50000),
            "scheme": "http",
            "server": ("testserver", 80),
            "path": "/admin/login",
        }
    )

    assert webapp._client_ip(request) == "127.0.0.1"


def test_client_ip_aceita_x_forwarded_for_apenas_de_proxy_confiavel(mock_settings, monkeypatch):
    import auth_middleware
    import webapp

    object.__setattr__(mock_settings, "trusted_proxy_cidrs", ["127.0.0.0/8"])
    monkeypatch.setattr(auth_middleware, "SETTINGS", mock_settings)
    request = Request(
        {
            "type": "http",
            "headers": [(b"x-forwarded-for", b"203.0.113.10, 127.0.0.1")],
            "client": ("127.0.0.1", 50000),
            "scheme": "http",
            "server": ("testserver", 80),
            "path": "/admin/login",
        }
    )
    assert webapp._client_ip(request) == "203.0.113.10"
