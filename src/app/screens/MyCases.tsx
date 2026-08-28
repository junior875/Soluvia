/**
 * "Meus atendimentos" — só o que está esperando por ESTA pessoa.
 *
 * A lista geral de casos mostra tudo que ela pode VER; esta mostra o que ela
 * precisa FAZER. São perguntas diferentes, e misturá-las obriga cada pessoa a
 * varrer a lista inteira procurando o próprio nome.
 *
 * A fonte é `/cases/mine/assignments`: as fichas ATIVAS dela, pessoais e pelos
 * papéis que ela tem.
 */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { KIND_VISUAL } from '../../lib/flowKinds'
import type { ApiError, StageKind } from '../../lib/types'
import { Icon } from '../icons'
import { useT } from '../strings'
import { Button, Card, Chip, EmptyState, PageHeader, Skeleton } from '../ui'

type Ficha = {
  case_id: string
  protocol: string
  title: string
  status: string
  stage_name: string
  is_closer: boolean
  kind: StageKind
  activated_at: string | null
  sla_days: number
  sla_hours: number | null
  module: string
}

export default function MyCases() {
  const t = useT()
  const tx = t.mine
  const [fichas, setFichas] = useState<Ficha[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      setFichas(await api.get<Ficha[]>('/cases/mine/assignments'))
    } catch (e) {
      setErro((e as ApiError).detail ?? 'Erro')
      setFichas([])
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  /** Dias desde que virou a vez dela. É o número que diz o que atrasou. */
  const diasEsperando = (iso: string | null) =>
    iso === null ? null : Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)

  function abrir(f: Ficha) {
    // Mesma rota do e-mail e do sininho: a tela de casos lê `protocolo` e abre
    // o caso. Um caminho só para chegar no caso, vindo de onde vier.
    const tela = f.module === 'sac' ? 'sac' : 'cases'
    window.location.hash = `painel/${tela}?protocolo=${f.protocol}`
  }

  if (fichas === null) {
    return (
      <div className="app-screen">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} h={82} r={16} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="app-screen">
      <PageHeader title={tx.title} subtitle={tx.subtitle} />

      {erro && <Card style={{ marginBottom: 14 }}><p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{erro}</p></Card>}

      {fichas.length === 0 ? (
        <Card><EmptyState icon="check" title={tx.empty} body={tx.emptyBody} /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fichas.map((f) => {
            const dias = diasEsperando(f.activated_at)
            // Atrasado é fato, não estimativa: só marca quando há SLA definido
            // e ele já passou. Em HORAS quando a ficha as tem — no SAC uma
            // etapa de 4h "atrasada em dias" nunca apareceria atrasada.
            const horasEsperando = f.activated_at === null
              ? null : Math.floor((Date.now() - new Date(f.activated_at).getTime()) / 3600000)
            const atrasado = f.sla_hours != null
              ? horasEsperando !== null && horasEsperando > f.sla_hours
              : dias !== null && !!f.sla_days && dias > f.sla_days
            return (
              <Card key={f.case_id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 15 }}>
                        {f.protocol}
                      </span>
                      <Chip tone={f.is_closer ? 'green' : 'accent'}>
                        {f.is_closer ? t.cases.inv.closer : `${tx.stage}: ${f.stage_name}`}
                      </Chip>
                      {/* O TIPO do bloco, com a mesma cor e ícone do canvas: a
                          pessoa sabe o que vão pedir dela antes de abrir — se é
                          escrever uma decisão ou juntar documento. */}
                      {(() => {
                        const kind: StageKind = f.kind ?? 'decisao'
                        const vis = KIND_VISUAL[kind]
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${vis.cor}`, color: vis.cor, borderRadius: 100, padding: '2px 9px', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                            <Icon name={vis.icon} size={12} />
                            {t.flow.kinds[kind]}
                          </span>
                        )
                      })()}
                      {atrasado && <Chip tone="accent">{tx.overdue}</Chip>}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.title}
                    </div>
                    {dias !== null && (
                      <div style={{ color: atrasado ? '#e11d48' : 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>
                        {tx.since} {dias === 0 ? t.notif.now : t.notif.days(dias)}
                        {f.sla_days ? ` · ${tx.due} ${f.sla_days}d` : ''}
                      </div>
                    )}
                  </div>
                  <Button leftIcon="cases" onClick={() => abrir(f)}>{tx.open}</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
