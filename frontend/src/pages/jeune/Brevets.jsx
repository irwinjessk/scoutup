import { useEffect, useState } from 'react'
import { Download, Eye, ExternalLink } from 'lucide-react'

import { downloadBrevet, fetchBrevetBlob, fetchBrevets } from '@/api/formation'
import { ApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  const [preview, setPreview] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function openPreview(cert) {
    setError('')
    setBusyId(cert.id)
    setPreviewLoading(true)
    setPreview(cert)
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      const { objectUrl } = await fetchBrevetBlob(cert)
      setPreviewUrl(objectUrl)
    } catch (err) {
      setPreview(null)
      setPreviewUrl('')
      setError(err instanceof ApiError ? err.message : 'Aperçu impossible.')
    } finally {
      setBusyId(null)
      setPreviewLoading(false)
    }
  }

  function closePreview(open) {
    if (open) return
    setPreview(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
    }
  }

  async function onDownload(cert, fromPreview = false) {
    setBusyId(cert.id)
    setError('')
    try {
      await downloadBrevet(cert, fromPreview ? previewUrl : undefined)
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
          Visualise ton brevet, puis télécharge le PDF.
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
            <button
              type="button"
              onClick={() => openPreview(cert)}
              className="min-w-0 flex-1 text-left transition hover:opacity-90"
            >
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
            </button>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === cert.id}
                onClick={() => openPreview(cert)}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <Eye className="size-3.5" />
                Voir
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Sheet open={Boolean(preview)} onOpenChange={closePreview}>
        <SheetContent
          side="bottom"
          className="flex h-[min(92svh,720px)] flex-col gap-0 border-white/10 bg-[#0d1117] p-0 text-white sm:max-w-none"
          showCloseButton
        >
          <SheetHeader className="shrink-0 border-b border-white/10 px-4 py-3 text-left">
            <SheetTitle className="text-base text-white">
              {preview?.stage_titre || 'Brevet'}
            </SheetTitle>
            <p className="text-xs text-white/45">
              {preview?.nom_affiche}
              {preview?.delivered_at
                ? ` · ${new Date(preview.delivered_at).toLocaleDateString('fr-FR')}`
                : ''}
            </p>
          </SheetHeader>

          <div className="relative min-h-0 flex-1 overflow-hidden bg-[#161b22]">
            {previewLoading ? (
              <p className="p-6 text-sm text-white/45">Chargement de l’aperçu…</p>
            ) : null}
            {!previewLoading && previewUrl ? (
              <iframe
                title={`Aperçu brevet ${preview?.stage_titre || ''}`}
                src={`${previewUrl}#toolbar=0`}
                className="absolute inset-0 h-full w-full border-0 bg-white"
              />
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              disabled={!preview || busyId === preview?.id || !previewUrl}
              onClick={() => preview && onDownload(preview, true)}
              className="bg-[#0073e6] text-white hover:bg-[#0073e6]/90"
            >
              <Download className="size-3.5" />
              Télécharger
            </Button>
            {previewUrl ? (
              <Button
                variant="outline"
                className="border-white/15 bg-transparent text-white hover:bg-white/10"
                onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="size-3.5" />
                Nouvel onglet
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
