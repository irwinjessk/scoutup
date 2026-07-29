"""Service foulard : pénalité + récupération 15 min."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .models import ScarfState

MAX_MOITIES = 6
RECOVERY_MINUTES = 15


def get_or_create_scarf(jeune) -> ScarfState:
    state, _ = ScarfState.objects.get_or_create(jeune=jeune)
    return state


def _parse_ts(value):
    if isinstance(value, str):
        dt = parse_datetime(value)
        if dt is None:
            return None
        if timezone.is_naive(dt):
            return timezone.make_aware(dt, timezone.get_current_timezone())
        return dt
    return value


def sync_recoveries(state: ScarfState, *, save: bool = True) -> ScarfState:
    """Restaure les moitiés dont l'horaire de récupération est passé."""
    now = timezone.now()
    remaining = []
    restored = 0
    for raw in state.recovery_at or []:
        ts = _parse_ts(raw)
        if ts is None:
            continue
        if ts <= now:
            restored += 1
        else:
            remaining.append(ts.isoformat())

    if restored:
        state.moities_perdues = max(0, state.moities_perdues - restored)
        state.recovery_at = remaining
        if save:
            state.save(update_fields=['moities_perdues', 'recovery_at', 'updated_at'])
    elif remaining != (state.recovery_at or []):
        state.recovery_at = remaining
        if save:
            state.save(update_fields=['recovery_at', 'updated_at'])
    return state


def apply_penalty(jeune) -> ScarfState:
    """−1 moitié + planification récupération +15 min."""
    state = sync_recoveries(get_or_create_scarf(jeune), save=False)
    if state.moities_perdues >= MAX_MOITIES:
        state.save(update_fields=['moities_perdues', 'recovery_at', 'updated_at'])
        return state

    state.moities_perdues += 1
    recover_at = timezone.now() + timedelta(minutes=RECOVERY_MINUTES)
    recoveries = list(state.recovery_at or [])
    recoveries.append(recover_at.isoformat())
    state.recovery_at = recoveries
    state.save(update_fields=['moities_perdues', 'recovery_at', 'updated_at'])
    return state


def serialize_scarf(state: ScarfState) -> dict:
    state = sync_recoveries(state)
    return {
        'moities_perdues': state.moities_perdues,
        'moities_restantes': state.moities_restantes,
        'foulards_restants': state.foulards_restants,
        'recovery_at': state.recovery_at or [],
        'updated_at': state.updated_at.isoformat() if state.updated_at else None,
    }
