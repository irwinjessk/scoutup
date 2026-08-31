import { apiFetch } from '@/api/client'

/** ── CC ─────────────────────────────────────────────── */

export function fetchCcEvaluations() {
  return apiFetch('cc/evaluations/')
}

export function fetchCcEvaluationDetail(id) {
  return apiFetch(`cc/evaluations/${id}/`)
}

export function createCcEvaluation(payload) {
  return apiFetch('cc/evaluations/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCcEvaluation(id, payload) {
  return apiFetch(`cc/evaluations/${id}/`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function publishCcEvaluation(id) {
  return apiFetch(`cc/evaluations/${id}/publish/`, { method: 'POST' })
}

export function closeCcEvaluation(id) {
  return apiFetch(`cc/evaluations/${id}/close/`, { method: 'POST' })
}

export function fetchCcEvaluationResults(id) {
  return apiFetch(`cc/evaluations/${id}/results/`)
}

export function fetchCcEvaluationParticipantDetail(evaluationId, jeuneId) {
  return apiFetch(`cc/evaluations/${evaluationId}/participants/${jeuneId}/`)
}

export function fetchCcPresences() {
  return apiFetch('cc/presences/')
}

/** ── Jeune ──────────────────────────────────────────── */

export function fetchJeuneEvaluations() {
  return apiFetch('jeune/evaluations/')
}

export function joinEvaluation(id) {
  return apiFetch(`jeune/evaluations/${id}/join/`, { method: 'POST' })
}

export function fetchEvaluationQuestions(id) {
  return apiFetch(`jeune/evaluations/${id}/questions/`)
}

export function submitEvaluation(id, reponses) {
  return apiFetch(`jeune/evaluations/${id}/submit/`, {
    method: 'POST',
    body: JSON.stringify({ reponses }),
  })
}

export function fetchJeuneEvaluationAttemptDetail(attemptId) {
  return apiFetch(`jeune/evaluations/attempts/${attemptId}/`)
}

/** ── CG ─────────────────────────────────────────────── */

export function fetchCgEvaluations() {
  return apiFetch('cg/evaluations/')
}
