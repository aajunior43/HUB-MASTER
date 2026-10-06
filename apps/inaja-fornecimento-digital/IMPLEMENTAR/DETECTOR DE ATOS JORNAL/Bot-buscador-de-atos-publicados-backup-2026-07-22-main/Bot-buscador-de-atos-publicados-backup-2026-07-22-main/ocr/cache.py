"""
OCR result caching to .ocr.json files next to the original PDF.

Allows skipping expensive OCR on repeated runs.
Cache contains full text, per-page data and blocks.
"""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path

from config import SETTINGS
from ocr.models import OCRResult, PageText, TextBlock

logger = logging.getLogger(__name__)

# v3 inclui identidade do PDF e configuração OCR. Caches anteriores são
# ignorados para não perpetuar resultados gerados com idioma/DPI antigos.
# v4 troca a leitura nativa por linhas pela leitura por colunas.
_CACHE_VERSION = 4


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fp:
        for chunk in iter(lambda: fp.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _config_signature() -> dict:
    return {
        "language": SETTINGS.ocr_language,
        "ocr_dpi": SETTINGS.ocr_dpi,
        "ocr_retry_dpi": SETTINGS.ocr_retry_dpi,
        "ocr_fast_dpi": SETTINGS.ocr_fast_dpi,
        "ocr_max_dimension": SETTINGS.ocr_max_dimension,
        "ocr_fast_max_dimension": SETTINGS.ocr_fast_max_dimension,
        "min_text_chars": SETTINGS.min_text_chars_per_page,
        "fast_min_chars": SETTINGS.ocr_fast_min_chars,
        "tesseract_path": SETTINGS.tesseract_path,
    }


def _pdf_signature(pdf_path: Path) -> dict:
    stat = pdf_path.stat()
    return {
        "size": stat.st_size,
        "mtime_ns": stat.st_mtime_ns,
        "sha256": _sha256(pdf_path),
    }


def _salvar_cache_ocr(pdf_path: Path, result: OCRResult) -> None:
    try:
        cache_path = pdf_path.with_suffix(".ocr.json")
        data = {
            "cache_version": _CACHE_VERSION,
            "pdf": _pdf_signature(pdf_path),
            "ocr_config": _config_signature(),
            "texto_completo": result.texto_completo,
            "avisos": result.avisos,
            "paginas": [
                {
                    "pagina": p.pagina,
                    "texto": p.texto,
                    "metodo": p.metodo,
                    "blocks": [
                        {
                            "pagina": b.pagina,
                            "bloco": b.bloco,
                            "texto": b.texto,
                            "bbox": list(b.bbox) if b.bbox else None,
                        }
                        for b in (p.blocks or [])
                    ],
                }
                for p in result.paginas
            ],
        }
        temp_path = cache_path.with_suffix(cache_path.suffix + ".tmp")
        temp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        temp_path.replace(cache_path)
    except Exception:
        logger.exception("Falha ao salvar cache OCR para %s", pdf_path)


def _carregar_cache_ocr(pdf_path: Path) -> OCRResult | None:
    try:
        cache_path = pdf_path.with_suffix(".ocr.json")
        if not cache_path.exists():
            return None
        data = json.loads(cache_path.read_text(encoding="utf-8"))

        # Caches antigos não comprovam qual PDF/configuração os gerou.
        versao = int(data.get("cache_version") or 1)
        if versao != _CACHE_VERSION:
            logger.info(
                "Cache OCR antigo/incompatível (versão %s), ignorando %s",
                versao,
                cache_path.name,
            )
            return None
        if data.get("pdf") != _pdf_signature(pdf_path):
            logger.info("Cache OCR não pertence ao PDF atual: %s", cache_path.name)
            return None
        if data.get("ocr_config") != _config_signature():
            logger.info("Cache OCR usa outra configuração: %s", cache_path.name)
            return None
        if "paginas" not in data or not isinstance(data["paginas"], list):
            logger.warning("Cache OCR sem lista de páginas: %s", cache_path)
            return None

        paginas = []
        for p in data["paginas"]:
            blocks = []
            for b in p.get("blocks", []) or []:
                bbox = tuple(b["bbox"]) if b.get("bbox") else None
                blocks.append(
                    TextBlock(
                        pagina=b.get("pagina", p.get("pagina", 0)),
                        bloco=b.get("bloco", 0),
                        texto=b.get("texto") or "",
                        bbox=bbox,
                    )
                )
            paginas.append(
                PageText(
                    pagina=p.get("pagina", 0),
                    texto=p.get("texto") or "",
                    metodo=p.get("metodo") or "ocr",
                    blocks=blocks,
                )
            )

        if not paginas:
            return None

        return OCRResult(
            texto_completo=data.get("texto_completo", ""),
            paginas=paginas,
            texto_path=pdf_path.with_suffix(".txt"),
            avisos=data.get("avisos", []),
        )
    except Exception:
        logger.exception("Falha ao carregar cache OCR para %s", pdf_path)
        return None
