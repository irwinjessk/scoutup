"""Contrats OAuth partagés — providers plugables."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


class OAuthError(Exception):
    """Erreur métier OAuth (message exposable au client)."""

    def __init__(self, message: str, *, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


@dataclass(frozen=True)
class OAuthIdentity:
    """Profil normalisé renvoyé par un provider OAuth."""

    provider: str  # AuthProvider value (GOOGLE, TIKTOK, …)
    subject: str
    email: str | None
    prenoms: str
    nom: str
    avatar_url: str | None = None

    @property
    def oauth_key(self) -> str:
        """Clé unique stockée dans User.oauth_id (provider:subject)."""
        return f'{self.provider.lower()}:{self.subject}'


class OAuthProvider(ABC):
    """Interface minimale d'un fournisseur OAuth."""

    key: str  # slug API : google, tiktok
    provider: str  # AuthProvider enum value

    @abstractmethod
    def is_configured(self) -> bool:
        """True si les secrets/env nécessaires sont présents."""

    @abstractmethod
    def authenticate(self, payload: dict) -> OAuthIdentity:
        """
        Valide le payload client et retourne une identité.

        Payloads typiques :
        - Google : { "id_token": "..." }
        - TikTok : { "code": "...", "redirect_uri": "..." }
        """
