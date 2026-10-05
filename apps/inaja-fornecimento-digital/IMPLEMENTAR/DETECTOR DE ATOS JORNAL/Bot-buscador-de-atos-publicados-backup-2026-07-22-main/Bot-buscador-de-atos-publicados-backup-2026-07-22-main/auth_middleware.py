from __future__ import annotations

import secrets
from ipaddress import ip_address, ip_network
from urllib.parse import urlsplit

from fastapi import Request
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware

from config import SETTINGS

_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def peer_is_trusted(request: Request) -> bool:
    if request.client is None:
        return False
    try:
        peer = ip_address(request.client.host)
    except ValueError:
        return False
    for cidr in getattr(SETTINGS, "trusted_proxy_cidrs", []):
        try:
            if peer in ip_network(cidr, strict=False):
                return True
        except ValueError:
            continue
    return False


def _public_origin(request: Request) -> str:
    if peer_is_trusted(request):
        forwarded_proto = (
            request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip().lower()
        )
        forwarded_host = request.headers.get("host", "").strip()
        if forwarded_proto == "https" and forwarded_host:
            return f"https://{forwarded_host}"
    return f"{request.url.scheme}://{request.url.netloc}"


def _same_origin(value: str, expected_origin: str, *, require_https: bool = False) -> bool:
    try:
        parsed = urlsplit(value)
    except ValueError:
        return False
    if not parsed.scheme or not parsed.netloc or parsed.username or parsed.password:
        return False
    if require_https and parsed.scheme != "https":
        return False
    if parsed.path not in {"", "/"} and not require_https:
        return False
    origin = f"{parsed.scheme}://{parsed.netloc}"
    return secrets.compare_digest(origin, expected_origin)


def _csrf_request_is_safe(request: Request) -> bool:
    if getattr(SETTINGS, "app_env", "development") != "production":
        return True
    if request.method not in _MUTATING_METHODS or request.url.path.startswith("/static/"):
        return True
    expected_origin = _public_origin(request)
    origin = request.headers.get("origin")
    if origin:
        return _same_origin(origin, expected_origin)
    referer = request.headers.get("referer")
    return bool(referer) and _same_origin(referer, expected_origin, require_https=True)


class BasicAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not _csrf_request_is_safe(request):
            return Response(status_code=403, content="Origem da solicitação não permitida.")
        user = SETTINGS.webapp_user
        pwd = SETTINGS.webapp_password
        if not user and not pwd:
            return await call_next(request)
        if request.url.path.startswith("/static"):
            return await call_next(request)
        header = request.headers.get("Authorization", "")
        if header.startswith("Basic "):
            import base64

            try:
                decoded = base64.b64decode(header[6:]).decode("utf-8")
                req_user, _, req_pwd = decoded.partition(":")
            except (UnicodeDecodeError, ValueError):
                req_user, req_pwd = "", ""
            ok_user = secrets.compare_digest(req_user, user)
            ok_pwd = secrets.compare_digest(req_pwd, pwd)
            if ok_user and ok_pwd:
                return await call_next(request)
        return Response(
            status_code=401,
            headers={"WWW-Authenticate": "Basic realm=Monitor"},
            content="Autenticacao necessaria.",
        )
