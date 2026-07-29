"""Délivrance des brevets PDF."""

from __future__ import annotations

import uuid
from io import BytesIO

from django.core.files.base import ContentFile

from ..models import Certificate
from ..pdf import build_brevet_pdf


def deliver_certificate(jeune, stage) -> Certificate:
    existing = Certificate.objects.filter(jeune=jeune, stage=stage).first()
    if existing:
        return existing

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
