/**
 * COFRE DE PROVAS — todas as evidências que a pessoa pode ver, num lugar só.
 *
 * O auditor sabe o NOME do laudo, não o protocolo do caso — e procurar um
 * arquivo abrindo caso por caso não escala. O cofre busca por nome ou
 * protocolo, filtra por módulo/tipo/origem, e cada linha diz de onde a prova
 * veio (do relato ou de qual etapa da apuração).
 *
 * A permissão é a mesma da tela do caso (`view_evidence` por módulo + escopo):
 * o cofre não abre nada novo — só tira a prova do fundo da gaveta.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import type { ApiError } from '../../lib/types'
import { useCaps } from '../capabilities'
import { modPerm } from '../modulePerms'
import { goScreen } from '../nav'
import { DuoIcon, Icon, type IconName } from '../icons'
import { useT } from '../strings'
import { Button, Card, Chip, EmptyState, Input, PageHeader, Skeleton } from '../ui'

type Prova = {
  id: string
  case_id: string
  protocol: string
  module: string
  filename: string
  content_type: string
  kind: 'image' | 'video' | 'document'
  size_bytes: number
  created_at: string
  stage_name: string | null
  previewable: boolean
}

const ICONE_DO_KIND: Record<string, IconName> = {
  image: 'eye', video: 'eye', document: 'audit',
}

function humano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function EvidenceVault() {
  const t = useT()
  const tx = t.vault
  const { can } = useCaps()
  const [provas, setProvas] = useState<Prova[] | null>(null)
  const [q, setQ] = useState('')
  const [modulo, setModulo] = useState<'todos' | 'etica' | 'sac'>('todos')
  const [tipo, setTipo] = useState<'todos' | 'image' | 'video' | 'document'>('todos')
  const [origem, setOrigem] = useState<'todas' | 'relato' | 'apuracao'>('todas')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const carregar = useCallback(async () => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (modulo !== 'todos') params.set('module', modulo)
    if (tipo !== 'todos') params.set('kind', tipo)
    if (origem !== 'todas') params.set('origem', origem)
    try {
      setProvas(await api.get<Prova[]>(`/cases/evidence/all?${params}`))
      setErro(null)
    } catch (e) {
      setErro((e as ApiError).detail ?? t.cases.fail)
      setProvas([])
    }
  }, [q, modulo, tipo, origem, t.cases.fail])

  // Busca com folga de digitação; filtros aplicam na hora.
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void carregar(), 350)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [carregar])

  async function abrir(p: Prova) {
    setOcupado(p.id)
    try {
      const acao = p.previewable ? 'view-url' : 'download-url'
      const r = await api.post<{ url: string }>(
        `/cases/${p.case_id}/attachments/${p.id}/${acao}`, {},
      )
      window.open(r.url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setErro((e as ApiError).detail ?? t.cases.fail)
    } finally { setOcupado(null) }
  }

  const podeBaixar = (p: Prova) => can(modPerm(p.module === 'sac' ? 'sac' : 'etica', 'download_evidence'))

  async function baixar(p: Prova) {
    setOcupado(p.id)
    try {
      const r = await api.post<{ url: string }>(
        `/cases/${p.case_id}/attachments/${p.id}/download-url`, {},
      )
      window.open(r.url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setErro((e as ApiError).detail ?? t.cases.fail)
    } finally { setOcupado(null) }
  }

  const Filtro = <V extends string>({ valor, opcoes, ao }: {
    valor: V; opcoes: [V, string][]; ao: (v: V) => void
  }) => (
    <div style={{ display: 'inline-flex', background: 'var(--surface-2)', borderRadius: 100, padding: 3 }}>
      {opcoes.map(([v, rotulo]) => (
        <button key={v} type="button" onClick={() => ao(v)} className="app-btn"
          style={{ border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 100, fontWeight: 700, fontSize: 12, background: valor === v ? 'var(--accent)' : 'transparent', color: valor === v ? '#fff' : 'var(--text-muted)' }}>
          {rotulo}
        </button>
      ))}
    </div>
  )

  return (
    <div className="app-screen">
      <PageHeader title={tx.title} subtitle={tx.subtitle} />

      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 260px' }}>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx.searchPh} />
          </div>
          <Filtro valor={modulo} ao={setModulo} opcoes={[['todos', tx.fAll], ['etica', tx.fEtica], ['sac', tx.fSac]]} />
          <Filtro valor={tipo} ao={setTipo} opcoes={[['todos', tx.fAll], ['image', tx.fImage], ['video', tx.fVideo], ['document', tx.fDoc]]} />
          <Filtro valor={origem} ao={setOrigem} opcoes={[['todas', tx.fAll], ['relato', tx.fReport], ['apuracao', tx.fFlow]]} />
        </div>
      </Card>

      {erro && <Card style={{ marginBottom: 14 }}><p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{erro}</p></Card>}

      {provas === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} h={64} r={14} />)}
        </div>
      ) : provas.length === 0 ? (
        <Card><EmptyState icon="vault" title={tx.empty} body={tx.emptyBody} /></Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {provas.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < provas.length - 1 ? '1px solid var(--border)' : 'none', flexWrap: 'wrap' }}>
              <span style={{ width: 36, height: 36, minWidth: 36, borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DuoIcon name={ICONE_DO_KIND[p.kind] ?? 'audit'} size={17} />
              </span>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.filename}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {/* Protocolo clicável: do arquivo para o caso num salto. */}
                  <button type="button" className="app-btn"
                    onClick={() => { window.location.hash = `painel/${p.module === 'sac' ? 'sac' : 'cases'}?protocolo=${p.protocol}` }}
                    style={{ cursor: 'pointer', border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 100, padding: '2px 9px', fontSize: 11, fontWeight: 800 }}>
                    {p.protocol}
                  </button>
                  {p.stage_name ? (
                    <Chip tone="blue">{p.stage_name}</Chip>
                  ) : (
                    <Chip tone="muted">{p.module === 'sac' ? tx.fromCustomer : tx.fromReporter}</Chip>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
                    {humano(p.size_bytes)} · {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                <Button variant="ghost" leftIcon="eye" loading={ocupado === p.id} onClick={() => void abrir(p)} style={{ padding: '7px 13px', fontSize: 12.5 }}>
                  {tx.open}
                </Button>
                {podeBaixar(p) && (
                  <Button variant="outline" leftIcon="download" onClick={() => void baixar(p)} style={{ padding: '7px 13px', fontSize: 12.5 }}>
                    {tx.download}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
      {provas !== null && provas.length > 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 10 }}>
          {tx.count(provas.length)}
          {/* Ícone só decorativo no rodapé para fechar a identidade da tela. */}
          {' '}<Icon name="lock" size={11} style={{ verticalAlign: 'middle' }} />
        </p>
      )}
    </div>
  )
}
