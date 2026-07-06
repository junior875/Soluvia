// Visualizador de PDF (pdf.js) com sobreposição de CAMPOS de assinatura.
//  • Renderiza a página atual num <canvas>; zoom + navegação de páginas.
//  • Modo "preparar": clique-e-arraste sobre a página cria um campo; coordenadas
//    guardadas SEMPRE normalizadas (0..1) por página → independem do zoom/tela.
//  • Persistência via POST /signature/documents/{id}/fields.
// DOCX não entra aqui (o posicionamento é recurso do PDF) — a tela mãe mostra a nota.
import { useCallback, useEffect, useRef, useState } from 'react'
import { getDocument, type PdfDocument, type PdfLoadingTask } from '../../../lib/pdf'
import { api, BASE_URL, getAccessToken } from '../../../lib/api'
import type { ApiError, SigDocument, SigField, SigFieldInput } from '../../../lib/types'
import { Button, Card } from '../../ui'
import { Icon } from '../../icons'
import { useT } from '../../strings'

interface Props {
  documentId: string
  canManage: boolean
  initialFields: SigField[]
  onFieldsSaved: (doc: SigDocument) => void
  onToast: (msg: string) => void
}

interface DraftField extends SigFieldInput { key: string }

const uid = () => Math.random().toString(36).slice(2, 9)

export default function PdfViewer({ documentId, canManage, initialFields, onFieldsSaved, onToast }: Props) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<PdfDocument | null>(null)
  const taskRef = useRef<PdfLoadingTask | null>(null)
  const fittedRef = useRef(false)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [numPages, setNumPages] = useState(1)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1.1)
  const [busy, setBusy] = useState(false)

  // Campos, já normalizados. Cada um com uma key local estável para a lista/DOM.
  const [fields, setFields] = useState<DraftField[]>(
    () => initialFields.map((f) => ({ ...f, key: uid() })),
  )
  const [dirty, setDirty] = useState(false)

  // Rascunho do retângulo enquanto o usuário arrasta (em px do overlay).
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)

  // ── Carrega o PDF autenticado como bytes e abre no pdf.js ──────────
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    ;(async () => {
      try {
        const token = getAccessToken()
        const resp = await fetch(`${BASE_URL}/signature/documents/${documentId}/download`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!resp.ok) throw new Error('fetch')
        const buf = await resp.arrayBuffer()
        if (cancelled) return
        const task = getDocument({ data: buf })
        taskRef.current = task
        const pdf = await task.promise
        if (cancelled) { void task.destroy(); return }
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        setPage(1)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
      void taskRef.current?.destroy()
      taskRef.current = null
      pdfRef.current = null
    }
  }, [documentId])

  // ── Renderiza a página atual no canvas quando muda página/zoom ─────
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)
  const renderPage = useCallback(async () => {
    const pdf = pdfRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas) return
    const p = await pdf.getPage(page)
    const viewport = p.getViewport({ scale })
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * ratio)
    canvas.height = Math.floor(viewport.height * ratio)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    renderTaskRef.current?.cancel()
    const task = p.render({ canvas, canvasContext: ctx, viewport })
    renderTaskRef.current = task
    try { await task.promise } catch { /* cancelada por re-render — ok */ }
  }, [page, scale])

  useEffect(() => {
    if (status === 'ready') void renderPage()
  }, [status, renderPage])

  // Auto-ajuste à largura em telas estreitas (celular): calcula um zoom que faça a
  // página caber no palco, uma única vez ao abrir o PDF. No desktop (palco largo) a
  // página já cabe no 110% padrão, então nada muda.
  useEffect(() => {
    if (status !== 'ready' || fittedRef.current) return
    const pdf = pdfRef.current
    const stage = stageRef.current
    if (!pdf || !stage) return
    ;(async () => {
      const p = await pdf.getPage(page)
      const base = p.getViewport({ scale: 1 })
      const avail = stage.clientWidth - 36 // padding do palco (18 * 2)
      if (avail > 0 && base.width > avail) {
        const fit = Math.max(0.4, +(avail / base.width).toFixed(2))
        setScale((s) => Math.min(s, fit))
      }
      fittedRef.current = true
    })()
  }, [status, page])

  const pageFields = fields.filter((f) => f.page === page)

  // ── Criação de campo por clique-e-arraste (só no modo preparar) ────
  const overlaySize = () => {
    const el = overlayRef.current
    return el ? { w: el.clientWidth, h: el.clientHeight } : { w: 1, h: 1 }
  }

  const onDown = (e: React.PointerEvent) => {
    if (!canManage) return
    // Ignora quando o clique começa sobre um campo já existente (para removê-lo/movê-lo).
    if ((e.target as HTMLElement).closest('[data-field]')) return
    const rect = overlayRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    overlayRef.current?.setPointerCapture(e.pointerId)
    setDrag({ x0: x, y0: y, x1: x, y1: y })
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return
    const rect = overlayRef.current!.getBoundingClientRect()
    setDrag({ ...drag, x1: e.clientX - rect.left, y1: e.clientY - rect.top })
  }
  const onUp = () => {
    if (!drag) return
    const { w, h } = overlaySize()
    let left = Math.min(drag.x0, drag.x1)
    let top = Math.min(drag.y0, drag.y1)
    let width = Math.abs(drag.x1 - drag.x0)
    let height = Math.abs(drag.y1 - drag.y0)
    setDrag(null)
    // Toque simples (sem arrastar) → campo de tamanho padrão CENTRADO no ponto
    // tocado. Antes o canto superior-esquerdo nascia no dedo, então a caixa
    // "descia" para baixo/direita e a assinatura não ficava onde foi clicada.
    if (width < 12 || height < 12) {
      width = 0.22 * w
      height = 0.08 * h
      left = drag.x0 - width / 2
      top = drag.y0 - height / 2
    }
    // Normaliza (0..1) e garante que a caixa inteira fique dentro da página.
    const nw = Math.min(1, width / w)
    const nh = Math.min(1, height / h)
    const nx = Math.max(0, Math.min(1 - nw, left / w))
    const ny = Math.max(0, Math.min(1 - nh, top / h))
    setFields((prev) => [
      ...prev,
      { key: uid(), page, x: nx, y: ny, w: nw, h: nh, order_index: prev.length, placeholder: t.sig.signHere },
    ])
    setDirty(true)
  }

  const removeField = (key: string) => {
    setFields((prev) => prev.filter((f) => f.key !== key))
    setDirty(true)
  }

  const clearFields = () => { setFields([]); setDirty(true) }

  async function save() {
    setBusy(true)
    try {
      const payload = {
        fields: fields.map((f, i) => ({
          signer_user_id: f.signer_user_id ?? null,
          page: f.page, x: f.x, y: f.y, w: f.w, h: f.h,
          order_index: i, placeholder: f.placeholder ?? null,
        })),
      }
      const doc = await api.post<SigDocument>(`/signature/documents/${documentId}/fields`, payload)
      setFields(doc.fields.map((f) => ({ ...f, key: uid() })))
      setDirty(false)
      onFieldsSaved(doc)
      onToast(t.sig.fieldsSaved)
    } catch (e) {
      onToast((e as ApiError).detail ?? t.sig.fieldsFail)
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') {
    return <Card style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>{t.sig.loadingPdf}</Card>
  }
  if (status === 'error') {
    return <Card style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>{t.sig.pdfFail}</Card>
  }

  const dragRect = drag && {
    left: Math.min(drag.x0, drag.x1), top: Math.min(drag.y0, drag.y1),
    width: Math.abs(drag.x1 - drag.x0), height: Math.abs(drag.y1 - drag.y0),
  }

  return (
    <Card padding={16}>
      {/* Barra de ferramentas do viewer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 100, padding: 4 }}>
          <ToolBtn icon="chevron" label={t.sig.page} flip disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--heading)', minWidth: 78, textAlign: 'center', whiteSpace: 'nowrap' }}>{t.sig.page} {page} {t.sig.of} {numPages}</span>
          <ToolBtn icon="chevron" label={t.sig.page} disabled={page >= numPages} onClick={() => setPage((p) => Math.min(numPages, p + 1))} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 100, padding: 4 }}>
          <ToolBtn text="−" label={t.sig.zoomOut} disabled={scale <= 0.6} onClick={() => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(2)))} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--heading)', minWidth: 44, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
          <ToolBtn text="+" label={t.sig.zoomIn} disabled={scale >= 2.4} onClick={() => setScale((s) => Math.min(2.4, +(s + 0.2).toFixed(2)))} />
        </div>

        {canManage && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>{fields.length} {t.sig.fieldsCount}</span>
            {fields.length > 0 && (
              <Button variant="ghost" onClick={clearFields}>{t.sig.clearFields}</Button>
            )}
            <Button leftIcon="check" onClick={() => void save()} loading={busy} disabled={!dirty}>{busy ? t.sig.savingFields : t.sig.saveFields}</Button>
          </div>
        )}
      </div>

      {canManage && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="signature" size={14} /> {t.sig.addFieldHint}
        </p>
      )}

      {/* Palco: canvas do PDF + overlay dos campos (MESMA dimensão do canvas).
          IMPORTANTE: alignItems 'flex-start' + flexShrink 0 impedem o flex de
          ENCOLHER o wrapper para a altura/largura visível — sem isso o overlay
          (inset:0) cobria só a parte visível e (a) não dava para criar campos na
          metade de baixo e (b) o clique era normalizado pela altura errada,
          jogando a assinatura ~2x mais para baixo. `margin:auto` centraliza quando
          cabe e deixa rolar do início quando o zoom excede a largura. */}
      <div ref={stageRef} className="app-scroll" style={{ overflow: 'auto', maxHeight: 'calc(100vh - 320px)', minHeight: 300, background: 'var(--surface-2)', borderRadius: 14, padding: 18, display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flexShrink: 0, margin: '0 auto', boxShadow: '0 10px 30px rgba(8,22,38,.22)' }}>
          <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 4 }} />
          <div
            ref={overlayRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            style={{ position: 'absolute', inset: 0, cursor: canManage ? 'crosshair' : 'default', touchAction: canManage ? 'none' : 'auto' }}
          >
            {pageFields.map((f) => (
              <div
                key={f.key}
                data-field
                style={{
                  position: 'absolute',
                  left: `${f.x * 100}%`, top: `${f.y * 100}%`,
                  width: `${f.w * 100}%`, height: `${f.h * 100}%`,
                  border: '1.5px dashed var(--accent)',
                  background: 'var(--accent-soft)',
                  borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', fontSize: 11.5, fontWeight: 700,
                  boxSizing: 'border-box', overflow: 'hidden', textAlign: 'center', padding: 2,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, pointerEvents: 'none' }}>
                  <Icon name="signature" size={13} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.placeholder || t.sig.signHere}</span>
                </span>
                {canManage && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); removeField(f.key) }}
                    aria-label={t.sig.removeField}
                    title={t.sig.removeField}
                    style={{ position: 'absolute', top: -9, right: -9, width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#d9534f', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.3)' }}
                  >
                    <Icon name="close" size={12} />
                  </button>
                )}
              </div>
            ))}
            {/* Rascunho do retângulo em arraste */}
            {dragRect && (
              <div style={{ position: 'absolute', left: dragRect.left, top: dragRect.top, width: dragRect.width, height: dragRect.height, border: '1.5px dashed var(--accent)', background: 'var(--accent-soft)', borderRadius: 6, pointerEvents: 'none' }} />
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function ToolBtn({ icon, text, label, onClick, disabled, flip }: { icon?: 'chevron'; text?: string; label: string; onClick: () => void; disabled?: boolean; flip?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="app-btn"
      style={{ width: 30, height: 30, borderRadius: 100, border: 'none', background: 'transparent', color: disabled ? 'var(--text-muted)' : 'var(--heading)', cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, opacity: disabled ? 0.4 : 1 }}
    >
      {icon ? <Icon name="chevron" size={16} style={{ transform: flip ? 'rotate(180deg)' : undefined }} /> : text}
    </button>
  )
}
