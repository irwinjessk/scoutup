"""Placement initial d'étape (choix jeune une fois, ou correction CC)."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from ..models import FormationProgress, ProgressStatut, Stage
from .progress import FormationError, _active_questions, ensure_default_stages


@transaction.atomic
def place_jeune_at_stage(jeune, stage: Stage, *, by_cc: bool = False) -> object:
    """
    Place le jeune sur une étape :
    - étapes avant → ACQUIS (non jouables)
    - étape choisie → EN_COURS
    - étapes après → pas encore ouvertes
    """
    if not jeune.communaute_id:
        raise FormationError('Aucune communauté associée.', status=400)

    if stage.communaute_id != jeune.communaute_id or not stage.actif:
        raise FormationError('Étape invalide pour cette communauté.', status=400)

    if jeune.etape_placee_le and not by_cc:
        raise FormationError(
            'Ton étape est déjà fixée. Demande à ton chef de communauté de la corriger.',
            status=403,
        )

    ensure_default_stages(jeune.communaute)

    # Reset progression formation (placement / re-placement CC).
    FormationProgress.objects.filter(jeune=jeune).delete()

    stages = Stage.objects.filter(communaute_id=jeune.communaute_id, actif=True).order_by(
        'ordre'
    )
    for s in stages:
        if s.ordre < stage.ordre:
            FormationProgress.objects.create(
                jeune=jeune,
                stage=s,
                statut=ProgressStatut.ACQUIS,
                nb_total=_active_questions(s).count(),
                nb_reussies=0,
                completed_at=timezone.now(),
            )
        elif s.id == stage.id:
            FormationProgress.objects.create(
                jeune=jeune,
                stage=s,
                statut=ProgressStatut.EN_COURS,
                nb_total=_active_questions(s).count(),
                nb_reussies=0,
            )

    jeune.etape_courante = stage
    jeune.etape_placee_le = timezone.now()
    jeune.save(update_fields=['etape_courante', 'etape_placee_le', 'updated_at'])
    return jeune
