from __future__ import annotations

import logging
from dataclasses import replace

from config import SETTINGS
from detector import DetectionResult

logger = logging.getLogger(__name__)


def aplicar_qualidade_pos_deteccao(
    resultado: DetectionResult,
    data_publicacao: str | None,
) -> DetectionResult:
    if not resultado.publicacoes:
        return resultado
    fix = bool(getattr(SETTINGS, "quality_fix_numero_ano", True))
    conf = bool(getattr(SETTINGS, "quality_confianca", False))
    if not fix and not conf:
        return resultado
    try:
        import qualidade

        pubs = qualidade.pos_processar_publicacoes(
            list(resultado.publicacoes),
            data_edicao=data_publicacao,
        )
        return replace(resultado, publicacoes=pubs)
    except Exception:
        logger.warning(
            "Pós-processamento de qualidade falhou; mantendo detecção "
            "(edicao_id=%s, publicacoes=%s)",
            resultado.edicao_id,
            len(resultado.publicacoes),
            exc_info=True,
        )
        return resultado
