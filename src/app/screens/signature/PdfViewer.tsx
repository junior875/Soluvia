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
  /** Há campo desenhado ainda não persistido (ou POST no ar). */
  onPendingChange?: (pending: boolean) => void
  onFieldsSaved: (doc: SigDocument) => void
  onToast: (msg: string) => void
}

interface DraftField extends SigFieldInput { key: string }

/** Gesto em curso sobre o overlay. */
type Act =
  | { kind: 'create'; x0: number; y0: number; x1: number; y1: number }
  | { kind: 'move'; key: string; offX: number; offY: number }
  | { kind: 'resize'; key: string }

const uid = () => Math.random().toString(36).slice(2, 9)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// Tamanhos normalizados (fração da página).
const DEFAULT_W = 0.22
const DEFAULT_H = 0.08
const MIN_W = 0.05
const MIN_H = 0.02

/** Telas de toque não têm ponteiro fino: lá o modo de posicionar começa DESLIGADO
 *  para o dedo continuar rolando o documento. */
const isCoarsePointer = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches

export default function PdfViewer({ documentId, canManage, initialFields, onPendingChange, onFieldsSaved, onToast }: Props) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<PdfDocument | null>(null)
  const taskRef = useRef<PdfLoadingTask | null>(null)
  const fittedRef = useRef(false)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const bytesRef = useRef<ArrayBuffer | null>(null)
  const [numPages, setNumPages] = useState(1)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1.1)
  const [busy, setBusy] = useState(false)

  // Campos, já normalizados. Cada um com uma key local estável para a lista/DOM.
  const [fields, setFields] = useState<DraftField[]>(
    () => initialFields.map((f) => ({ ...f, key: uid() })),
  )
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Modo de posicionar. No desktop fica ligado (o mouse não rola a página ao
  // arrastar); no toque começa desligado para o dedo rolar o documento — antes o
  // overlay capturava todo o gesto e não dava para chegar na parte de baixo.
  const [addMode, setAddMode] = useState(() => !isCoarsePointer())

  // Gesto em curso (criar / mover / redimensionar), em px do overlay.
  const [act, setAct] = useState<Act | null>(null)

  // ── Carrega o PDF autenticado como bytes e abre no pdf.js ──────────
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    ;(async () => {
      try {
        const token = getAccessToken()
        // Sempre o ORIGINAL: a versão assinada traz carimbos antigos e páginas de
        // evidência no fim, o que atrapalha na hora de marcar onde assinar.
        const resp = await fetch(`${BASE_URL}/signature/documents/${documentId}/download?original=true`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!resp.ok) {
          // Mostra o motivo que o servidor deu (ex.: arquivo perdido por falta de
          // volume persistente) em vez do genérico "não foi possível renderizar".
          const detail = await resp.json().then((b) => b?.detail).catch(() => null)
          throw new Error(typeof detail === 'string' ? detail : 'fetch')
        }
        const buf = await resp.arrayBuffer()
        if (cancelled) return
        // Guarda os bytes: se o pdf.js recusar o arquivo, a pessoa ainda
        // consegue baixá-lo e abrir no leitor dela — sem isso, um PDF que só
        // este renderizador não entende viraria um beco sem saída.
        bytesRef.current = buf
        const task = getDocument({ data: buf.slice(0) })
        taskRef.current = task
        const pdf = await task.promise
        if (cancelled) { void task.destroy(); return }
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        setPage(1)
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        const msg = (e as Error).message
        setLoadError(msg && msg !== 'fetch' ? msg : null)
        setStatus('error')
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

  /** Enquadra a página INTEIRA no palco. Sem isso, num notebook só a metade de
   *  cima da página cabia na área visível e parecia não dar para marcar embaixo. */
  const fitPage = useCallback(async () => {
    const pdf = pdfRef.current
    const stage = stageRef.current
    if (!pdf || !stage) return
    const p = await pdf.getPage(page)
    const base = p.getViewport({ scale: 1 })
    const s = Math.min((stage.clientWidth - 36) / base.width, (stage.clientHeight - 36) / base.height)
    if (s > 0) setScale(clamp(+s.toFixed(2), 0.4, 2.4))
  }, [page])

  const pageFields = fields.filter((f) => f.page === page)

  // ── Gestos sobre a página: criar, mover e redimensionar campos ─────
  /** Ponto do ponteiro relativo ao overlay + o tamanho REAL dele em px. */
  const pointAt = (e: React.PointerEvent) => {
    const r = overlayRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width || 1, h: r.height || 1 }
  }

  const onDown = (e: React.PointerEvent) => {
    if (!canManage) return
    const el = e.target as HTMLElement
    const handleKey = el.closest<HTMLElement>('[data-resize]')?.dataset.resize
    const fieldKey = el.closest<HTMLElement>('[data-field]')?.dataset.field
    const p = pointAt(e)

    if (handleKey) {
      setAct({ kind: 'resize', key: handleKey })
    } else if (fieldKey) {
      // Arrastar um campo existente move-o. Antes o campo era intocável: quem
      // errava o lugar tinha que apagar e refazer.
      const f = fields.find((x) => x.key === fieldKey)
      if (!f) return
      setAct({ kind: 'move', key: fieldKey, offX: p.x - f.x * p.w, offY: p.y - f.y * p.h })
    } else {
      // Área vazia. No toque, só cria com o modo de posicionar ligado — assim o
      // dedo continua rolando o documento para alcançar o resto da página.
      if (e.pointerType === 'touch' && !addMode) return
      setAct({ kind: 'create', x0: p.x, y0: p.y, x1: p.x, y1: p.y })
    }
    overlayRef.current?.setPointerCapture(e.pointerId)
    // No toque não bloqueamos o gesto: o navegador ainda pode transformá-lo em
    // rolagem (e aí manda pointercancel, que aborta sem criar nada).
    if (e.pointerType !== 'touch') e.preventDefault()
  }

  const onMove = (e: React.PointerEvent) => {
    if (!act) return
    const p = pointAt(e)
    if (act.kind === 'create') {
      setAct({ ...act, x1: p.x, y1: p.y })
      return
    }
    if (act.kind === 'move') {
      setFields((prev) => prev.map((f) => (f.key !== act.key ? f : {
        ...f,
        x: clamp((p.x - act.offX) / p.w, 0, 1 - f.w),
        y: clamp((p.y - act.offY) / p.h, 0, 1 - f.h),
      })))
    } else {
      setFields((prev) => prev.map((f) => (f.key !== act.key ? f : {
        ...f,
        w: clamp(p.x / p.w - f.x, MIN_W, 1 - f.x),
        h: clamp(p.y / p.h - f.y, MIN_H, 1 - f.y),
      })))
    }
    setDirty(true)
  }

  const onUp = (e: React.PointerEvent) => {
    if (!act) return
    try { overlayRef.current?.releasePointerCapture(e.pointerId) } catch { /* já solto */ }
    if (act.kind !== 'create') { setAct(null); return }

    const { w, h } = pointAt(e)
    let left = Math.min(act.x0, act.x1)
    let top = Math.min(act.y0, act.y1)
    let width = Math.abs(act.x1 - act.x0)
    let height = Math.abs(act.y1 - act.y0)
    setAct(null)
    // Houve gesto? Mede pelo deslocamento TOTAL, nunca por eixo. Com o `||` antigo,
    // um arrasto largo e baixo (300x8 — o formato natural de uma LINHA de
    // assinatura) era jogado fora e virava uma caixa padrão no ponto de PARTIDA do
    // gesto: a caixa aparecia com outro tamanho, em outro lugar.
    if (Math.hypot(act.x1 - act.x0, act.y1 - act.y0) < 8) {
      // Toque simples → campo padrão CENTRADO no ponto tocado, para a caixa nascer
      // onde o dedo encostou e não abaixo/à direita dele.
      width = DEFAULT_W * w
      height = DEFAULT_H * h
      left = act.x0 - width / 2
      top = act.y0 - height / 2
    } else {
      // Arrasto de verdade: preserva o retângulo desenhado e, se precisar do mínimo
      // legível, cresce para os DOIS lados — assim o mínimo nunca empurra a caixa
      // para baixo/para a direita do que foi marcado.
      const minW = MIN_W * w, minH = MIN_H * h
      if (width < minW) { left -= (minW - width) / 2; width = minW }
      if (height < minH) { top -= (minH - height) / 2; height = minH }
    }
    const nw = clamp(width / w, MIN_W, 1)
    const nh = clamp(height / h, MIN_H, 1)
    setFields((prev) => [
      ...prev,
      {
        key: uid(), page,
        x: clamp(left / w, 0, 1 - nw), y: clamp(top / h, 0, 1 - nh),
        w: nw, h: nh, order_index: prev.length, placeholder: t.sig.signHere,
      },
    ])
    setDirty(true)
  }

  const removeField = (key: string) => {
    setFields((prev) => prev.filter((f) => f.key !== key))
    setDirty(true)
  }

  const clearFields = () => { setFields([]); setDirty(true) }

  // Revisão dos campos: evita marcar "salvo" se o usuário mexeu enquanto a
  // requisição estava no ar.
  const revRef = useRef(0)
  useEffect(() => { revRef.current += 1 }, [fields])

  async function save(silent = false) {
    if (!canManage) return
    const rev = revRef.current
    if (!silent) setBusy(true)
    setSaveState('saving')
    try {
      const payload = {
        fields: fields.map((f, i) => ({
          signer_user_id: f.signer_user_id ?? null,
          page: f.page, x: f.x, y: f.y, w: f.w, h: f.h,
          order_index: i, placeholder: f.placeholder ?? null,
        })),
      }
      const doc = await api.post<SigDocument>(`/signature/documents/${documentId}/fields`, payload)
      // No auto-save não trocamos a lista local: regenerar as keys remontaria os
      // campos no DOM no meio de um arraste.
      if (!silent) setFields(doc.fields.map((f) => ({ ...f, key: uid() })))
      onFieldsSaved(doc)
      if (revRef.current === rev) { setDirty(false); setSaveState('saved') } else setSaveState('idle')
      if (!silent) onToast(t.sig.fieldsSaved)
    } catch (e) {
      setSaveState('idle')
      onToast((e as ApiError).detail ?? t.sig.fieldsFail)
    } finally {
      setBusy(false)
    }
  }

  // Auto-salva pouco depois da última mudança. Antes dava para posicionar tudo,
  // trocar de aba e perder os campos sem aviso — e aí o backend carimbava a
  // assinatura no rodapé da última página, longe de onde foi marcado.
  const saveRef = useRef<((silent?: boolean) => Promise<void>) | null>(null)
  const dirtyRef = useRef(false)
  useEffect(() => { saveRef.current = save; dirtyRef.current = dirty })
  useEffect(() => {
    if (!canManage || !dirty || act) return   // não salva no meio de um gesto
    const id = window.setTimeout(() => { void saveRef.current?.(true) }, 900)
    return () => window.clearTimeout(id)
  }, [fields, dirty, act, canManage])
  // Rede de segurança: ao sair da aba, envia o que ainda não foi salvo.
  useEffect(() => () => { if (dirtyRef.current) void saveRef.current?.(true) }, [])
  // Avisa a tela mãe enquanto houver campo não persistido: a aba Assinar usa isso
  // para não deixar assinar antes do POST voltar — senão o backend vê a lista
  // vazia e carimba no rodapé da última página.
  useEffect(() => { onPendingChange?.(dirty || saveState === 'saving') }, [dirty, saveState, onPendingChange])

  if (status === 'loading') {
    return <Card style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>{t.sig.loadingPdf}</Card>
  }
  if (status === 'error') {
    // "Invalid PDF structure" é o pdf.js falando com quem o escreveu, não com
    // quem só quer assinar um documento. Traduz, e oferece a saída de baixar.
    const cru = (loadError ?? '').toLowerCase()
    const arquivoRuim = cru.includes('invalid pdf') || cru.includes('structure') || cru.includes('corrupt')
    const mensagem = arquivoRuim ? t.sig.pdfBroken : (loadError ?? t.sig.pdfFail)
    return (
      <Card style={{ minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 14 }}>
        <p style={{ color: 'var(--heading)', fontSize: 14, lineHeight: 1.65, maxWidth: 460, margin: 0 }}>
          {mensagem}
        </p>
        {bytesRef.current && (
          <Button
            variant="ghost"
            onClick={() => {
              const url = URL.createObjectURL(new Blob([bytesRef.current!], { type: 'application/pdf' }))
              const a = document.createElement('a')
              a.href = url
              a.download = 'documento.pdf'
              a.click()
              setTimeout(() => URL.revokeObjectURL(url), 4000)
            }}
          >
            {t.sig.pdfDownloadRaw}
          </Button>
        )}
      </Card>
    )
  }

  const dragRect = act?.kind === 'create' ? {
    left: Math.min(act.x0, act.x1), top: Math.min(act.y0, act.y1),
    width: Math.abs(act.x1 - act.x0), height: Math.abs(act.y1 - act.y0),
  } : null

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
          <button
            type="button"
            onClick={() => void fitPage()}
            aria-label={t.sig.fitPageHint}
            title={t.sig.fitPageHint}
            className="app-btn"
            style={{ border: 'none', background: 'transparent', color: 'var(--heading)', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, padding: '0 10px', height: 30, borderRadius: 100, whiteSpace: 'nowrap' }}
          >
            {t.sig.fitPage}
          </button>
        </div>

        {canManage && (
          <>
            {/* Modo de posicionar: com ele desligado o dedo rola o documento. */}
            <button
              type="button"
              onClick={() => setAddMode((v) => !v)}
              aria-pressed={addMode}
              className="app-btn"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                padding: '8px 15px', borderRadius: 100, fontWeight: 700, fontSize: 13,
                border: `1.5px solid ${addMode ? 'var(--accent)' : 'var(--border)'}`,
                background: addMode ? 'var(--accent)' : 'var(--surface-2)',
                color: addMode ? '#fff' : 'var(--heading)', whiteSpace: 'nowrap',
              }}
            >
              <Icon name="plus" size={14} /> {t.sig.addFieldMode}
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                {fields.length} {t.sig.fieldsCount}
                {saveState === 'saving' && ` · ${t.sig.savingFields}`}
                {saveState === 'saved' && !dirty && ` · ${t.sig.fieldsSavedShort}`}
              </span>
              {fields.length > 0 && (
                <Button variant="ghost" onClick={clearFields}>{t.sig.clearFields}</Button>
              )}
              <Button leftIcon="check" onClick={() => void save()} loading={busy} disabled={!dirty}>{busy ? t.sig.savingFields : t.sig.saveFields}</Button>
            </div>
          </>
        )}
      </div>

      {canManage && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.5 }}>
          <Icon name="signature" size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{isCoarsePointer() ? t.sig.addFieldHintTouch : t.sig.addFieldHint} {t.sig.moveFieldHint}</span>
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
            // Rolagem (ou um gesto do sistema) vencendo → aborta sem criar campo.
            // Soltar a captura é obrigatório: presa, o toque seguinte não chega ao
            // alvo certo — mais uma forma de "não dá para colocar em qualquer lugar".
            onPointerCancel={(e) => {
              try { overlayRef.current?.releasePointerCapture(e.pointerId) } catch { /* já solto */ }
              setAct(null)
            }}
            style={{
              position: 'absolute', inset: 0,
              cursor: canManage && addMode ? 'crosshair' : 'default',
              // 'pan-y' deixa o dedo ROLAR o documento e ainda assim tocar para
              // posicionar. Fixo em 'none' (como era antes) o overlay engolia todo
              // gesto: não dava para descer a página e marcar nada na parte de baixo.
              // Só afeta toque — o mouse continua arrastando para desenhar a caixa.
              touchAction: canManage && addMode ? 'pan-y' : 'auto',
            }}
          >
            {pageFields.map((f) => (
              <div
                key={f.key}
                data-field={f.key}
                style={{
                  position: 'absolute',
                  left: `${f.x * 100}%`, top: `${f.y * 100}%`,
                  width: `${f.w * 100}%`, height: `${f.h * 100}%`,
                  border: '1.5px dashed var(--accent)',
                  background: 'var(--accent-soft)',
                  borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', fontSize: 11.5, fontWeight: 700,
                  // overflow VISÍVEL: com 'hidden' aqui o ✕ e a alça de
                  // redimensionar (que ficam nos cantos, para fora) sumiam.
                  // Quem corta o texto é o <span> de dentro.
                  boxSizing: 'border-box', textAlign: 'center', padding: 2,
                  // O campo é sempre arrastável, mesmo com o modo de posicionar
                  // desligado — por isso ele próprio segura o gesto do toque.
                  cursor: canManage ? (act?.kind === 'move' && act.key === f.key ? 'grabbing' : 'grab') : 'default',
                  touchAction: canManage ? 'none' : 'auto',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, pointerEvents: 'none', maxWidth: '100%', overflow: 'hidden' }}>
                  <Icon name="signature" size={13} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.placeholder || t.sig.signHere}</span>
                </span>
                {canManage && (
                  <>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); removeField(f.key) }}
                      aria-label={t.sig.removeField}
                      title={t.sig.removeField}
                      style={{ position: 'absolute', top: -9, right: -9, width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#d9534f', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.3)', touchAction: 'none' }}
                    >
                      <Icon name="close" size={12} />
                    </button>
                    {/* Alça do canto inferior-direito: redimensiona o campo. */}
                    <span
                      data-resize={f.key}
                      role="button"
                      aria-label={t.sig.resizeField}
                      title={t.sig.resizeField}
                      style={{
                        position: 'absolute', right: -7, bottom: -7, width: 18, height: 18,
                        borderRadius: 5, background: 'var(--accent)', border: '2px solid var(--surface)',
                        cursor: 'nwse-resize', touchAction: 'none', boxShadow: '0 2px 6px rgba(0,0,0,.25)',
                      }}
                    />
                  </>
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
