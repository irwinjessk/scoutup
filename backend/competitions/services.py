"""Cycle de vie des compétitions Génie Route + participation jeune (RF-45, RF-47)."""

from __future__ import annotations

import secrets

from django.db import transaction
from django.utils import timezone

from formation.services.grading import check_answer
from gamification.services import apply_penalty, get_or_create_scarf, sync_recoveries

from .models import Competition, CompetitionAttempt, CompetitionQuestion, CompetitionStatut


class CompetitionError(Exception):
    def __init__(self, message: str, *, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def sync_closure(competition: Competition) -> None:
    """Clôture paresseuse : si la durée impartie est écoulée, on referme la compétition."""
    if competition.statut == CompetitionStatut.OUVERTE and competition.closes_at:
        if timezone.now() >= competition.closes_at:
            close_competition(competition)


def close_competition(competition: Competition) -> None:
    """Fige le classement final et clôt la participation (RF-44) : génère le lien
    partageable à cette occasion, une seule fois."""
    competition.statut = CompetitionStatut.CLOTUREE
    update_fields = ['statut']
    if not competition.partage_token:
        competition.partage_token = secrets.token_urlsafe(9)
        update_fields.append('partage_token')
    competition.save(update_fields=update_fields)


def join_competition(jeune, competition: Competition) -> CompetitionAttempt:
    sync_closure(competition)
    if competition.statut != CompetitionStatut.OUVERTE:
        raise CompetitionError("Cette compétition n'est plus ouverte.", status=422)
    attempt, _ = CompetitionAttempt.objects.get_or_create(competition=competition, jeune=jeune)
    return attempt


def _answered_ids(attempt: CompetitionAttempt) -> set[int]:
    return set(attempt.reponses.values_list('question_id', flat=True))


def next_question(jeune, competition: Competition) -> tuple[CompetitionAttempt, CompetitionQuestion | None, dict]:
    sync_closure(competition)
    scarf = sync_recoveries(get_or_create_scarf(jeune))

    attempt = CompetitionAttempt.objects.filter(competition=competition, jeune=jeune).first()
    if attempt is None:
        raise CompetitionError("Rejoins d'abord la compétition.", status=403)

    if competition.statut != CompetitionStatut.OUVERTE:
        return attempt, None, scarf

    if scarf.moities_restantes <= 0:
        raise CompetitionError('Plus de foulard disponible. Attends la récupération.', status=403)

    done = _answered_ids(attempt)
    question = (
        competition.questions.exclude(id__in=done).order_by('ordre', 'id').first()
    )
    return attempt, question, scarf


@transaction.atomic
def answer_competition_question(jeune, competition: Competition, question_id, reponse) -> dict:
    sync_closure(competition)
    if competition.statut != CompetitionStatut.OUVERTE:
        raise CompetitionError('Cette compétition est clôturée.', status=422)

    scarf = sync_recoveries(get_or_create_scarf(jeune))
    if scarf.moities_restantes <= 0:
        raise CompetitionError('Plus de foulard disponible. Attends la récupération.', status=403)

    attempt = (
        CompetitionAttempt.objects.select_for_update()
        .filter(competition=competition, jeune=jeune)
        .first()
    )
    if attempt is None:
        raise CompetitionError("Rejoins d'abord la compétition.", status=403)

    question = competition.questions.filter(pk=question_id).first()
    if not question:
        raise CompetitionError('Question introuvable.', status=404)

    if attempt.reponses.filter(question=question).exists():
        raise CompetitionError('Tu as déjà répondu à cette question.', status=409)

    est_correcte = check_answer(question, reponse)
    points = question.points if est_correcte else 0

    attempt.reponses.create(
        question=question,
        reponse=reponse,
        est_correcte=est_correcte,
        points_obtenus=points,
    )
    if not est_correcte:
        apply_penalty(jeune)

    attempt.score += points
    attempt.save(update_fields=['score', 'updated_at'])

    return {
        'est_correcte': est_correcte,
        'points_obtenus': points,
        'score': attempt.score,
    }


def build_classement(competition: Competition, *, moi_id=None) -> list[dict]:
    """Classement d'une compétition, meilleur score en tête (RF-43, RF-46, RF-49)."""
    attempts = competition.attempts.select_related('jeune').order_by('-score', 'updated_at')
    rows = []
    for rang, attempt in enumerate(attempts, start=1):
        row = {
            'rang': rang,
            'jeune_id': attempt.jeune_id,
            'nom_complet': attempt.jeune.nom_complet,
            'score': attempt.score,
            'derniere_reponse': attempt.updated_at,
        }
        if moi_id is not None:
            row['moi'] = attempt.jeune_id == moi_id
        rows.append(row)
    return rows
