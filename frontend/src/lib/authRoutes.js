/** Chemins d'accueil par rôle utilisateur. */
export function homeForRole(role, user) {
  if (role === 'CC') return '/cc'
  if (role === 'CG') return '/cg'
  if (role === 'JEUNE' && needsEtapePlacement(user)) {
    return '/jeune/placement'
  }
  return '/jeune'
}

export function isPendingStatus(status) {
  return status === 'EN_ATTENTE' || status === 'PENDING'
}

/** Jeune actif sans placement d’étape initial. */
export function needsEtapePlacement(user) {
  if (!user || user.role !== 'JEUNE') return false
  return !(user.etape_placee || user.etape_placee_le)
}
