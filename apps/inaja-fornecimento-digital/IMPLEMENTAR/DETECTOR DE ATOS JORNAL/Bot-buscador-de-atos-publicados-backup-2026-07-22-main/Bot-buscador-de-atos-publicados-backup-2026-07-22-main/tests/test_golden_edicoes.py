from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from detector import detectar
from ocr.models import PageText, TextBlock

ROTULOS = json.loads((Path(__file__).parent / "golden" / "edicoes_rotuladas.json").read_text(encoding="utf-8"))["edicoes"]
PASTA_EDICOES = Path(__file__).resolve().parents[3] / "edicoes"

DECRETO = """PREFEITURA MUNICIPAL DE INAJÁ
ESTADO DO PARANÁ
DECRETO Nº 071/2026
Súmula: Nomeia servidor para o cargo em comissão de Chefe de Divisão de Tributos.
O PREFEITO DO MUNICÍPIO DE INAJÁ, no uso de suas atribuições legais, DECRETA:
Art. 1º Fica nomeado Fulano de Tal para o cargo de Chefe de Divisão.
Art. 2º Este Decreto entra em vigor na data de sua publicação.
Inajá, 01 de setembro de 2026.
CNPJ 76.970.318/0001-67"""


def _pagina(texto: str, numero: int = 1) -> PageText:
    return PageText(pagina=numero, texto=texto, metodo="pdfplumber-colunas", blocks=[TextBlock(numero, 1, texto)])


def test_rotulos_cobrem_edicoes_processadas():
    assert {"03-09-2026", "06-09-2026", "30-07-2026", "02-08-2026"} <= set(ROTULOS)
    assert all(int(r["atos_oficiais"]) >= 0 for r in ROTULOS.values())


def test_decreto_oficial_continua_gerando_alerta(db, mock_settings):
    import database
    from notifier import _publicacoes_para_alerta
    from qualidade import aplicar_confianca_pub

    database.init_db()
    object.__setattr__(mock_settings, "ai_importancia", True)
    resultado = detectar(99, "Edição com decreto", [_pagina(DECRETO)])
    assert resultado.publicacoes, "o decreto deveria virar uma publicação candidata"
    pubs = []
    for pub in resultado.publicacoes:
        pub = dict(pub)
        pub["jev_detalhe"] = {"categoria": "ato_oficial", "categoria_confianca": 0.9, "pertence_a_inaja": 0.95}
        pubs.append(aplicar_confianca_pub(pub, data_edicao="2026-09-01"))
    resultado.publicacoes[:] = pubs
    with patch("notifier.SETTINGS", mock_settings):
        assert _publicacoes_para_alerta(resultado, "2026-09-01")


@pytest.mark.parametrize("titulo", [t for t, r in ROTULOS.items() if r.get("sem_mistura")])
def test_materias_diferentes_ficam_em_blocos_separados(titulo):
    pdfplumber = pytest.importorskip("pdfplumber")
    from ocr.colunas import extrair_pagina_por_colunas

    pdfs = list(PASTA_EDICOES.rglob(f"*{titulo}.pdf"))
    if not pdfs:
        pytest.skip(f"PDF da edição {titulo} não está disponível")
    with pdfplumber.open(str(pdfs[0])) as pdf:
        for regra in ROTULOS[titulo]["sem_mistura"]:
            numero = int(regra["pagina"])
            extraido = extrair_pagina_por_colunas(pdf.pages[numero - 1], numero)
            assert extraido is not None
            for bloco in extraido[1]:
                assert not (regra["a"] in bloco.texto and regra["b"] in bloco.texto)
            for item in ROTULOS[titulo].get("menciona", []):
                assert item["trecho"] in extraido[0].replace("\n", " ")
