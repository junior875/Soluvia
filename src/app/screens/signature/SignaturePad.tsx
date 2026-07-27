// Canvas para desenhar a rubrica (assinatura manuscrita). Puramente visual: o
// resultado vira um data URL (PNG) enviado como signature_image. Suporta mouse,
// caneta e toque via Pointer Events; devolve null quando o traço está vazio.
// Expõe clear() via ref para o botão "Limpar" do modal.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface SignaturePadHandle { clear: () => void; load: (dataUrl: string) => void }

// Tinta fixa (não segue o tema): a rubrica precisa ficar ESCURA para aparecer
// no documento assinado (PDF/DOCX geralmente com fundo claro).
const INK = '#12324e'

interface Props {
  onChange: (dataUrl: string | null) => void
  height?: number
}

const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad({ onChange, height = 150 }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const dirty = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const setupCtx = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.round(rect.width * ratio)
    canvas.height = Math.round(rect.height * ratio)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 2.4
    }
  }

  // Ajusta a resolução do canvas ao tamanho físico (retina) e reseta o traço.
  useEffect(() => {
    setupCtx()
    window.addEventListener('resize', setupCtx)
    return () => window.removeEventListener('resize', setupCtx)
  }, [])

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    dirty.current = false
    onChange(null)
  }

  /** Exporta SÓ o retângulo que tem tinta.
   *
   *  Exportar o canvas inteiro era a maior causa de "a assinatura foi parar muito
   *  para baixo": o pad tem ~944x300 px quase todos transparentes e a linha-guia
   *  fica lá embaixo, então todo mundo assina no terço inferior. O backend desenha
   *  a imagem com preserveAspectRatio + anchor centrado, ou seja, centraliza o PNG
   *  INTEIRO na caixa marcada — e a tinta, que mora embaixo dele, cai ~15pt abaixo
   *  do centro ocupando 12pt de uma caixa de 67pt. Recortando na origem, a rubrica
   *  preenche a caixa e fica exatamente onde foi marcada.
   */
  const exportTrimmed = (): string | null => {
    const cv = canvasRef.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return null
    // getImageData ignora o ctx.scale(ratio) — trabalha em pixels de dispositivo.
    const { data, width: W, height: H } = ctx.getImageData(0, 0, cv.width, cv.height)
    let x0 = W, y0 = H, x1 = -1, y1 = -1
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (data[(y * W + x) * 4 + 3] > 8) {   // alpha > 8 → tem tinta
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    if (x1 < 0) return null                    // pad vazio
    const pad = 6                              // respiro p/ não cortar a espessura do traço
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad)
    x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad)
    const out = document.createElement('canvas')
    out.width = x1 - x0 + 1
    out.height = y1 - y0 + 1
    const octx = out.getContext('2d')
    if (!octx) return null
    octx.drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
    return out.toDataURL('image/png')
  }

  // Pré-preenche o pad com uma rubrica salva (reusa os dados do signatário).
  const load = (dataUrl: string) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !dataUrl) return
    const img = new Image()
    img.onload = () => {
      const ratio = window.devicePixelRatio || 1
      const cw = canvas.width / ratio, ch = canvas.height / ratio
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // "contain", nunca esticar: antes a rubrica salva era deformada para o pad
      // inteiro, o que também desfazia o recorte a cada reabertura do modal.
      const s = Math.min((cw * 0.9) / img.width, (ch * 0.9) / img.height)
      const w = img.width * s, h = img.height * s
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h)
      dirty.current = true
      onChange(exportTrimmed())   // normaliza rubricas antigas salvas sem recorte
    }
    img.src = dataUrl
  }
  useImperativeHandle(ref, () => ({ clear, load }))

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent) => {
    e.preventDefault()
    drawing.current = true
    last.current = pos(e)
    canvasRef.current?.setPointerCapture(e.pointerId)
  }

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const p = pos(e)
    if (!ctx || !last.current) return
    ctx.strokeStyle = INK  // tinta escura fixa → visível no documento assinado
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    dirty.current = true
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    if (dirty.current) onChange(exportTrimmed())
  }

  return (
    <div style={{ position: 'relative', color: 'var(--heading)' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        style={{
          width: '100%',
          height,
          display: 'block',
          background: '#f6f8fc',  // papel claro fixo → contraste com a tinta escura
          border: '1px dashed #c4cede',
          borderRadius: 12,
          touchAction: 'none',
          cursor: 'crosshair',
        }}
      />
      {/* Linha-guia da assinatura */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 26, borderTop: '1px solid var(--border)', pointerEvents: 'none' }} />
    </div>
  )
})

export default SignaturePad
