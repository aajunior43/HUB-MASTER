"""Extração de texto nativo de PDF respeitando colunas e matérias do jornal.

O ``extract_text`` do pdfplumber lê linha a linha de ponta a ponta da página,
misturando o texto de colunas vizinhas. Aqui as palavras são agrupadas por
cortes recursivos (XY-cut): cortes horizontais separam faixas da página e
cortes verticais separam colunas, produzindo blocos de leitura coerentes.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from statistics import median

from ocr.models import TextBlock

logger = logging.getLogger(__name__)

PT_PARA_PX_300DPI = 300 / 72
MIN_PALAVRAS_PAGINA = 15
MAX_PROFUNDIDADE = 24
TOLERANCIA_COLUNA_PT = 14.0
_HIFEN_FIM_LINHA = re.compile(r"(?<=[A-Za-zÀ-ÿ]{2})-$")


@dataclass(frozen=True)
class Palavra:
    texto: str
    x0: float
    x1: float
    top: float
    bottom: float


@dataclass(frozen=True)
class Regiao:
    palavras: list[Palavra]
    x0: float
    x1: float
    top: float
    bottom: float


def _regiao(palavras: list[Palavra]) -> Regiao:
    return Regiao(
        palavras=palavras,
        x0=min(p.x0 for p in palavras),
        x1=max(p.x1 for p in palavras),
        top=min(p.top for p in palavras),
        bottom=max(p.bottom for p in palavras),
    )


def _cortar_por_lacuna(
    palavras: list[Palavra], inicio, fim, lacuna_min: float
) -> list[list[Palavra]] | None:
    ordenadas = sorted(palavras, key=inicio)
    grupos: list[list[Palavra]] = [[ordenadas[0]]]
    limite = fim(ordenadas[0])
    for palavra in ordenadas[1:]:
        if inicio(palavra) - limite >= lacuna_min:
            grupos.append([palavra])
        else:
            grupos[-1].append(palavra)
        limite = max(limite, fim(palavra))
    return grupos if len(grupos) > 1 else None


def _tamanho_mediano(palavras: list[Palavra]) -> float:
    return median(max(1.0, p.bottom - p.top) for p in palavras)


def _dividir(palavras: list[Palavra], profundidade: int = 0) -> list[list[Palavra]]:
    if len(palavras) < 2 or profundidade >= MAX_PROFUNDIDADE:
        return [palavras]
    altura = _tamanho_mediano(palavras)
    horizontal = _cortar_por_lacuna(
        palavras, lambda p: p.top, lambda p: p.bottom, max(5.0, altura * 0.5)
    )
    if horizontal:
        return [b for grupo in horizontal for b in _dividir(grupo, profundidade + 1)]
    vertical = _cortar_por_lacuna(
        palavras, lambda p: p.x0, lambda p: p.x1, max(5.0, altura * 0.6)
    )
    if vertical:
        return [b for grupo in vertical for b in _dividir(grupo, profundidade + 1)]
    return [palavras]


def _linhas(palavras: list[Palavra]) -> list[str]:
    altura = _tamanho_mediano(palavras)
    tolerancia = max(1.5, altura * 0.5)
    ordenadas = sorted(palavras, key=lambda p: (p.top, p.x0))
    linhas: list[list[Palavra]] = []
    for palavra in ordenadas:
        if linhas and abs(palavra.top - linhas[-1][0].top) <= tolerancia:
            linhas[-1].append(palavra)
        else:
            linhas.append([palavra])
    return [" ".join(p.texto for p in sorted(linha, key=lambda p: p.x0)) for linha in linhas]


def _juntar_hifenizacao(linhas: list[str]) -> str:
    saida: list[str] = []
    i = 0
    while i < len(linhas):
        atual = linhas[i]
        while (
            i + 1 < len(linhas)
            and _HIFEN_FIM_LINHA.search(atual)
            and linhas[i + 1][:1].islower()
        ):
            atual = atual[:-1] + linhas[i + 1]
            i += 1
        saida.append(atual)
        i += 1
    return "\n".join(saida)


def _indices_de_coluna(regioes: list[Regiao]) -> list[int]:
    inicios = sorted({round(r.x0, 1) for r in regioes})
    faixas: list[float] = []
    for x in inicios:
        if not faixas or x - faixas[-1] > TOLERANCIA_COLUNA_PT:
            faixas.append(x)
    indices = []
    for regiao in regioes:
        indices.append(min(range(len(faixas)), key=lambda k: abs(faixas[k] - regiao.x0)))
    return indices


def palavras_da_pagina(page) -> list[Palavra]:
    brutas = page.extract_words(x_tolerance=1.5, y_tolerance=2, keep_blank_chars=False, use_text_flow=False)
    return [
        Palavra(str(w["text"]), float(w["x0"]), float(w["x1"]), float(w["top"]), float(w["bottom"]))
        for w in brutas
        if str(w.get("text") or "").strip()
    ]


def extrair_pagina_por_colunas(page, numero_pagina: int) -> tuple[str, list[TextBlock]] | None:
    """Retorna (texto em ordem de leitura, blocos com bbox em px a 300 DPI) ou None para usar o fallback."""
    try:
        palavras = palavras_da_pagina(page)
    except Exception:
        logger.debug("Falha ao ler palavras da página %s", numero_pagina, exc_info=True)
        return None
    if len(palavras) < MIN_PALAVRAS_PAGINA:
        return None

    regioes = [_regiao(grupo) for grupo in _dividir(palavras)]
    colunas = _indices_de_coluna(regioes)
    sequencia: dict[int, int] = {}
    blocos: list[TextBlock] = []
    textos: list[str] = []
    for regiao, coluna in zip(regioes, colunas, strict=True):
        texto = _juntar_hifenizacao(_linhas(regiao.palavras)).strip()
        if not texto:
            continue
        sequencia[coluna] = sequencia.get(coluna, 0) + 1
        blocos.append(
            TextBlock(
                pagina=numero_pagina,
                bloco=coluna * 1000 + sequencia[coluna],
                texto=texto,
                bbox=(
                    int(regiao.x0 * PT_PARA_PX_300DPI),
                    int(regiao.top * PT_PARA_PX_300DPI),
                    int(regiao.x1 * PT_PARA_PX_300DPI),
                    int(regiao.bottom * PT_PARA_PX_300DPI),
                ),
            )
        )
        textos.append(texto)
    if not blocos:
        return None
    return "\n".join(textos), blocos
