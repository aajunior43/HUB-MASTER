from __future__ import annotations

import contextlib
import logging
import re
import unicodedata
from dataclasses import dataclass
from datetime import date

from ai_processor import normalizar_tipo_ato, refinar_publicacoes
from config import CNPJ_INAJA_PREFIXES, MUNICIPIOS_VIZINHOS, SETTINGS
from ocr.models import PageText, TextBlock

logger = logging.getLogger(__name__)


BASE_TERMS = [
    "Inajá",
    "Inaja",
    # INAVÁ/INAVA: normalizados no texto para Inajá — não listar à parte
    "Prefeitura de Inajá",
    "Prefeitura Municipal de Inajá",
    "Câmara de Inajá",
    "Câmara Municipal de Inajá",
    "Município de Inajá",
    "Municipio de Inaja",
    "75.771.400/0001-48",
    "76.970.318/0001",
]

GENERIC_TERMS = {"inajá", "inaja"}
# Termos genéricos que batem dentro de nomes mais longos — preferir o específico
CEP_RE = re.compile(r"\b87\.?\d{3}-\d{3}\b")
CPF_RE = re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b")
VALOR_RE = re.compile(r"R\s*[$S]\s*[\d\.\,]+", re.IGNORECASE)
VALOR_DE_RE = re.compile(r"valor\s+de\s+(R\s*[$S]\s*[\d\.\,]+)", re.IGNORECASE)
DATA_EXTENSO_RE = re.compile(
    r"\b\d{1,2}\s+de\s+[A-Za-zçÇãÃéÉ]+\s+de\s+\d{4}\b",
    re.IGNORECASE,
)
DATA_NUMERICA_RE = re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b")
TIPOS_ATO = [
    "DECRETO",
    "PORTARIA",
    "LEI",
    "EDITAL",
    "AVISO",
    "EXTRATO",
    "DISPENSA",
    "INEXIGIBILIDADE",
    "HOMOLOGAÇÃO",
    "ADJUDICAÇÃO",
    "TERMO",
    "RESOLUÇÃO",
    "ERRATA",
    "NOTIFICAÇÃO",
    "DEMONSTRATIVO",
    "RELATÓRIO",
    "BALANÇO",
    "RGF",
    "RREO",
]
# Prefixo ordinal comum em aditivos: "QUINTO TERMO ADITIVO..."
_ORDINAL_ATO = (
    r"(?:(?:PRIMEIRO|SEGUNDO|TERCEIRO|QUARTO|QUINTO|SEXTO|S[ÉE]TIMO|OITAVO|NONO|"
    r"D[ÉE]CIMO|1[ºO.]|2[ºO.]|3[ºO.]|4[ºO.]|5[ºO.]|6[ºO.]|7[ºO.]|8[ºO.]|9[ºO.]|"
    r"10[ºO.])\s+)?"
)
# Tipos compostos (mais específicos primeiro)
_TIPOS_COMPOSTOS = (
    r"EXTRATO\s+(?:DO\s+|DE\s+|RE\s+)?(?:TERMO\s+(?:DE\s+)?)?CONTRATO|"
    r"EXTRATO\s+DE\s+CONTRATO|"
    r"CONTRATO\s+ADMINISTRATIVO|"
    r"TERMO\s+(?:DE\s+)?ADITIVO(?:\s+DE\s+CONTRATO)?|"
    r"TERMO\s+ADITIVO|"
    r"TERMO\s+DE\s+HOMOLOGA[CÇ][AÃ]O(?:\s+E\s+ADJUDICA[CÇ][AÃ]O)?|"
    r"HOMOLOGA[CÇ][AÃ]O\s+E\s+ADJUDICA[CÇ][AÃ]O|"
    r"DISPENSA\s+(?:DE\s+)?LICITA[CÇ][AÃ]O|"
    r"PREG[AÃ]O\s+ELETR[OÔ]NICO"
)
_TIPOS_SIMPLES = "|".join(re.escape(tipo) for tipo in TIPOS_ATO)
TIPO_ATO_RE = re.compile(
    rf"\b(?:{_ORDINAL_ATO})(?:({_TIPOS_COMPOSTOS})|({_TIPOS_SIMPLES}))\b"
    r"\s*(?:N[º°O.]?\s*)?(\d{1,6}(?:[./-]\d{1,4})?)?",
    re.IGNORECASE,
)
LINHA_TITULO_ATO_RE = re.compile(
    rf"^\s*(?:{_ORDINAL_ATO})(?:(?:{_TIPOS_COMPOSTOS})|(?:{_TIPOS_SIMPLES}))\b",
    re.IGNORECASE,
)
# Cabeçalho de órgão Inajá (mesmo com OCR truncado: "PREFEITURA MUNICIPAL DE IN")
_CABECALHO_INAJA_RE = re.compile(
    r"(?im)^\s*(?:"
    r"PREFEITURA\s+MUNICIPAL\s+DE\s+IN(?:AJ[AÁ])?|"
    r"PREFEITURA\s+DE\s+IN(?:AJ[AÁ])?|"
    r"C[AÂ]MARA\s+MUNICIPAL\s+DE\s+IN(?:AJ[AÁ])?|"
    r"MUNIC[IÍ]PIO\s+DE\s+IN(?:AJ[AÁ])?"
    r")\b"
)
LINHA_ASSUNTO_RE = re.compile(
    r"\b(S[ÚU]MULA|EMENTA|OBJETO|ASSUNTO)\b\s*[:\-]?\s*(.+)",
    re.IGNORECASE,
)
REFERENCIA_LEGAL_RE = re.compile(
    r"\b(lei\s+(federal|estadual|org[aâ]nica)|art\.?\s*\d+|inciso|par[aá]grafo|loa)\b",
    re.IGNORECASE,
)
_TITULO_ATO_MID_RE = re.compile(
    rf"(?im)^(?=.{{0,20}}(?:{_ORDINAL_ATO})(?:(?:{_TIPOS_COMPOSTOS})|(?:{_TIPOS_SIMPLES}))\b"
    r".{{0,40}}N[º°O.]?\s*\d)",
)
SINAIS_OFICIAIS = [
    "prefeitura municipal",
    "camara municipal",
    "municipio de",
    "estado do parana",
    "cnpj",
    "lei organica",
    "licitacao",
    "processo",
    "decreto",
    "portaria",
    "edital",
]


@dataclass(frozen=True)
class DetectionMetrics:
    """Métricas de qualidade de uma execução de detecção."""

    publicacoes_brutas: int = 0
    publicacoes_finais: int = 0
    descartes_ia: int = 0
    descartes_vizinho: int = 0
    paginas_total: int = 0
    paginas_ocr_fraco: int = 0
    mencoes: int = 0

    def as_dict(self) -> dict[str, int]:
        return {
            "publicacoes_brutas": self.publicacoes_brutas,
            "publicacoes_finais": self.publicacoes_finais,
            "descartes_ia": self.descartes_ia,
            "descartes_vizinho": self.descartes_vizinho,
            "paginas_total": self.paginas_total,
            "paginas_ocr_fraco": self.paginas_ocr_fraco,
            "mencoes": self.mencoes,
        }


@dataclass(frozen=True)
class DetectionResult:
    encontrado: bool
    edicao_id: int
    edicao_titulo: str
    paginas_com_mencao: list[int]
    trechos: list[dict]
    termos_encontrados: list[str]
    mencoes_db: list[dict]
    publicacoes: list[dict]
    metricas: DetectionMetrics | None = None


def _candidatos_recuperacao_ia(paginas: list[PageText]) -> list[dict]:
    """Monta trechos de páginas relevantes quando a heurística não achou atos.

    A recuperação é deliberadamente limitada a páginas que contenham uma
    identificação forte de Inajá (nome, CNPJ ou CEP). Assim a IA pode recuperar
    um falso negativo de OCR sem transformar o jornal inteiro em candidatos ou
    gastar chamadas com páginas sem relação com o município.
    """
    marcadores = (
        "inaja",
        "75.771.400/0001-48",
        "76.970.318/0001-67",
        "87670-000",
        "87670 000",
    )
    candidatos: list[dict] = []
    vistos: set[str] = set()
    for pagina in paginas:
        texto = _normalizar_ocr_para_extracao(pagina.texto or "")
        normalizado = _sem_acentos(texto).casefold()
        posicoes = [normalizado.find(marcador) for marcador in marcadores]
        posicoes = [pos for pos in posicoes if pos >= 0]
        if not posicoes:
            continue

        # Uma janela por página normalmente basta e evita repetir a mesma lista
        # de distribuição quando a página contém várias ocorrências.
        centro = min(posicoes)
        inicio = max(0, centro - 1100)
        fim = min(len(texto), inicio + 2500)
        trecho = texto[inicio:fim].strip()
        chave = _sem_acentos(" ".join(trecho.split())[:180]).casefold()
        if not trecho or chave in vistos:
            continue
        vistos.add(chave)
        candidatos.append(
            {
                "pagina": pagina.pagina,
                "bloco": 0,
                "categoria": "publicacao_oficial",
                "trecho": trecho,
            }
        )
    return candidatos


def _sem_acentos(texto: str) -> str:
    normalizado = unicodedata.normalize("NFKD", texto)
    return "".join(ch for ch in normalizado if not unicodedata.combining(ch))


def _snippet(texto: str, inicio: int, fim: int, margem: int = 120) -> str:
    ini = max(0, inicio - margem)
    end = min(len(texto), fim + margem)
    trecho = " ".join(texto[ini:end].split())
    return f"...{trecho}..."


def _limpar(texto: str) -> str:
    return " ".join((texto or "").split())


def _normalizar_ocr_para_extracao(texto: str) -> str:
    normalizado = texto or ""
    normalizado = re.sub(
        r"\bN[ER]\.?\s*:",
        "Nº:",
        normalizado,
        flags=re.IGNORECASE,
    )
    normalizado = re.sub(r"\bLEI\s*N[º°O.]", "LEI Nº", normalizado, flags=re.IGNORECASE)
    normalizado = re.sub(r"\bLEIN[º°O.]", "LEI Nº", normalizado, flags=re.IGNORECASE)
    normalizado = re.sub(r"\bPORTARIAN[º°O.]", "PORTARIA Nº", normalizado, flags=re.IGNORECASE)
    normalizado = re.sub(r"\bDECRETON[º°O.]", "DECRETO Nº", normalizado, flags=re.IGNORECASE)
    # Variantes OCR de Inajá (INAVÁ, INA JA, truncado)
    normalizado = re.sub(r"\bINA\s*V[AÁ]\b", "Inajá", normalizado, flags=re.IGNORECASE)
    normalizado = re.sub(r"\bINA\s*J\s*A\b", "Inajá", normalizado, flags=re.IGNORECASE)
    normalizado = re.sub(r"\bINAJA\b", "Inajá", normalizado, flags=re.IGNORECASE)
    normalizado = re.sub(
        r"\bPRE[ZS]?EITURA\b", "PREFEITURA", normalizado, flags=re.IGNORECASE
    )
    normalizado = re.sub(
        r"\b(\d{1,2})[/:](\d{1,2})[/:](20\d{2})\b",
        r"\1/\2/\3",
        normalizado,
    )
    normalizado = re.sub(
        r"\b(\d{1,2})/(\d{2})(20\d{2})\b",
        r"\1/\2/\3",
        normalizado,
    )
    normalizado = re.sub(
        r"\b(\d{1,2}\s+de\s+[A-Za-zçÇãÃéÉ]+)\s+do\s+(20\d{2})\b",
        r"\1 de \2",
        normalizado,
        flags=re.IGNORECASE,
    )
    # Títulos de ato truncados pelo OCR
    normalizado = re.sub(
        r"\bE?X?TRATO\s+DO\s+CONTRATO\b",
        "EXTRATO DO CONTRATO",
        normalizado,
        flags=re.IGNORECASE,
    )
    normalizado = re.sub(
        r"\bRATO\s+DO\s+CONTRATO\b",
        "EXTRATO DO CONTRATO",
        normalizado,
        flags=re.IGNORECASE,
    )
    normalizado = re.sub(
        r"\bEXTRATO\s+RE\s+CONTRATO\b",
        "EXTRATO DE CONTRATO",
        normalizado,
        flags=re.IGNORECASE,
    )
    normalizado = re.sub(
        r"\bCONTRATO\s+ADMINISTRATIVO\b",
        "CONTRATO ADMINISTRATIVO",
        normalizado,
        flags=re.IGNORECASE,
    )

    # "PREFEITURA MUNICIPAL DE IN" / "DE IN." truncado pelo OCR
    normalizado = re.sub(
        r"\b(PREFEITURA\s+MUNICIPAL\s+DE\s+IN)\b(?!\s*AJ)",
        r"\1ajá",
        normalizado,
        flags=re.IGNORECASE,
    )
    normalizado = re.sub(
        r"\b(C[AÂ]MARA\s+MUNICIPAL\s+DE\s+IN)\b(?!\s*AJ)",
        r"\1ajá",
        normalizado,
        flags=re.IGNORECASE,
    )
    normalizado = re.sub(
        r"\b(MUNIC[IÍ]PIO\s+DE\s+IN)\b(?!\s*AJ)",
        r"\1ajá",
        normalizado,
        flags=re.IGNORECASE,
    )
    # CNPJ Inajá com OCR quebrado: 76.970.318/0001-67 → 76970318...
    # Aceita espaços/pontuação soltos no miolo
    normalizado = re.sub(
        r"76[\s.\-_/|]*970[\s.\-_/|]*318[\s.\-_/|]*0*0*0*1[\s.\-_/|]*6?7?",
        "76.970.318/0001-67",
        normalizado,
        flags=re.IGNORECASE,
    )
    normalizado = re.sub(
        r"75[\s.\-_/|]*771[\s.\-_/|]*400[\s.\-_/|]*0*0*0*1[\s.\-_/|]*4?8?",
        "75.771.400/0001-48",
        normalizado,
        flags=re.IGNORECASE,
    )
    return normalizado


def _contexto(texto: str, inicio: int, fim: int, margem: int = 180) -> str:
    ini = max(0, inicio - margem)
    end = min(len(texto), fim + margem)
    return texto[ini:end]


def _termos() -> list[str]:
    """Lista de busca sem duplicar o mesmo texto normalizado (ex.: Inajá/Inaja)."""
    termos = BASE_TERMS + SETTINGS.extra_terms
    por_norm: dict[str, str] = {}
    for termo in termos:
        if not (termo or "").strip():
            continue
        chave = _sem_acentos(termo).casefold()
        if chave in {"inava", "inavá"}:
            chave = "inaja"
            termo = "Inajá"
        # Preferir o rótulo mais específico (mais longo) para o mesmo norm
        if chave not in por_norm or len(termo) > len(por_norm[chave]):
            por_norm[chave] = "Inajá" if chave == "inaja" else termo
    # Ordem: mais específicos primeiro (evita “Inajá” engolir contexto do match longo)
    return sorted(por_norm.values(), key=lambda t: (-len(t), t.casefold()))


def _score_termo_mencao(termo: str) -> int:
    """Quanto maior, mais específico (usado ao colapsar menções no mesmo trecho)."""
    t = _sem_acentos(termo or "").casefold()
    if "prefeitura municipal" in t:
        return 100
    if "camara municipal" in t:
        return 95
    if "municipio de" in t:
        return 85
    if "prefeitura de" in t:
        return 80
    if "camara de" in t:
        return 75
    if "joao eder" in t:
        return 70
    if re.search(r"\d{2}\.\d{3}\.\d{3}", termo or "") or "cnpj" in t:
        return 65
    if t.startswith("cep"):
        return 50
    if t in GENERIC_TERMS:
        return 10
    return 40


def _contexto_marca_comercial(texto: str, inicio: int, fim: int) -> bool:
    """True se 'Inajá' parece marca de produto (ex.: combustível SR 10 Marca: Inajá)."""
    ctx = _sem_acentos(_contexto(texto, inicio, fim, margem=50)).casefold()
    if re.search(r"\bmarca\s*[:\-]?\s*inaja\b", ctx) or re.search(r"\binaja\s*\d+\b", ctx):
        # Ainda é menção municipal se órgão aparece perto
        largo = _sem_acentos(_contexto(texto, inicio, fim, margem=200)).casefold()
        return not any(
            k in largo for k in ("prefeitura", "municipio de inaja", "camara municipal", "cnpj")
        )
    return False


def _deduplicar_mencoes(mencoes: list[dict]) -> list[dict]:
    """Uma menção por trecho/página — fica o termo mais específico."""
    melhores: dict[tuple, dict] = {}
    for m in mencoes:
        trecho = re.sub(r"\s+", " ", _sem_acentos(m.get("trecho") or "").casefold()).strip()
        # Janela estável do trecho (sem variar com o termo no meio)
        chave = (m.get("pagina"), trecho[:160])
        if chave not in melhores:
            melhores[chave] = m
            continue
        if _score_termo_mencao(m.get("termo") or "") > _score_termo_mencao(
            melhores[chave].get("termo") or ""
        ):
            melhores[chave] = m
    # Ordena por página
    return sorted(
        melhores.values(),
        key=lambda x: (int(x.get("pagina") or 0), str(x.get("termo") or "")),
    )


def _cep_de_inaja(cep: str) -> bool:
    numeros = cep.replace("-", "")
    prefixos = SETTINGS.inaja_cep_prefixes or ["87670"]
    return any(numeros.startswith(prefixo.replace("-", "")) for prefixo in prefixos)


def _contexto_ignorado_para_mencao_generica(
    texto: str,
    inicio: int,
    fim: int,
) -> bool:
    contexto_norm = _sem_acentos(_contexto(texto, inicio, fim)).casefold()
    termos = [
        _sem_acentos(termo).casefold() for termo in SETTINGS.ignore_context_terms if termo.strip()
    ]
    encontrados = [termo for termo in termos if termo in contexto_norm]
    return "distribuicao avulsa" in contexto_norm or len(encontrados) >= 2


def _segmentos(pagina: PageText) -> list[TextBlock]:
    if pagina.blocks:
        base = _agrupar_blocos_oficiais([block for block in pagina.blocks if block.texto.strip()])
    else:
        base = [TextBlock(pagina=pagina.pagina, bloco=1, texto=pagina.texto)]
    # Divide mega-blocos com vários cabeçalhos de Inajá / títulos de ato
    out: list[TextBlock] = []
    for seg in base:
        out.extend(_dividir_segmento_multi_atos(seg))
    return out


def _dividir_segmento_multi_atos(segmento: TextBlock) -> list[TextBlock]:
    """Parte segmentos longos que misturam 2+ atos oficiais de Inajá."""
    texto = segmento.texto or ""
    if len(texto) < 900:
        return [segmento]

    cortes: list[int] = []
    cabecalhos_aceitos: list[int] = []
    for m in _CABECALHO_INAJA_RE.finditer(texto):
        cabecalho_norm = _sem_acentos(m.group(0)).casefold()
        anterior = cabecalhos_aceitos[-1] if cabecalhos_aceitos else 0
        escopo_norm = _sem_acentos(texto[anterior : m.start()]).casefold()
        mencao_embutida = (
            "extrato" in escopo_norm[:600]
            and "contrato" in escopo_norm[:600]
            and m.start() > 100
            and cabecalho_norm.startswith("municipio")
        )
        if m.start() > 40 and not mencao_embutida:
            cortes.append(m.start())
            cabecalhos_aceitos.append(m.start())
    for m in _TITULO_ATO_MID_RE.finditer(texto):
        fim_linha = texto.find("\n", m.start())
        linha = texto[m.start() : fim_linha if fim_linha >= 0 else len(texto)]
        anterior = max(
            (pos for pos in cabecalhos_aceitos if pos < m.start()),
            default=0,
        )
        prefixo = _sem_acentos(texto[anterior : m.start()]).casefold()
        linha_norm = _sem_acentos(linha).casefold()
        referencia_contratual = (
            "extrato" in prefixo[:500]
            and "contrato" in prefixo[:500]
            and linha_norm.startswith(("inexigibilidade", "dispensa"))
        )
        if m.start() > 80 and not referencia_contratual:
            cortes.append(m.start())

    if not cortes:
        return [segmento]

    cortes = sorted(set(cortes))
    # Evita cortes densos demais
    filtrados: list[int] = []
    ultimo = -9999
    for c in cortes:
        if c - ultimo >= 120:
            filtrados.append(c)
            ultimo = c
    if not filtrados:
        return [segmento]

    pedacos: list[TextBlock] = []
    inicio = 0
    for i, c in enumerate(filtrados):
        pedaco = texto[inicio:c].strip()
        if len(pedaco) >= 40:
            pedacos.append(
                TextBlock(
                    pagina=segmento.pagina,
                    bloco=segmento.bloco * 100 + i + 1,
                    texto=pedaco,
                    bbox=segmento.bbox,
                )
            )
        inicio = c
    resto = texto[inicio:].strip()
    if len(resto) >= 40:
        pedacos.append(
            TextBlock(
                pagina=segmento.pagina,
                bloco=segmento.bloco * 100 + len(filtrados) + 1,
                texto=resto,
                bbox=segmento.bbox,
            )
        )
    return pedacos if pedacos else [segmento]


def _coluna_do_bloco(bloco: TextBlock) -> int:
    return bloco.bloco // 1000 if bloco.bloco >= 1000 else 0


def _bbox_top(bloco: TextBlock) -> int:
    return bloco.bbox[1] if bloco.bbox else 0


def _bbox_bottom(bloco: TextBlock) -> int:
    return bloco.bbox[3] if bloco.bbox else _bbox_top(bloco)


def _mesclar_blocos(blocos: list[TextBlock]) -> TextBlock:
    primeiro = blocos[0]
    texto = "\n".join(bloco.texto for bloco in blocos if bloco.texto.strip())
    bboxes = [bloco.bbox for bloco in blocos if bloco.bbox]
    bbox = None
    if bboxes:
        bbox = (
            min(item[0] for item in bboxes),
            min(item[1] for item in bboxes),
            max(item[2] for item in bboxes),
            max(item[3] for item in bboxes),
        )
    return TextBlock(
        pagina=primeiro.pagina,
        bloco=primeiro.bloco,
        texto=texto,
        bbox=bbox,
    )


def _inicia_publicacao_inaja(texto: str) -> bool:
    return _extrair_orgao(texto) is not None or _linha_inicia_ato(texto)


def _linha_inicia_ato(texto: str) -> bool:
    for linha in texto.splitlines():
        linha_limpa = _limpar(linha)
        if not linha_limpa:
            continue
        if REFERENCIA_LEGAL_RE.search(linha_limpa) and not re.search(
            r"\b(LEI|DECRETO|PORTARIA|EDITAL|AVISO|EXTRATO|TERMO|RESOLUÇÃO)\b\s*N[º°O.]?",
            linha_limpa,
            re.IGNORECASE,
        ):
            return False
        return bool(LINHA_TITULO_ATO_RE.search(linha_limpa))
    return False


def _agrupar_blocos_oficiais(blocos: list[TextBlock]) -> list[TextBlock]:
    if not blocos:
        return []

    agrupados: list[TextBlock] = []
    por_coluna: dict[int, list[TextBlock]] = {}
    for bloco in blocos:
        por_coluna.setdefault(_coluna_do_bloco(bloco), []).append(bloco)

    for _coluna, itens in sorted(por_coluna.items()):
        atual: list[TextBlock] = []

        def flush() -> None:
            nonlocal atual
            if atual:
                agrupados.append(_mesclar_blocos(atual) if len(atual) > 1 else atual[0])
                atual = []

        for bloco in sorted(itens, key=lambda item: (_bbox_top(item), item.bloco)):
            inicia_inaja = _inicia_publicacao_inaja(bloco.texto)
            if inicia_inaja:
                flush()
                atual = [bloco]
                continue

            if atual:
                gap = _bbox_top(bloco) - _bbox_bottom(atual[-1])
                # Em 300 DPI, 420 px separavam partes do mesmo formulário.
                # Cabeçalhos novos ainda forçam flush, então um limite maior
                # preserva corpo, valores e assinatura do ato atual.
                if gap <= 700:
                    atual.append(bloco)
                    continue
                flush()

            agrupados.append(bloco)
        flush()

    return sorted(
        agrupados,
        key=lambda bloco: (
            _coluna_do_bloco(bloco),
            _bbox_top(bloco),
            bloco.bloco,
        ),
    )


def _categoria(texto: str) -> str:
    texto_norm = _sem_acentos(texto).casefold()
    if _contexto_ignorado_para_mencao_generica(texto, 0, min(len(texto), 1)):
        return "patrocinador_distribuicao"
    if any(sinal in texto_norm for sinal in SINAIS_OFICIAIS):
        return "publicacao_oficial"
    return "materia_jornalistica"


def _extrair_orgao(texto: str) -> str | None:
    texto = _normalizar_ocr_para_extracao(texto)
    inicio_norm = _sem_acentos(_limpar(texto)[:280]).casefold()
    full_norm = _sem_acentos(_limpar(texto)[:800]).casefold()
    if re.match(r"^\s*(art\.?\s*\d+|paragrafo|inciso)\b", inicio_norm):
        return None
    if re.match(
        r"^(prefeitura( municipal)?( do municipio)? de inaja|prefeitura municipal de inaja)\b",
        inicio_norm,
    ):
        return "Prefeitura Municipal de Inajá"
    if re.match(r"^(camara( municipal)? de inaja|camara municipal de inaja)\b", inicio_norm):
        return "Câmara Municipal de Inajá"
    if re.match(r"^municipio de inaja\b", inicio_norm):
        return "Município de Inajá"
    # OCR truncado no cabeçalho: "prefeitura municipal de in" sem "aja"
    if re.match(r"^prefeitura\s+municipal\s+de\s+in\b", inicio_norm):
        return "Prefeitura Municipal de Inajá"
    if re.match(r"^camara\s+municipal\s+de\s+in\b", inicio_norm):
        return "Câmara Municipal de Inajá"
    # Órgão no miolo (não só na 1ª linha) — comum quando OCR mistura colunas
    if re.search(r"\bprefeitura\s+(municipal\s+)?de\s+inaja\b", full_norm):  # noqa: SIM102
        if not re.search(r"\bprefeitura\s+(municipal\s+)?de\s+(?!inaja)\w+", full_norm[:200]):
            return "Prefeitura Municipal de Inajá"
    if re.search(r"\bmunicipio\s+de\s+inaja\b", full_norm):
        return "Município de Inajá"
    # Conselho Municipal de Saúde de Inajá — exige "inaja" no texto para confirmar
    if re.match(r"^conselho municipal de saude\b", inicio_norm):  # noqa: SIM102
        if "inaja" in _sem_acentos(texto).casefold():
            return "Conselho Municipal de Saúde de Inajá"
    # Fundo Municipal (saúde, assistência, etc.) — exige "inaja" no texto
    if re.match(r"^fundo municipal\b", inicio_norm):  # noqa: SIM102
        if "inaja" in _sem_acentos(texto).casefold():
            return "Fundo Municipal de Inajá"
    # Outros órgãos colegiados (CMAS, CMDCA, etc.) — exige "inaja" no texto
    if re.match(r"^(conselho municipal|comite municipal|comissao municipal)\b", inicio_norm):
        texto_norm_full = _sem_acentos(texto).casefold()
        if "inaja" in texto_norm_full:
            return "Conselho Municipal de Inajá"
    # Fallback por CNPJ: o CNPJ 76.970.318 aparece em documentos tanto da
    # Prefeitura quanto da Câmara, então só atribuir à Câmara se houver
    # menção explícita a "câmara" no texto. Caso contrário, é neutro
    # (Prefeitura/Município).
    texto_norm = _sem_acentos(texto).casefold()
    tem_camara = "camara municipal" in texto_norm or "camara de inaja" in texto_norm
    if "75.771.400/0001-48" in texto:
        return "Prefeitura Municipal de Inajá"
    if "76.970.318/0001" in texto:
        if tem_camara:
            return "Câmara Municipal de Inajá"
        return "Município de Inajá"
    return None


def _extrair_tipo_numero(texto: str) -> tuple[str | None, str | None]:
    texto = _normalizar_ocr_para_extracao(texto)
    linhas = [_limpar(linha) for linha in texto.splitlines() if _limpar(linha)]
    # Também varre as 3 primeiras linhas coladas (OCR quebra títulos)
    if linhas:
        linhas = linhas + [" ".join(linhas[:3])]
    for linha in linhas:
        tem_marcador_explicito = re.search(
            rf"(?:{_TIPOS_COMPOSTOS}|{_TIPOS_SIMPLES})\b\s*N[º°O.]?",
            linha,
            re.IGNORECASE,
        )
        if (
            REFERENCIA_LEGAL_RE.search(linha)
            and not LINHA_TITULO_ATO_RE.search(linha)
            and not tem_marcador_explicito
        ):
            continue
        if not LINHA_TITULO_ATO_RE.search(linha) and not tem_marcador_explicito:
            # Aceita tipo composto no meio da linha (ex.: "QUINTO TERMO ADITIVO DE CONTRATO")
            if not TIPO_ATO_RE.search(linha):
                continue
            # exige indício de ato (Nº, ADITIVO, CONTRATO, DISPENSA…)
            if not re.search(
                r"N[º°O.]?|ADITIVO|CONTRATO|DISPENSA|HOMOLOG|EXTRATO|DECRETO|PORTARIA",
                linha,
                re.I,
            ):
                continue
        match = TIPO_ATO_RE.search(linha)
        if not match:
            continue
        tipo = match.group(1) or match.group(2)
        numero = match.group(3)
        if not tipo:
            continue
        tipo_limpo = _limpar(tipo)
        # Normaliza compostos longos
        tn = _sem_acentos(tipo_limpo).casefold()
        if "termo" in tn and "aditivo" in tn:
            tipo_limpo = "Termo Aditivo"
        elif "extrato" in tn and "contrato" in tn:
            tipo_limpo = "Extrato de Contrato"
        elif "dispensa" in tn:
            tipo_limpo = "Dispensa"
        elif "homolog" in tn:
            tipo_limpo = "Homologação/Adjudicação"
        elif "pregao" in tn:
            tipo_limpo = "Pregão"
        else:
            tipo_limpo = tipo_limpo.title()
        if numero and _numero_parece_documento_pessoal(numero, linha):
            numero = None
        if _sem_acentos(tipo_limpo).casefold() == "lei" and REFERENCIA_LEGAL_RE.search(linha):
            continue
        if _sem_acentos(tipo_limpo).casefold() == "lei" and not re.search(
            r"N[º°O.]?", linha, re.IGNORECASE
        ):
            continue
        if REFERENCIA_LEGAL_RE.search(linha) and not re.search(r"N[º°O.]?", linha, re.IGNORECASE):  # noqa: SIM102
            # linhas de fundamentação legal sem número de ato
            if "aditivo" not in tn and "extrato" not in tn and "dispensa" not in tn:
                continue
        return tipo_limpo, _normalizar_numero_ato(numero) if numero else None
    return None, None


def _numero_parece_documento_pessoal(numero: str, linha: str) -> bool:
    if CPF_RE.search(linha):
        return True
    numero_limpo = numero.strip()
    if re.search(r"N[º°O.]?\s*" + re.escape(numero_limpo), linha, re.IGNORECASE):
        return False
    if "." in numero_limpo and "/" not in numero_limpo:
        return True
    # Sequência longa só de dígitos (RG, processo OCR) sem ano
    if re.fullmatch(r"\d{7,}", numero_limpo):
        ano = numero_limpo[-4:]
        if not ano.startswith(("19", "20")):
            return True
    contexto = _sem_acentos(linha).casefold()
    return any(chave in contexto for chave in ("cpf", "rg", "cnpj"))


def _normalizar_numero_ato(numero: str) -> str:
    valor = numero.strip().strip(".,;:")
    if "/" in valor or "-" in valor or "." in valor:
        return valor
    # Nº típico de ato: 1–4 dígitos + ano (ex.: 0422026 → 042/2026)
    if len(valor) in {6, 7, 8} and valor.isdigit():
        ano = valor[-4:]
        if ano.startswith(("19", "20")):
            return f"{valor[:-4]}/{ano}"
        # 7–8 dígitos sem ano → lixo (ex.: 16132720) — não devolver
        return ""
    return valor


def _numero_ato_valido(numero: str | None) -> str | None:
    """Sanitiza número de ato; None se for lixo OCR/RG/processo."""
    if not numero or not str(numero).strip():
        return None
    n = str(numero).strip().strip(".,;:")
    if not n:
        return None
    # Só dígitos longos sem separador
    if re.fullmatch(r"\d{7,}", n):
        ano = n[-4:]
        if ano.startswith(("19", "20")) and 6 <= len(n) <= 8:
            return f"{n[:-4]}/{ano}"
        return None
    # Formato N/AAAA ou N-AAAA
    m = re.match(r"^(\d{1,6})\s*[/\-]\s*(\d{2,4})$", n)
    if m:
        seq, ano = m.group(1), m.group(2)
        if len(ano) == 2:
            ano = "20" + ano
        if not ano.startswith(("19", "20")):
            return None
        # Anos absurdos (ex. 2036 OCR de 2026 ainda aceita; >2100 não)
        try:
            if int(ano) > 2100 or int(ano) < 1990:
                return None
        except ValueError:
            return None
        return f"{seq}/{ano}"
    # Nº curto sem ano (ex.: Portaria 89)
    if re.fullmatch(r"\d{1,5}", n):
        return n
    # Alfanumérico curto residual
    if len(n) <= 12 and re.search(r"\d", n):
        return n
    return None


def _numero_ancorado_no_texto(numero: str, texto: str) -> bool:
    """Exige que o nº apareça com marcador N°/n. junto aos dígitos do ato."""
    if not numero or not texto:
        return False
    texto = _normalizar_ocr_para_extracao(texto)
    n = _numero_ato_valido(numero) or str(numero).strip()
    # Com ano: só aceita se N° + sequência/ano aparecerem juntos (sem match frouxo de dígitos)
    if "/" in n:
        a, b = n.split("/", 1)
        compacto = re.escape(a + b)
        pats = [
            rf"N[º°O.]?\s*{re.escape(n)}\b",
            rf"N[º°O.]?\s*{re.escape(a)}\s*[/\-.]\s*{re.escape(b)}\b",
            rf"N[º°O.]?\s*:\s*{compacto}\b",
            rf"n[uú]mero\s*[:\s]*{re.escape(n)}\b",
            rf"n[uú]mero\s*[:\s]*{re.escape(a)}\s*[/\-.]\s*{re.escape(b)}\b",
        ]
        return any(re.search(p, texto, re.IGNORECASE) for p in pats)
    # Sem ano (Portaria 89): exige N° + dígitos
    return bool(
        re.search(rf"N[º°O.]?\s*{re.escape(n)}\b", texto, re.IGNORECASE)
        or re.search(rf"n[uú]mero\s*[:\s]*{re.escape(n)}\b", texto, re.IGNORECASE)
    )


def _numero_confiavel(
    numero: str | None,
    *,
    trecho: str = "",
    resumo: str = "",
    texto_corrigido: str = "",
) -> str | None:
    """Número só se formato ok E ancorado no OCR/resumo com marcador N°."""
    n = _numero_ato_valido(numero)
    if not n:
        return None
    blob = "\n".join(x for x in (trecho or "", resumo or "", texto_corrigido or "") if x)
    if not blob.strip():
        return n  # sem texto para validar — mantém formato limpo
    if _numero_ancorado_no_texto(n, blob):
        return n
    return None


def _extrair_numero_preferencial(texto: str, tipo: str | None = None) -> str | None:
    """Extrai nº do trecho com padrões explícitos (preferível à alucinação da IA)."""
    if not texto:
        return None
    t = _normalizar_ocr_para_extracao(texto)
    tipo_n = _sem_acentos(tipo or "").casefold()
    padroes_contextuais = [
        r"N[º°O.]?\s*DA\s+LICITA[CÇ][AÃ]O\s*[:\-]?\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
        r"NR\.?\s*(?:DA\s+)?LICITA[CÇ][AÃ]O\s*[:\-]?\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
        r"NR\.?\s*[:\-]\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
        r"NR\.?\s*[:\-]?\s*(\d{6,8})\b",
        r"N[º°O.]?\s*:\s*(\d{6,8})\b",
    ]
    padroes = [
        r"EXTRATO\s+(?:DO\s+|DE\s+)?CONTRATO\s+N[º°O.]?\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
        r"CONTRATO\s+(?:ADMINISTRATIVO\s+)?N[º°O.]?\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
        r"TERMO\s+ADITIVO[^\n]{0,40}N[º°O.]?\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
        r"DECRETO\s+(?:MUNICIPAL\s+)?N[º°O.]?\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
        r"PORTARIA\s+N?[º°O.]?\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
        r"DISPENSA[^\n]{0,30}N[º°O.]?\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
        r"PREG[AÃ]O\s+ELETR[OÔ]NICO\s+N[º°O.]?\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
        # Homologação / adjudicação (OCR costuma omitir "Nº" ou quebrar o título)
        r"TERMO\s+DE\s+HOMOLOGA[CÇ][AÃ]O[^\n]{0,40}N[º°O.]?\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
        r"HOMOLOGA[CÇ][AÃ]O(?:\s+E\s+ADJUDICA[CÇ][AÃ]O)?[^\n]{0,40}N[º°O.]?\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
        r"ADJUDICA[CÇ][AÃ]O[^\n]{0,30}N[º°O.]?\s*(\d{1,6}\s*[/\-]\s*\d{2,4})",
    ]
    if any(chave in tipo_n for chave in ("dispensa", "inexig", "homolog", "adjudic")):
        padroes = padroes_contextuais + padroes
    # Prioriza padrões do tipo
    if "extrato" in tipo_n:
        padroes = padroes[0:2] + padroes[2:]
    elif "aditivo" in tipo_n:
        padroes = [padroes[2], padroes[1]] + padroes

    encontrados: list[str] = []
    vistos: set[str] = set()
    for pat in padroes:
        for m in re.finditer(pat, t, re.IGNORECASE):
            n = _numero_ato_valido(
                _normalizar_numero_ato(m.group(1).replace(" ", ""))
            )
            if n and n not in vistos:
                vistos.add(n)
                encontrados.append(n)
    # Completa com qualquer N° X/20XX (OCR lista vários no mesmo trecho)
    for m in re.finditer(r"N[º°O.]?\s*(\d{1,6}\s*[/\-]\s*20\d{2})\b", t, re.I):
        n = _numero_ato_valido(m.group(1).replace(" ", ""))
        if n and n not in vistos:
            vistos.add(n)
            encontrados.append(n)
    if not encontrados:
        return None

    def _score_ano(n: str) -> int:
        if "/" not in n:
            return 0
        try:
            return int(n.split("/")[1])
        except ValueError:
            return 0

    # Extrato: prefere o do padrão EXTRATO DO CONTRATO
    if "extrato" in tipo_n:
        for n in encontrados:
            if re.search(
                rf"EXTRATO\s+(?:DO\s+|DE\s+)?CONTRATO\s+N[º°O.]?\s*{re.escape(n.split('/')[0])}",
                t,
                re.I,
            ):
                return n
    # Vários N° no mesmo OCR (070/2023 e 02/2025): ano mais recente
    return max(encontrados, key=_score_ano)


def _numero_tipo_na_pagina(texto: str, tipo: str) -> str | None:
    """Número do cabeçalho do tipo, sem capturar datas ou outro formulário."""
    normalizado = _normalizar_ocr_para_extracao(texto)
    tipo_norm = _sem_acentos(tipo).casefold()
    if "inexig" in tipo_norm:
        titulo = r"INEXIGIBILIDADE(?:\s+DE)?\s+LICITA[CÇ][AÃ]O"
    elif "dispensa" in tipo_norm:
        titulo = r"DISPENSA(?:\s+DE)?\s+LICITA[CÇ][AÃ]O"
    elif "extrato" in tipo_norm:
        titulo = r"EXTRATO\s+(?:DO|DE)\s+CONTRATO"
    else:
        return _extrair_numero_preferencial(texto, tipo)
    padrao = re.compile(
        titulo
        + r"[\s\S]{0,220}?(?:N[ER]\.?|N[º°O.]?)\s*[:\-]?\s*"
        + r"(\d{1,6}\s*[/\-:]\s*\d{2,4}|\d{6,8})\b",
        re.IGNORECASE,
    )
    candidatos: list[tuple[int, str]] = []
    normalizado_sem_acentos = _sem_acentos(normalizado).casefold()
    for match in padrao.finditer(normalizado):
        numero_bruto = match.group(1).replace(" ", "").replace(":", "/")
        numero = _numero_ato_valido(_normalizar_numero_ato(numero_bruto))
        if not numero:
            continue
        antes = normalizado_sem_acentos[max(0, match.start() - 700) : match.start()]
        entorno = normalizado_sem_acentos[
            max(0, match.start() - 250) : min(len(normalizado), match.end() + 700)
        ]
        score = 0
        if "/" not in numero_bruto and "-" not in numero_bruto:
            score += 140
        if "termo de homologacao" in entorno:
            score += 100
        if "modalidade" in entorno:
            score += 70
        if "nr. processo" in entorno or "processo adm" in entorno:
            score += 35
        if "extrato do contrato" in antes or "decorrente da" in antes[-300:]:
            score -= 120
        candidatos.append((score, numero))
    if not candidatos:
        return None
    return max(candidatos, key=lambda item: item[0])[1]


def _ano_referencia_edicao(referencia: str | None) -> int | None:
    if not referencia:
        return None
    for padrao in (r"\b\d{2}-\d{2}-(\d{4})\b", r"\b(\d{4})-\d{2}-\d{2}\b"):
        match = re.search(padrao, referencia)
        if match:
            return int(match.group(1))
    return None


def _data_documento_plausivel(valor: str, referencia: str | None = None) -> bool:
    anos = re.findall(r"\b(19\d{2}|20\d{2})\b", valor)
    if not anos:
        return False
    ano = int(anos[-1])
    ano_ref = _ano_referencia_edicao(referencia) or date.today().year
    return ano_ref - 2 <= ano <= ano_ref + 1


def _extrair_data(texto: str, referencia: str | None = None) -> str | None:
    texto = _normalizar_ocr_para_extracao(texto)
    texto_sem_acentos = _sem_acentos(texto)
    for rotulo in (
        r"data\s+de\s+homologacao",
        r"data\s+de\s+assinatura(?:\s+do\s+contrato)?",
        r"data\s+do\s+processo",
    ):
        for marcador in re.finditer(rotulo, texto_sem_acentos, re.IGNORECASE):
            janela = texto[marcador.end() : marcador.end() + 80]
            for regex in (DATA_EXTENSO_RE, DATA_NUMERICA_RE):
                match = regex.search(janela)
                if match:
                    valor = _limpar(match.group(0))
                    if _data_documento_plausivel(valor, referencia):
                        return valor
    for regex in (DATA_EXTENSO_RE, DATA_NUMERICA_RE):
        for match in regex.finditer(texto):
            valor = _limpar(match.group(0))
            if _data_documento_plausivel(valor, referencia):
                return valor
    return None


def _extrair_assunto(texto: str) -> str | None:
    texto = _normalizar_ocr_para_extracao(texto)
    linhas = [_limpar(linha) for linha in texto.splitlines() if _limpar(linha)]
    for idx, linha in enumerate(linhas):
        if not LINHA_TITULO_ATO_RE.search(linha):
            continue
        match_mesma_linha = LINHA_ASSUNTO_RE.search(linha)
        if match_mesma_linha and match_mesma_linha.group(2).strip():
            return _limpar(
                f"{match_mesma_linha.group(1).title()}: {match_mesma_linha.group(2).strip()}"
            )[:300]
        proximas = linhas[idx + 1 : idx + 5]
        for candidata in proximas:
            match = LINHA_ASSUNTO_RE.search(candidata)
            if match and match.group(2).strip():
                return _limpar(f"{linha} - {match.group(2).strip()}")[:300]
        for candidata in proximas:
            if _parece_linha_de_rodape_ou_assinatura(candidata):
                continue
            if LINHA_TITULO_ATO_RE.search(candidata):
                continue
            return _limpar(candidata)[:300]
        return _limpar(linha)[:300]

    for linha in linhas:
        match = LINHA_ASSUNTO_RE.search(linha)
        if match and match.group(2).strip():
            return _limpar(f"{match.group(1).title()}: {match.group(2).strip()}")[:300]

    palavras_chave = [
        "abertura",
        "credito",
        "crédito",
        "licitacao",
        "licitação",
        "homologar",
        "adjudicar",
        "objeto",
        "contratação",
        "contratacao",
    ]
    for linha in linhas:
        linha_norm = _sem_acentos(linha).casefold()
        if any(_sem_acentos(palavra).casefold() in linha_norm for palavra in palavras_chave):
            return _limpar(linha)[:300]
    for linha in linhas:
        if _parece_linha_de_rodape_ou_assinatura(linha):
            continue
        return _limpar(linha)[:300]
    return None


def _parece_linha_de_rodape_ou_assinatura(linha: str) -> bool:
    inicio = _sem_acentos(_limpar(linha)[:160]).casefold()
    return bool(
        re.match(
            r"^(cep|e-mail|email|fone|telefone|gabinete do prefeito|joao eder|joão eder|assinado|prefeito municipal)\b",
            inicio,
        )
    )


def _parece_fragmento_continuacao(texto: str, tipo: str | None, orgao: str | None) -> bool:
    inicio = _sem_acentos(_limpar(texto)[:140]).casefold()
    if tipo or orgao:
        return False
    return bool(
        re.match(
            r"^(art\.?\s*\d+|paragrafo|inciso|gabinete do prefeito|joao eder|assinado)", inicio
        )
    )


def _tem_cabecalho_ato(texto: str) -> bool:
    return any(
        LINHA_TITULO_ATO_RE.search(_limpar(linha)) or LINHA_ASSUNTO_RE.search(_limpar(linha))
        for linha in texto.splitlines()
        if _limpar(linha)
    )


def _corrigir_ocr_basico(texto: str) -> str:
    substituicoes = {
        "www inaja.pr gov br": "www.inaja.pr.gov.br",
        "TPCA/IBGE": "IPCA/IBGE",
        "Art,": "Art.",
        "virgnta": "vírgula",
        "deforma ligital": "de forma digital",
        "Agsirado": "Assinado",
        "Municipio de Inajá": "Município de Inajá",
        "Prefeito Mui ral": "Prefeito Municipal",
        "servidores públicas": "servidores públicos",
        "Município do Inajá": "Município de Inajá",
        "LEINº": "LEI Nº",
        "INAVÁ": "Inajá",
        "INAVA": "Inajá",
    }
    corrigido = _normalizar_ocr_para_extracao(texto)
    for errado, certo in substituicoes.items():
        corrigido = corrigido.replace(errado, certo)
    corrigido = re.sub(
        r"prefeitura[gq@d]inaja\.?\s*pr\.?\s*gov\.?\s*br",
        "prefeitura@inaja.pr.gov.br",
        corrigido,
        flags=re.IGNORECASE,
    )
    corrigido = re.sub(
        r"prefeituraminaia\.?\s*pr\.?\s*gov\.?\s*br",
        "prefeitura@inaja.pr.gov.br",
        corrigido,
        flags=re.IGNORECASE,
    )
    return _limpar(corrigido)


def _resumir_assunto(texto: str | None) -> str | None:
    if not texto:
        return None
    assunto = _corrigir_ocr_basico(texto)
    assunto = re.split(
        r"\b(A CÂMARA MUNICIPAL|A CAMARA MUNICIPAL|Art\.?\s*\d+|RESOLVE)\b",
        assunto,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]
    return assunto.strip(" .,-")[:300] or None


def _extrair_valor(texto: str) -> str | None:
    rotulado = re.search(
        r"(?:total\s*(?:geral|genl)|total\s+do\s+partici\w*|"
        r"valor\s+(?:total|global|do\s+contrato))"
        r"[^\d]{0,25}(?:R\s*[$S]\s*)?"
        r"(\d{1,3}(?:\.\d{3})*,\d{2})",
        _sem_acentos(texto),
        re.IGNORECASE,
    )
    if rotulado:
        return _normalizar_valor("R$ " + rotulado.group(1))

    candidatos: list[tuple[int, float, str]] = []
    for match in VALOR_RE.finditer(texto):
        valor = _normalizar_valor(match.group(0))
        contexto = _sem_acentos(
            texto[max(0, match.start() - 100) : match.start()]
        ).casefold()
        score = 0
        if re.search(r"total\s+geral|valor\s+(?:total|global|do\s+contrato)", contexto):
            score += 120
        elif "total do participante" in contexto:
            score += 100
        elif re.search(r"\bvalor\s+(?:de|estimado)\b", contexto):
            score += 45
        if "saldo orcamentario" in contexto:
            score -= 100
        if "valor unitario" in contexto:
            score -= 80
        if "dotacao" in contexto or "recurso financeiro" in contexto:
            score -= 35
        candidatos.append((score, _valor_float(valor), valor))
    if not candidatos:
        return None
    # Mantém o comportamento anterior (maior valor) quando não há rótulo
    # semântico; quando há, proximidade ao rótulo vence.
    return max(candidatos, key=lambda item: (item[0], item[1]))[2]


def _normalizar_valor(valor: str) -> str:
    normalizado = re.sub(
        r"^R\s*[$S]\s*", "R$ ", valor.strip(), flags=re.IGNORECASE
    )
    return normalizado.strip(".,;:")


def _valor_float(valor: str) -> float:
    numeros = re.sub(r"[^\d,\.]", "", valor)
    if "," in numeros:
        numeros = numeros.replace(".", "").replace(",", ".")
    try:
        return float(numeros)
    except ValueError:
        return 0.0


def _mencao_generica_sem_palavra_isolada(texto: str, inicio: int, fim: int) -> bool:
    """Menção genérica 'inajá' colada a outras letras (ex: dentro de token/email corrompido)."""
    antes = texto[inicio - 1] if inicio > 0 else " "
    depois = texto[fim] if fim < len(texto) else " "
    return antes.isalpha() or depois.isalpha()


def _cnpj_digits(texto: str) -> str:
    return re.sub(r"\D", "", texto or "")


def _tem_cnpj_inaja(texto: str) -> bool:
    # Normaliza OCR antes de extrair dígitos
    texto_n = _normalizar_ocr_para_extracao(texto)
    digits = _cnpj_digits(texto_n)
    if any(p in digits for p in CNPJ_INAJA_PREFIXES):
        return True
    # Fallback: sequência completa ou raiz OCR (769703/0/000] S → 769703…)
    compact = re.sub(r"\D", "", texto or "")
    if "76970318" in compact or "75771400" in compact:
        return True
    # Raiz dos CNPJs oficiais (8 dígitos) — OCR costuma manter o início
    return "76970318"[:6] in compact or "75771400"[:6] in compact


def _mencao_orgao_municipio(texto_norm: str, municipio: str) -> bool:
    """Prefeitura/Câmara/Município/Prefeito de <município> no texto normalizado."""
    mun = re.escape(municipio)
    padroes = [
        rf"\bprefeitura(\s+municipal)?(\s+do)?(\s+municipio)?\s+(de\s+)?{mun}\b",
        rf"\bcamara(\s+municipal)?\s+(de\s+)?{mun}\b",
        rf"\bmunicipio\s+(de\s+)?{mun}\b",
        rf"\bprefeito(\s+municipal)?\s+(de\s+)?{mun}\b",
        rf"\bprefeita(\s+municipal)?\s+(de\s+)?{mun}\b",
    ]
    return any(re.search(p, texto_norm) for p in padroes)


def _orgao_de_outro_municipio(texto: str) -> bool:
    """Detecta publicação/órgão de município vizinho (hard-filter, sem IA).

    Regras:
    - Se há CNPJ oficial de Inajá e não há órgão de vizinho explícito → não descarta.
    - Se o trecho é claramente de Inajá (prefeitura/câmara/município de Inajá) → não descarta.
    - Se há prefeitura/câmara/prefeito de município vizinho → descarta.
    - Cabeçalho curto com prefeitura/câmara/município + nome de vizinho → descarta.
    """
    if not (texto or "").strip():
        return False
    full = _sem_acentos(_limpar(texto)).casefold()
    if not full:
        return False

    tem_inaja_orgao = bool(
        re.search(
            r"\b(prefeitura|camara|municipio|prefeito)(\s+\w+){0,4}\s+inaja\b",
            full[:500],
        )
        or "prefeitura municipal de inaja" in full[:400]
        or "camara municipal de inaja" in full[:400]
        or "municipio de inaja" in full[:400]
    )
    tem_cnpj_inaja = _tem_cnpj_inaja(texto)

    # Vizinho explícito como órgão emissor
    for mun in MUNICIPIOS_VIZINHOS:
        if _mencao_orgao_municipio(full[:600], mun):
            # Exceção: documento misto com CNPJ/órgão de Inajá dominante no início
            if tem_cnpj_inaja and tem_inaja_orgao and mun not in full[:120]:
                continue
            return True

    # Cabeçalho clássico: primeiros 140 chars com órgão + vizinho
    inicio = full[:140]
    if re.search(r"(prefeitura|camara|municipio)", inicio[:80]) and "inaja" not in inicio[:120]:  # noqa: SIM102
        if any(mun in inicio for mun in MUNICIPIOS_VIZINHOS):
            return True

    return False


def _publicacao_suspeita_outro_municipio(pub: dict) -> bool:
    """Pós-check: órgão extraído não é Inajá e texto aponta vizinho."""
    orgao = _sem_acentos(pub.get("orgao") or "").casefold()
    trecho = pub.get("trecho") or ""
    if orgao and "inaja" in orgao:
        return False
    if _tem_cnpj_inaja(trecho) and (not orgao or "inaja" in orgao):
        return False
    return _orgao_de_outro_municipio(trecho)


def _publicacao_do_segmento(
    segmento: TextBlock,
    termos: set[str],
    referencia_edicao: str | None = None,
) -> dict | None:
    categoria = _categoria(segmento.texto)
    if categoria == "patrocinador_distribuicao":
        return None
    if _orgao_de_outro_municipio(segmento.texto):
        return None

    orgao = _extrair_orgao(segmento.texto)
    tipo, numero = _extrair_tipo_numero(segmento.texto)
    texto_modalidade = _sem_acentos(segmento.texto).casefold()
    modalidade = re.search(
        r"\bmodalidade\s*[:\-]?\s*(dispensa|inexigibilidade|pregao)",
        texto_modalidade,
    )
    if modalidade:
        tipo = {
            "dispensa": "Dispensa",
            "inexigibilidade": "Inexigibilidade",
            "pregao": "Pregão",
        }[modalidade.group(1)]
    numero = _extrair_numero_preferencial(segmento.texto, tipo) or numero
    tipo_norm = _sem_acentos(tipo or "").casefold()
    if tipo_norm == "lei" and not re.search(
        r"(?im)^\s*LEI(?:\s+MUNICIPAL)?\s+N[º°O.]?\s*\d",
        segmento.texto,
    ):
        return None
    if tipo_norm == "termo" and not re.search(
        r"(?im)^\s*TERMO\s+N[º°O.]?\s*\d",
        segmento.texto,
    ):
        return None
    tem_cabecalho = _tem_cabecalho_ato(segmento.texto)

    # Se o segmento pertencer a Inajá (por órgão ou menção direta) e contiver palavras indicativas de relatório orçamentário/balanço
    texto_clean = _sem_acentos(segmento.texto).casefold()
    eh_lrf = any(
        t in texto_clean for t in ["relatorio", "demonstrativo", "balanco", "lrf", "rgf", "rreo"]
    )

    if not (orgao or termos):
        return None
    if _parece_fragmento_continuacao(segmento.texto, tipo, orgao):
        return None
    if categoria == "publicacao_oficial" and not (orgao or tipo or eh_lrf):
        return None
    # Com órgão Inajá + texto longo, aceita mesmo sem tipo OCR-limpo
    # (ex.: aditivo/corpo de contrato com OCR ruim)
    orgao_inaja = bool(orgao and "inaja" in _sem_acentos(orgao).casefold())
    if not orgao_inaja and tipo:
        pos_tipo = TIPO_ATO_RE.search(segmento.texto)
        pos_inaja = re.search(r"inaj[aá]", segmento.texto, re.IGNORECASE)
        if pos_tipo and pos_inaja and abs(pos_tipo.start() - pos_inaja.start()) > 650:
            return None
    texto_longo_util = len((segmento.texto or "").strip()) >= 400
    if orgao and not tipo and not LINHA_ASSUNTO_RE.search(segmento.texto) and not eh_lrf:  # noqa: SIM102
        if not (orgao_inaja and texto_longo_util and _tem_cnpj_inaja(segmento.texto)):
            assunto_tentativo = _extrair_assunto(segmento.texto)
            if not assunto_tentativo or _parece_linha_de_rodape_ou_assinatura(assunto_tentativo):
                return None
    if (
        categoria == "publicacao_oficial"
        and orgao
        and not (tipo or LINHA_ASSUNTO_RE.search(segmento.texto) or eh_lrf)
    ):
        if not (orgao_inaja and texto_longo_util):
            return None
        # Fallback de tipo genérico para não perder o ato
        if not tipo and orgao_inaja:  # noqa: SIM102
            if re.search(r"aditivo|contrato|clausula", texto_clean):
                tipo = "Termo Aditivo" if "aditivo" in texto_clean else "Contrato"
    if categoria == "materia_jornalistica" and not (orgao or tipo or tem_cabecalho or eh_lrf):
        return None
    if categoria == "materia_jornalistica" and (tipo or tem_cabecalho or eh_lrf):
        categoria = "publicacao_oficial"

    # Guarda final: não gerar publicação se tanto o órgão quanto o tipo forem
    # desconhecidos — seria apenas ruído (fragmento de cabeçalho ou rodapé).
    if orgao is None and tipo is None and not eh_lrf:
        return None

    # Guarda para fragmentos de cabeçalho puro: o segmento tem órgão mas não tem
    # tipo e o texto é curto demais para ser uma publicação real (só o nome do órgão
    # e/ou endereço, sem corpo de ato).
    if orgao and tipo is None and not eh_lrf:
        linhas_uteis = [linha for linha in segmento.texto.splitlines() if _limpar(linha)]
        if len(linhas_uteis) <= 3:
            # Texto muito curto (≤3 linhas) sem tipo identificado → cabeçalho isolado
            return None
        assunto_tentativo = _extrair_assunto(segmento.texto)
        if assunto_tentativo:
            orgao_norm = _sem_acentos(orgao).casefold()
            assunto_norm = _sem_acentos(assunto_tentativo).casefold()
            # Se o assunto for apenas variação do nome do órgão, é ruído
            if orgao_norm[:20] in assunto_norm or assunto_norm in orgao_norm:
                return None

    trecho = _corrigir_ocr_basico(segmento.texto)
    assunto = _resumir_assunto(_extrair_assunto(segmento.texto))

    return {
        "pagina": segmento.pagina,
        "bloco": segmento.bloco,
        "categoria": categoria,
        "orgao": orgao,
        "tipo": normalizar_tipo_ato(tipo),
        "numero": _numero_ato_valido(numero),
        "data_documento": _extrair_data(segmento.texto, referencia_edicao),
        "assunto": assunto,
        "valor": _extrair_valor(segmento.texto),
        "trecho": trecho[:2000],
    }


def _pagina_ocr_fraco(pagina: PageText) -> bool:
    """Heurística: página com pouco texto ou extraída só via OCR visual."""
    texto = (pagina.texto or "").strip()
    metodo = (pagina.metodo or "").casefold()
    if len(texto) < SETTINGS.min_text_chars_per_page:
        return True
    return bool("ocr" in metodo and "pdfplumber" not in metodo)


_RE_CABECALHO_INAJA_TEXTO = re.compile(
    r"(?i)(?:"
    r"prefeitura\s+municipal\s+de\s+inaj[aá]|"
    r"prefeitura\s+de\s+inaj[aá]|"
    r"c[aâ]mara\s+municipal\s+de\s+inaj[aá]|"
    r"munic[ií]pio\s+de\s+inaj[aá]|"
    r"prefeitura\s+municipal\s+de\s+in\b|"
    r"munic[ií]pio\s+de\s+in\b"
    r")"
)


def _segmentos_fallback_texto(pagina: PageText) -> list[TextBlock]:
    """Recupera atos no texto integral da página (quando blocks/colunas falham).

    Corta janelas a partir de cabeçalhos de Inajá e títulos de ato próximos.
    """
    bruto = pagina.texto or ""
    if len(bruto.strip()) < 100:
        return []
    texto = _normalizar_ocr_para_extracao(bruto)
    n = _sem_acentos(texto).casefold()
    if "inaja" not in n and not _tem_cnpj_inaja(texto):
        return []

    starts: list[int] = []
    for m in _RE_CABECALHO_INAJA_TEXTO.finditer(texto):
        starts.append(m.start())

    # Títulos de ato (DECRETO Nº …) com Inajá/CNPJ na vizinhança
    for m in TIPO_ATO_RE.finditer(texto):
        ini = max(0, m.start() - 450)
        fim = min(len(texto), m.end() + 500)
        janela = texto[ini:fim]
        jn = _sem_acentos(janela).casefold()
        if "inaja" in jn or _tem_cnpj_inaja(janela):
            # recua ao início de linha se possível
            line_start = texto.rfind("\n", 0, m.start()) + 1
            starts.append(max(0, line_start))

    if not starts:
        # Página com menção + sinais oficiais: 1 janela ampla
        if any(s in n for s in SINAIS_OFICIAIS):
            return [
                TextBlock(
                    pagina=pagina.pagina,
                    bloco=9000,
                    texto=texto[:4000],
                )
            ]
        return []

    starts = sorted(set(starts))
    filtrados: list[int] = []
    ultimo = -9999
    for s in starts:
        if s - ultimo >= 100:
            filtrados.append(s)
            ultimo = s

    out: list[TextBlock] = []
    for i, s in enumerate(filtrados):
        fim = filtrados[i + 1] if i + 1 < len(filtrados) else min(len(texto), s + 2200)
        # janela mínima útil
        if fim - s < 60:
            fim = min(len(texto), s + 800)
        pedaco = texto[s:fim].strip()
        if len(pedaco) < 50:
            continue
        # exige indício de ato ou órgão Inajá
        pn = _sem_acentos(pedaco).casefold()
        if "inaja" not in pn and not _tem_cnpj_inaja(pedaco):
            continue
        out.append(
            TextBlock(
                pagina=pagina.pagina,
                bloco=9100 + i,
                texto=pedaco[:3500],
            )
        )
    return out


def _tipo_familia_dedup(tipo: str | None) -> str:
    t = _sem_acentos(str(tipo or "")).casefold()
    if not t:
        return "sem_tipo"
    if "extrato" in t and "contrato" in t:
        return "extrato_contrato"
    if "extrato" in t and "rescis" in t:
        return "extrato_rescisao"
    if "termo" in t and "aditivo" in t:
        return "termo_aditivo"
    if "homolog" in t or "adjudic" in t:
        return "homologacao"
    if "dispensa" in t:
        return "dispensa"
    if "contrato" in t:
        return "contrato"
    if "portaria" in t:
        return "portaria"
    if "decreto" in t:
        return "decreto"
    if "edital" in t:
        return "edital"
    if t.startswith("lei"):
        return "lei"
    return t[:40]


def _orgao_familia_dedup(orgao: str | None) -> str:
    """Agrupa Prefeitura e Município (mesmo ente) vs Câmara."""
    o = _sem_acentos(str(orgao or "")).casefold()
    if "camara" in o:
        return "camara"
    if "prefeitura" in o or "municipio" in o:
        return "executivo"
    if "conselho" in o:
        return "conselho"
    if "fundo" in o:
        return "fundo"
    return o[:30] or "sem_orgao"


def _assinatura_conteudo_ato(pub: dict) -> str:
    """Assinatura semântica para fundir fragmentos (aditivo cabeçalho+corpo)."""
    blob = _sem_acentos(
        " ".join(
            str(pub.get(k) or "") for k in ("tipo", "assunto", "resumo_ia", "trecho", "partes_ia")
        )
    ).casefold()
    blob = re.sub(r"\s+", " ", blob)
    tokens = set(re.findall(r"[a-z0-9]{4,}", blob))
    # Tokens fortes de identidade do ato
    chaves = []
    for kw in (
        "lourdes",
        "elias",
        "fernandes",
        "combust",
        "litro",
        "aditivo",
        "quinto",
        "elite",
        "veiculo",
        "picape",
        "pickup",
        "pregao",
        "homolog",
    ):
        if any(kw in t for t in tokens) or kw in blob:
            chaves.append(kw)
    # Quantidades típicas
    for m in re.finditer(r"\b(25\.?000|104\.?000|255\.?800)\b", blob):
        chaves.append(m.group(1).replace(".", ""))
    return "|".join(sorted(set(chaves))[:8])


def _chave_pub_dedup(pub: dict) -> str:
    """Chave para evitar duplicar o mesmo ato (blocks + fallback + órgãos sinônimos)."""
    tipo = _tipo_familia_dedup(pub.get("tipo"))
    num = _numero_ato_valido(pub.get("numero")) or ""
    num = num.casefold()
    fam = _orgao_familia_dedup(pub.get("orgao"))
    pag = pub.get("pagina")
    if num:
        # Depois do filtro municipal, página + família do tipo + número
        # identificam o ato. O órgão pode faltar em um fragmento de OCR.
        return f"{pag}|{tipo}|{num}"
    # Sem número: mesma página + tipo + assinatura de conteúdo (funde aditivo partido)
    sig = _assinatura_conteudo_ato(pub)
    if sig and tipo in {"termo_aditivo", "contrato", "extrato_contrato", "dispensa"}:
        return f"{pag}|{tipo}|{fam}|sig:{sig}"
    trecho = _sem_acentos(str(pub.get("trecho") or "")[:200]).casefold()
    trecho = re.sub(r"\s+", " ", trecho)
    return f"{pag}|{tipo}|{fam}|{trecho[40:120] if len(trecho) > 80 else trecho[:80]}"


def _fundir_fragmentos_mesmo_ato(publicacoes: list[dict]) -> list[dict]:
    """Funde cabeçalho+corpo do mesmo aditivo/contrato na mesma página."""
    if len(publicacoes) < 2:
        return publicacoes

    def _grupo_tipo(tipo: str | None) -> str:
        t = _tipo_familia_dedup(tipo)
        # Aditivo e "Contrato" fragmentado contam como mesma família contratual
        if t in {"termo_aditivo", "contrato"}:
            return "contrato_aditivo"
        return t

    # Agrupa por página + família ampla + órgão
    grupos: dict[tuple, list[dict]] = {}
    sozinhos: list[dict] = []
    for pub in publicacoes:
        gtipo = _grupo_tipo(pub.get("tipo"))
        if gtipo not in {
            "contrato_aditivo",
            "extrato_contrato",
            "dispensa",
            "homologacao",
        }:
            sozinhos.append(pub)
            continue
        key = (
            pub.get("pagina"),
            gtipo,
            _orgao_familia_dedup(pub.get("orgao")),
            _numero_ato_valido(pub.get("numero")) or "sem_numero",
        )
        grupos.setdefault(key, []).append(pub)

    out: list[dict] = list(sozinhos)
    for _key, itens in grupos.items():
        if len(itens) == 1:
            out.append(itens[0])
            continue
        # Se compartilham assinatura ou um é trecho curto de cabeçalho
        sigs = [_assinatura_conteudo_ato(p) for p in itens]
        sets = [set(s.split("|")) - {""} for s in sigs if s]
        inter: set[str] = set.intersection(*sets) if len(sets) >= 2 else set()
        trechos_curtos = sum(1 for p in itens if len(p.get("trecho") or "") < 400)
        # Também funde se só um tem número confiável e compartilham "aditivo"/"lourdes"
        if (
            inter
            or trechos_curtos >= 1
            or (
                len(sets) >= 2
                and any(
                    len(s & {"aditivo", "lourdes", "elias", "combust", "litro"}) >= 1 for s in sets
                )
            )
        ):
            itens_ord = sorted(itens, key=_score_qualidade_pub, reverse=True)
            base = dict(itens_ord[0])
            # Preferir tipo "Termo Aditivo" se algum for aditivo
            for p in itens_ord:
                if "aditivo" in _sem_acentos(str(p.get("tipo") or "")).casefold():
                    base["tipo"] = p.get("tipo")
                    break
            for outro in itens_ord[1:]:
                for k in (
                    "numero",
                    "valor",
                    "resumo_ia",
                    "assunto",
                    "data_documento",
                    "texto_corrigido",
                    "partes_ia",
                    "temas",
                    "explicacao_ia",
                ):
                    if not base.get(k) and outro.get(k):
                        base[k] = outro[k]
                if len(outro.get("trecho") or "") > len(base.get("trecho") or ""):
                    base["trecho"] = outro["trecho"]
                o1 = _sem_acentos(base.get("orgao") or "").casefold()
                o2 = _sem_acentos(outro.get("orgao") or "").casefold()
                if "prefeitura" in o2 and "prefeitura" not in o1:
                    base["orgao"] = outro.get("orgao")
            rs = [
                (p.get("resumo_ia") or "").strip()
                for p in itens_ord
                if (p.get("resumo_ia") or "").strip()
            ]
            if len(rs) >= 2 and rs[0] != rs[1]:
                base["resumo_ia"] = rs[0]
                if rs[1][:80] not in rs[0]:
                    base["resumo_ia"] = (rs[0] + " " + rs[1]).strip()[:800]
            # Nº: preferir o ancorado no trecho fundido
            base["numero"] = _numero_confiavel(
                base.get("numero"),
                trecho=base.get("trecho") or "",
                resumo=base.get("resumo_ia") or "",
                texto_corrigido=base.get("texto_corrigido") or "",
            ) or _extrair_numero_preferencial(
                (base.get("trecho") or "") + "\n" + (base.get("resumo_ia") or ""),
                base.get("tipo"),
            )
            out.append(base)
        else:
            out.extend(itens)
    return out


def _score_qualidade_pub(pub: dict) -> float:
    """Preferência ao fundir duplicatas (maior vence)."""
    s = 0.0
    if pub.get("resumo_ia"):
        s += 12
    if pub.get("valor"):
        s += 5
    if pub.get("assunto"):
        s += 2
    if pub.get("importancia"):
        with contextlib.suppress(TypeError, ValueError):
            s += min(5, int(pub["importancia"]))
    orgao = _sem_acentos(str(pub.get("orgao") or "")).casefold()
    if "prefeitura" in orgao:
        s += 4
    elif "municipio" in orgao:
        s += 2
    elif "camara" in orgao:
        s += 3
    num = str(pub.get("numero") or "")
    if num and "/" in num:
        s += 3
    elif num:
        s += 1
    s += min(len(pub.get("trecho") or ""), 800) / 200.0
    if pub.get("ia_processado") or pub.get("texto_corrigido"):
        s += 2
    return s


def _deduplicar_publicacoes(publicacoes: list[dict]) -> list[dict]:
    """Colapsa duplicatas (ex.: Extrato 04/2026 Prefeitura + Município)."""
    preparadas = [dict(pub) for pub in publicacoes if pub]
    familias_por_pagina = {
        pub.get("pagina")
        for pub in preparadas
        if _tipo_familia_dedup(pub.get("tipo")) in {"dispensa", "inexigibilidade"}
    }
    preparadas = [
        pub
        for pub in preparadas
        if not (
            pub.get("pagina") in familias_por_pagina
            and _tipo_familia_dedup(pub.get("tipo")) == "homologacao"
            and not _numero_ato_valido(pub.get("numero"))
        )
    ]
    paginas_com_contrato = {
        pub.get("pagina")
        for pub in preparadas
        if _tipo_familia_dedup(pub.get("tipo")) in {"contrato", "extrato_contrato"}
    }
    preparadas = [
        pub
        for pub in preparadas
        if not (
            pub.get("pagina") in paginas_com_contrato
            and _tipo_familia_dedup(pub.get("tipo")) in {"inexigibilidade", "dispensa"}
            and re.search(
                r"deste\s+contrato|data\s+de\s+assinatura\s+do\s+contrato|"
                r"termo\s+de\s+refer",
                _sem_acentos(pub.get("trecho") or ""),
                re.IGNORECASE,
            )
            and not re.search(
                r"nr\.?\s+(?:da\s+)?licitacao|modalidade\s*:|"
                r"termo\s+de\s+homologacao",
                _sem_acentos(pub.get("trecho") or ""),
                re.IGNORECASE,
            )
        )
    ]
    # Fallbacks de texto integral frequentemente recuperam o corpo sem repetir
    # o número do cabeçalho. Se existe exatamente um ato numerado compatível na
    # página, herda esse número antes de calcular a chave de deduplicação.
    for pub in preparadas:
        if _numero_ato_valido(pub.get("numero")):
            continue
        tipo = _tipo_familia_dedup(pub.get("tipo"))
        pagina = pub.get("pagina")
        numeros = {
            _numero_ato_valido(outro.get("numero"))
            for outro in preparadas
            if outro is not pub
            and outro.get("pagina") == pagina
            and _tipo_familia_dedup(outro.get("tipo")) == tipo
            and _numero_ato_valido(outro.get("numero"))
        }
        if len(numeros) == 1:
            pub["numero"] = numeros.pop()

    # Formulários de licitação costumam trazer "Termo de Homologação" no
    # próprio corpo. Se página+número já representam uma Dispensa ou
    # Inexigibilidade, isso é uma etapa do mesmo ato, não uma quarta publicação.
    homologacoes_embutidas: set[int] = set()
    for homologacao in preparadas:
        if _tipo_familia_dedup(homologacao.get("tipo")) != "homologacao":
            continue
        numero = _numero_ato_valido(homologacao.get("numero"))
        if not numero:
            continue
        alvo = next(
            (
                pub
                for pub in preparadas
                if pub is not homologacao
                and pub.get("pagina") == homologacao.get("pagina")
                and _numero_ato_valido(pub.get("numero")) == numero
                and _tipo_familia_dedup(pub.get("tipo"))
                in {"dispensa", "inexigibilidade"}
            ),
            None,
        )
        if alvo is None:
            continue
        for campo in ("valor", "data_documento", "assunto", "resumo_ia"):
            if not alvo.get(campo) and homologacao.get(campo):
                alvo[campo] = homologacao[campo]
        homologacoes_embutidas.add(id(homologacao))
    preparadas = [
        pub for pub in preparadas if id(pub) not in homologacoes_embutidas
    ]

    melhores: dict[str, dict] = {}
    ordem: list[str] = []
    for pub in preparadas:
        # Sanitiza número antes da chave
        num_ok = _numero_ato_valido(pub.get("numero"))
        if pub.get("numero") and not num_ok:
            pub = dict(pub)
            pub["numero"] = None
        elif num_ok:
            pub = dict(pub)
            pub["numero"] = num_ok
        chave = _chave_pub_dedup(pub)
        if chave not in melhores:
            melhores[chave] = pub
            ordem.append(chave)
            continue
        atual = melhores[chave]
        if _score_qualidade_pub(pub) > _score_qualidade_pub(atual):
            # Herda campos úteis do perdedor
            merged = dict(pub)
            for k in ("valor", "resumo_ia", "assunto", "data_documento", "explicacao_ia"):
                if not merged.get(k) and atual.get(k):
                    merged[k] = atual[k]
            if not merged.get("numero") and atual.get("numero"):
                merged["numero"] = atual.get("numero")
            melhores[chave] = merged
        else:
            # Completa o vencedor com campos do novo se faltar
            for k in ("valor", "resumo_ia", "assunto", "data_documento"):
                if not atual.get(k) and pub.get(k):
                    atual[k] = pub[k]
    return [melhores[k] for k in ordem]


def detectar(
    edicao_id: int,
    edicao_titulo: str,
    paginas: list[PageText],
) -> DetectionResult:
    """Analisa páginas extraídas e detecta menções + publicações oficiais de Inajá.

    Retorna trechos encontrados, menções para DB e publicações estruturadas
    (que podem ser refinadas pela IA posteriormente).
    """
    trechos: list[dict] = []
    termos_encontrados: set[str] = set()
    paginas_com_mencao: set[int] = set()
    mencoes_db: list[dict] = []
    publicacoes: list[dict] = []
    descartes_vizinho = 0
    vistos_pub: set[str] = set()
    numeros_pagina: dict[tuple[int, str], str] = {}
    campos_pagina: dict[tuple[int, str], dict[str, str | None]] = {}
    textos_pagina = {pagina.pagina: pagina.texto for pagina in paginas}

    termos = _termos()
    for pagina in paginas:
        for tipo_hint in ("Dispensa", "Inexigibilidade", "Extrato de Contrato"):
            numero_hint = None
            for bloco_hint in pagina.blocks or []:
                bloco_norm = _sem_acentos(bloco_hint.texto).casefold()
                if "inaja" not in bloco_norm and not _tem_cnpj_inaja(
                    bloco_hint.texto
                ):
                    continue
                numero_hint = _numero_tipo_na_pagina(
                    bloco_hint.texto, tipo_hint
                )
                if numero_hint:
                    texto_campos = bloco_hint.texto
                    for pedaco_hint in _dividir_segmento_multi_atos(
                        bloco_hint
                    ):
                        pedaco_norm = _sem_acentos(
                            pedaco_hint.texto
                        ).casefold()
                        familia_hint = _tipo_familia_dedup(tipo_hint)
                        numero_no_pedaco = _numero_tipo_na_pagina(
                            pedaco_hint.texto, tipo_hint
                        )
                        formulario_modalidade = (
                            familia_hint in {"inexigibilidade", "dispensa"}
                            and "modalida" in pedaco_norm
                            and familia_hint in pedaco_norm
                            and "extrato do contrato" not in pedaco_norm[:300]
                        )
                        if numero_no_pedaco == numero_hint or formulario_modalidade:
                            texto_campos = pedaco_hint.texto
                            break
                    chave_hint = (
                        pagina.pagina,
                        _tipo_familia_dedup(tipo_hint),
                    )
                    campos_pagina[chave_hint] = {
                        "data_documento": _extrair_data(
                            texto_campos, edicao_titulo
                        ),
                        "valor": _extrair_valor(texto_campos),
                    }
                    break
            if not numero_hint:
                numero_hint = _numero_tipo_na_pagina(
                    pagina.texto, tipo_hint
                )
            if numero_hint:
                numeros_pagina[(pagina.pagina, _tipo_familia_dedup(tipo_hint))] = numero_hint
        # Blocos estruturados + fallback por texto integral (recupera FN)
        segmentos = list(_segmentos(pagina))
        existentes = {_sem_acentos((s.texto or "")[:120]).casefold() for s in segmentos}
        for fb in _segmentos_fallback_texto(pagina):
            chave = _sem_acentos((fb.texto or "")[:120]).casefold()
            if chave and chave not in existentes:
                segmentos.append(fb)
                existentes.add(chave)

        for segmento in segmentos:
            # Normaliza OCR antes de buscar termos (INAVÁ, CNPJ, etc.)
            texto = _normalizar_ocr_para_extracao(segmento.texto or "")
            # Mantém bbox/bloco; troca só o texto normalizado no segmento lógico
            if texto != (segmento.texto or ""):
                segmento = TextBlock(
                    pagina=segmento.pagina,
                    bloco=segmento.bloco,
                    texto=texto,
                    bbox=segmento.bbox,
                )
            texto_norm = _sem_acentos(texto).casefold()
            termos_segmento: set[str] = set()
            # Evita buscar o mesmo norm 2x (Inajá/Inaja já colapsados em _termos)
            for termo in termos:
                termo_norm = _sem_acentos(termo).casefold()
                if termo_norm in {"inava", "inavá"}:
                    termo_norm = "inaja"
                    termo = "Inajá"
                start = 0
                while termo_norm and (idx := texto_norm.find(termo_norm, start)) != -1:
                    fim = idx + len(termo_norm)
                    if termo_norm in GENERIC_TERMS and (
                        _contexto_ignorado_para_mencao_generica(texto, idx, fim)
                        or _mencao_generica_sem_palavra_isolada(texto, idx, fim)
                        or _contexto_marca_comercial(texto, idx, fim)
                    ):
                        start = fim
                        continue
                    trecho = _snippet(texto, idx, fim)
                    paginas_com_mencao.add(pagina.pagina)
                    termos_encontrados.add(termo)
                    termos_segmento.add(termo)
                    trechos.append(
                        {
                            "pagina": pagina.pagina,
                            "bloco": segmento.bloco,
                            "trecho": trecho,
                        }
                    )
                    mencoes_db.append({"pagina": pagina.pagina, "trecho": trecho, "termo": termo})
                    start = fim

            for match in CEP_RE.finditer(texto):
                cep = match.group(0).replace(".", "")
                if not _cep_de_inaja(cep):
                    continue
                if _contexto_ignorado_para_mencao_generica(texto, match.start(), match.end()):
                    continue
                trecho = _snippet(texto, match.start(), match.end())
                paginas_com_mencao.add(pagina.pagina)
                termos_encontrados.add(f"CEP {cep}")
                termos_segmento.add(f"CEP {cep}")
                trechos.append(
                    {
                        "pagina": pagina.pagina,
                        "bloco": segmento.bloco,
                        "trecho": trecho,
                    }
                )
                mencoes_db.append(
                    {"pagina": pagina.pagina, "trecho": trecho, "termo": f"CEP {cep}"}
                )

            if _orgao_de_outro_municipio(segmento.texto):
                # Conta só se o segmento teria sido candidato de publicação oficial
                if _categoria(segmento.texto) == "publicacao_oficial" or termos_segmento:
                    descartes_vizinho += 1
                continue

            publicacao = _publicacao_do_segmento(
                segmento, termos_segmento, edicao_titulo
            )
            if publicacao:
                if _publicacao_suspeita_outro_municipio(publicacao):
                    descartes_vizinho += 1
                    continue
                # Sanitiza número lixo logo na extração
                publicacao["numero"] = _numero_ato_valido(publicacao.get("numero"))
                chave = _chave_pub_dedup(publicacao)
                if chave in vistos_pub:
                    continue
                vistos_pub.add(chave)
                publicacoes.append(publicacao)

    for publicacao in publicacoes:
        numero_atual = _numero_ato_valido(publicacao.get("numero"))
        familia = _tipo_familia_dedup(publicacao.get("tipo"))
        hint = numeros_pagina.get(
            (
                int(publicacao.get("pagina") or 0),
                familia,
            )
        )
        referencia_embutida = False
        if numero_atual and hint and numero_atual != hint and familia in {
            "inexigibilidade",
            "dispensa",
        }:
            pagina_texto = _sem_acentos(
                textos_pagina.get(int(publicacao.get("pagina") or 0), "")
            )
            seq, ano = (
                numero_atual.split("/", 1)
                if "/" in numero_atual
                else (numero_atual, "")
            )
            referencia_embutida = bool(
                re.search(
                    r"extrato\s+(?:do|de)\s+contrato[\s\S]{0,3000}"
                    + re.escape(familia)
                    + r"[\s\S]{0,100}N[º°O.]?\s*"
                    + re.escape(seq)
                    + (rf"\s*/\s*{re.escape(ano)}" if ano else ""),
                    pagina_texto,
                    re.IGNORECASE,
                )
            )
        if hint and (
            not numero_atual
            or referencia_embutida
            or familia in {"inexigibilidade", "dispensa"}
        ):
            publicacao["numero"] = hint
        campos_hint = campos_pagina.get(
            (int(publicacao.get("pagina") or 0), familia), {}
        )
        for campo in ("data_documento", "valor"):
            if not publicacao.get(campo) and campos_hint.get(campo):
                publicacao[campo] = campos_hint[campo]

    # Menções: colapsa Inajá+Prefeitura no mesmo trecho; remove INAVÁ duplicado
    mencoes_db = _deduplicar_mencoes(mencoes_db)
    # Trechos de UI/notificação alinhados às menções únicas
    trechos = [
        {
            "pagina": m["pagina"],
            "bloco": 0,
            "trecho": m["trecho"],
        }
        for m in mencoes_db
    ]
    termos_encontrados = {m["termo"] for m in mencoes_db}
    if mencoes_db:
        paginas_com_mencao = {int(m["pagina"]) for m in mencoes_db if m.get("pagina")}

    publicacoes_brutas = len(publicacoes)
    # Hard-filter + dedup (Prefeitura≡Município no mesmo nº/tipo)
    filtradas: list[dict] = []
    for pub in publicacoes:
        if _publicacao_suspeita_outro_municipio(pub) or _orgao_de_outro_municipio(
            pub.get("trecho") or ""
        ):
            descartes_vizinho += 1
            continue
        filtradas.append(pub)
    publicacoes = _fundir_fragmentos_mesmo_ato(filtradas)
    publicacoes = _deduplicar_publicacoes(publicacoes)
    descartes_ia = 0
    if publicacoes:
        logger.info("Chamando IA para refinar %s publicacoes...", len(publicacoes))
        publicacoes, stats_ia = refinar_publicacoes(publicacoes)
        descartes_ia = int(stats_ia.get("descartes_ia", 0))
        descartes_vizinho += int(stats_ia.get("descartes_vizinho", 0))
        # Pós-IA: limpa nº inventados e colapsa duplicatas restantes
        for p in publicacoes:
            p["numero"] = _numero_ato_valido(p.get("numero"))
        publicacoes = _fundir_fragmentos_mesmo_ato(publicacoes)
        publicacoes = _deduplicar_publicacoes(publicacoes)
        logger.info(
            "IA concluida. Publicacoes refinadas: %s (após dedup)",
            sum(1 for p in publicacoes if p.get("resumo_ia")),
        )
    elif (
        getattr(SETTINGS, "ai_fn_recuperacao", True)
        and getattr(SETTINGS, "ai_refine_publications", True)
    ):
        # Recuperação de falso negativo: a heurística pode perder uma publicação
        # por erro de OCR ou por um layout jornalístico diferente. A IA analisa
        # somente páginas que têm nome/CNPJ/CEP de Inajá e ainda pode descartá-las
        # como simples menção, anúncio ou município vizinho.
        candidatos_ia = _candidatos_recuperacao_ia(paginas)
        if candidatos_ia:
            logger.info(
                "Nenhuma publicação heurística; iniciando recuperação IA em %s trecho(s)",
                len(candidatos_ia),
            )
            recuperadas, stats_ia = refinar_publicacoes(candidatos_ia)
            descartes_ia = int(stats_ia.get("descartes_ia", 0))
            descartes_vizinho += int(stats_ia.get("descartes_vizinho", 0))
            # Falha/timeout da IA não pode criar um ato. Só entram respostas que
            # passaram pela extração completa e têm resumo estruturado.
            publicacoes = [
                pub for pub in recuperadas if pub.get("resumo_ia") and pub.get("categoria_ia")
            ]
            publicacoes = _fundir_fragmentos_mesmo_ato(publicacoes)
            publicacoes = _deduplicar_publicacoes(publicacoes)
            logger.info(
                "Recuperação IA concluída: %s publicação(ões) mantida(s), %s descartada(s)",
                len(publicacoes),
                descartes_ia,
            )

    metricas = DetectionMetrics(
        publicacoes_brutas=publicacoes_brutas,
        publicacoes_finais=len(publicacoes),
        descartes_ia=descartes_ia,
        descartes_vizinho=descartes_vizinho,
        paginas_total=len(paginas),
        paginas_ocr_fraco=sum(1 for p in paginas if _pagina_ocr_fraco(p)),
        mencoes=len(mencoes_db),
    )

    return DetectionResult(
        encontrado=bool(trechos or publicacoes),
        edicao_id=edicao_id,
        edicao_titulo=edicao_titulo,
        paginas_com_mencao=sorted(paginas_com_mencao),
        trechos=trechos,
        termos_encontrados=sorted(termos_encontrados),
        mencoes_db=mencoes_db,
        publicacoes=publicacoes,
        metricas=metricas,
    )
