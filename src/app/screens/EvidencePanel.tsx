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

export type Acesso = {
  id: string
  action: 'view' | 'download'
  actor: string | null
  at: string
  ip: string | null
  user_agent: string | null
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
  noCodecTitle: string
  noCodecBody: string
  noCodecNoPerm: string
  accessLog: string
  accessLogEmpty: string
  accessView: string
  accessDownload: string
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
  canAudit,
  textos,
  onError,
}: {
  caseId: string
  canView: boolean
  canDownload: boolean
  canAudit: boolean
  textos: EvidenceTextos
  onError: (msg: string) => void
}) {
  const [provas, setProvas] = useState<Prova[] | null>(null)
  const [aberta, setAberta] = useState<{ prova: Prova; url: string } | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  /** Este navegador não consegue decodificar o vídeo aberto. */
  const [semCodec, setSemCodec] = useState(false)
  /** Histórico de acesso já carregado, por anexo. Sob demanda: é a resposta a
   *  uma pergunta que quase nunca se faz, e carregá-lo sempre seria N consultas
   *  de auditoria a cada abertura de caso. */
  const [historico, setHistorico] = useState<Record<string, Acesso[]>>({})
  const [aberto, setAberto] = useState<string | null>(null)

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
      if (prova.kind === 'document') { window.open(r.url, '_blank', 'noopener,noreferrer'); return }
      // Pergunta ao navegador se ele sabe tocar isto ANTES de montar o player.
      // `canPlayType` devolve '' para o que ele não reconhece — é assim que o
      // .mkv se anuncia em Chrome, Firefox e Safari. Sem esta pergunta, a
      // pessoa encara um player parado até o `onError` disparar (e em alguns
      // navegadores ele nem dispara).
      let naoToca = false
      if (prova.kind === 'video') {
        const teste = document.createElement('video')
        naoToca = teste.canPlayType(prova.content_type) === ''
      }
      setSemCodec(naoToca)
      setAberta({ prova, url: r.url })
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

  async function verHistorico(prova: Prova) {
    if (aberto === prova.id) { setAberto(null); return }
    setAberto(prova.id)
    if (historico[prova.id]) return
    try {
      const r = await api.get<Acesso[]>(`/cases/${caseId}/attachments/${prova.id}/access-log`)
      setHistorico((h) => ({ ...h, [prova.id]: r }))
    } catch (e) {
      onError((e as ApiError).detail ?? textos.failed)
      setAberto(null)
    }
  }

  if (!canView) return null
  if (provas === null) return <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{textos.loading}</p>
  if (provas.length === 0) return null

  const cartao: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
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
              {canAudit && (
                <button type="button" style={botao} onClick={() => void verHistorico(p)} title={textos.accessLog}>
                  {aberto === p.id ? '▴' : '▾'} {textos.accessLog}
                </button>
              )}
            </div>

            {canAudit && aberto === p.id && (
              <div style={{ flexBasis: '100%', borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10 }}>
                {(historico[p.id] ?? []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                    {historico[p.id] ? textos.accessLogEmpty : textos.loading}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {historico[p.id].map((a) => (
                      <div key={a.id} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: a.action === 'download' ? 'var(--accent)' : 'var(--text)' }}>
                          {a.action === 'download' ? textos.accessDownload : textos.accessView}
                        </span>
                        <span style={{ color: 'var(--heading)' }}>{a.actor ?? '—'}</span>
                        <span>{new Date(a.at).toLocaleString()}</span>
                        <span style={{ fontFamily: 'monospace' }}>{a.ip ?? '—'}</span>
                        <span style={{ flexBasis: '100%', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.user_agent ?? ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {aberta && (
        <div
          onClick={() => { setAberta(null); setSemCodec(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 12000, background: 'rgba(6,10,18,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {aberta.prova.filename}
              </span>
              <button
                type="button"
                onClick={() => { setAberta(null); setSemCodec(false) }}
                style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.14)', color: '#fff', border: 'none', borderRadius: 100, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                {textos.close}
              </button>
            </div>

            {aberta.prova.kind === 'image' ? (
              <img src={aberta.url} alt={aberta.prova.filename} style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 12, objectFit: 'contain' }} />
            ) : aberta.prova.kind === 'video' && !semCodec ? (
              // `controlsList="nodownload"` tira o item "baixar" do menu do
              // player. Não é segurança — quem tem a URL tem o arquivo —, mas
              // evita que quem só pode VER baixe sem perceber que baixou.
              //
              // O `onError` é o que importa aqui: navegador nenhum reproduz
              // Matroska (.mkv) de forma confiável, e vários também não abrem
              // .avi ou .wmv. Sem ele, o player ficava parado em 0:00 sem
              // explicar nada — o pior estado possível para uma prova, porque
              // parece defeito do sistema e não limitação do formato.
              <video
                src={aberta.url}
                controls
                controlsList="nodownload"
                onError={() => setSemCodec(true)}
                style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 12, background: '#000' }}
              />
            ) : (
              <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '26px 24px', maxWidth: 460, textAlign: 'center' }}>
                <div style={{ fontSize: 30, marginBottom: 10 }} aria-hidden>🎞️</div>
                <p style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                  {textos.noCodecTitle}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.55 }}>
                  {canDownload ? textos.noCodecBody : textos.noCodecNoPerm}
                </p>
                {canDownload && (
                  <button
                    type="button"
                    onClick={() => void baixar(aberta.prova)}
                    style={{ marginTop: 16, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 100, padding: '10px 22px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {textos.download}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
