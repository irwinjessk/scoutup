import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronRight, Plus, X, XCircle } from 'lucide-react'

import {
  closeCcEvaluation,
  createCcEvaluation,
  fetchCcEvaluationDetail,
  fetchCcEvaluationParticipantDetail,
  fetchCcEvaluationResults,
  fetchCcEvaluations,
  publishCcEvaluation,
  updateCcEvaluation,
} from '@/api/evaluations'
import { ApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const TYPES = [
  { id: 'QCM', label: 'QCM' },
  { id: 'TEXTE_TROUS', label: 'Texte à trous' },
  { id: 'REPONSE_DIRECTE', label: 'Réponse directe' },
]

const STATUT_LABEL = {
  BROUILLON: 'Brouillon',
  OUVERTE: 'Ouverte',
  CLOTUREE: 'Clôturée',
}

function statutTone(statut) {
  if (statut === 'OUVERTE') return 'bg-[var(--chef-primary)]/12 text-[var(--chef-primary)]'
  if (statut === 'CLOTUREE') return 'bg-emerald-50 text-emerald-700'
  return 'bg-slate-100 text-slate-600'
}

function emptyQuestion() {
  return {
    key: Math.random().toString(36).slice(2),
    type: 'QCM',
    enonce: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correct: 'a',
    reponseDirecte: '',
    trousReponses: '',
    points: 1,
  }
}

function countBlanks(enonce) {
  return (enonce.match(/_{3,}/g) || []).length
}

function parseTrousAnswers(raw, nbBlanks) {
  const variants = raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!variants.length) return []
  if (nbBlanks <= 1) return variants.map((v) => [v])
  return variants.map((v) =>
    v
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean),
  )
}

function buildQuestionPayload(q, ordre) {
  const payload = { type: q.type, enonce: q.enonce.trim(), points: Number(q.points) || 1, ordre }

  if (q.type === 'QCM') {
    const options = [
      { id: 'a', texte: q.optionA.trim() },
      { id: 'b', texte: q.optionB.trim() },
    ]
    if (q.optionC.trim()) options.push({ id: 'c', texte: q.optionC.trim() })
    if (q.optionD.trim()) options.push({ id: 'd', texte: q.optionD.trim() })
    const correct = options.find((o) => o.id === q.correct) || options[0]
    payload.options = options
    payload.reponse_attendue = correct
    return payload
  }

  if (q.type === 'TEXTE_TROUS') {
    const nb = countBlanks(q.enonce)
    if (nb < 1) {
      throw new ApiError(`Question ${ordre} : place au moins un trou avec ___ dans l’énoncé.`)
    }
    const sets = parseTrousAnswers(q.trousReponses, nb)
    if (!sets.length) {
      throw new ApiError(`Question ${ordre} : indique au moins une réponse pour les trous.`)
    }
    payload.options = { nb_blanks: nb }
    payload.reponse_attendue = nb === 1 ? sets.map((row) => row[0]) : sets
    return payload
  }

  payload.reponse_attendue = q.reponseDirecte
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
  payload.options = []
  return payload
}

const OPTION_LETTERS = ['a', 'b', 'c', 'd']

/** Inverse de buildQuestionPayload — reconstruit l'état éditable du formulaire
 * à partir d'une question déjà enregistrée (réouverture d'un brouillon). */
function questionToFormState(q) {
  const base = {
    ...emptyQuestion(),
    type: q.type,
    enonce: q.enonce,
    points: q.points,
  }

  if (q.type === 'QCM') {
    const options = Array.isArray(q.options) ? q.options : []
    options.forEach((opt, idx) => {
      const letter = OPTION_LETTERS[idx]
      if (letter) base[`option${letter.toUpperCase()}`] = opt.texte ?? ''
    })
    const expected = q.reponse_attendue
    const matchIdx = options.findIndex(
      (opt) =>
        (expected?.id != null && opt.id === expected.id) ||
        (expected?.texte != null && opt.texte === expected.texte),
    )
    base.correct = OPTION_LETTERS[matchIdx] ?? 'a'
    return base
  }

  if (q.type === 'TEXTE_TROUS') {
    const expected = q.reponse_attendue
    if (Array.isArray(expected) && Array.isArray(expected[0])) {
      base.trousReponses = expected.map((row) => row.join(';')).join('|')
    } else if (Array.isArray(expected)) {
      base.trousReponses = expected.join('|')
    }
    return base
  }

  base.reponseDirecte = Array.isArray(q.reponse_attendue)
    ? q.reponse_attendue.join('|')
    : String(q.reponse_attendue ?? '')
  return base
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

export default function CcEvaluations() {
  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [titre, setTitre] = useState('')
  const [dureeMinutes, setDureeMinutes] = useState(20)
  const [questions, setQuestions] = useState([emptyQuestion()])

  const [resultsFor, setResultsFor] = useState(null)
  const [results, setResults] = useState(null)
  const [resultsLoading, setResultsLoading] = useState(false)

  const [detailFor, setDetailFor] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  async function loadEvaluations() {
    setError('')
    setLoading(true)
    try {
      const data = await fetchCcEvaluations()
      setEvaluations(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvaluations()
  }, [])

  function resetForm() {
    setEditingId(null)
    setTitre('')
    setDureeMinutes(20)
    setQuestions([emptyQuestion()])
    setShowForm(false)
  }

  function updateQuestion(key, patch) {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)))
  }

  async function onEdit(ev) {
    setBusy(true)
    setError('')
    try {
      const data = await fetchCcEvaluationDetail(ev.id)
      setTitre(data.titre)
      setDureeMinutes(data.duree_minutes)
      const sorted = [...(data.questions || [])].sort(
        (a, b) => (a.ordre ?? 0) - (b.ordre ?? 0),
      )
      setQuestions(sorted.length ? sorted.map(questionToFormState) : [emptyQuestion()])
      setEditingId(ev.id)
      setShowForm(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de rouvrir le brouillon.')
    } finally {
      setBusy(false)
    }
  }

  async function onCreate(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const payload = {
        titre: titre.trim(),
        duree_minutes: Number(dureeMinutes) || 20,
        questions: questions.map((q, idx) => buildQuestionPayload(q, idx + 1)),
      }
      if (editingId) {
        await updateCcEvaluation(editingId, payload)
      } else {
        await createCcEvaluation(payload)
      }
      resetForm()
      await loadEvaluations()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function onPublish(id) {
    setBusy(true)
    setError('')
    try {
      await publishCcEvaluation(id)
      await loadEvaluations()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Publication impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function onClose(id) {
    setBusy(true)
    setError('')
    try {
      await closeCcEvaluation(id)
      await loadEvaluations()
      if (resultsFor === id) await onShowResults(id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Clôture impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function onShowResults(id) {
    setResultsFor(id)
    setResultsLoading(true)
    setError('')
    try {
      const data = await fetchCcEvaluationResults(id)
      setResults(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Résultats indisponibles.')
    } finally {
      setResultsLoading(false)
    }
  }

  async function onShowDetail(evaluationId, jeuneId) {
    setDetailFor({ evaluationId, jeuneId })
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const data = await fetchCcEvaluationParticipantDetail(evaluationId, jeuneId)
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Évaluations surveillées</h1>
          <p className="mt-2 text-sm text-[var(--chef-muted)]">
            Les réponses n'affectent pas les foulards — elles servent la note et la présence.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="bg-[var(--chef-primary)] text-white hover:bg-[var(--chef-primary)]/90"
        >
          <Plus className="size-3.5" />
          Créer une évaluation
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/5 px-4 py-3 text-sm text-[#ff3131]">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <form
          onSubmit={onCreate}
          className="space-y-4 rounded-2xl border border-[var(--chef-border)] bg-white p-4"
        >
          {editingId ? (
            <p className="text-sm font-medium text-[var(--chef-primary)]">
              Modification du brouillon
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <input
              required
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Titre — ex. Nœuds et matelotage"
              className="h-10 w-full rounded-lg border border-[var(--chef-border)] px-3 text-sm outline-none focus:border-[var(--chef-primary)]"
            />
            <input
              required
              type="number"
              min={1}
              value={dureeMinutes}
              onChange={(e) => setDureeMinutes(e.target.value)}
              placeholder="Durée (min)"
              className="h-10 w-full rounded-lg border border-[var(--chef-border)] px-3 text-sm outline-none focus:border-[var(--chef-primary)]"
            />
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const blanksPreview = countBlanks(q.enonce)
              return (
                <div
                  key={q.key}
                  className="space-y-3 rounded-xl border border-[var(--chef-border)] px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--chef-ink)]">
                      Question {idx + 1}
                    </p>
                    {questions.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setQuestions((prev) => prev.filter((item) => item.key !== q.key))
                        }
                        className="text-[var(--chef-muted)] hover:text-[var(--chef-accent)]"
                        aria-label="Retirer la question"
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => updateQuestion(q.key, { type: t.id })}
                        className={
                          q.type === t.id
                            ? 'rounded-lg bg-[var(--chef-primary)]/15 px-2.5 py-1 text-xs font-medium text-[var(--chef-primary)]'
                            : 'rounded-lg border border-[var(--chef-border)] px-2.5 py-1 text-xs'
                        }
                      >
                        {t.label}
                      </button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      value={q.points}
                      onChange={(e) => updateQuestion(q.key, { points: e.target.value })}
                      className="ml-auto h-8 w-20 rounded-lg border border-[var(--chef-border)] px-2 text-xs outline-none focus:border-[var(--chef-primary)]"
                      title="Points"
                    />
                  </div>

                  <textarea
                    required
                    value={q.enonce}
                    onChange={(e) => updateQuestion(q.key, { enonce: e.target.value })}
                    placeholder={
                      q.type === 'TEXTE_TROUS'
                        ? 'Ex. La devise Route est ___ · ___ · ___'
                        : 'Énoncé de la question'
                    }
                    className="min-h-16 w-full rounded-lg border border-[var(--chef-border)] px-3 py-2 text-sm outline-none focus:border-[var(--chef-primary)]"
                  />

                  {q.type === 'QCM' ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        ['optionA', 'a', 'Option A (correcte possible)'],
                        ['optionB', 'b', 'Option B'],
                        ['optionC', 'c', 'Option C (optionnel)'],
                        ['optionD', 'd', 'Option D (optionnel)'],
                      ].map(([key, id, ph]) => (
                        <div key={key} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.key}`}
                            checked={q.correct === id}
                            onChange={() => updateQuestion(q.key, { correct: id })}
                            aria-label={`Bonne réponse ${id}`}
                          />
                          <input
                            value={q[key]}
                            onChange={(e) => updateQuestion(q.key, { [key]: e.target.value })}
                            required={id === 'a' || id === 'b'}
                            placeholder={ph}
                            className="h-9 w-full rounded-lg border border-[var(--chef-border)] px-2 text-sm outline-none focus:border-[var(--chef-primary)]"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {q.type === 'TEXTE_TROUS' ? (
                    <div className="space-y-1">
                      <input
                        required
                        value={q.trousReponses}
                        onChange={(e) =>
                          updateQuestion(q.key, { trousReponses: e.target.value })
                        }
                        placeholder={
                          blanksPreview > 1
                            ? 'Grandir;Apprendre;Servir | grandir;apprendre;servir'
                            : 'Grandir | grandir'
                        }
                        className="h-9 w-full rounded-lg border border-[var(--chef-border)] px-3 text-sm outline-none focus:border-[var(--chef-primary)]"
                      />
                      <p className="text-xs text-[var(--chef-muted)]">
                        Trous séparés par <strong>;</strong> · variantes par <strong>|</strong>
                        {blanksPreview > 0 ? ` · ${blanksPreview} détecté(s)` : ''}
                      </p>
                    </div>
                  ) : null}

                  {q.type === 'REPONSE_DIRECTE' ? (
                    <input
                      required
                      value={q.reponseDirecte}
                      onChange={(e) => updateQuestion(q.key, { reponseDirecte: e.target.value })}
                      placeholder="Réponses acceptées (séparées par |)"
                      className="h-9 w-full rounded-lg border border-[var(--chef-border)] px-3 text-sm outline-none focus:border-[var(--chef-primary)]"
                    />
                  ) : null}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
            className="text-sm font-medium text-[var(--chef-primary)] hover:underline"
          >
            + Ajouter une question
          </button>

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={busy}
              className="bg-[var(--chef-primary)] text-white hover:bg-[var(--chef-primary)]/90"
            >
              {busy ? '…' : editingId ? 'Enregistrer les modifications' : 'Créer l’évaluation'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Annuler
            </Button>
          </div>
        </form>
      ) : null}

      <Separator className="bg-[var(--chef-border)]" />

      {loading ? (
        <p className="text-sm text-[var(--chef-muted)]">Chargement…</p>
      ) : evaluations.length === 0 ? (
        <div className="rounded-2xl border border-[var(--chef-border)] bg-white px-5 py-8 text-center text-sm text-[var(--chef-muted)]">
          Aucune évaluation créée pour le moment.
        </div>
      ) : (
        <ul className="space-y-3">
          {evaluations.map((ev) => (
            <li
              key={ev.id}
              className="rounded-2xl border border-[var(--chef-border)] bg-white px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--chef-ink)]">{ev.titre}</p>
                  <p className="text-sm text-[var(--chef-muted)]">
                    {ev.nb_questions} question{ev.nb_questions > 1 ? 's' : ''} ·{' '}
                    {ev.duree_minutes} min · {ev.nb_participants} participant
                    {ev.nb_participants > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className={cn('border-0', statutTone(ev.statut))}>
                    {STATUT_LABEL[ev.statut] || ev.statut}
                  </Badge>
                  {ev.statut === 'BROUILLON' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onEdit(ev)}
                      className="border-[var(--chef-border)]"
                    >
                      Modifier
                    </Button>
                  ) : null}
                  {ev.statut === 'BROUILLON' ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => onPublish(ev.id)}
                      className="bg-[var(--chef-primary)] text-white hover:bg-[var(--chef-primary)]/90"
                    >
                      Publier
                    </Button>
                  ) : null}
                  {ev.statut === 'OUVERTE' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onClose(ev.id)}
                      className="border-[var(--chef-accent)]/40 text-[var(--chef-accent)]"
                    >
                      Clôturer
                    </Button>
                  ) : null}
                  {ev.statut !== 'BROUILLON' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onShowResults(ev.id)}
                      className="border-[var(--chef-border)]"
                    >
                      Résultats
                    </Button>
                  ) : null}
                </div>
              </div>

              {resultsFor === ev.id ? (
                <div className="mt-4 border-t border-[var(--chef-border)] pt-4">
                  {resultsLoading ? (
                    <p className="text-sm text-[var(--chef-muted)]">Chargement des résultats…</p>
                  ) : results ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-xs uppercase tracking-wide text-[var(--chef-muted)]">
                            <th className="pb-2 pr-3 font-medium">Participant</th>
                            <th className="pb-2 pr-3 font-medium">Note</th>
                            <th className="pb-2 pr-3 font-medium">Temps</th>
                            <th className="pb-2 pr-3 font-medium">Présence</th>
                            <th className="pb-2 font-medium" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--chef-border)]">
                          {results.participants.map((p) => (
                            <tr key={p.jeune_id}>
                              <td className="py-2 pr-3 text-[var(--chef-ink)]">
                                {p.nom_complet}
                              </td>
                              <td className="py-2 pr-3 text-[var(--chef-ink)]">
                                {p.score != null ? `${p.score} / ${p.score_max}` : '—'}
                              </td>
                              <td className="py-2 pr-3 text-[var(--chef-muted)]">
                                {p.temps_minutes != null ? `${p.temps_minutes} min` : '—'}
                              </td>
                              <td className="py-2 pr-3">
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'border-0',
                                    p.present
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-700',
                                  )}
                                >
                                  {p.present ? 'Présent' : 'Absent'}
                                </Badge>
                              </td>
                              <td className="py-2 text-right">
                                {p.present ? (
                                  <button
                                    type="button"
                                    onClick={() => onShowDetail(ev.id, p.jeune_id)}
                                    className="inline-flex items-center gap-0.5 text-sm font-medium text-[var(--chef-primary)] hover:underline"
                                  >
                                    Détail
                                    <ChevronRight className="size-3.5" />
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Sheet open={Boolean(detailFor)} onOpenChange={(open) => !open && closeDetail()}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-[var(--chef-border)] bg-white p-0 sm:max-w-md"
          showCloseButton
        >
          <SheetHeader className="shrink-0 border-b border-[var(--chef-border)] px-5 py-4 text-left">
            <SheetTitle className="text-base text-[var(--chef-ink)]">
              {detail?.nom_complet || 'Détail de la participation'}
            </SheetTitle>
            <SheetDescription>
              {evaluations.find((e) => e.id === detailFor?.evaluationId)?.titre}
              {detail ? ` · ${detail.score} / ${detail.score_max} pts` : ''}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {detailError ? (
              <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/5 px-4 py-3 text-sm text-[#ff3131]">
                {detailError}
              </p>
            ) : null}

            {detailLoading ? (
              <p className="text-sm text-[var(--chef-muted)]">Chargement…</p>
            ) : null}

            {!detailLoading && detail
              ? detail.reponses.map((r, idx) => (
                  <div
                    key={r.question_id}
                    className={cn(
                      'rounded-xl border px-4 py-3',
                      r.est_correcte
                        ? 'border-emerald-200 bg-emerald-50/60'
                        : 'border-[#ff3131]/25 bg-[#ff3131]/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--chef-muted)]">
                        Question {idx + 1}
                      </p>
                      {r.est_correcte ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="size-4 shrink-0 text-[#ff3131]" />
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-[var(--chef-ink)]">{r.enonce}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        <span className="text-[var(--chef-muted)]">Réponse donnée : </span>
                        <span className="font-medium text-[var(--chef-ink)]">
                          {formatAnswerValue(r.type, r.reponse)}
                        </span>
                      </p>
                      {!r.est_correcte ? (
                        <p>
                          <span className="text-[var(--chef-muted)]">Réponse attendue : </span>
                          <span className="font-medium text-emerald-700">
                            {formatAnswerValue(r.type, r.reponse_attendue)}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-[var(--chef-muted)]">
                      {r.points_obtenus} / {r.points_max} pt{r.points_max > 1 ? 's' : ''}
                    </p>
                  </div>
                ))
              : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
