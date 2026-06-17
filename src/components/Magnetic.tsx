import { useRef, type ReactNode, type CSSProperties } from 'react'

interface MagneticProps {
  children: ReactNode
  /** Intensidade do efeito (0–1). Padrão 0.3 */
  strength?: number
  style?: CSSProperties
  className?: string
}

/**
 * Envolve um elemento clicável e o faz "puxar" suavemente em direção ao cursor
 * (micro-interação magnética estilo Apple/Awwwards). Desliga com reduced-motion e em toque.
 */
export default function Magnetic({ children, strength = 0.3, style, className }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null)

  const reduce =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const onMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (reduce) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const mx = e.clientX - (r.left + r.width / 2)
    const my = e.clientY - (r.top + r.height / 2)
    el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`
  }

  const reset = () => {
    const el = ref.current
    if (el) el.style.transform = 'translate(0,0)'
  }

  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={className}
      style={{ display: 'inline-block', transition: 'transform .45s cubic-bezier(.16,1,.3,1)', willChange: 'transform', ...style }}
    >
      {children}
    </span>
  )
}
