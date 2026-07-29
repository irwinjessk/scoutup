import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

import { downloadBrevet, fetchBrevets } from '@/api/formation'
import { ApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const COLOR = {
  vert: 'bg-emerald-500/20 text-emerald-300',
  bleu: 'bg-[#0073e6]/20 text-[#7eb6ff]',
  or: 'bg-[#e8b923]/20 text-[#e8b923]',
  rouge: 'bg-[#ff3131]/20 text-[#ff8a8a]',
}

export default function JeuneBrevets() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError('')
      setLoading(true)
      try {
        const data = await fetchBrevets()
        if (!cancelled) setItems(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Chargement impossible.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onDownload(cert) {
    setBusyId(cert.id)
    setError('')
    try {
      await downloadBrevet(cert)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Téléchargement impossible.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Brevets</h1>
        <p className="mt-1 text-sm text-white/55">
          Tes certificats PDF délivrés à la validation d’étape.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-3 py-2 text-sm text-[#ff8a8a]">
          {error}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-white/45">Chargement…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-white/45">
          Aucun brevet pour l’instant. Valide une étape de formation pour en obtenir un.
        </p>
      ) : null}

      <ul className="space-y-3">
        {items.map((cert) => (
          <li
            key={cert.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{cert.stage_titre}</p>
              <p className="mt-0.5 text-xs text-white/40">
                {cert.nom_affiche}
                {cert.delivered_at
                  ? ` · ${new Date(cert.delivered_at).toLocaleDateString('fr-FR')}`
                  : ''}
              </p>
              <Badge
                className={cn(
                  'mt-2 border-0 capitalize',
                  COLOR[cert.couleur] || 'bg-white/10 text-white/60',
                )}
              >
                {cert.couleur || 'brevet'}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={busyId === cert.id}
              onClick={() => onDownload(cert)}
              className="shrink-0 border-white/15 text-white hover:bg-white/10"
            >
              <Download className="size-3.5" />
              {busyId === cert.id ? '…' : 'PDF'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
