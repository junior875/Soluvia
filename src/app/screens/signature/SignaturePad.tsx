// Canvas para desenhar a rubrica (assinatura manuscrita). Puramente visual: o
// resultado vira um data URL (PNG) enviado como signature_image. Suporta mouse,
// caneta e toque via Pointer Events; devolve null quando o traço está vazio.
// Expõe clear() via ref para o botão "Limpar" do modal.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { SIGNATURE_INK, trimToInk } from '../../../lib/signatureImage'

export interface SignaturePadHandle { clear: () => void; load: (dataUrl: string) => void }

// Tinta fixa (não segue o tema): a rubrica precisa ficar ESCURA para aparecer
// no documento assinado (PDF/DOCX geralmente com fundo claro).
const INK = SIGNATURE_INK

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

  /** Exporta SÓ o retângulo que tem tinta (ver o porquê em lib/signatureImage). */
  const exportTrimmed = (): string | null => {
    const cv = canvasRef.current
    return cv ? trimToInk(cv) : null
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
