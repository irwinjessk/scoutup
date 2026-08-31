import { apiFetch } from '@/api/client'

/** ── CC ─────────────────────────────────────────────── */

export function fetchCcCompetitions() {
  return apiFetch('cc/competitions/')
}

export function fetchCcCompetitionDetail(id) {
  return apiFetch(`cc/competitions/${id}/`)
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

export function closeCcCompetition(id) {
  return apiFetch(`cc/competitions/${id}/close/`, { method: 'POST' })
}

export function fetchCcCompetitionClassement(id) {
  return apiFetch(`cc/competitions/${id}/classement/`)
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

export function fetchJeuneCompetitionClassement(id) {
  return apiFetch(`jeune/competitions/${id}/classement/`)
}

/** ── CG ─────────────────────────────────────────────── */

export function fetchCgCompetitions() {
  return apiFetch('cg/competitions/')
}

/** ── Public (lien partageable) ─────────────────────────── */

export function fetchCompetitionShare(token) {
  return apiFetch(`partage/competitions/${token}/`, { auth: false })
}
