import { useEffect, useRef, useState } from 'react'

interface StatRingProps {
  target: number
  suffix?: string
  label: string
  /** Fração do anel a preencher (0–1) */
  percent: number
  /** Cor do anel de progresso */
  color?: string
}

/**
 * Estatística como mini data-viz: o anel "desenha" (stroke-dashoffset) e o número
 * conta de 0 ao alvo quando entra na viewport — reversível ao sair.
 */
export default function StatRing({ target, suffix = '', label, percent, color = '#0e2c46' }: StatRingProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!active) {
      setValue(0)
      return
    }
    let raf = 0
    const dur = 1600
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target])

  const R = 54
  const CIRC = 2 * Math.PI * R
  const offset = active ? CIRC * (1 - percent) : CIRC

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="9" />
          <circle
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>
            {value}
            {suffix}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 16, color: 'rgba(255,255,255,.9)', fontWeight: 500, marginTop: 14, textAlign: 'center' }}>{label}</div>
    </div>
  )
}
