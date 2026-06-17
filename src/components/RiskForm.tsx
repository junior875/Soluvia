import { useState } from 'react'
import { useTranslation } from '../i18n/LanguageProvider'

const OPT_COLORS = ['#1f9d57', '#f2921e', '#e0524e'] // baixo, médio, alto
const LEVEL_COLORS: Record<'low' | 'mid' | 'high', string> = { low: '#1f9d57', mid: '#f2921e', high: '#e0524e' }

/**
 * Demo interativa do diagnóstico: o usuário responde e o ponteiro do medidor
 * + o nível de risco (Baixo/Médio/Alto) reagem em tempo real.
 */
export default function RiskForm() {
  const { dict } = useTranslation()
  const demo = dict.form.demo
  const questions: string[] = demo.q
  const options: string[] = demo.options
  const total = questions.length

  const [answers, setAnswers] = useState<number[]>([])
  const [step, setStep] = useState(0)

  const sum = answers.reduce((a, b) => a + b, 0)
  const pct = answers.length ? sum / (total * 2) : 0
  const levelKey: 'low' | 'mid' | 'high' = pct < 0.34 ? 'low' : pct < 0.67 ? 'mid' : 'high'
  const color = LEVEL_COLORS[levelKey]
  const angle = -90 + pct * 180
  const done = answers.length === total

  const choose = (w: number) => {
    const next = [...answers]
    next[step] = w
    setAnswers(next)
    if (step < total - 1) window.setTimeout(() => setStep(step + 1), 240)
  }
  const restart = () => {
    setAnswers([])
    setStep(0)
  }

  return (
    <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, overflow: 'hidden', backdropFilter: 'blur(10px)' }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>{demo.title}</span>
        <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, fontWeight: 600 }}>{Math.min(answers.length, total)}/{total}</span>
      </div>

      {/* Medidor */}
      <div style={{ padding: '24px 24px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg width="220" height="120" viewBox="0 0 220 120">
          <path d="M22 110 A88 88 0 0 1 60 42" stroke="#1f9d57" strokeWidth="13" fill="none" strokeLinecap="round" />
          <path d="M74 31 A88 88 0 0 1 146 31" stroke="#f2921e" strokeWidth="13" fill="none" strokeLinecap="round" />
          <path d="M160 42 A88 88 0 0 1 198 110" stroke="#e0524e" strokeWidth="13" fill="none" strokeLinecap="round" />
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '110px 110px', transition: 'transform .6s cubic-bezier(.34,1.56,.64,1)' }}>
            <line x1="110" y1="110" x2="110" y2="40" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          </g>
          <circle cx="110" cy="110" r="8" fill="#fff" />
        </svg>
        <div style={{ textAlign: 'center', marginTop: 2 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{demo.result}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: '-.5px', transition: 'color .4s ease', minHeight: 34 }}>
            {answers.length ? demo.levels[levelKey] : '—'}
          </div>
        </div>
      </div>

      {/* Pergunta / opções */}
      <div style={{ padding: '6px 24px 24px' }}>
        {!done ? (
          <>
            <p style={{ color: 'rgba(255,255,255,.85)', fontSize: 14, lineHeight: 1.5, marginBottom: 12, minHeight: 42 }}>{questions[step]}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {options.map((opt, i) => {
                const active = answers[step] === i
                return (
                  <button
                    key={opt}
                    onClick={() => choose(i)}
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      borderRadius: 9,
                      padding: '10px 8px',
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "'Poppins',sans-serif",
                      border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,.14)'}`,
                      background: active ? OPT_COLORS[i] : 'rgba(255,255,255,.06)',
                      color: active ? '#fff' : 'rgba(255,255,255,.7)',
                      transition: 'all .2s ease',
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <button
            onClick={restart}
            style={{ width: '100%', cursor: 'pointer', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, fontFamily: "'Poppins',sans-serif", border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.06)', color: '#fff', transition: 'all .2s ease' }}
          >
            ↻ {demo.restart}
          </button>
        )}
        <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 12, marginTop: 14, textAlign: 'center' }}>{demo.hint}</p>
      </div>
    </div>
  )
}
