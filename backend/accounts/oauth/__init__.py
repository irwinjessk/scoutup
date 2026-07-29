"""Package OAuth ScoutUp."""

from .base import OAuthError, OAuthIdentity, OAuthProvider
from .registry import get_provider, list_providers
from .service import authenticate_oauth

__all__ = [
    'OAuthError',
    'OAuthIdentity',
    'OAuthProvider',
    'authenticate_oauth',
    'get_provider',
    'list_providers',
]
