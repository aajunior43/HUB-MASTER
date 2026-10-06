from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlsplit, urlunsplit


class WebhookUrlError(ValueError):
    pass


def _endereco_webhook_permitido(address: str) -> bool:
    parsed = ipaddress.ip_address(address)
    return not (
        parsed.is_loopback
        or parsed.is_private
        or parsed.is_link_local
        or parsed.is_multicast
        or parsed.is_reserved
        or parsed.is_unspecified
    )


def validar_url_webhook(url: str) -> str:
    try:
        parsed = urlsplit(url.strip())
    except ValueError as exc:
        raise WebhookUrlError("URL de webhook inválida") from exc
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.fragment
    ):
        raise WebhookUrlError("URL de webhook deve usar HTTPS público")
    try:
        host = parsed.hostname.encode("idna").decode("ascii")
    except UnicodeError as exc:
        raise WebhookUrlError("URL de webhook inválida") from exc
    try:
        port = parsed.port or 443
    except ValueError as exc:
        raise WebhookUrlError("URL de webhook inválida") from exc
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise WebhookUrlError("URL de webhook não aceita endereço IP")
    if port != 443:
        raise WebhookUrlError("URL de webhook deve usar a porta 443")
    try:
        resolved = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise WebhookUrlError("Host de webhook não pôde ser resolvido") from exc
    addresses = {item[4][0] for item in resolved}
    if not addresses or not all(_endereco_webhook_permitido(address) for address in addresses):
        raise WebhookUrlError("Host de webhook não é público")
    netloc = host if parsed.port is None else f"{host}:443"
    return urlunsplit(("https", netloc, parsed.path or "/", parsed.query, ""))
