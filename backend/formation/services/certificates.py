"""Délivrance des brevets PDF."""

from __future__ import annotations

import uuid

from django.core.files.base import ContentFile

from accounts.models import Role, StatutCompte

from ..models import Certificate
from ..pdf import build_brevet_pdf

# Incrémenter pour forcer la régénération des PDF existants après un nouveau template.
TEMPLATE_VERSION = 2


def _cg_display_name(jeune) -> str:
    if not jeune.groupe_id:
        return ''
    from django.contrib.auth import get_user_model

    User = get_user_model()
    cg = (
        User.objects.filter(
            role=Role.CG,
            groupe_id=jeune.groupe_id,
            statut=StatutCompte.ACTIF,
        )
        .order_by('id')
        .first()
    )
    if not cg:
        return ''
    return f'{cg.prenoms} {cg.nom}'.strip() or cg.email


def _pdf_bytes_for(cert: Certificate) -> bytes:
    stage = cert.stage
    jeune = cert.jeune
    prenoms = getattr(jeune, 'prenoms', '') or ''
    nom = getattr(jeune, 'nom', '') or ''
    # Fallback si nom_affiche seul est fiable
    if not (prenoms or nom) and cert.nom_affiche:
        parts = cert.nom_affiche.rsplit(' ', 1)
        if len(parts) == 2:
            prenoms, nom = parts[0], parts[1]
        else:
            prenoms = cert.nom_affiche
    return build_brevet_pdf(
        prenoms=prenoms,
        nom=nom,
        stage_titre=stage.titre,
        stage_code=stage.code,
        couleur=cert.couleur or stage.couleur_brevet,
        communaute=str(stage.communaute),
        cg_nom=_cg_display_name(jeune),
        delivered_at=cert.delivered_at,
    )


def ensure_certificate_file(cert: Certificate, *, force: bool = False) -> Certificate:
    """Régénère le PDF si absent, ou force (nouveau template)."""
    needs_rebuild = force or not cert.fichier
    if not needs_rebuild:
        try:
            cert.fichier.open('rb')
            cert.fichier.close()
        except (FileNotFoundError, ValueError, OSError):
            needs_rebuild = True

    # Nouveau template : toujours régénérer à la consultation / délivrance.
    if TEMPLATE_VERSION >= 2:
        needs_rebuild = True

    if not needs_rebuild:
        return cert

    pdf_bytes = _pdf_bytes_for(cert)
    filename = f'brevet-{cert.stage.code.lower()}-{cert.jeune_id}-v{TEMPLATE_VERSION}.pdf'
    if cert.fichier:
        cert.fichier.delete(save=False)
    cert.fichier.save(filename, ContentFile(pdf_bytes), save=True)
    return cert


def deliver_certificate(jeune, stage) -> Certificate:
    existing = (
        Certificate.objects.filter(jeune=jeune, stage=stage)
        .select_related('stage', 'stage__communaute', 'jeune')
        .first()
    )
    if existing:
        return ensure_certificate_file(existing, force=True)

    prenoms = (jeune.prenoms or '').strip()
    nom = (jeune.nom or '').strip()
    nom_affiche = f'{prenoms} {nom}'.strip() or jeune.email
    pdf_bytes = build_brevet_pdf(
        prenoms=prenoms,
        nom=nom,
        stage_titre=stage.titre,
        stage_code=stage.code,
        couleur=stage.couleur_brevet,
        communaute=str(stage.communaute),
        cg_nom=_cg_display_name(jeune),
    )

    cert = Certificate(
        id=uuid.uuid4(),
        jeune=jeune,
        stage=stage,
        nom_affiche=nom_affiche,
        couleur=stage.couleur_brevet,
    )
    filename = f'brevet-{stage.code.lower()}-{jeune.id}-v{TEMPLATE_VERSION}.pdf'
    cert.fichier.save(filename, ContentFile(pdf_bytes), save=False)
    cert.save()
    return cert
