"""Délivrance des brevets PDF."""

from __future__ import annotations

import uuid

from django.core.files.base import ContentFile

from ..models import Certificate
from ..pdf import build_brevet_pdf


def _pdf_bytes_for(cert: Certificate) -> bytes:
    stage = cert.stage
    return build_brevet_pdf(
        nom_affiche=cert.nom_affiche,
        stage_titre=stage.titre,
        couleur=cert.couleur or stage.couleur_brevet,
        communaute=str(stage.communaute),
    )


def ensure_certificate_file(cert: Certificate) -> Certificate:
    """Régénère le PDF si absent du disque (ex. filesystem éphémère Render)."""
    needs_rebuild = not cert.fichier
    if not needs_rebuild:
        try:
            cert.fichier.open('rb')
            cert.fichier.close()
        except (FileNotFoundError, ValueError, OSError):
            needs_rebuild = True

    if not needs_rebuild:
        return cert

    pdf_bytes = _pdf_bytes_for(cert)
    filename = f'brevet-{cert.stage.code.lower()}-{cert.jeune_id}.pdf'
    if cert.fichier:
        cert.fichier.delete(save=False)
    cert.fichier.save(filename, ContentFile(pdf_bytes), save=True)
    return cert


def deliver_certificate(jeune, stage) -> Certificate:
    existing = Certificate.objects.filter(jeune=jeune, stage=stage).select_related('stage').first()
    if existing:
        return ensure_certificate_file(existing)

    nom_affiche = f'{jeune.prenoms} {jeune.nom}'.strip() or jeune.email
    pdf_bytes = build_brevet_pdf(
        nom_affiche=nom_affiche,
        stage_titre=stage.titre,
        couleur=stage.couleur_brevet,
        communaute=str(stage.communaute),
    )

    cert = Certificate(
        id=uuid.uuid4(),
        jeune=jeune,
        stage=stage,
        nom_affiche=nom_affiche,
        couleur=stage.couleur_brevet,
    )
    filename = f'brevet-{stage.code.lower()}-{jeune.id}.pdf'
    cert.fichier.save(filename, ContentFile(pdf_bytes), save=False)
    cert.save()
    return cert
