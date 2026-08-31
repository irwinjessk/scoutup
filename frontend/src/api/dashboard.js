import { apiFetch } from '@/api/client'

export function fetchCcDashboard() {
  return apiFetch('cc/dashboard/')
}

export function fetchCgDashboard() {
  return apiFetch('cg/dashboard/')
}
