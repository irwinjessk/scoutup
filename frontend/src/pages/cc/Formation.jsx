import { useEffect, useState } from 'react'
import { Eye, EyeOff, Pencil, Plus } from 'lucide-react'

import {
  createCcQuestion,
  fetchCcQuestions,
  fetchCcStages,
  initCcStages,
  updateCcQuestion,
} from '@/api/formation'
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

const TYPE_LABEL = {
  QCM: 'QCM',
  TEXTE_TROUS: 'Texte à trous',
  REPONSE_DIRECTE: 'Réponse directe',
}

const emptyForm = {
  type: 'QCM',
  enonce: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correct: 'a',
  reponseDirecte: '',
  trousReponses: '',
  explication: '',
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
  if (nbBlanks <= 1) {
    return variants.map((v) => [v])
  }
  return variants.map((v) =>
    v
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean),
  )
}

function formatTrousAnswers(expected, nbBlanks) {
  if (nbBlanks <= 1) {
    const list = Array.isArray(expected) ? expected : [expected]
    if (list.length && Array.isArray(list[0])) {
      return list.map((row) => row[0]).join(' | ')
    }
    return list.map(String).join(' | ')
  }
  if (Array.isArray(expected) && expected.length && Array.isArray(expected[0])) {
    return expected.map((row) => row.join(';')).join(' | ')
  }
  if (Array.isArray(expected)) return expected.join(';')
  return String(expected || '')
}

function questionToForm(q) {
  const base = {
    ...emptyForm,
    type: q.type,
    enonce: q.enonce || '',
    explication: q.explication || '',
  }
  if (q.type === 'QCM') {
    const opts = Array.isArray(q.options) ? q.options : []
    const byId = Object.fromEntries(opts.map((o) => [o.id, o.texte || '']))
    const correctId =
      (typeof q.reponse_attendue === 'object' && q.reponse_attendue?.id) ||
      opts[0]?.id ||
      'a'
    return {
      ...base,
      optionA: byId.a || opts[0]?.texte || '',
      optionB: byId.b || opts[1]?.texte || '',
      optionC: byId.c || opts[2]?.texte || '',
      optionD: byId.d || opts[3]?.texte || '',
      correct: correctId,
    }
  }
  if (q.type === 'TEXTE_TROUS') {
    const nb = q.options?.nb_blanks || countBlanks(q.enonce) || 1
    return {
      ...base,
      trousReponses: formatTrousAnswers(q.reponse_attendue, nb),
    }
  }
  const accepted = Array.isArray(q.reponse_attendue)
    ? q.reponse_attendue.join(' | ')
    : String(q.reponse_attendue || '')
  return { ...base, reponseDirecte: accepted }
}

function buildPayload(form, { ordre, actif = true } = {}) {
  const payload = {
    type: form.type,
    enonce: form.enonce.trim(),
    explication: form.explication.trim(),
    actif,
  }
  if (ordre != null) payload.ordre = ordre

  if (form.type === 'QCM') {
    const options = [
      { id: 'a', texte: form.optionA.trim() },
      { id: 'b', texte: form.optionB.trim() },
    ]
    if (form.optionC.trim()) options.push({ id: 'c', texte: form.optionC.trim() })
    if (form.optionD.trim()) options.push({ id: 'd', texte: form.optionD.trim() })
    const correct = options.find((o) => o.id === form.correct) || options[0]
    payload.options = options
    payload.reponse_attendue = correct
    return payload
  }

  if (form.type === 'TEXTE_TROUS') {
    const nb = countBlanks(form.enonce)
    if (nb < 1) {
      throw new ApiError('Place au moins un trou avec ___ dans l’énoncé.')
    }
    const sets = parseTrousAnswers(form.trousReponses, nb)
    if (!sets.length) {
      throw new ApiError('Indique au moins une réponse pour les trous.')
    }
    if (sets.some((row) => row.length !== nb)) {
      throw new ApiError(
        `Chaque variante doit avoir ${nb} réponse(s) séparée(s) par « ; ».`,
      )
    }
    payload.options = { nb_blanks: nb }
    payload.reponse_attendue = nb === 1 ? sets.map((row) => row[0]) : sets
    return payload
  }

  payload.reponse_attendue = form.reponseDirecte
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean)
  payload.options = []
  return payload
}

export default function CcFormation() {
  const [stages, setStages] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  async function loadStages() {
    setError('')
    setLoading(true)
    try {
      let data = await fetchCcStages()
      if (!Array.isArray(data) || data.length === 0) {
        const init = await initCcStages()
        data = init.stages || []
      }
      setStages(data)
      setSelectedId((prev) => prev ?? data[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }

  async function loadQuestions(stageId) {
    if (!stageId) {
      setQuestions([])
      return
    }
    try {
      const data = await fetchCcQuestions(stageId)
      setQuestions(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Questions introuvables.')
    }
  }

  useEffect(() => {
    loadStages()
  }, [])

  useEffect(() => {
    loadQuestions(selectedId)
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }, [selectedId])

  const selected = stages.find((s) => s.id === selectedId)
  const blanksPreview = countBlanks(form.enonce)
  const activeCount = questions.filter((q) => q.actif).length

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
    setError('')
  }

  function openEdit(q) {
    setEditingId(q.id)
    setForm(questionToForm(q))
    setShowForm(true)
    setError('')
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!selectedId) return
    setBusy(true)
    setError('')
    try {
      if (editingId) {
        const current = questions.find((q) => q.id === editingId)
        const payload = buildPayload(form, { actif: current?.actif ?? true })
        await updateCcQuestion(editingId, payload)
      } else {
        const payload = buildPayload(form, {
          ordre: questions.length + 1,
          actif: true,
        })
        await createCcQuestion(selectedId, payload)
      }
      closeForm()
      await loadQuestions(selectedId)
      await loadStages()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : editingId
            ? 'Modification impossible.'
            : 'Création impossible.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function onToggleActif(q) {
    setBusy(true)
    setError('')
    try {
      await updateCcQuestion(q.id, { actif: !q.actif })
      await loadQuestions(selectedId)
      await loadStages()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Mise à jour impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Formation</h1>
        <p className="mt-2 text-sm text-[var(--chef-muted)]">
          Crée, modifie ou désactive les questions du parcours libre.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-3 py-2 text-sm text-[#ff3131]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--chef-muted)]">Chargement…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {stages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => setSelectedId(stage.id)}
                className={
                  selectedId === stage.id
                    ? 'rounded-full bg-[var(--chef-primary)] px-3 py-1.5 text-sm font-medium text-white'
                    : 'rounded-full border border-[var(--chef-border)] bg-white px-3 py-1.5 text-sm text-[var(--chef-ink)]'
                }
              >
                {stage.titre}
                <span className="ml-1 opacity-70">({stage.nb_questions_parcours})</span>
              </button>
            ))}
          </div>

          {selected ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--chef-ink)]">{selected.titre}</h2>
                  <p className="text-sm text-[var(--chef-muted)]">
                    {activeCount} active{activeCount > 1 ? 's' : ''}
                    {questions.length > activeCount
                      ? ` · ${questions.length - activeCount} désactivée${questions.length - activeCount > 1 ? 's' : ''}`
                      : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => (showForm && !editingId ? closeForm() : openCreate())}
                  className="bg-[var(--chef-primary)] text-white hover:bg-[var(--chef-primary)]/90"
                >
                  <Plus className="size-3.5" />
                  Question
                </Button>
              </div>

              {showForm ? (
                <form
                  onSubmit={onSubmit}
                  className="space-y-3 rounded-xl border border-[var(--chef-border)] bg-white p-4"
                >
                  <p className="text-sm font-medium text-[var(--chef-ink)]">
                    {editingId ? 'Modifier la question' : 'Nouvelle question'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, type: t.id }))}
                        className={
                          form.type === t.id
                            ? 'rounded-lg bg-[var(--chef-primary)]/15 px-2.5 py-1 text-xs font-medium text-[var(--chef-primary)]'
                            : 'rounded-lg border border-[var(--chef-border)] px-2.5 py-1 text-xs'
                        }
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    required
                    value={form.enonce}
                    onChange={(e) => setForm((f) => ({ ...f, enonce: e.target.value }))}
                    placeholder={
                      form.type === 'TEXTE_TROUS'
                        ? 'Ex. La devise Route est ___ · ___ · ___'
                        : 'Énoncé de la question'
                    }
                    className="min-h-20 w-full rounded-lg border border-[var(--chef-border)] px-3 py-2 text-sm outline-none focus:border-[var(--chef-primary)]"
                  />
                  {form.type === 'TEXTE_TROUS' ? (
                    <p className="text-xs text-[var(--chef-muted)]">
                      Utilise <code className="rounded bg-slate-100 px-1">___</code> pour chaque
                      trou
                      {blanksPreview > 0 ? ` · ${blanksPreview} détecté(s)` : ''}.
                    </p>
                  ) : null}

                  {form.type === 'QCM' ? (
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
                            name="correct"
                            checked={form.correct === id}
                            onChange={() => setForm((f) => ({ ...f, correct: id }))}
                            aria-label={`Bonne réponse ${id}`}
                          />
                          <input
                            value={form[key]}
                            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                            required={id === 'a' || id === 'b'}
                            placeholder={ph}
                            className="h-9 w-full rounded-lg border border-[var(--chef-border)] px-2 text-sm outline-none focus:border-[var(--chef-primary)]"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {form.type === 'TEXTE_TROUS' ? (
                    <div className="space-y-1">
                      <input
                        required
                        value={form.trousReponses}
                        onChange={(e) => setForm((f) => ({ ...f, trousReponses: e.target.value }))}
                        placeholder={
                          blanksPreview > 1
                            ? 'Grandir;Apprendre;Servir | grandir;apprendre;servir'
                            : 'Grandir | grandir'
                        }
                        className="h-9 w-full rounded-lg border border-[var(--chef-border)] px-3 text-sm outline-none focus:border-[var(--chef-primary)]"
                      />
                      <p className="text-xs text-[var(--chef-muted)]">
                        Trous séparés par <strong>;</strong> · variantes par <strong>|</strong>
                      </p>
                    </div>
                  ) : null}

                  {form.type === 'REPONSE_DIRECTE' ? (
                    <input
                      required
                      value={form.reponseDirecte}
                      onChange={(e) => setForm((f) => ({ ...f, reponseDirecte: e.target.value }))}
                      placeholder="Réponses acceptées (séparées par |)"
                      className="h-9 w-full rounded-lg border border-[var(--chef-border)] px-3 text-sm outline-none focus:border-[var(--chef-primary)]"
                    />
                  ) : null}

                  <input
                    value={form.explication}
                    onChange={(e) => setForm((f) => ({ ...f, explication: e.target.value }))}
                    placeholder="Explication (optionnel)"
                    className="h-9 w-full rounded-lg border border-[var(--chef-border)] px-3 text-sm outline-none focus:border-[var(--chef-primary)]"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={busy}
                      className="bg-[var(--chef-primary)] text-white hover:bg-[var(--chef-primary)]/90"
                    >
                      {busy ? '…' : editingId ? 'Enregistrer' : 'Ajouter'}
                    </Button>
                    <Button type="button" variant="outline" onClick={closeForm}>
                      Annuler
                    </Button>
                  </div>
                </form>
              ) : null}

              <Separator />

              <ul className="space-y-2">
                {questions.map((q) => (
                  <li
                    key={q.id}
                    className={cn(
                      'flex items-start justify-between gap-3 rounded-xl border border-[var(--chef-border)] bg-white px-4 py-3',
                      !q.actif && 'opacity-70',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="border-0">
                          {TYPE_LABEL[q.type] || q.type}
                        </Badge>
                        {!q.actif ? (
                          <Badge
                            variant="secondary"
                            className="border-0 bg-slate-100 text-[var(--chef-muted)]"
                          >
                            Désactivée
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="border-0 bg-[var(--chef-primary)]/12 text-[var(--chef-primary)]"
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-[var(--chef-ink)]">{q.enonce}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="icon-sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => openEdit(q)}
                        className="border-[var(--chef-border)]"
                        aria-label="Modifier"
                        title="Modifier"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => onToggleActif(q)}
                        className={
                          q.actif
                            ? 'border-[var(--chef-border)]'
                            : 'border-[var(--chef-primary)]/40 text-[var(--chef-primary)]'
                        }
                        aria-label={q.actif ? 'Désactiver' : 'Réactiver'}
                        title={q.actif ? 'Désactiver' : 'Réactiver'}
                      >
                        {q.actif ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                  </li>
                ))}
                {questions.length === 0 ? (
                  <p className="text-sm text-[var(--chef-muted)]">
                    Aucune question. Ajoute-en pour activer le parcours jeune.
                  </p>
                ) : null}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
