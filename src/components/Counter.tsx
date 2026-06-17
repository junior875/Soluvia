import { useEffect, useRef, useState } from 'react'

interface CounterProps {
  target: number
  suffix?: string
  label: string
}

/**
 * Conta de 0 até `target` com easing ao entrar na viewport e RESETA ao sair,
 * recontando toda vez que volta — acompanha o scroll nos dois sentidos.
 */
export default function Counter({ target, suffix = '', label }: CounterProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [value, setValue] = useState(0)

  // Observa visibilidade continuamente (reversível)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Anima quando ativo; reseta quando sai
  useEffect(() => {
    if (!active) {
      setValue(0)
      return
    }
    let raf = 0
    const duration = 1600
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target])

  return (
    <div ref={ref}>
      <div className="stat-num" style={{ fontSize: 'clamp(56px,7vw,80px)', fontWeight: 900, color: 'white', letterSpacing: '-3px', lineHeight: 1 }}>
        {value}
        {suffix}
      </div>
      <div style={{ fontSize: 17, color: 'rgba(255,255,255,.8)', fontWeight: 500, marginTop: 12 }}>{label}</div>
    </div>
  )
}
