"""Cycle de vie et correction des évaluations surveillées."""

from __future__ import annotations

from django.utils import timezone

from formation.services.grading import check_answer

from .models import EvaluationAttempt, EvaluationStatut


def sync_closure(evaluation) -> None:
    """Clôture paresseuse : si le temps imparti est écoulé, on referme l'évaluation."""
    if evaluation.statut == EvaluationStatut.OUVERTE and evaluation.closes_at:
        if timezone.now() >= evaluation.closes_at:
            close_evaluation(evaluation)


def close_evaluation(evaluation) -> None:
    evaluation.statut = EvaluationStatut.CLOTUREE
    evaluation.save(update_fields=['statut'])


def grade_attempt(attempt: EvaluationAttempt, reponses: list[dict]) -> EvaluationAttempt:
    """Note chaque réponse soumise côté serveur et enregistre le score de la tentative."""
    questions = {q.id: q for q in attempt.evaluation.questions.all()}
    score = 0
    score_max = sum(q.points for q in questions.values())

    for item in reponses:
        question = questions.get(item.get('question_id'))
        if question is None:
            continue
        est_correcte = check_answer(question, item.get('reponse'))
        points = question.points if est_correcte else 0
        attempt.reponses.update_or_create(
            question=question,
            defaults={
                'reponse': item.get('reponse'),
                'est_correcte': est_correcte,
                'points_obtenus': points,
            },
        )
        score += points

    attempt.score = score
    attempt.score_max = score_max
    attempt.submitted_at = timezone.now()
    attempt.save(update_fields=['score', 'score_max', 'submitted_at'])
    return attempt
