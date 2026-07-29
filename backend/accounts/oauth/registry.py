"""Registre des providers OAuth."""

from __future__ import annotations

from .base import OAuthError, OAuthProvider
from .providers.google import GoogleOAuthProvider
from .providers.tiktok import TikTokOAuthProvider

_PROVIDERS: dict[str, OAuthProvider] = {
    GoogleOAuthProvider.key: GoogleOAuthProvider(),
    TikTokOAuthProvider.key: TikTokOAuthProvider(),
}


def get_provider(key: str) -> OAuthProvider:
    provider = _PROVIDERS.get((key or '').lower().strip())
    if provider is None:
        raise OAuthError(f'Provider OAuth inconnu : {key}', status=404)
    return provider


def list_providers() -> dict[str, dict]:
    """État public des providers (sans secrets)."""
    result = {}
    for key, provider in _PROVIDERS.items():
        result[key] = {
            'key': key,
            'configured': provider.is_configured(),
        }
    return result
