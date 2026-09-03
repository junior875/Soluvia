// O palco de UMA página: o canvas do PDF e, exatamente sobre ele, a camada
// onde os campos de assinatura são marcados.
//
// Existe como componente próprio porque o modo de ROLAGEM empilha uma dessas
// por página do documento — e a camada de campos precisa ter a MESMA caixa do
// canvas em cada uma delas. Foi a divergência entre essas duas caixas que já
// mandou assinatura para o pé do documento: o overlay media a área visível,
// não a página inteira.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PdfDocument } from '../../../lib/pdf'

interface Props {
  pdf: PdfDocument
  numero: number
  escala: number
  /** Só desenha quando entra (ou está perto de entrar) na janela: um documento
   *  de 300 páginas não cabe na memória se todas virarem bitmap de uma vez. */
  preguicoso?: boolean
  aoInterceptarGesto?: (n: number) => void
  children?: ReactNode
  overlayProps?: React.HTMLAttributes<HTMLDivElement> & { 'data-pagina'?: number }
}

export default function PaginaDoDocumento({
  pdf, numero, escala, preguicoso = false, children, overlayProps,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const caixaRef = useRef<HTMLDivElement>(null)
  const tarefaRef = useRef<{ cancel: () => void; promise: Promise<unknown> } | null>(null)
  const [visivel, setVisivel] = useState(!preguicoso)
  const [medida, setMedida] = useState<{ w: number; h: number } | null>(null)

  // Reserva o espaço ANTES de desenhar: sem a altura certa, a barra de rolagem
  // pula a cada página que chega e a leitura fica impossível.
  useEffect(() => {
    let vivo = true
    void pdf.getPage(numero).then((p) => {
      const v = p.getViewport({ scale: escala })
      if (vivo) setMedida({ w: Math.floor(v.width), h: Math.floor(v.height) })
    })
    return () => { vivo = false }
  }, [pdf, numero, escala])

  useEffect(() => {
    if (!preguicoso) return
    const alvo = caixaRef.current
    if (!alvo) return
    const obs = new IntersectionObserver(
      ([entrada]) => setVisivel(entrada.isIntersecting),
      // Margem generosa: a página seguinte já chega desenhada quando a pessoa
      // rola, em vez de aparecer em branco e preencher depois.
      { root: null, rootMargin: '900px 0px' },
    )
    obs.observe(alvo)
    return () => obs.disconnect()
  }, [preguicoso])

  useEffect(() => {
    if (!visivel) return
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelado = false
    void (async () => {
      const p = await pdf.getPage(numero)
      if (cancelado) return
      const viewport = p.getViewport({ scale: escala })
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      // Teto de resolução: A4 com zoom alto num aparelho de dpr 3 passa de 40 MB
      // POR canvas, e três páginas na tela derrubam a aba no celular.
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(viewport.width * ratio)
      canvas.height = Math.floor(viewport.height * ratio)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      tarefaRef.current?.cancel()
      const tarefa = p.render({ canvas, canvasContext: ctx, viewport })
      tarefaRef.current = tarefa
      try { await tarefa.promise } catch { /* cancelada por re-render — ok */ }
    })()
    return () => {
      cancelado = true
      tarefaRef.current?.cancel()
      // Solta o bitmap ao sair da janela: sem isto a "virtualização" segura a
      // memória de todas as páginas já visitadas.
      const c = canvasRef.current
      if (c && preguicoso) { c.width = 0; c.height = 0 }
    }
  }, [visivel, pdf, numero, escala, preguicoso])

  return (
    <div
      ref={caixaRef}
      style={{
        position: 'relative', flexShrink: 0, margin: '0 auto',
        width: medida?.w, height: medida?.h,
        background: '#fff', borderRadius: 4,
        boxShadow: '0 10px 30px rgba(8,22,38,.22)',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 4 }} />
      <div {...overlayProps} data-pagina={numero} style={{ position: 'absolute', inset: 0, ...(overlayProps?.style ?? {}) }}>
        {children}
      </div>
    </div>
  )
}
