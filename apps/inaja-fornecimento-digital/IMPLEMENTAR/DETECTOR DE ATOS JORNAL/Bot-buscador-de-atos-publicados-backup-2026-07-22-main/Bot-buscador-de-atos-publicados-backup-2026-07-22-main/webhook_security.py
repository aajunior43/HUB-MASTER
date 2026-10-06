from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlsplit, urlunsplit


class WebhookUrlError(ValueError):
    pass


def _endereco_webhook_permitido(address: str) -> bool:
    return ipaddress.ip_address(address).is_global


def resolver_enderecos_webhook(url: str) -> tuple[str, frozenset[str]]:
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
        port = parsed.port or 443
    except (UnicodeError, ValueError) as exc:
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
    addresses = frozenset(item[4][0] for item in resolved)
    if not addresses or not all(_endereco_webhook_permitido(address) for address in addresses):
        raise WebhookUrlError("Host de webhook não é público")
    netloc = host if parsed.port is None else f"{host}:443"
    normalized = urlunsplit(("https", netloc, parsed.path or "/", parsed.query, ""))
    return normalized, addresses


def validar_url_webhook(url: str) -> str:
    normalized, _ = resolver_enderecos_webhook(url)
    return normalized
