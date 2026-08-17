/**
 * Galeria de provas do caso — o "mostrador" das mesmas terminações que o
 * formulário aceita.
 *
 * Duas regras moldam o componente:
 *
 * 1. **A URL nasce no clique.** A listagem traz só metadados; o link temporário
 *    é pedido quando a pessoa abre o arquivo. Buscar todos de uma vez ao montar
 *    a tela criaria links válidos para o acervo inteiro sempre que alguém desse
 *    uma olhada — e bastaria a resposta cair num cache para a prova viajar.
 * 2. **Ver e baixar são botões diferentes**, porque são permissões diferentes.
 *    Quem não pode baixar não vê o botão; e mesmo que forçasse a chamada, o
 *    servidor recusa — a tela esconde, ela não protege.
 */
import { useEffect, useState, type CSSProperties } from 'react'
import { api } from '../../lib/api'
import type { ApiError } from '../../lib/types'

export type Prova = {
  id: string
  filename: string
  content_type: string
  kind: 'image' | 'video' | 'document'
  size_bytes: number
  created_at: string
}

export type EvidenceTextos = {
  title: string
  empty: string
  view: string
  download: string
  close: string
  failed: string
  noPreview: string
  loading: string
}

function humano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const ICONE: Record<string, string> = { image: '🖼️', video: '🎬', document: '📄' }

export default function EvidencePanel({
  caseId,
  canView,
  canDownload,
  textos,
  onError,
}: {
  caseId: string
  canView: boolean
  canDownload: boolean
  textos: EvidenceTextos
  onError: (msg: string) => void
}) {
  const [provas, setProvas] = useState<Prova[] | null>(null)
  const [aberta, setAberta] = useState<{ prova: Prova; url: string } | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  useEffect(() => {
    if (!canView) { setProvas([]); return }
    let vivo = true
    api
      .get<Prova[]>(`/cases/${caseId}/attachments`)
      .then((r) => vivo && setProvas(r))
      .catch(() => vivo && setProvas([]))
    return () => { vivo = false }
  }, [caseId, canView])

  async function abrir(prova: Prova) {
    setOcupado(prova.id)
    try {
      const r = await api.post<{ url: string }>(`/cases/${caseId}/attachments/${prova.id}/view-url`, {})
      // Documento não tem visualizador próprio aqui: o navegador já sabe abrir
      // PDF e reproduzir áudio, e uma aba nova faz isso melhor do que um <iframe>
      // que herdaria o nosso contexto.
      if (prova.kind === 'document') window.open(r.url, '_blank', 'noopener,noreferrer')
      else setAberta({ prova, url: r.url })
    } catch (e) {
      onError((e as ApiError).detail ?? textos.failed)
    } finally { setOcupado(null) }
  }

  async function baixar(prova: Prova) {
    setOcupado(prova.id)
    try {
      const r = await api.post<{ url: string }>(`/cases/${caseId}/attachments/${prova.id}/download-url`, {})
      // A URL já vem com `Content-Disposition: attachment` assinado dentro —
      // não é o `download` do <a> que decide, é o storage. Por isso basta
      // navegar até ela.
      window.location.href = r.url
    } catch (e) {
      onError((e as ApiError).detail ?? textos.failed)
    } finally { setOcupado(null) }
  }

  if (!canView) return null
  if (provas === null) return <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{textos.loading}</p>
  if (provas.length === 0) return null

  const cartao: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: 14, padding: '11px 13px',
  }
  const botao: CSSProperties = {
    padding: '6px 13px', borderRadius: 100, fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)',
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {provas.map((p) => (
          <div key={p.id} style={cartao}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }} aria-hidden>
              {ICONE[p.kind] ?? '📄'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--heading)', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.filename}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {humano(p.size_bytes)} · {new Date(p.created_at).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
              <button type="button" style={botao} disabled={ocupado === p.id} onClick={() => void abrir(p)}>
                {textos.view}
              </button>
              {canDownload && (
                <button type="button" style={botao} disabled={ocupado === p.id} onClick={() => void baixar(p)}>
                  {textos.download}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {aberta && (
        <div
          onClick={() => setAberta(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 12000, background: 'rgba(6,10,18,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {aberta.prova.filename}
              </span>
              <button
                type="button"
                onClick={() => setAberta(null)}
                style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.14)', color: '#fff', border: 'none', borderRadius: 100, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                {textos.close}
              </button>
            </div>

            {aberta.prova.kind === 'image' ? (
              <img src={aberta.url} alt={aberta.prova.filename} style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 12, objectFit: 'contain' }} />
            ) : aberta.prova.kind === 'video' ? (
              // `controlsList="nodownload"` tira o item "baixar" do menu do
              // player. Não é segurança — quem tem a URL tem o arquivo —, mas
              // evita que quem só pode VER baixe sem perceber que baixou.
              <video
                src={aberta.url}
                controls
                controlsList="nodownload"
                style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 12, background: '#000' }}
              />
            ) : (
              <p style={{ color: '#fff' }}>{textos.noPreview}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
