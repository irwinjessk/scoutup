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
  const [selectedOption, setSelectedOption] = useState(null)

  useGSAP(() => {
    if (!cardRef.current || !question) return
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
    )
  }, [question?.id])

  async function loadQuestion() {
    setError('')
    setLoading(true)
    setFeedback(null)
    setDirectAnswer('')
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
        <div ref={cardRef} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5">
          <p className="text-xs uppercase tracking-wider text-white/35">
            {question.type?.replace('_', ' ')}
          </p>
          <h2 className="text-lg font-medium leading-snug">{question.enonce}</h2>

          {feedback ? (
            <div
              className={cn(
                'flex items-start gap-2 rounded-xl px-3 py-3 text-sm',
                feedback.ok
                  ? 'bg-emerald-500/15 text-emerald-200'
                  : 'bg-[#ff3131]/15 text-[#ff8a8a]',
              )}
            >
              {feedback.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <X className="mt-0.5 size-4 shrink-0" />}
              <div>
                <p className="font-medium">{feedback.ok ? 'Bonne réponse' : 'Mauvaise réponse'}</p>
                {feedback.explication ? (
                  <p className="mt-1 text-white/60">{feedback.explication}</p>
                ) : null}
                {!feedback.ok ? (
                  <p className="mt-1 text-white/50">Une moitié de foulard a été perdue (−15 min).</p>
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

          {!feedback && question.type !== 'QCM' ? (
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
                  (question.type === 'QCM' ? selectedOption == null : !directAnswer.trim())
                }
                onClick={() => {
                  if (question.type === 'QCM') {
                    const opt = options.find((o) => (o.id ?? o.texte) === selectedOption)
                    submit(opt ?? { id: selectedOption })
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
