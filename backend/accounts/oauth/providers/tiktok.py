"""Provider TikTok Login Kit (code → token → profil)."""

from __future__ import annotations

import requests
from django.conf import settings

from ..base import OAuthError, OAuthIdentity, OAuthProvider
from ...models import AuthProvider

TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/'
AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/'


class TikTokOAuthProvider(OAuthProvider):
    key = 'tiktok'
    provider = AuthProvider.TIKTOK

    def is_configured(self) -> bool:
        return bool(
            getattr(settings, 'TIKTOK_CLIENT_KEY', '')
            and getattr(settings, 'TIKTOK_CLIENT_SECRET', '')
        )

    def build_authorize_url(self, *, redirect_uri: str, state: str = '') -> str:
        if not self.is_configured():
            raise OAuthError('TikTok non configuré.', status=503)
        from urllib.parse import urlencode

        params = {
            'client_key': settings.TIKTOK_CLIENT_KEY,
            'scope': 'user.info.basic',
            'response_type': 'code',
            'redirect_uri': redirect_uri,
            'state': state or 'scoutup',
        }
        return f'{AUTHORIZE_URL}?{urlencode(params)}'

    def authenticate(self, payload: dict) -> OAuthIdentity:
        code = (payload.get('code') or '').strip()
        redirect_uri = (payload.get('redirect_uri') or '').strip()
        if not code:
            raise OAuthError('code TikTok manquant.')
        if not redirect_uri:
            raise OAuthError('redirect_uri TikTok manquant.')

        access_token = self._exchange_code(code, redirect_uri)
        profile = self._fetch_user(access_token)

        open_id = profile.get('open_id') or profile.get('union_id')
        if not open_id:
            raise OAuthError('Profil TikTok incomplet (open_id manquant).')

        display_name = (profile.get('display_name') or 'Scout Up').strip()
        parts = display_name.split()
        prenoms = parts[0] if parts else 'Scout'
        nom = ' '.join(parts[1:]) if len(parts) > 1 else prenoms

        email = (profile.get('email') or None)
        if email:
            email = email.lower().strip()

        return OAuthIdentity(
            provider=self.provider,
            subject=str(open_id),
            email=email,
            prenoms=prenoms,
            nom=nom,
            avatar_url=profile.get('avatar_url'),
        )

    def _exchange_code(self, code: str, redirect_uri: str) -> str:
        try:
            response = requests.post(
                TOKEN_URL,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                data={
                    'client_key': settings.TIKTOK_CLIENT_KEY,
                    'client_secret': settings.TIKTOK_CLIENT_SECRET,
                    'code': code,
                    'grant_type': 'authorization_code',
                    'redirect_uri': redirect_uri,
                },
                timeout=20,
            )
        except requests.RequestException as exc:
            raise OAuthError('Impossible de contacter TikTok (token).', status=502) from exc

        data = response.json() if response.content else {}
        # TikTok v2 peut envelopper dans { "data": {...}, "error": ... }
        payload = data.get('data') if isinstance(data.get('data'), dict) else data
        access_token = payload.get('access_token')
        if response.status_code >= 400 or not access_token:
            detail = data.get('error_description') or data.get('error') or data
            raise OAuthError(f'Échange code TikTok échoué : {detail}')
        return access_token

    def _fetch_user(self, access_token: str) -> dict:
        try:
            response = requests.get(
                USER_INFO_URL,
                headers={'Authorization': f'Bearer {access_token}'},
                params={'fields': 'open_id,union_id,avatar_url,display_name'},
                timeout=20,
            )
        except requests.RequestException as exc:
            raise OAuthError('Impossible de contacter TikTok (profil).', status=502) from exc

        data = response.json() if response.content else {}
        user = (
            data.get('data', {}).get('user')
            if isinstance(data.get('data'), dict)
            else data.get('user')
        )
        if response.status_code >= 400 or not isinstance(user, dict):
            raise OAuthError(f'Profil TikTok inaccessible : {data}')
        return user
