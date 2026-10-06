from __future__ import annotations

from pathlib import Path
from typing import Final

from fastapi.testclient import TestClient

import database
from webapp import app


def _block_after(source: str, marker: str) -> str:
    start = source.index("{", source.index(marker))
    depth = 0
    for position, character in enumerate(source[start:], start):
        if character == "{":
            depth += 1
        elif character == "}":
            depth -= 1
            if depth == 0:
                return source[start + 1 : position]
    raise AssertionError(f"Bloco não fechado após {marker!r}")


def test_dashboard_preserves_navigation_landmarks_and_skip_link(db) -> None:
    response = TestClient(app).get("/")

    assert response.status_code == 200
    assert '<a href="#main-content" id="skip-nav">' in response.text
    assert '<header class="topbar">' in response.text
    assert '<nav class="main-nav" id="main-nav" aria-label="Principal">' in response.text
    assert '<main id="main-content">' in response.text


def test_dashboard_controls_keep_accessible_names_and_relationships(db) -> None:
    edicao_id = database.insert_or_get_edicao(
        "https://example.com/ato-ui-acessivel.pdf", "Edição UI acessível", "2026-07-18"
    )
    database.insert_publicacoes(
        edicao_id,
        [
            {
                "pagina": 1,
                "orgao": "Prefeitura",
                "tipo": "Portaria",
                "numero": "9/2026",
                "assunto": "Ato para navegação por tipo",
                "trecho": "Inajá",
            }
        ],
    )
    response = TestClient(app).get("/")

    assert response.status_code == 200
    assert (
        'id="nav-toggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="main-nav"'
        in response.text
    )
    assert (
        'id="nav-more-btn" aria-expanded="false" aria-haspopup="menu" aria-controls="nav-more-menu"'
        in response.text
    )
    assert (
        'id="theme-toggle" class="nav-chip" title="Alternar tema claro/escuro" aria-label="Alternar tema"'
        in response.text
    )
    assert 'id="q" name="q"' in response.text
    assert 'aria-label="Buscar atos"' in response.text
    assert 'aria-label="Filtrar por mês"' in response.text
    assert 'aria-label="Filtrar por tipo de ato"' in response.text


def test_dashboard_exposes_priority_selection_and_quality_hooks(db) -> None:
    edicao_id = database.insert_or_get_edicao(
        "https://example.com/contrato-ui.pdf", "Edição contrato UI", "2026-07-18"
    )
    database.insert_publicacoes(
        edicao_id,
        [
            {
                "pagina": 1,
                "orgao": "Prefeitura",
                "tipo": "Contrato",
                "numero": "10/2026",
                "assunto": "Contrato sujeito à revisão",
                "trecho": "Inajá",
                "confianca": 40,
                "confianca_nivel": "revisar",
            }
        ],
    )
    response = TestClient(app).get("/?confianca=revisar")

    assert response.status_code == 200
    assert 'href="/?confianca=revisar' in response.text
    assert 'class="chip active"' in response.text
    assert 'class="badge badge-conf-revisar"' in response.text
    assert 'class="pub-row cat-contrato"' in response.text


def test_shared_focus_and_loading_contracts_remain_in_static_assets() -> None:
    base_css = Path("static/base.css").read_text(encoding="utf-8")
    component_css = Path("static/components.css").read_text(encoding="utf-8")
    app_js = Path("static/app.js").read_text(encoding="utf-8")

    assert "#skip-nav:focus" in base_css
    assert ".field input:focus, .field textarea:focus, .field select:focus" in component_css
    assert "box-shadow: 0 0 0 3px var(--accent-glow)" in component_css
    assert ".skeleton" in component_css
    assert "cursor: wait" in component_css
    assert 'button:disabled, .btn[aria-disabled="true"]' in component_css
    assert ":focus-visible" in base_css
    handler = _block_after(app_js, "window.startProcessing = function")
    success_block = _block_after(handler, "if (r.ok)")
    failure_offset = handler.index("else {", handler.index("if (r.ok)") + len(success_block))
    failure_block = _block_after(handler[failure_offset:], "else")
    network_error_block = _block_after(handler, ".catch(function ()")
    disabled_assignment: Final[str] = "btn.disabled = true;"

    assert handler.index(disabled_assignment) < handler.index("fetch(action")
    assert "window.createLiveMonitor" in success_block
    assert "restoreControl" in success_block
    assert "Processamento iniciado. Acompanhe na Fila." in success_block
    assert "restoreControl();" in failure_block
    assert "restoreControl();" in network_error_block


def test_queue_empty_state_is_distinct_from_scheduler_idle_state(db) -> None:
    response = TestClient(app).get("/operacao?tab=fila")

    assert response.status_code == 200
    assert 'class="empty-state empty-state-queue"' in response.text
    assert 'role="status"' in response.text
    assert "Nenhum job foi registrado ainda." in response.text
    assert "Sistema aguardando" not in response.text


def test_queue_page_preserves_empty_and_error_state_hooks(db) -> None:
    client = TestClient(app)
    empty_response = client.get("/operacao?tab=fila")

    assert empty_response.status_code == 200
    assert '<article id="stat-rodando"><strong>0</strong>' in empty_response.text
    assert 'class="empty-state empty-state-queue"' in empty_response.text
    assert "Nenhum job foi registrado ainda." in empty_response.text
    assert 'class="status-group status-' not in empty_response.text

    job_id = database.start_job("ocr", titulo="Edição com falha", mensagem="iniciando")
    database.update_job(job_id, "erro", mensagem="Falha de OCR")
    error_response = client.get("/operacao?tab=fila")

    assert error_response.status_code == 200
    assert 'class="status-group status-erro"' in error_response.text
    assert 'class="status-group status-erro" role="alert"' in error_response.text
    assert 'class="timeline-item status-erro"' in error_response.text
    assert "Falha de OCR" in error_response.text
