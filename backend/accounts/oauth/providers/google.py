"""Provider Google — validation d'un ID token (Google Identity Services)."""

from __future__ import annotations

from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from ..base import OAuthError, OAuthIdentity, OAuthProvider
from ...models import AuthProvider


class GoogleOAuthProvider(OAuthProvider):
    key = 'google'
    provider = AuthProvider.GOOGLE

    def is_configured(self) -> bool:
        return bool(getattr(settings, 'GOOGLE_CLIENT_ID', '') or '')

    def authenticate(self, payload: dict) -> OAuthIdentity:
        token = (payload.get('id_token') or payload.get('credential') or '').strip()
        if not token:
            raise OAuthError('id_token Google manquant.')

        client_id = settings.GOOGLE_CLIENT_ID
        try:
            info = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                client_id,
            )
        except ValueError as exc:
            raise OAuthError(f'Token Google invalide : {exc}') from exc

        if info.get('iss') not in ('accounts.google.com', 'https://accounts.google.com'):
            raise OAuthError('Émetteur Google invalide.')

        subject = info.get('sub')
        email = (info.get('email') or '').lower().strip() or None
        if not subject:
            raise OAuthError('Profil Google incomplet (sub manquant).')
        if not email:
            raise OAuthError('Email Google requis (compte sans email).')

        given = (info.get('given_name') or '').strip()
        family = (info.get('family_name') or '').strip()
        full = (info.get('name') or '').strip()
        if not given and full:
            parts = full.split()
            given = parts[0]
            family = ' '.join(parts[1:]) if len(parts) > 1 else parts[0]

        return OAuthIdentity(
            provider=self.provider,
            subject=subject,
            email=email,
            prenoms=given or 'Scout',
            nom=family or 'Up',
            avatar_url=info.get('picture'),
        )
