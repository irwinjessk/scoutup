import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import {
  createCcQuestion,
  deleteCcQuestion,
  fetchCcQuestions,
  fetchCcStages,
  initCcStages,
} from '@/api/formation'
import { ApiError } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const emptyForm = {
  type: 'QCM',
  enonce: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correct: 'a',
  reponseDirecte: '',
  explication: '',
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
  }, [selectedId])

  const selected = stages.find((s) => s.id === selectedId)

  async function onCreate(e) {
    e.preventDefault()
    if (!selectedId) return
    setBusy(true)
    setError('')
    try {
      const payload = {
        type: form.type,
        enonce: form.enonce.trim(),
        explication: form.explication.trim(),
        actif: true,
        ordre: questions.length + 1,
      }
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
      } else {
        payload.reponse_attendue = form.reponseDirecte
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
        payload.options = []
      }
      await createCcQuestion(selectedId, payload)
      setForm(emptyForm)
      setShowForm(false)
      await loadQuestions(selectedId)
      await loadStages()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Création impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id) {
    setBusy(true)
    setError('')
    try {
      await deleteCcQuestion(id)
      await loadQuestions(selectedId)
      await loadStages()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Suppression impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Formation</h1>
        <p className="mt-2 text-sm text-[var(--chef-muted)]">
          Gère les étapes Route et les questions du parcours libre.
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
                    {questions.length} question{questions.length > 1 ? 's' : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowForm((v) => !v)}
                  className="bg-[var(--chef-primary)] text-white hover:bg-[var(--chef-primary)]/90"
                >
                  <Plus className="size-3.5" />
                  Question
                </Button>
              </div>

              {showForm ? (
                <form
                  onSubmit={onCreate}
                  className="space-y-3 rounded-xl border border-[var(--chef-border)] bg-white p-4"
                >
                  <div className="flex flex-wrap gap-2">
                    {['QCM', 'REPONSE_DIRECTE'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, type: t }))}
                        className={
                          form.type === t
                            ? 'rounded-lg bg-[var(--chef-primary)]/15 px-2.5 py-1 text-xs font-medium text-[var(--chef-primary)]'
                            : 'rounded-lg border border-[var(--chef-border)] px-2.5 py-1 text-xs'
                        }
                      >
                        {t === 'QCM' ? 'QCM' : 'Réponse directe'}
                      </button>
                    ))}
                  </div>
                  <textarea
                    required
                    value={form.enonce}
                    onChange={(e) => setForm((f) => ({ ...f, enonce: e.target.value }))}
                    placeholder="Énoncé de la question"
                    className="min-h-20 w-full rounded-lg border border-[var(--chef-border)] px-3 py-2 text-sm outline-none focus:border-[var(--chef-primary)]"
                  />
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
                  ) : (
                    <input
                      required
                      value={form.reponseDirecte}
                      onChange={(e) => setForm((f) => ({ ...f, reponseDirecte: e.target.value }))}
                      placeholder="Réponses acceptées (séparées par |)"
                      className="h-9 w-full rounded-lg border border-[var(--chef-border)] px-3 text-sm outline-none focus:border-[var(--chef-primary)]"
                    />
                  )}
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
                      {busy ? '…' : 'Ajouter'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
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
                    className="flex items-start justify-between gap-3 rounded-xl border border-[var(--chef-border)] bg-white px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="border-0">
                          {q.type}
                        </Badge>
                        {!q.actif ? (
                          <Badge variant="secondary" className="border-0 text-[var(--chef-muted)]">
                            Inactive
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-medium text-[var(--chef-ink)]">{q.enonce}</p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onDelete(q.id)}
                      className="shrink-0 border-[#ff3131]/30 text-[#ff3131] hover:bg-[#ff3131]/10"
                      aria-label="Supprimer"
                    >
                      <Trash2 />
                    </Button>
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
