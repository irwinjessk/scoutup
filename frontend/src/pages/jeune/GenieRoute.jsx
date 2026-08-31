import { useEffect, useRef, useState } from 'react'
import { Award, Check, Swords, X } from 'lucide-react'

import {
  answerCompetitionQuestion,
  fetchJeuneCompetitions,
  fetchNextCompetitionQuestion,
  joinCompetition,
} from '@/api/competitions'
import { ApiError } from '@/api/client'
import ModuleShell from '@/components/layout/ModuleShell'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const TYPE_LABEL = {
  QCM: 'QCM',
  TEXTE_TROUS: 'Texte à trous',
  REPONSE_DIRECTE: 'Réponse directe',
}

function blankCount(question) {
  const fromOpts = question?.options?.nb_blanks
  if (fromOpts) return Math.max(1, Number(fromOpts) || 1)
  return Math.max(1, (question?.enonce?.match(/_{3,}/g) || []).length)
}

function splitEnonce(enonce) {
  return String(enonce || '').split(/_{3,}/)
}

export default function JeuneGenieRoute() {
  const { patchUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [competitions, setCompetitions] = useState([])

  const [active, setActive] = useState(null)
  const [question, setQuestion] = useState(null)
  const [termine, setTermine] = useState(false)
  const [score, setScore] = useState(0)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [directAnswer, setDirectAnswer] = useState('')
  const [blankAnswers, setBlankAnswers] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)

  async function loadList() {
    setError('')
    setLoading(true)
    try {
      const data = await fetchJeuneCompetitions()
      setCompetitions(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadList()
  }, [])

  async function loadQuestion(competition) {
    setError('')
    setFeedback(null)
    setDirectAnswer('')
    setBlankAnswers([])
    setSelectedOption(null)
    try {
      const data = await fetchNextCompetitionQuestion(competition.id)
      setQuestion(data.question)
      setTermine(Boolean(data.termine))
      setScore(data.score)
      if (data.foulard) patchUser({ foulard: data.foulard })
      if (data.question?.type === 'TEXTE_TROUS') {
        setBlankAnswers(Array.from({ length: blankCount(data.question) }, () => ''))
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.')
    }
  }

  async function onPlay(competition) {
    setBusy(true)
    setError('')
    try {
      await joinCompetition(competition.id)
      setActive(competition)
      await loadQuestion(competition)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de rejoindre.')
    } finally {
      setBusy(false)
    }
  }

  function backToList() {
    setActive(null)
    setQuestion(null)
    setFeedback(null)
    setTermine(false)
    loadList()
  }

  async function submit(reponse) {
    if (!question || !active || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await answerCompetitionQuestion(active.id, {
        questionId: question.id,
        reponse,
      })
      if (result.foulard) patchUser({ foulard: result.foulard })
      setScore(result.score)
      setFeedback({ ok: result.est_correcte })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Réponse impossible.')
    } finally {
      setBusy(false)
    }
  }

  function onNext() {
    if (!active) return
    loadQuestion(active)
  }

  const options = Array.isArray(question?.options) ? question.options : []
  const parts = question?.type === 'TEXTE_TROUS' ? splitEnonce(question.enonce) : []
  const canSubmitTrous =
    blankAnswers.length > 0 && blankAnswers.every((v) => String(v).trim().length > 0)

  if (active) {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{active.titre}</h1>
            <p className="mt-1 text-sm text-white/55">Score : {score} pt{score > 1 ? 's' : ''}</p>
          </div>
          <button
            type="button"
            onClick={backToList}
            className="text-sm text-white/45 hover:text-white/70"
          >
            Quitter
          </button>
        </div>

        {error ? (
          <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-3 py-2 text-sm text-[#ff8a8a]">
            {error}
          </p>
        ) : null}

        {termine ? (
          <div className="space-y-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-5">
            <div className="flex items-center gap-2 text-emerald-300">
              <Award className="size-5" />
              <h2 className="text-lg font-semibold">Banque de questions terminée</h2>
            </div>
            <p className="text-sm text-white/70">
              Score final : {score} pt{score > 1 ? 's' : ''}. Reviens plus tard pour voir le
              classement.
            </p>
            <Button
              onClick={backToList}
              className="bg-[#0073e6] text-white hover:bg-[#0073e6]/90"
            >
              Retour
            </Button>
          </div>
        ) : question ? (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5">
            <p className="text-xs uppercase tracking-wider text-white/35">
              {TYPE_LABEL[question.type] || question.type} · {question.points} pt
              {question.points > 1 ? 's' : ''}
            </p>

            {question.type === 'TEXTE_TROUS' ? (
              <div className="text-lg font-medium leading-relaxed text-white">
                {parts.map((part, i) => (
                  <span key={`p-${i}`}>
                    {part}
                    {i < parts.length - 1 ? (
                      <input
                        type="text"
                        value={blankAnswers[i] || ''}
                        disabled={busy || Boolean(feedback)}
                        onChange={(e) => {
                          const next = [...blankAnswers]
                          next[i] = e.target.value
                          setBlankAnswers(next)
                        }}
                        aria-label={`Trou ${i + 1}`}
                        className="mx-1 inline-block h-9 min-w-[5.5rem] max-w-[10rem] rounded-lg border border-white/20 bg-white/10 px-2 text-center text-base font-semibold text-[#7eb6ff] outline-none placeholder:text-white/25 focus:border-[#0073e6]"
                        placeholder="…"
                      />
                    ) : null}
                  </span>
                ))}
              </div>
            ) : (
              <h2 className="text-lg font-medium leading-snug">{question.enonce}</h2>
            )}

            {feedback ? (
              <div
                className={cn(
                  'flex items-start gap-2 rounded-xl px-3 py-3 text-sm',
                  feedback.ok
                    ? 'bg-emerald-500/15 text-emerald-200'
                    : 'bg-[#ff3131]/15 text-[#ff8a8a]',
                )}
              >
                {feedback.ok ? (
                  <Check className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <X className="mt-0.5 size-4 shrink-0" />
                )}
                <div>
                  <p className="font-medium">
                    {feedback.ok ? 'Bonne réponse' : 'Mauvaise réponse'}
                  </p>
                  {!feedback.ok ? (
                    <p className="mt-1 text-white/50">
                      Une moitié de foulard a été perdue (−15 min).
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!feedback && question.type === 'QCM' ? (
              <ul className="space-y-2">
                {options.map((opt) => {
                  const id = opt.id ?? opt.texte
                  const isActive = selectedOption === id
                  return (
                    <li key={String(id)}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setSelectedOption(id)}
                        className={cn(
                          'w-full rounded-xl border px-4 py-3 text-left text-sm transition',
                          isActive
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

            {!feedback && question.type === 'REPONSE_DIRECTE' ? (
              <input
                type="text"
                value={directAnswer}
                onChange={(e) => setDirectAnswer(e.target.value)}
                disabled={busy}
                placeholder="Ta réponse…"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#0073e6]"
              />
            ) : null}

            <div className="flex gap-2 pt-1">
              {!feedback ? (
                <Button
                  disabled={
                    busy ||
                    (question.type === 'QCM'
                      ? selectedOption == null
                      : question.type === 'TEXTE_TROUS'
                        ? !canSubmitTrous
                        : !directAnswer.trim())
                  }
                  onClick={() => {
                    if (question.type === 'QCM') {
                      const opt = options.find((o) => (o.id ?? o.texte) === selectedOption)
                      submit(opt ?? { id: selectedOption })
                    } else if (question.type === 'TEXTE_TROUS') {
                      const values = blankAnswers.map((v) => v.trim())
                      submit(values.length === 1 ? values[0] : values)
                    } else {
                      submit(directAnswer.trim())
                    }
                  }}
                  className="bg-[#0073e6] text-white hover:bg-[#0073e6]/90"
                >
                  {busy ? '…' : 'Valider'}
                </Button>
              ) : (
                <Button onClick={onNext} className="bg-[#0073e6] text-white hover:bg-[#0073e6]/90">
                  Question suivante
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/45">Chargement…</p>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <ModuleShell title="Génie Route" hint="Compétition de connaissances de ta communauté." />

      {error ? (
        <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-3 py-2 text-sm text-[#ff8a8a]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/45">Chargement…</p>
      ) : competitions.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-8 text-center">
          <p className="text-3xl">🏁</p>
          <p className="text-sm font-medium text-white">Aucune compétition ouverte</p>
          <p className="text-sm text-white/55">
            Ton chef lancera bientôt le prochain Génie Route de ta communauté.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {competitions.map((comp) => (
            <div
              key={comp.id}
              className="space-y-3 rounded-2xl border border-[#0073e6]/30 bg-[#0073e6]/10 px-4 py-5"
            >
              <div className="flex items-center gap-2 text-[#7eb6ff]">
                <Swords className="size-5" />
                <h2 className="text-lg font-semibold text-white">{comp.titre}</h2>
              </div>
              <p className="text-sm text-white/60">
                {comp.nb_questions} question{comp.nb_questions > 1 ? 's' : ''} ·{' '}
                {comp.duree_jours} jour{comp.duree_jours > 1 ? 's' : ''}
                {comp.deja_rejoint ? ` · ton score : ${comp.mon_score} pt` : ''}
              </p>
              <Button
                disabled={busy}
                onClick={() => onPlay(comp)}
                className="w-full bg-[#0073e6] text-white hover:bg-[#0073e6]/90"
              >
                {comp.deja_rejoint ? 'Continuer' : 'Participer'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
