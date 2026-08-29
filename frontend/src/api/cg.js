import { apiFetch } from '@/api/client'

export function fetchPendingCCs() {
  return apiFetch('cg/cc/pending/')
}

export function fetchActiveCCs() {
  return apiFetch('cg/cc/')
}

export function fetchCGFormations() {
  return apiFetch('cg/formations/')
}

export function acceptCC(id) {
  return apiFetch(`cg/cc/${id}/accept/`, { method: 'POST' })
}

export function rejectCC(id) {
  return apiFetch(`cg/cc/${id}/reject/`, { method: 'POST' })
}
