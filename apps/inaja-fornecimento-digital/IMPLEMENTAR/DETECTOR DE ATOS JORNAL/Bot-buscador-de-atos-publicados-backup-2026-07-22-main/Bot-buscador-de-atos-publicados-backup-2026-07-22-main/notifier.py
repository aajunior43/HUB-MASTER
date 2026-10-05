from __future__ import annotations

import logging
import threading
from datetime import datetime
from pathlib import Path

import requests

import database
from config import SETTINGS
from detector import DetectionResult
from scraper import Edicao
from webhook_security import WebhookUrlError, resolver_enderecos_webhook

logger = logging.getLogger(__name__)


def _resumir(trecho: str, limite: int = 150) -> str:
    texto = " ".join(trecho.split())
    return texto if len(texto) <= limite else texto[: limite - 3] + "..."


def _tem_publicacao_oficial(resultado: DetectionResult) -> bool:
    """Verifica se há publicação oficial do município (não apenas menção genérica)."""
    return any(
        p.get("orgao") or p.get("tipo") or p.get("categoria") == "publicacao_oficial"
        for p in resultado.publicacoes
    )


def montar_mensagem(resultado: DetectionResult, edicao: Edicao) -> str:
    """Monta mensagem de alerta em texto simples (arquivo / webhook)."""
    eh_oficial = _tem_publicacao_oficial(resultado)
    if eh_oficial:
        cabecalho = "Publicação oficial de Inajá detectada!"
    else:
        cabecalho = "Menção a Inajá detectada (sem publicação oficial identificada)"

    titulo = edicao.titulo or ""
    data = edicao.data_publicacao or "não informada"
    paginas = ", ".join(map(str, resultado.paginas_com_mencao))
    termos = ", ".join(resultado.termos_encontrados)

    linhas = [
        cabecalho,
        "",
        f"Edição: {titulo}",
        f"Data: {data}",
        f"Páginas: {paginas}",
        f"Termos: {termos}",
        "",
    ]
    if resultado.publicacoes:
        linhas.append("Publicações classificadas:")
        for item in resultado.publicacoes[:5]:
            partes = [
                item.get("categoria") or "publicação",
                item.get("orgao"),
                item.get("tipo"),
                item.get("numero"),
            ]
            titulo_pub = " - ".join(str(p) for p in partes if p)
            linhas.append(f"— Pág. {item['pagina']}: {titulo_pub}")
            if item.get("data_documento"):
                linhas.append(f"  Data: {item['data_documento']}")
            if item.get("valor"):
                linhas.append(f"  Valor: {item['valor']}")
            if item.get("assunto"):
                linhas.append(f"  Assunto: {_resumir(item['assunto'], 180)}")
            if item.get("resumo_ia"):
                linhas.append(f"  IA: {_resumir(item['resumo_ia'], 180)}")
        if len(resultado.publicacoes) > 5:
            resto = len(resultado.publicacoes) - 5
            linhas.append(f"— Mais {resto} publicação(ões) omitida(s).")
        linhas.append("")

    linhas.append("Trechos encontrados:")
    for item in resultado.trechos[:10]:
        trecho = _resumir(item["trecho"])
        linhas.append(f'— Pág. {item["pagina"]}: "{trecho}"')
    if len(resultado.trechos) > 10:
        resto = len(resultado.trechos) - 10
        linhas.append(f"— Mais {resto} trecho(s) omitido(s).")
    linhas.extend(["", f"Abrir edição: {edicao.url}"])
    return "\n".join(linhas)


def _salvar_alerta(mensagem: str) -> Path:
    SETTINGS.alert_dir.mkdir(parents=True, exist_ok=True)
    path = SETTINGS.alert_dir / f"{datetime.now().date().isoformat()}.log"
    with path.open("a", encoding="utf-8") as fp:
        fp.write(mensagem)
        fp.write("\n\n" + "-" * 80 + "\n\n")
    return path


def _disparar_webhooks(payload: dict) -> None:
    """Dispara webhooks configurados no banco de dados em thread separada."""
    webhooks = database.get_webhooks()
    if not webhooks:
        return

    def _disparar(url: str) -> None:
        try:
            destino, enderecos = resolver_enderecos_webhook(url)
            destino_atual, enderecos_atuais = resolver_enderecos_webhook(destino)
            if destino_atual != destino or enderecos_atuais != enderecos:
                raise WebhookUrlError("resolução DNS do webhook mudou antes do envio")
            resp = requests.post(destino, json=payload, timeout=10, allow_redirects=False)
            resp.raise_for_status()
            logger.info("Webhook disparado: %s → %s", destino, resp.status_code)
        except WebhookUrlError as exc:
            logger.warning("Webhook rejeitado antes do envio (motivo=%s)", type(exc).__name__)
        except requests.HTTPError as exc:
            logger.warning(
                "Webhook respondeu com erro HTTP (status=%s)",
                exc.response.status_code if exc.response is not None else "desconhecido",
            )
        except requests.RequestException as exc:
            logger.warning("Falha de transporte no webhook (erro=%s)", type(exc).__name__)
            logger.warning("Falha ao disparar webhook: destino rejeitado ou indisponível")

    for wh in webhooks:
        t = threading.Thread(target=_disparar, args=(wh["url"],), daemon=True)
        t.start()


def _sem_avaliacao_textual(pub: dict) -> bool:
    return isinstance(pub.get("jev_detalhe"), dict) and pub.get("importancia") is None and not (
        pub.get("resumo_ia") or ""
    ).strip()


def _nivel_confianca(pub: dict, data_edicao: str | None) -> str:
    nivel = str(pub.get("confianca_nivel") or "").strip().casefold()
    if nivel:
        return nivel
    try:
        from qualidade import calcular_confianca

        return str(calcular_confianca(dict(pub), data_edicao=data_edicao).get("nivel") or "").casefold()
    except Exception:
        logger.debug("Confiança não calculada para o filtro de alerta", exc_info=True)
        return ""


def _alerta_bloqueado_sem_evidencia(pub: dict, data_edicao: str | None) -> bool:
    """Sem nota de importância (só o Jev rodou), exige evidência de que é um ato oficial."""
    if not _sem_avaliacao_textual(pub):
        return False
    categoria = str(pub["jev_detalhe"].get("categoria") or "").strip().casefold()
    if categoria and categoria != "ato_oficial":
        return True
    if not str(pub.get("tipo") or "").strip():
        return True
    return _nivel_confianca(pub, data_edicao) == "revisar"


def _publicacoes_para_alerta(
    resultado: DetectionResult, data_edicao: str | None = None
) -> list[dict]:
    """Filtra pubs que merecem alerta (importância / notificar_ia / evidência de ato)."""
    pubs = list(resultado.publicacoes or [])
    if not pubs:
        return []
    if not getattr(SETTINGS, "ai_importancia", True):
        return pubs
    limiar = int(getattr(SETTINGS, "ai_importancia_min_notificar", 3) or 3)
    filtradas = []
    for p in pubs:
        if _alerta_bloqueado_sem_evidencia(p, data_edicao):
            continue
        notif = p.get("notificar_ia")
        if notif is False or notif == 0:
            continue
        if notif is True or notif == 1:
            filtradas.append(p)
            continue
        imp = p.get("importancia")
        try:
            imp_i = int(imp) if imp is not None else limiar
        except (TypeError, ValueError):
            imp_i = limiar
        if imp_i >= limiar:
            filtradas.append(p)
    return filtradas


def notificar(resultado: DetectionResult, edicao: Edicao) -> None:
    if not resultado.encontrado:
        return

    pubs_alerta = _publicacoes_para_alerta(resultado, getattr(edicao, "data_publicacao", None))
    if resultado.publicacoes and not pubs_alerta:
        logger.info(
            "Notificação suprimida (importância baixa) edição %s — %s pub(s) sem alerta",
            resultado.edicao_id,
            len(resultado.publicacoes),
        )
        mensagem_suprimida = (
            "[suprimido: sem evidência de ato oficial / importancia < limiar / notificar=false]\n\n"
            + montar_mensagem(resultado, edicao)
        )
        _salvar_alerta(mensagem_suprimida)
        database.insert_notificacao(resultado.edicao_id, "arquivo", mensagem_suprimida[:2000], True)
        return

    if pubs_alerta and len(pubs_alerta) < len(resultado.publicacoes or []):
        from dataclasses import replace

        resultado = replace(resultado, publicacoes=pubs_alerta)

    mensagem = montar_mensagem(resultado, edicao)
    if pubs_alerta:
        tops = [p for p in pubs_alerta if p.get("importancia")]
        if tops:
            melhor = max(int(p.get("importancia") or 0) for p in tops)
            mensagem = f"Importância {melhor}/5\n\n" + mensagem
    anoms = [
        p
        for p in (pubs_alerta or resultado.publicacoes or [])
        if p.get("anomalia") in (1, True, "1")
    ]
    if anoms:
        motivos = []
        for p in anoms[:3]:
            m = (p.get("anomalia_motivo") or "").strip()
            if m:
                motivos.append(m)
        head = "ANOMALIA DETECTADA"
        if motivos:
            head += "\n" + "\n".join(f"• {m}" for m in motivos)
        mensagem = head + "\n\n" + mensagem

    path = _salvar_alerta(mensagem)
    logger.info("Alerta salvo em %s", path)
    database.mark_notified(resultado.edicao_id)
    database.insert_notificacao(
        edicao_id=resultado.edicao_id,
        canal="arquivo",
        conteudo=mensagem,
        sucesso=True,
        erro=None,
    )

    payload = {
        "edicao_id": resultado.edicao_id,
        "edicao_titulo": resultado.edicao_titulo,
        "paginas": resultado.paginas_com_mencao,
        "termos": resultado.termos_encontrados,
        "publicacoes": len(resultado.publicacoes),  # INT — não mudar para lista
        "mencoes": len(resultado.mencoes_db),
        "url": edicao.url,
    }
    if bool(getattr(SETTINGS, "quality_webhook_enrich", True)):
        resumo = []
        for p in (resultado.publicacoes or [])[:10]:
            resumo.append(
                {
                    "id": p.get("id"),
                    "tipo": p.get("tipo"),
                    "numero": p.get("numero"),
                    "importancia": p.get("importancia"),
                    "confianca": p.get("confianca"),
                    "confianca_nivel": p.get("confianca_nivel"),
                    "flags_qualidade": p.get("flags_qualidade"),
                }
            )
        payload["publicacoes_resumo"] = resumo
    _disparar_webhooks(payload)


def verificar_ausencia_publicacao() -> None:
    """Grava alerta se não houve publicação de Inajá nos últimos N dias."""
    days = SETTINGS.absence_alert_days
    if not database.get_absence_alert_needed(days):
        return
    mensagem = (
        f"Alerta de ausência — Nenhuma publicação oficial de Inajá-PR "
        f"foi detectada nos últimos {days} dias.\n\n"
        f"Verifique o sistema ou se o jornal publicou algum ato oficial recentemente."
    )
    logger.warning("Alerta de ausência: nenhuma publicação em %s dias", days)
    _salvar_alerta(mensagem)
    database.insert_notificacao(
        edicao_id=None,
        canal="ausencia",
        conteudo=mensagem,
        sucesso=True,
    )


def enviar_teste() -> dict:
    """Grava notificação de teste em arquivo. Retorna dict com canal e status."""
    resultado = DetectionResult(
        encontrado=True,
        edicao_id=0,
        edicao_titulo="Teste",
        paginas_com_mencao=[1],
        trechos=[{"pagina": 1, "trecho": "Teste de alerta do monitor de Inajá."}],
        termos_encontrados=["Inajá"],
        mencoes_db=[],
        publicacoes=[],
    )
    edicao = Edicao(
        url=SETTINGS.site_url,
        titulo="Mensagem de teste",
        data_publicacao=datetime.now().date().isoformat(),
    )
    notificar(resultado, edicao)
    return {
        "ok": True,
        "canal": "arquivo",
        "detalhe": "Alerta gravado em alertas/.",
    }
