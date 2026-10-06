"""Relatório de qualidade do detector contra as edições rotuladas.

Uso: python scripts/avaliar_golden.py [--extracao]

Sem opções, compara o que o detector gravou no banco (publicações finais e
alertas emitidos) com os rótulos de tests/golden/edicoes_rotuladas.json.
Com --extracao, também reextrai os PDFs e confere se matérias diferentes
continuam em blocos separados.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

ROTULOS = RAIZ / "tests" / "golden" / "edicoes_rotuladas.json"


def carregar_rotulos() -> dict:
    return json.loads(ROTULOS.read_text(encoding="utf-8"))["edicoes"]


def resultado_no_banco(conn: sqlite3.Connection, titulo: str) -> dict | None:
    edicao = conn.execute("SELECT id FROM edicoes WHERE titulo = ?", (titulo,)).fetchone()
    if not edicao:
        return None
    finais = conn.execute("SELECT COUNT(*) FROM publicacoes WHERE edicao_id = ?", (edicao[0],)).fetchone()[0]
    ultima = conn.execute(
        "SELECT conteudo FROM notificacoes WHERE edicao_id = ? ORDER BY id DESC LIMIT 1",
        (edicao[0],),
    ).fetchone()
    conteudo = (ultima[0] if ultima else "") or ""
    alertas = int(conteudo.lstrip().startswith("Publicação oficial") or conteudo.startswith("Importância"))
    return {"publicacoes": finais, "alertas": alertas}


def avaliar_banco(rotulos: dict, db_path: Path) -> list[dict]:
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    linhas = []
    for titulo, rotulo in rotulos.items():
        obtido = resultado_no_banco(conn, titulo)
        esperado = int(rotulo["atos_oficiais"])
        if obtido is None:
            linhas.append({"edicao": titulo, "status": "não processada"})
            continue
        falsos_alertas = obtido["alertas"] if esperado == 0 else 0
        linhas.append(
            {
                "edicao": titulo,
                "esperado": esperado,
                "publicacoes": obtido["publicacoes"],
                "alertas": obtido["alertas"],
                "falsos_alertas": falsos_alertas,
                "status": "ok" if falsos_alertas == 0 and (esperado or obtido["publicacoes"] >= 0) else "falso alerta",
            }
        )
    conn.close()
    return linhas


def avaliar_extracao(rotulos: dict, pasta_edicoes: Path) -> list[dict]:
    import pdfplumber

    from ocr.colunas import extrair_pagina_por_colunas

    linhas = []
    for titulo, rotulo in rotulos.items():
        regras = rotulo.get("sem_mistura") or []
        if not regras:
            continue
        pdfs = list(pasta_edicoes.rglob(f"*{titulo}.pdf"))
        if not pdfs:
            linhas.append({"edicao": titulo, "extracao": "PDF ausente"})
            continue
        violacoes = 0
        with pdfplumber.open(str(pdfs[0])) as pdf:
            for regra in regras:
                pagina = pdf.pages[int(regra["pagina"]) - 1]
                extraido = extrair_pagina_por_colunas(pagina, int(regra["pagina"]))
                if not extraido:
                    violacoes += 1
                    continue
                for bloco in extraido[1]:
                    if regra["a"] in bloco.texto and regra["b"] in bloco.texto:
                        violacoes += 1
        linhas.append({"edicao": titulo, "regras": len(regras), "misturas": violacoes})
    return linhas


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--extracao", action="store_true")
    args = parser.parse_args()

    from config import SETTINGS

    rotulos = carregar_rotulos()
    db_path = Path(SETTINGS.db_path)
    falhas = 0
    print("== Banco de dados ==")
    for linha in avaliar_banco(rotulos, db_path):
        print(linha)
        if linha.get("status") == "falso alerta":
            falhas += 1
    if args.extracao:
        print("== Extração por colunas ==")
        for linha in avaliar_extracao(rotulos, Path(SETTINGS.download_dir)):
            print(linha)
            if linha.get("misturas"):
                falhas += 1
    print(f"Falhas: {falhas}")
    return 1 if falhas else 0


if __name__ == "__main__":
    raise SystemExit(main())
