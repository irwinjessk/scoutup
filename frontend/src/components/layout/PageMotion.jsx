import { useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { gsap, useGSAP } from '@/lib/gsap'

/**
 * Entrée de page : fade + léger slide vertical à chaque changement de route.
 */
export function PageMotion({ children, className = '' }) {
  const ref = useRef(null)
  const { pathname } = useLocation()

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      gsap.fromTo(
        el,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
      )
    },
    { dependencies: [pathname] },
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
