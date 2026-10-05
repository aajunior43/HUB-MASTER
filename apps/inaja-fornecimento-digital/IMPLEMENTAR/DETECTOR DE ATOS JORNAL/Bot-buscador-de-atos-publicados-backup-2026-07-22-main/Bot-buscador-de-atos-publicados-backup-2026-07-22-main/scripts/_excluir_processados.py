"""Exclusão seletiva de resultados para reprocessamento.

Mantém a edição cadastrada, o PDF e o cache OCR. Remove apenas os resultados
gerados e zera os marcadores para que a edição volte à fila.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import database


def main() -> int:
    ap = argparse.ArgumentParser()
    grupo = ap.add_mutually_exclusive_group(required=True)
    grupo.add_argument("--todos", action="store_true")
    grupo.add_argument("--mes", help="Mês no formato AAAA-MM")
    grupo.add_argument("--id", type=int, dest="edicao_id")
    args = ap.parse_args()
    database.init_db()

    with database.connect() as c:
        if args.todos:
            where, params = "ocr_processado = 1", ()
        elif args.mes:
            if len(args.mes) != 7 or args.mes[4] != "-":
                print("Mês inválido. Use AAAA-MM.")
                return 2
            where, params = "data_publicacao LIKE ? AND ocr_processado = 1", (args.mes + "%",)
        else:
            where, params = "id = ? AND ocr_processado = 1", (args.edicao_id,)

        rows = c.execute(f"SELECT id, titulo, data_publicacao FROM edicoes WHERE {where}", params).fetchall()
        if not rows:
            print("Nenhuma edição processada encontrada para esse filtro.")
            return 0
        ids = [r[0] for r in rows]
        marks = ",".join("?" for _ in ids)
        for tabela in ("publicacoes", "mencoes", "deteccao_metricas", "notificacoes"):
            c.execute(f"DELETE FROM {tabela} WHERE edicao_id IN ({marks})", ids)
        c.execute(f"DELETE FROM jobs WHERE edicao_id IN ({marks})", ids)
        c.execute(
            f"UPDATE edicoes SET ocr_processado=0, tem_inaja=0, texto_extraido_path=NULL "
            f"WHERE id IN ({marks})", ids
        )
        print(f"{len(rows)} edição(ões) preparada(s) para reprocessamento.")
        for row in rows[:20]:
            print(f"  id={row[0]} | {row[2]} | {row[1]}")
        if len(rows) > 20:
            print(f"  ... e mais {len(rows) - 20}")
        print("Mantidos: cadastro da edição, PDF e cache OCR.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
