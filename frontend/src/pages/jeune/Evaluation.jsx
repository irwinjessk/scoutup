import { useEffect, useState } from 'react'
import { Award, CheckCircle2, ChevronRight, ClipboardCheck, XCircle } from 'lucide-react'

import {
  fetchEvaluationQuestions,
  fetchJeuneEvaluationAttemptDetail,
  fetchJeuneEvaluations,
  joinEvaluation,
  submitEvaluation,
} from '@/api/evaluations'
import { ApiError } from '@/api/client'
import ModuleShell from '@/components/layout/ModuleShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

function splitEnonce(enonce) {
  return String(enonce || '').split(/_{3,}/)
}

function formatAnswerValue(type, value) {
  if (value == null || value === '') return '—'
  if (type === 'QCM') {
    if (value && typeof value === 'object') return value.texte ?? String(value.id ?? '—')
    return String(value)
  }
  if (Array.isArray(value)) {
    if (Array.isArray(value[0])) return value[0].join(' · ')
    return value.join(' · ') || '—'
  }
  return String(value)
}

function formatCountdown(ms) {
  if (ms == null || ms < 0) return '0:00'
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function JeuneEvaluation() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ouvertes, setOuvertes] = useState([])
  const [historique, setHistorique] = useState([])

  const [session, setSession] = useState(null)
  const [answers, setAnswers] = useState({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [now, setNow] = useState(Date.now())

  const [detailFor, setDetailFor] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function loadList() {
    setError('')
    setLoading(true)
    try {
      const data = await fetchJeuneEvaluations()
      setOuvertes(Array.isArray(data.ouvertes) ? data.ouvertes : [])
      setHistorique(Array.isArray(data.historique) ? data.historique : [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadList()
  }, [])

  async function onJoin(evaluation) {
    setBusy(true)
    setError('')
    try {
      await joinEvaluation(evaluation.id)
      const data = await fetchEvaluationQuestions(evaluation.id)
      const initial = {}
      for (const q of data.questions) {
        initial[q.id] = q.type === 'TEXTE_TROUS' ? [] : ''
      }
      setAnswers(initial)
      setSession({ evaluation, questions: data.questions, closesAt: data.closes_at })
      setResult(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de rejoindre.')
    } finally {
      setBusy(false)
    }
  }

  function updateAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  async function onShowAttemptDetail(h) {
    setDetailFor(h)
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const data = await fetchJeuneEvaluationAttemptDetail(h.id)
      setDetail(data)
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'Détail indisponible.')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetailFor(null)
    setDetail(null)
    setDetailError('')
  }

  const remainingMs = session ? new Date(session.closesAt).getTime() - now : null
  const expired = remainingMs != null && remainingMs <= 0

  async function onSubmit(e) {
    e.preventDefault()
    if (!session || busy) return
    setBusy(true)
    setError('')
    try {
      const reponses = session.questions.map((q) => ({
        question_id: q.id,
        reponse: answers[q.id],
      }))
      const data = await submitEvaluation(session.evaluation.id, reponses)
      setResult(data)
      setSession(null)
      await loadList()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Soumission impossible.')
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <ModuleShell title="Évaluation" hint="Résultat de la session." />
        <div className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-5">
          <div className="flex items-center gap-2 text-emerald-300">
            <Award className="size-5" />
            <h2 className="text-lg font-semibold">Réponses envoyées</h2>
          </div>
          <p className="text-2xl font-semibold text-white">
            {result.score} / {result.score_max}
          </p>
          <p className="text-sm text-white/60">
            Ton chef consultera ta note lors du bilan de la réunion.
          </p>
        </div>
        <Button
          onClick={() => setResult(null)}
          className="bg-[#0073e6] text-white hover:bg-[#0073e6]/90"
        >
          Retour
        </Button>
      </div>
    )
  }

  if (session) {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{session.evaluation.titre}</h1>
            <p className="mt-1 text-sm text-white/55">
              Réponds à toutes les questions avant la fin du temps.
            </p>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              'shrink-0 border-0',
              expired ? 'bg-[#ff3131]/15 text-[#ff8a8a]' : 'bg-[#0073e6]/15 text-[#7eb6ff]',
            )}
          >
            {formatCountdown(remainingMs)}
          </Badge>
        </div>

        {error ? (
          <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-3 py-2 text-sm text-[#ff8a8a]">
            {error}
          </p>
        ) : null}

        {expired ? (
          <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-3 py-2 text-sm text-[#ff8a8a]">
            Temps écoulé — soumets tes réponses maintenant.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          {session.questions.map((q, idx) => (
            <div
              key={q.id}
              className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"
            >
              <p className="text-xs uppercase tracking-wider text-white/35">
                Question {idx + 1} · {q.points} pt{q.points > 1 ? 's' : ''}
              </p>

              {q.type === 'TEXTE_TROUS' ? (
                <div className="text-base font-medium leading-relaxed text-white">
                  {splitEnonce(q.enonce).map((part, i, arr) => (
                    <span key={`p-${i}`}>
                      {part}
                      {i < arr.length - 1 ? (
                        <input
                          type="text"
                          value={answers[q.id]?.[i] || ''}
                          onChange={(e) => {
                            const next = [...(answers[q.id] || [])]
                            next[i] = e.target.value
                            updateAnswer(q.id, next)
                          }}
                          aria-label={`Trou ${i + 1}`}
                          className="mx-1 inline-block h-9 min-w-[5.5rem] rounded-lg border border-white/20 bg-white/10 px-2 text-center text-sm font-semibold text-[#7eb6ff] outline-none focus:border-[#0073e6]"
                        />
                      ) : null}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-base font-medium leading-snug text-white">{q.enonce}</p>
              )}

              {q.type === 'QCM' ? (
                <ul className="space-y-2">
                  {(q.options || []).map((opt) => {
                    const id = opt.id ?? opt.texte
                    const active = answers[q.id]?.id === id || answers[q.id] === id
                    return (
                      <li key={String(id)}>
                        <button
                          type="button"
                          onClick={() => updateAnswer(q.id, opt)}
                          className={cn(
                            'w-full rounded-xl border px-4 py-2.5 text-left text-sm transition',
                            active
                              ? 'border-[#0073e6] bg-[#0073e6]/20 text-white'
                              : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10',
                          )}
                        >
                          {opt.texte ?? String(opt)}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}

              {q.type === 'REPONSE_DIRECTE' ? (
                <input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  placeholder="Ta réponse…"
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#0073e6]"
                />
              ) : null}
            </div>
          ))}

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-[#0073e6] text-white hover:bg-[#0073e6]/90"
          >
            {busy ? 'Envoi…' : 'Soumettre mes réponses'}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <ModuleShell title="Évaluation" hint="Les épreuves de réunion." />

      {error ? (
        <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-3 py-2 text-sm text-[#ff8a8a]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/45">Chargement…</p>
      ) : ouvertes.length > 0 ? (
        <div className="space-y-3">
          {ouvertes.map((ev) => (
            <div
              key={ev.id}
              className="space-y-3 rounded-2xl border border-[#0073e6]/30 bg-[#0073e6]/10 px-4 py-5"
            >
              <div className="flex items-center gap-2 text-[#7eb6ff]">
                <ClipboardCheck className="size-5" />
                <h2 className="text-lg font-semibold text-white">{ev.titre}</h2>
              </div>
              <p className="text-sm text-white/60">
                {ev.nb_questions} question{ev.nb_questions > 1 ? 's' : ''} · {ev.duree_minutes}{' '}
                min
              </p>
              <Button
                disabled={busy}
                onClick={() => onJoin(ev)}
                className="w-full bg-[#0073e6] text-white hover:bg-[#0073e6]/90"
              >
                Participer
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-center">
          <p className="text-3xl">🎉</p>
          <p className="text-sm font-medium text-white">Aucune évaluation ouverte</p>
          <p className="text-sm text-white/55">
            Ton chef lancera la prochaine évaluation pendant la réunion. Sois présent — la
            participation compte comme présence !
          </p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-white/70">Ma dernière évaluation</p>
        {historique.length === 0 ? (
          <p className="text-sm text-white/45">Aucune évaluation passée pour l’instant.</p>
        ) : (
          <ul className="space-y-2">
            {historique.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => onShowAttemptDetail(h)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm transition hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <span className="text-white/80">{h.evaluation_titre}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-medium text-white">
                      {h.score} / {h.score_max}
                    </span>
                    <ChevronRight className="size-4 text-white/35" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={Boolean(detailFor)} onOpenChange={(open) => !open && closeDetail()}>
        <SheetContent
          side="bottom"
          className="flex h-[min(88svh,680px)] flex-col gap-0 border-white/10 bg-[#0d1117] p-0 text-white sm:max-w-none"
          showCloseButton
        >
          <SheetHeader className="shrink-0 border-b border-white/10 px-4 py-3 text-left">
            <SheetTitle className="text-base text-white">{detail?.evaluation_titre}</SheetTitle>
            <SheetDescription className="text-white/45">
              {detail ? `${detail.score} / ${detail.score_max} pts` : ''}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {detailError ? (
              <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-3 py-2 text-sm text-[#ff8a8a]">
                {detailError}
              </p>
            ) : null}

            {detailLoading ? <p className="text-sm text-white/45">Chargement…</p> : null}

            {!detailLoading && detail && !detail.corrige ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/60">
                Le correctif sera visible une fois l’évaluation clôturée par ton chef.
              </p>
            ) : null}

            {!detailLoading && detail
              ? detail.reponses.map((r, idx) => (
                  <div
                    key={r.question_id}
                    className={cn(
                      'rounded-xl border px-4 py-3',
                      detail.corrige
                        ? r.est_correcte
                          ? 'border-emerald-500/25 bg-emerald-500/10'
                          : 'border-[#ff3131]/25 bg-[#ff3131]/10'
                        : 'border-white/10 bg-white/[0.04]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-white/35">
                        Question {idx + 1}
                      </p>
                      {detail.corrige ? (
                        r.est_correcte ? (
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                        ) : (
                          <XCircle className="size-4 shrink-0 text-[#ff8a8a]" />
                        )
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-medium text-white">{r.enonce}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        <span className="text-white/45">Ta réponse : </span>
                        <span className="font-medium text-white">
                          {formatAnswerValue(r.type, r.reponse)}
                        </span>
                      </p>
                      {detail.corrige && !r.est_correcte ? (
                        <p>
                          <span className="text-white/45">Réponse attendue : </span>
                          <span className="font-medium text-emerald-400">
                            {formatAnswerValue(r.type, r.reponse_attendue)}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    {detail.corrige ? (
                      <p className="mt-2 text-xs text-white/35">
                        {r.points_obtenus} / {r.points_max} pt{r.points_max > 1 ? 's' : ''}
                      </p>
                    ) : null}
                  </div>
                ))
              : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
