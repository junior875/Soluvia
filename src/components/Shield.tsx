import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../i18n/LanguageProvider'

/**
 * Escudo interativo: o contorno e o "check" desenham (stroke-dashoffset) ao entrar
 * na viewport, pulsos emanam e um selo "Protegido" aparece. Reversível.
 */
export default function Shield() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const DASH = 320

  return (
    <div ref={ref} style={{ position: 'relative', width: 340, height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 190,
            height: 190,
            borderRadius: '50%',
            border: '1.5px solid var(--accent)',
            opacity: 0,
            animation: on ? `shieldPulse 3s ease-out ${i}s infinite` : 'none',
          }}
        />
      ))}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid var(--border)' }} />
      <div style={{ position: 'absolute', inset: 40, borderRadius: '50%', border: '1.5px solid var(--border)' }} />

      <div style={{ width: 170, height: 170, borderRadius: '50%', background: 'linear-gradient(145deg,var(--navy),var(--navy-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 24px 60px rgba(14,44,70,.35)' }}>
        <svg width="92" height="92" viewBox="0 0 88 88" fill="none">
          <path
            d="M44 8L12 22v22c0 17.6 12.1 33.5 32 38 19.9-4.5 32-20.4 32-38V22L44 8z"
            fill="rgba(255,255,255,.08)"
            stroke="white"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeDasharray={DASH}
            strokeDashoffset={on ? 0 : DASH}
            style={{ transition: 'stroke-dashoffset 1.4s ease' }}
          />
          <path
            d="M30 44l11 11 17-17"
            stroke="var(--accent)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="44"
            strokeDashoffset={on ? 0 : 44}
            style={{ transition: 'stroke-dashoffset .7s ease .8s' }}
          />
        </svg>
      </div>

      <div style={{ position: 'absolute', top: 30, right: 30, width: 13, height: 13, borderRadius: '50%', background: 'var(--accent)', animation: 'dotBlink 2.5s ease infinite' }} />
      <div style={{ position: 'absolute', bottom: 44, left: 30, width: 9, height: 9, borderRadius: '50%', background: 'var(--blue)', animation: 'dotBlink 3.5s ease infinite 1s' }} />

      <div
        style={{
          position: 'absolute',
          bottom: 2,
          left: '50%',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 16px',
          borderRadius: 100,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--card-shadow)',
          opacity: on ? 1 : 0,
          transform: on ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(8px)',
          transition: 'opacity .5s ease 1.1s, transform .5s ease 1.1s',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1f9d57' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--heading)' }}>{t('security.protected')}</span>
      </div>
    </div>
  )
}
