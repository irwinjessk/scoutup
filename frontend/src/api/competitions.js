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

/** ── Jeune ──────────────────────────────────────────── */

export function fetchJeuneCompetitions() {
  return apiFetch('jeune/competitions/')
}

export function joinCompetition(id) {
  return apiFetch(`jeune/competitions/${id}/join/`, { method: 'POST' })
}

export function fetchNextCompetitionQuestion(id) {
  return apiFetch(`jeune/competitions/${id}/question/`)
}

export function answerCompetitionQuestion(id, { questionId, reponse }) {
  return apiFetch(`jeune/competitions/${id}/repondre/`, {
    method: 'POST',
    body: JSON.stringify({ question_id: questionId, reponse }),
  })
}
