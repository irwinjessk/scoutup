import { apiFetch } from '@/api/client'

/** ── CC ─────────────────────────────────────────────── */

export function fetchCcCompetitions() {
  return apiFetch('cc/competitions/')
}

export function createCcCompetition(payload) {
  return apiFetch('cc/competitions/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCcCompetition(id, payload) {
  return apiFetch(`cc/competitions/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function publishCcCompetition(id) {
  return apiFetch(`cc/competitions/${id}/publish/`, { method: 'POST' })
}
