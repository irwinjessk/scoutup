import { apiFetch, ApiError } from '@/api/client'
import { env } from '@/config/env'
import { getAccessToken } from '@/stores/auth'

/** ── Jeune ─────────────────────────────────────────── */

export function fetchFormationOverview() {
  return apiFetch('jeune/formation/')
}

export function startFormation(stageId) {
  return apiFetch('jeune/formation/start/', {
    method: 'POST',
    body: JSON.stringify(stageId != null ? { stage_id: stageId } : {}),
  })
}

export function fetchNextQuestion() {
  return apiFetch('jeune/formation/next-question/')
}

export function answerQuestion({ questionId, reponse }) {
  return apiFetch('jeune/formation/answer/', {
    method: 'POST',
    body: JSON.stringify({ question_id: questionId, reponse }),
  })
}

export function fetchFoulard() {
  return apiFetch('jeune/foulard/')
}

export function fetchBrevets() {
  return apiFetch('jeune/brevets/')
}

/** Charge le PDF brevet (blob + object URL). Penser à revokeObjectURL après usage. */
export async function fetchBrevetBlob(cert) {
  const path =
    cert?.download_url?.replace(/^\/?api\/v1\//, '') ||
    `jeune/brevets/${cert.id}/download/`
  const url = `${env.apiUrl.replace(/\/$/, '')}/api/v1/${path.replace(/^\//, '')}`
  const token = getAccessToken()
  // Pas d'Accept: application/pdf — DRF renvoie 406 (négociation de contenu).
  const response = await fetch(url, {
    headers: {
      Accept: '*/*',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let detail = text
    try {
      detail = JSON.parse(text)?.detail || text
    } catch {
      /* keep text */
    }
    throw new ApiError(detail || `Téléchargement impossible (${response.status})`, {
      status: response.status,
    })
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(
    blob.type ? blob : new Blob([blob], { type: 'application/pdf' }),
  )
  return { blob, objectUrl }
}

export async function downloadBrevet(cert, existingObjectUrl) {
  let objectUrl = existingObjectUrl
  let shouldRevoke = false
  if (!objectUrl) {
    ;({ objectUrl } = await fetchBrevetBlob(cert))
    shouldRevoke = true
  }
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = `brevet-${(cert.stage_code || 'scout').toLowerCase()}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  if (shouldRevoke) URL.revokeObjectURL(objectUrl)
}

/** ── CC ─────────────────────────────────────────────── */

export function fetchCcStages() {
  return apiFetch('cc/stages/')
}

export function initCcStages() {
  return apiFetch('cc/stages/', { method: 'POST', body: JSON.stringify({}) })
}

export function updateCcStage(id, payload) {
  return apiFetch(`cc/stages/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function fetchCcQuestions(stageId) {
  return apiFetch(`cc/stages/${stageId}/questions/`)
}

export function createCcQuestion(stageId, payload) {
  return apiFetch(`cc/stages/${stageId}/questions/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCcQuestion(id, payload) {
  return apiFetch(`cc/questions/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteCcQuestion(id) {
  return apiFetch(`cc/questions/${id}/`, { method: 'DELETE' })
}
