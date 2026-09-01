/**
 * Visualizador de arquivos DENTRO do site — um overlay só, para tudo que o
 * navegador sabe exibir: imagem, vídeo, áudio, PDF e texto.
 *
 * O PDF é renderizado com o pdf.js (que já era dependência do módulo de
 * assinatura), e não numa aba nova nem num <iframe>, por dois motivos que não
 * são gosto: o Chrome de Android NÃO renderiza PDF em iframe/aba — baixa o
 * arquivo —, e a CSP do site (frame-src ausente → default-src 'self') barra
 * iframe apontando para o storage. Buscar os bytes e desenhar em canvas passa
 * pelo `connect-src` que já existe e funciona igual no celular.
 *
 * Erro de qualquer etapa cai num estado honesto: "não deu para abrir aqui",
 * com o download como saída quando a pessoa tem essa permissão.
 */
import { useEffect, useRef, useState } from 'react'
// Só o TIPO entra estático: o pdf.js pesa ~480KB e é carregado sob demanda
// (import dinâmico no efeito), senão ele viria no bundle principal de TODAS
// as páginas — inclusive a landing.
import type { PdfLoadingTask } from '../../lib/pdf'

export type FilePreviewTextos = {
  close: string
  download: string
  loading: string
  /** "Este formato não abre aqui" — também serve para falha de carregamento. */
  noPreview: string
  noCodecTitle: string
  noCodecBody: string
  noCodecNoPerm: string
}

function Falha({ textos, canDownload, onDownload }: {
  textos: FilePreviewTextos
  canDownload: boolean
  onDownload?: () => void
}) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '26px 24px', maxWidth: 460, textAlign: 'center' }}>
      <div style={{ fontSize: 30, marginBottom: 10 }} aria-hidden>📄</div>
      <p style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{textos.noCodecTitle}</p>
      <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.55 }}>
        {canDownload ? textos.noPreview : textos.noCodecNoPerm}
      </p>
      {canDownload && onDownload && (
        <button type="button" onClick={onDownload}
          style={{ marginTop: 16, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 100, padding: '10px 22px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
          {textos.download}
        </button>
      )}
    </div>
  )
}

/** Páginas do PDF em canvas, uma embaixo da outra, na largura disponível. */
function PdfPager({ url, textos, canDownload, onDownload }: {
  url: string
  textos: FilePreviewTextos
  canDownload: boolean
  onDownload?: () => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'erro'>('carregando')

  useEffect(() => {
    let cancelado = false
    let task: PdfLoadingTask | null = null
    ;(async () => {
      try {
        const [{ getDocument }, resp] = await Promise.all([
          import('../../lib/pdf'),
          fetch(url),
        ])
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const dados = await resp.arrayBuffer()
        if (cancelado) return
        task = getDocument({ data: dados })
        const pdf = await task.promise
        if (cancelado) return
        const wrap = wrapRef.current
        if (!wrap) return
        // Largura disponível decide a escala — no celular a página ocupa a
        // tela; no desktop limita a ~900px para o texto não virar outdoor.
        const larguraAlvo = Math.min(wrap.clientWidth || 800, 900)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelado) return
          const page = await pdf.getPage(i)
          const base = page.getViewport({ scale: 1 })
          const escala = larguraAlvo / base.width
          const vp = page.getViewport({ scale: escala * dpr })
          const canvas = document.createElement('canvas')
          canvas.width = vp.width
          canvas.height = vp.height
          canvas.style.width = `${vp.width / dpr}px`
          canvas.style.height = `${vp.height / dpr}px`
          canvas.style.display = 'block'
          canvas.style.margin = '0 auto 12px'
          canvas.style.borderRadius = '8px'
          canvas.style.background = '#fff'
          const ctx = canvas.getContext('2d')
          if (!ctx) continue
          await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise
          if (cancelado) return
          wrap.appendChild(canvas)
        }
        setEstado('pronto')
      } catch {
        if (!cancelado) setEstado('erro')
      }
    })()
    return () => {
      cancelado = true
      void task?.destroy()
    }
  }, [url])

  if (estado === 'erro') return <Falha textos={textos} canDownload={canDownload} onDownload={onDownload} />
  return (
    <div className="app-scroll" style={{ overflowY: 'auto', maxHeight: '82vh', width: 'min(92vw, 940px)', borderRadius: 12 }}>
      {estado === 'carregando' && (
        <p style={{ color: '#fff', textAlign: 'center', padding: 30 }}>{textos.loading}</p>
      )}
      <div ref={wrapRef} />
    </div>
  )
}

/** Texto puro (txt/csv), buscado e mostrado — sem executar nada. */
function TextoPlano({ url, textos, canDownload, onDownload }: {
  url: string
  textos: FilePreviewTextos
  canDownload: boolean
  onDownload?: () => void
}) {
  const [conteudo, setConteudo] = useState<string | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      // 2 MB de texto já é mais do que qualquer olho aguenta num overlay.
      .then((t) => { if (vivo) setConteudo(t.slice(0, 2_000_000)) })
      .catch(() => { if (vivo) setErro(true) })
    return () => { vivo = false }
  }, [url])

  if (erro) return <Falha textos={textos} canDownload={canDownload} onDownload={onDownload} />
  return (
    <pre className="app-scroll" style={{
      overflow: 'auto', maxHeight: '82vh', width: 'min(92vw, 940px)',
      background: 'var(--surface)', color: 'var(--heading)', borderRadius: 12,
      padding: 18, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap',
      wordBreak: 'break-word', margin: 0,
    }}>
      {conteudo ?? textos.loading}
    </pre>
  )
}

export default function FilePreview({ url, filename, contentType, canDownload, onClose, onDownload, textos }: {
  url: string
  filename: string
  contentType: string
  canDownload: boolean
  onClose: () => void
  onDownload?: () => void
  textos: FilePreviewTextos
}) {
  const tipo = (contentType || '').split(';')[0].trim().toLowerCase()
  const [semCodec, setSemCodec] = useState(false)

  let corpo: JSX.Element
  if (tipo.startsWith('image/')) {
    corpo = <img src={url} alt={filename} style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 12, objectFit: 'contain' }} />
  } else if (tipo.startsWith('video/') && !semCodec) {
    corpo = (
      <video src={url} controls controlsList="nodownload" onError={() => setSemCodec(true)}
        style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 12, background: '#000' }} />
    )
  } else if (tipo.startsWith('video/')) {
    corpo = <Falha textos={{ ...textos, noPreview: textos.noCodecBody }} canDownload={canDownload} onDownload={onDownload} />
  } else if (tipo.startsWith('audio/')) {
    corpo = (
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '22px 24px', width: 'min(92vw, 460px)' }}>
        <p style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 14, marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</p>
        <audio src={url} controls controlsList="nodownload" style={{ width: '100%' }} onError={() => setSemCodec(true)} />
      </div>
    )
  } else if (tipo === 'application/pdf') {
    corpo = <PdfPager url={url} textos={textos} canDownload={canDownload} onDownload={onDownload} />
  } else if (tipo.startsWith('text/')) {
    corpo = <TextoPlano url={url} textos={textos} canDownload={canDownload} onDownload={onDownload} />
  } else {
    corpo = <Falha textos={textos} canDownload={canDownload} onDownload={onDownload} />
  }

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 12000, background: 'rgba(6,10,18,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(10px,3vw,24px)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '94vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
          <span style={{ fontWeight: 700, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {filename}
          </span>
          {canDownload && onDownload && (
            <button type="button" onClick={onDownload}
              style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.14)', color: '#fff', border: 'none', borderRadius: 100, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {textos.download}
            </button>
          )}
          <button type="button" onClick={onClose}
            style={{ marginLeft: canDownload && onDownload ? 0 : 'auto', background: 'rgba(255,255,255,.14)', color: '#fff', border: 'none', borderRadius: 100, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
            {textos.close}
          </button>
        </div>
        {corpo}
      </div>
    </div>
  )
}
