import { useEffect, useRef, useState, createElement, type CSSProperties, type ReactNode, type ElementType } from 'react'

interface RevealProps {
  children: ReactNode
  /** Tag a renderizar (div, p, h2, ...). Padrão: div */
  as?: ElementType
  /** Atraso em segundos ao entrar (stagger). Na saída a animação é imediata. */
  delay?: number
  /** Deslocamento vertical inicial (px) */
  y?: number
  /** Deslocamento horizontal inicial (px) */
  x?: number
  /** Escala inicial */
  scale?: number
  /** Duração da transição (s) */
  duration?: number
  style?: CSSProperties
  id?: string
  className?: string
}

/**
 * Revela o conteúdo (fade + slide/scale) ao entrar na viewport e o DESFAZ ao sair —
 * a animação roda para frente descendo e para trás subindo, repetindo indefinidamente
 * sem recarregar a página. Inspirado nas transições de scroll da Apple.
 */
export default function Reveal({
  children,
  as = 'div',
  delay = 0,
  y = 40,
  x = 0,
  scale = 1,
  duration = 0.85,
  style,
  id,
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Observa continuamente (sem disconnect) → reversível nos dois sentidos.
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const hiddenTransform = `translateY(${y}px) translateX(${x}px) scale(${scale})`

  const mergedStyle: CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0) translateX(0) scale(1)' : hiddenTransform,
    transition: `opacity ${duration}s cubic-bezier(.16,1,.3,1), transform ${duration}s cubic-bezier(.16,1,.3,1)`,
    // atraso só na entrada (stagger); some imediatamente ao sair
    transitionDelay: visible ? `${delay}s` : '0s',
    willChange: 'opacity, transform',
    ...style,
  }

  return createElement(as, { ref, id, className, style: mergedStyle }, children)
}
