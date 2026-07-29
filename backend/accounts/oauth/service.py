"""Orchestration OAuth : résoudre / créer un utilisateur ScoutUp."""

from __future__ import annotations

from django.contrib.auth import get_user_model

from organization.models import Communaute

from ..models import AuthProvider, Role, StatutCompte
from .base import OAuthError, OAuthIdentity
from .registry import get_provider

User = get_user_model()

DEFAULT_COMMUNAUTE_NAME = 'Félix Houphouët-Boigny'


def _default_communaute():
    return (
        Communaute.objects.filter(nom=DEFAULT_COMMUNAUTE_NAME).first()
        or Communaute.objects.order_by('id').first()
    )


def _ensure_email(identity: OAuthIdentity) -> str:
    if identity.email:
        return identity.email.lower().strip()
    # TikTok sans email : identifiant technique stable
    return f'{identity.provider.lower()}.{identity.subject}@oauth.scoutup.local'


def resolve_or_create_user(
    identity: OAuthIdentity,
    *,
    role: str | None = None,
    communaute_id: int | None = None,
) -> User:
    """
    Retrouve un utilisateur existant (oauth_id puis email) ou en crée un nouveau.

    Nouveaux comptes OAuth → EN_ATTENTE (JEUNE par défaut, communauté FHB).
    """
    user = User.objects.filter(oauth_id=identity.oauth_key).first()
    if user:
        return user

    email = _ensure_email(identity)
    user = User.objects.filter(email__iexact=email).first()
    if user:
        if not user.oauth_id:
            user.oauth_id = identity.oauth_key
            user.auth_provider = identity.provider
            user.save(update_fields=['oauth_id', 'auth_provider', 'updated_at'])
        return user

    # Création
    chosen_role = role if role in (Role.JEUNE, Role.CC) else Role.JEUNE
    if communaute_id:
        communaute = Communaute.objects.filter(pk=communaute_id).select_related('groupe').first()
        if not communaute:
            raise OAuthError('Communauté introuvable.')
    else:
        communaute = _default_communaute()
        if not communaute:
            raise OAuthError('Aucune communauté disponible pour créer le compte.', status=503)

    nom = (identity.nom or '').strip() or 'Up'
    prenoms = (identity.prenoms or '').strip() or 'Scout'

    user = User(
        email=email,
        role=chosen_role,
        statut=StatutCompte.EN_ATTENTE,
        nom=nom[:80],
        prenoms=prenoms[:120],
        auth_provider=identity.provider,
        oauth_id=identity.oauth_key,
        communaute=communaute,
        groupe=communaute.groupe,
    )
    user.set_unusable_password()
    user.save()
    return user


def authenticate_oauth(
    provider_key: str,
    payload: dict,
    *,
    role: str | None = None,
    communaute_id: int | None = None,
) -> User:
    provider = get_provider(provider_key)
    if not provider.is_configured():
        raise OAuthError(
            f'Le provider « {provider_key} » n’est pas configuré sur le serveur.',
            status=503,
        )
    identity = provider.authenticate(payload)
    if identity.provider not in AuthProvider.values:
        raise OAuthError('Provider invalide.')
    return resolve_or_create_user(
        identity,
        role=role,
        communaute_id=communaute_id,
    )
