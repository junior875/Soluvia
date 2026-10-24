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
import ImpedimentoBotao from '../../components/ImpedimentoBotao'
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
  // A RÉGUA congelada na liberação + o vencimento JÁ CALCULADO pelo servidor
  // (com os feriados da empresa). A tela não tem o calendário: era dividir
  // horas por 24 aqui que acendia "Atrasado" no domingo para uma etapa de
  // "2 dias" liberada na sexta.
  sla_mode?: 'horas' | 'corridos' | 'uteis'
  sla_value?: number
  due_at?: string | null
  prazo_label?: string
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
    // Mesma rota do e-mail e do sininho — mas com o ID do caso, e não só o
    // protocolo. O protocolo precisa da LISTA do canal para virar id, e quem
    // responde uma etapa sem ler o canal inteiro não recebe lista nenhuma:
    // clicava em Abrir e caía na visão geral, com a ficha ainda esperando.
    const tela = f.module === 'sac' ? 'sac' : 'cases'
    window.location.hash = `painel/${tela}?caso=${f.case_id}`
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
            // Atrasado é fato, não estimativa — e o fato é o `due_at` que o
            // SERVIDOR calculou, pela régua congelada na ficha e com os
            // feriados da empresa aplicados. Contar aqui em horas fazia uma
            // etapa de "2 dias úteis" liberada na sexta acender no domingo.
            //
            // A queda para horas serve a ficha liberada ANTES destes campos:
            // ela continua cobrada pela régua com que nasceu.
            const horasEsperando = f.activated_at === null
              ? null : Math.floor((Date.now() - new Date(f.activated_at).getTime()) / 3600000)
            const atrasado = f.due_at
              ? Date.now() > new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(f.due_at) ? f.due_at : `${f.due_at}Z`).getTime()
              : f.sla_hours != null
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
                        {/* O prazo vem ESCRITO do servidor (`prazo_label`: "4
                            horas", "2 dias úteis"), na régua congelada na
                            liberação. Escrever `${f.sla_days}d` aqui era
                            traduzir TUDO para dias: uma etapa de 4 HORAS
                            aparecia como "prazo 5d" para quem tinha de agir
                            naquela tarde — o cartão dizia cinco dias de folga
                            onde não havia nenhum.
                            A queda para `sla_days` serve só a ficha liberada
                            antes de o campo existir. */}
                        {f.prazo_label
                          ? ` · ${tx.due} ${f.prazo_label}`
                          : f.sla_days ? ` · ${tx.due} ${f.sla_days}d` : ''}
                      </div>
                    )}
                  </div>
                  {/* "Declarar impedimento" (item 17b) na própria ficha, e não
                      só na gaveta do caso: quem é citado no relato recebe a
                      cobrança DAQUI, e a saída tem de ficar ao lado do que
                      cobra. Mandá-lo abrir o caso para se retirar dele é pedir
                      que ele leia o que está dizendo que não pode ler.
                      `compact` porque divide a linha com o "Abrir". */}
                  <ImpedimentoBotao
                    caseId={f.case_id}
                    protocol={f.protocol}
                    compact
                    // A ficha SAI da lista no mesmo instante (ela virou
                    // `skipped` e o caso deixou de ser alcançável): recarregar
                    // é o que faz a tela contar a verdade.
                    onDone={() => { void carregar() }}
                    onError={setErro}
                  />
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
