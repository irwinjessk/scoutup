"""Parcours formation jeune + règles RF-19."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from gamification.services import (
    apply_penalty,
    get_or_create_scarf,
    serialize_scarf,
    sync_recoveries,
)

from ..models import FormationProgress, ProgressStatut, Question, Stage, StageCode
from .certificates import deliver_certificate
from .grading import check_answer


class FormationError(Exception):
    def __init__(self, message: str, *, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def default_stage_defs():
    return [
        {'code': StageCode.NOVICIAT, 'ordre': 1, 'titre': 'Noviciat', 'couleur_brevet': 'vert'},
        {
            'code': StageCode.APPRENTISSAGE,
            'ordre': 2,
            'titre': 'Apprentissage',
            'couleur_brevet': 'bleu',
        },
        {
            'code': StageCode.COMPAGNONNAGE,
            'ordre': 3,
            'titre': 'Compagnonnage',
            'couleur_brevet': 'or',
        },
        {
            'code': StageCode.DEPART_ROUTIER,
            'ordre': 4,
            'titre': 'Départ Routier',
            'couleur_brevet': 'rouge',
        },
    ]


@transaction.atomic
def ensure_default_stages(communaute, created_by=None):
    """Crée les 4 étapes Route si absentes."""
    created = []
    for spec in default_stage_defs():
        stage, was_created = Stage.objects.get_or_create(
            communaute=communaute,
            code=spec['code'],
            defaults={
                'ordre': spec['ordre'],
                'titre': spec['titre'],
                'couleur_brevet': spec['couleur_brevet'],
                'created_by': created_by,
                'nb_questions_parcours': 0,
                'actif': True,
            },
        )
        if was_created:
            created.append(stage)
    return Stage.objects.filter(communaute=communaute, actif=True).order_by('ordre'), created


def _active_questions(stage: Stage):
    return Question.objects.filter(stage=stage, actif=True).order_by('ordre', 'id')


def _succeeded_ids(progress: FormationProgress) -> set[int]:
    ids = set()
    for item in progress.reponses or []:
        if item.get('ok') and item.get('question_id') is not None:
            ids.add(int(item['question_id']))
    return ids


def refresh_progress_totals(progress: FormationProgress) -> FormationProgress:
    qs = _active_questions(progress.stage)
    total = qs.count()
    active_ids = set(qs.values_list('id', flat=True))
    progress.nb_total = total
    progress.nb_reussies = len(_succeeded_ids(progress) & active_ids)
    if progress.stage.nb_questions_parcours != total:
        progress.stage.nb_questions_parcours = total
        progress.stage.save(update_fields=['nb_questions_parcours'])
    progress.save(update_fields=['nb_total', 'nb_reussies'])
    return progress


@transaction.atomic
def start_formation(jeune, stage_id: int | None = None) -> FormationProgress:
    if not jeune.communaute_id:
        raise FormationError('Aucune communauté associée.', status=400)

    ensure_default_stages(jeune.communaute)

    if stage_id:
        stage = Stage.objects.filter(
            pk=stage_id,
            communaute_id=jeune.communaute_id,
            actif=True,
        ).first()
    else:
        stage = jeune.etape_courante
        if stage is None:
            stage = (
                Stage.objects.filter(communaute_id=jeune.communaute_id, actif=True)
                .order_by('ordre')
                .first()
            )

    if stage is None:
        raise FormationError('Aucune étape disponible.', status=404)

    progress = FormationProgress.objects.filter(jeune=jeune, stage=stage).first()
    if progress and progress.statut == ProgressStatut.VERROUILLE:
        raise FormationError('Cette étape est verrouillée (RF-19).', status=403)

    if progress is None:
        previous = Stage.objects.filter(
            communaute_id=jeune.communaute_id,
            ordre=stage.ordre - 1,
            actif=True,
        ).first()
        if previous:
            prev_ok = FormationProgress.objects.filter(
                jeune=jeune,
                stage=previous,
                statut=ProgressStatut.VALIDE,
            ).exists()
            if not prev_ok:
                raise FormationError(
                    'Valide l’étape précédente avant de commencer celle-ci.',
                    status=403,
                )

        progress = FormationProgress.objects.create(
            jeune=jeune,
            stage=stage,
            statut=ProgressStatut.EN_COURS,
            nb_total=_active_questions(stage).count(),
        )
        if jeune.etape_courante_id != stage.id:
            jeune.etape_courante = stage
            jeune.save(update_fields=['etape_courante', 'updated_at'])

    return refresh_progress_totals(progress)


def overview_for_jeune(jeune) -> list[dict]:
    if not jeune.communaute_id:
        return []
    ensure_default_stages(jeune.communaute)
    stages = Stage.objects.filter(communaute_id=jeune.communaute_id, actif=True).order_by('ordre')
    progress_map = {
        p.stage_id: p
        for p in FormationProgress.objects.filter(jeune=jeune, stage__in=stages)
    }
    rows = []
    for stage in stages:
        p = progress_map.get(stage.id)
        rows.append(
            {
                'stage': stage,
                'progress': p,
                'statut': p.statut if p else None,
                'nb_reussies': p.nb_reussies if p else 0,
                'nb_total': p.nb_total if p else stage.nb_questions_parcours,
            }
        )
    return rows


def next_question(jeune) -> tuple[FormationProgress, Question | None, dict]:
    scarf = serialize_scarf(sync_recoveries(get_or_create_scarf(jeune)))
    if scarf['moities_restantes'] <= 0:
        raise FormationError(
            'Plus de foulard disponible. Attends la récupération.',
            status=403,
        )

    stage = jeune.etape_courante
    if stage is None:
        raise FormationError('Aucune étape courante. Lance la formation.', status=400)

    progress = FormationProgress.objects.filter(jeune=jeune, stage=stage).first()
    if progress is None:
        progress = start_formation(jeune, stage.id)
    if progress.statut == ProgressStatut.VERROUILLE:
        raise FormationError('Étape verrouillée.', status=403)
    if progress.statut == ProgressStatut.VALIDE:
        return progress, None, scarf

    progress = refresh_progress_totals(progress)
    done = _succeeded_ids(progress)
    question = _active_questions(stage).exclude(id__in=done).order_by('ordre', 'id').first()
    return progress, question, scarf


@transaction.atomic
def answer_question(jeune, question_id, reponse) -> dict:
    scarf_state = sync_recoveries(get_or_create_scarf(jeune))
    if scarf_state.moities_restantes <= 0:
        raise FormationError(
            'Plus de foulard disponible. Attends la récupération.',
            status=403,
        )

    question = (
        Question.objects.select_related('stage').filter(pk=question_id, actif=True).first()
    )
    if not question:
        raise FormationError('Question introuvable.', status=404)
    if jeune.etape_courante_id and question.stage_id != jeune.etape_courante_id:
        raise FormationError(
            'Cette question ne correspond pas à ton étape courante.',
            status=400,
        )

    progress = (
        FormationProgress.objects.select_for_update()
        .filter(jeune=jeune, stage=question.stage)
        .first()
    )
    if progress is None:
        progress = start_formation(jeune, question.stage_id)
    if progress.statut != ProgressStatut.EN_COURS:
        raise FormationError('Parcours non actif sur cette étape.', status=400)

    ok = check_answer(question, reponse)
    history = list(progress.reponses or [])
    history.append(
        {
            'question_id': question.id,
            'ok': ok,
            'at': timezone.now().isoformat(),
        }
    )
    progress.reponses = history
    progress.save(update_fields=['reponses'])

    brevet = None
    completed = False
    if ok:
        progress = refresh_progress_totals(progress)
        if progress.nb_total > 0 and progress.nb_reussies >= progress.nb_total:
            completed = True
            brevet = complete_stage(jeune, progress)
    else:
        scarf_state = apply_penalty(jeune)

    return {
        'ok': ok,
        'explication': question.explication or '',
        'progress': progress,
        'foulard': serialize_scarf(
            scarf_state if not ok else sync_recoveries(get_or_create_scarf(jeune))
        ),
        'completed': completed,
        'brevet': brevet,
    }


@transaction.atomic
def complete_stage(jeune, progress: FormationProgress):
    """RF-19 : valide N, brevet, ouvre N+1, verrouille N-1."""
    progress.statut = ProgressStatut.VALIDE
    progress.completed_at = timezone.now()
    progress.save(
        update_fields=['statut', 'completed_at', 'reponses', 'nb_reussies', 'nb_total']
    )

    brevet = deliver_certificate(jeune, progress.stage)

    previous = Stage.objects.filter(
        communaute_id=progress.stage.communaute_id,
        ordre=progress.stage.ordre - 1,
        actif=True,
    ).first()
    if previous:
        FormationProgress.objects.filter(jeune=jeune, stage=previous).exclude(
            statut=ProgressStatut.VERROUILLE,
        ).update(statut=ProgressStatut.VERROUILLE)

    nxt = Stage.objects.filter(
        communaute_id=progress.stage.communaute_id,
        ordre=progress.stage.ordre + 1,
        actif=True,
    ).first()
    if nxt:
        FormationProgress.objects.get_or_create(
            jeune=jeune,
            stage=nxt,
            defaults={
                'statut': ProgressStatut.EN_COURS,
                'nb_total': _active_questions(nxt).count(),
            },
        )
        jeune.etape_courante = nxt
        jeune.save(update_fields=['etape_courante', 'updated_at'])

    return brevet
