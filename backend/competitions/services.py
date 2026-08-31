"""Cycle de vie des compétitions Génie Route."""

from __future__ import annotations

from django.utils import timezone

from .models import Competition, CompetitionStatut


def sync_closure(competition: Competition) -> None:
    """Clôture paresseuse : si la durée impartie est écoulée, on referme la compétition."""
    if competition.statut == CompetitionStatut.OUVERTE and competition.closes_at:
        if timezone.now() >= competition.closes_at:
            close_competition(competition)


def close_competition(competition: Competition) -> None:
    competition.statut = CompetitionStatut.CLOTUREE
    competition.save(update_fields=['statut'])
