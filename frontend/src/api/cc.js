import { apiFetch } from '@/api/client'

export function fetchPendingJeunes() {
  return apiFetch('cc/jeunes/pending/')
}

export function fetchActiveJeunes() {
  return apiFetch('cc/jeunes/')
}

export function acceptJeune(id) {
  return apiFetch(`cc/jeunes/${id}/accept/`, { method: 'POST' })
}

export function rejectJeune(id) {
  return apiFetch(`cc/jeunes/${id}/reject/`, { method: 'POST' })
}
