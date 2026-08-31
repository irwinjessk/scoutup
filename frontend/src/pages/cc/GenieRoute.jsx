import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'

import {
  createCcCompetition,
  fetchCcCompetitions,
  publishCcCompetition,
} from '@/api/competitions'
import { ApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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

export default function CcGenieRoute() {
  const [competitions, setCompetitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [titre, setTitre] = useState('')
  const [dureeJours, setDureeJours] = useState(2)
  const [questions, setQuestions] = useState([emptyQuestion()])

  async function loadCompetitions() {
    setError('')
    setLoading(true)
    try {
      const data = await fetchCcCompetitions()
      setCompetitions(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCompetitions()
  }, [])

  function resetForm() {
    setTitre('')
    setDureeJours(2)
    setQuestions([emptyQuestion()])
    setShowForm(false)
  }

  function updateQuestion(key, patch) {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)))
  }

  async function onCreate(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const payload = {
        titre: titre.trim(),
        duree_jours: Number(dureeJours) || 2,
        questions: questions.map((q, idx) => buildQuestionPayload(q, idx + 1)),
      }
      await createCcCompetition(payload)
      resetForm()
      await loadCompetitions()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Création impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function onPublish(id) {
    setBusy(true)
    setError('')
    try {
      await publishCcCompetition(id)
      await loadCompetitions()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Publication impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Génie Route</h1>
          <p className="mt-2 text-sm text-[var(--chef-muted)]">
            Compétition de connaissances entre routiers de ta communauté.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="bg-[var(--chef-primary)] text-white hover:bg-[var(--chef-primary)]/90"
        >
          <Plus className="size-3.5" />
          Créer une compétition
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
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <input
              required
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Titre — ex. Génie Route de rentrée"
              className="h-10 w-full rounded-lg border border-[var(--chef-border)] px-3 text-sm outline-none focus:border-[var(--chef-primary)]"
            />
            <input
              required
              type="number"
              min={1}
              value={dureeJours}
              onChange={(e) => setDureeJours(e.target.value)}
              placeholder="Durée (jours)"
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
          <p className="text-xs text-[var(--chef-muted)]">
            Le cahier des charges recommande une banque d'une soixantaine de questions.
          </p>

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              disabled={busy}
              className="bg-[var(--chef-primary)] text-white hover:bg-[var(--chef-primary)]/90"
            >
              {busy ? '…' : 'Créer la compétition'}
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
      ) : competitions.length === 0 ? (
        <div className="rounded-2xl border border-[var(--chef-border)] bg-white px-5 py-8 text-center text-sm text-[var(--chef-muted)]">
          Aucune compétition créée pour le moment.
        </div>
      ) : (
        <ul className="space-y-3">
          {competitions.map((comp) => (
            <li
              key={comp.id}
              className="rounded-2xl border border-[var(--chef-border)] bg-white px-4 py-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--chef-ink)]">{comp.titre}</p>
                  <p className="text-sm text-[var(--chef-muted)]">
                    {comp.nb_questions} question{comp.nb_questions > 1 ? 's' : ''} ·{' '}
                    {comp.duree_jours} jour{comp.duree_jours > 1 ? 's' : ''} ·{' '}
                    {comp.nb_participants} participant{comp.nb_participants > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className={cn('border-0', statutTone(comp.statut))}>
                    {STATUT_LABEL[comp.statut] || comp.statut}
                  </Badge>
                  {comp.statut === 'BROUILLON' ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => onPublish(comp.id)}
                      className="bg-[var(--chef-primary)] text-white hover:bg-[var(--chef-primary)]/90"
                    >
                      Publier
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
