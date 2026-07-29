import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, Check, X } from 'lucide-react'

import {
  answerQuestion,
  fetchNextQuestion,
  startFormation,
} from '@/api/formation'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { gsap, useGSAP } from '@/lib/gsap'
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

export default function JeuneQuiz() {
  const { patchUser } = useAuth()
  const cardRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)
  const [question, setQuestion] = useState(null)
  const [termine, setTermine] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [brevet, setBrevet] = useState(null)
  const [directAnswer, setDirectAnswer] = useState('')
  const [blankAnswers, setBlankAnswers] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)

  useGSAP(() => {
    if (!cardRef.current || !question) return
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: 'opacity,transform' },
    )
  }, [question?.id])

  async function loadQuestion() {
    setError('')
    setLoading(true)
    setFeedback(null)
    setDirectAnswer('')
    setBlankAnswers([])
    setSelectedOption(null)
    try {
      let data
      try {
        data = await fetchNextQuestion()
      } catch (err) {
        if (err instanceof ApiError && err.message?.includes('étape courante')) {
          await startFormation()
          data = await fetchNextQuestion()
        } else {
          throw err
        }
      }
      setProgress(data.progress)
      setQuestion(data.question)
      setTermine(Boolean(data.termine) || !data.question)
      if (data.question?.type === 'TEXTE_TROUS') {
        setBlankAnswers(Array.from({ length: blankCount(data.question) }, () => ''))
      }
      if (data.foulard) patchUser({ foulard: data.foulard })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chargement impossible.')
      setQuestion(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [])

  async function submit(reponse) {
    if (!question || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await answerQuestion({ questionId: question.id, reponse })
      if (result.foulard) patchUser({ foulard: result.foulard })
      setProgress(result.progress)
      setFeedback({
        ok: result.ok,
        explication: result.explication,
      })
      if (result.completed) {
        setBrevet(result.brevet)
        setTermine(true)
        setQuestion(null)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Réponse impossible.')
    } finally {
      setBusy(false)
    }
  }

  function onNext() {
    if (termine) return
    loadQuestion()
  }

  const options = Array.isArray(question?.options) ? question.options : []
  const parts = question?.type === 'TEXTE_TROUS' ? splitEnonce(question.enonce) : []
  const canSubmitTrous =
    blankAnswers.length > 0 && blankAnswers.every((v) => String(v).trim().length > 0)

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quiz</h1>
        <p className="mt-1 text-sm text-white/55">
          {progress
            ? `${progress.nb_reussies}/${progress.nb_total} réussies`
            : 'Réponds sans te tromper — chaque erreur coûte une moitié de foulard.'}
        </p>
      </div>

      {error ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-[#ff3131]/30 bg-[#ff3131]/10 px-3 py-2 text-sm text-[#ff8a8a]">
            {error}
          </p>
          <Link
            to="/jeune/formation"
            className="inline-flex h-8 items-center rounded-lg border border-white/15 px-3 text-sm text-white transition hover:bg-white/10"
          >
            Retour formation
          </Link>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-white/45">Chargement…</p> : null}

      {!loading && termine ? (
        <div className="space-y-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-5">
          <div className="flex items-center gap-2 text-emerald-300">
            <Award className="size-5" />
            <h2 className="text-lg font-semibold">Étape validée</h2>
          </div>
          <p className="text-sm text-white/70">
            {brevet
              ? `Brevet « ${brevet.stage_titre} » délivré.`
              : 'Parcours terminé pour cette étape.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/jeune/brevets"
              className="inline-flex h-8 items-center rounded-lg bg-[#0073e6] px-3 text-sm font-medium text-white transition hover:bg-[#0073e6]/90"
            >
              Voir mes brevets
            </Link>
            <Link
              to="/jeune/formation"
              className="inline-flex h-8 items-center rounded-lg border border-white/15 px-3 text-sm text-white transition hover:bg-white/10"
            >
              Parcours
            </Link>
          </div>
        </div>
      ) : null}

      {!loading && question && !termine ? (
        <div
          ref={cardRef}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5"
        >
          <p className="text-xs uppercase tracking-wider text-white/35">
            {TYPE_LABEL[question.type] || question.type}
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
                {feedback.explication ? (
                  <p className="mt-1 text-white/60">{feedback.explication}</p>
                ) : null}
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
                const active = selectedOption === id
                return (
                  <li key={String(id)}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setSelectedOption(id)}
                      className={cn(
                        'w-full rounded-xl border px-4 py-3 text-left text-sm transition',
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
              <Button
                onClick={onNext}
                className="bg-[#0073e6] text-white hover:bg-[#0073e6]/90"
              >
                Question suivante
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
