/**
 * "Meus acompanhamentos" — os casos que a pessoa SEGUE, sem responder por eles.
 *
 * É a tela irmã de "Meus atendimentos", e a diferença entre as duas é a
 * pergunta que respondem: lá é "o que espera por mim?", aqui é "o que andou no
 * que eu acompanho?". Juntar as duas obrigaria quem observa dez apurações a
 * caçar as próprias pendências no meio delas.
 *
 * A marca de novidade é o ponto da tela: caso com evento mais novo do que a
 * última visita vem sinalizado e no topo. Sem ela, acompanhar dez casos
 * significa abrir os dez para descobrir qual mexeu.
 */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { ApiError } from '../../lib/types'
import { Icon } from '../icons'
import { useT } from '../strings'
import { Button, Card, Chip, EmptyState, PageHeader, Skeleton } from '../ui'

type Acompanhado = {
  case_id: string
  protocol: string
  title: string
  status: string
  severity: string
  module: string
  last_event_at: string | null
  last_seen_at: string | null
  has_update: boolean
}

export default function MyWatching() {
  const t = useT()
  const tx = t.watching
  const [itens, setItens] = useState<Acompanhado[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      setItens(await api.get<Acompanhado[]>('/cases/mine/watching'))
    } catch (e) {
      setErro((e as ApiError).detail ?? t.cases.fail)
      setItens([])
    }
  }, [t.cases.fail])

  useEffect(() => { void carregar() }, [carregar])

  async function abrir(item: Acompanhado) {
    // Marca como visto ANTES de sair da tela: se esperasse a volta, a pessoa
    // veria a mesma novidade sinalizada depois de já ter lido o caso.
    try { await api.post(`/cases/${item.case_id}/seen`, {}) } catch { /* a marca é conforto, não regra */ }
    const tela = item.module === 'sac' ? 'sac' : 'cases'
    window.location.hash = `painel/${tela}?protocolo=${item.protocol}`
  }

  const quando = (iso: string | null) => {
    if (!iso) return null
    const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    return dias === 0 ? t.notif.now : t.notif.days(dias)
  }

  if (itens === null) {
    return (
      <div className="app-screen">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} h={82} r={16} />)}
        </div>
      </div>
    )
  }

  // Novidade primeiro: é o motivo de a tela existir.
  const ordenados = [...itens].sort((a, b) => Number(b.has_update) - Number(a.has_update))
  const novidades = itens.filter((i) => i.has_update).length

  return (
    <div className="app-screen">
      <PageHeader
        title={tx.title}
        subtitle={novidades > 0 ? tx.subtitleUpdates(novidades) : tx.subtitle}
      />

      {erro && <Card style={{ marginBottom: 14 }}><p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{erro}</p></Card>}

      {ordenados.length === 0 ? (
        <Card><EmptyState icon="eye" title={tx.empty} body={tx.emptyBody} /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ordenados.map((i) => (
            <Card
              key={i.case_id}
              style={i.has_update ? { borderColor: 'var(--accent)', boxShadow: 'inset 3px 0 0 var(--accent)' } : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 15 }}>{i.protocol}</span>
                    {i.has_update && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--accent)', color: '#fff', borderRadius: 100, padding: '2px 10px', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                        <Icon name="spark" size={12} />
                        {tx.updated}
                      </span>
                    )}
                    <Chip tone="muted">{(t.cases.stat as Record<string, string>)[i.status] ?? i.status}</Chip>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i.title}
                  </div>
                  {i.last_event_at && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>
                      {tx.lastMove} {quando(i.last_event_at)}
                    </div>
                  )}
                </div>
                <Button leftIcon="eye" onClick={() => void abrir(i)}>{tx.open}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
