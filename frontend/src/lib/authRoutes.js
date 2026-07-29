/** Chemins d'accueil par rôle utilisateur. */
export function homeForRole(role) {
  if (role === 'CC') return '/cc'
  if (role === 'CG') return '/cg'
  return '/jeune'
}

export function isPendingStatus(status) {
  return status === 'EN_ATTENTE' || status === 'PENDING'
}
