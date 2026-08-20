/**
 * Central de custos e entradas.
 *
 * A tela mostra três coisas que NÃO são a mesma e que um painel descuidado
 * empilharia como se fossem:
 *
 *  · CONTRATADO — o MRR que sai dos nossos planos. Existe mesmo sem Stripe.
 *  · RECEBIDO   — o que a Stripe registrou de fato. É o livro-caixa.
 *  · CUSTO      — consumo medido convertido por taxas explícitas.
 *
 * A distância entre contratado e recebido é inadimplência, e é por isso que os
 * dois aparecem lado a lado em vez de um "faturamento" só.
 *
 * Quando a Stripe não responde, a área de recebido vira um aviso — nunca R$ 0.
 * "Não entrou dinheiro" e "não fui olhar" levam a decisões opostas.
 */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { ApiError } from '../../lib/types'
import { Card, Chip, EmptyState, PageHeader, Skeleton, StatCard } from '../../app/ui'

type Mes = { month: string; gross: number; fees: number; net: number; refunds: number }
type MesCusto = { month: string; ai: number; stripe_fees: number | null; fixed: number; total: number }
type Empresa = {
  tenant_id: string
  name: string
  slug: string
  plan_name: string | null
  billing_cycle: string | null
  status: string
  mrr: number
  ai_tokens: number
  cost_ai: number
  cost_storage: number
  cost_total: number
  margin: number
}

type Financeiro = {
  currency: string
  month: string
  stripe: { connected: boolean; reason: string | null }
  recurring: {
    mrr: number
    arr: number
    active_subscriptions: number
    by_status: Record<string, number>
    churn_at_risk: number
    by_plan: { plan_name: string; companies: number; mrr: number }[]
  }
  received: { months: Mes[]; current_month: Mes; period_total: Omit<Mes, 'month'> } | null
  costs: {
    months: MesCusto[]
    ai_tokens_current_month: number
    rates: {
      usd_to_brl: number
      ai_usd_per_million_tokens: number
      storage_usd_per_gb_month: number
      fixed_monthly_usd: number
    }
  }
  storage_now: { gb: number; amount: number }
  current_month_cost: number
  margin: {
    revenue: number
    revenue_source: string
    cost: number
    profit: number
    percent: number | null
  }
  companies: Empresa[]
}

export type FinanceTextos = {
  titulo: string
  subtitulo: string
  mrr: string
  mrrSub: string
  recebido: string
  recebidoSub: string
  custo: string
  custoSub: string
  lucro: string
  lucroBase: Record<string, string>
  semStripe: string
  semStripeCorpo: string
  erroStripe: string
  erroStripeCorpo: string
  porMes: string
  porMesLegenda: string
  entrou: string
  saiu: string
  bruto: string
  taxas: string
  liquido: string
  estornos: string
  porPlano: string
  empresas: string
  companyPlan: string
  companyMrr: string
  companyCost: string
  companyMargin: string
  churn: string
  churnSub: string
  origens: string
  origemIa: string
  origemStorage: string
  origemTaxas: string
  origemFixo: string
  rateio: string
  taxasUsadas: string
  /** Unidade do custo fixo: "mês". Sem isto a linha virava "US$ 0/custo do mês". */
  unidadeMes: string
  taxasOnde: string
  vazio: string
  ciclos: Record<string, string>
  estados: Record<string, string>
}

const TOM_ESTADO: Record<string, 'green' | 'accent' | 'muted'> = {
  active: 'green',
  canceled: 'muted',
  suspended: 'accent',
}

export default function PlatformFinance({
  textos,
  onToast,
  lang,
}: {
  textos: FinanceTextos
  onToast: (msg: string) => void
  lang: string
}) {
  const [dados, setDados] = useState<Financeiro | null>(null)

  const carregar = useCallback(async () => {
    try {
      setDados(await api.get<Financeiro>('/platform/finance?months=6'))
    } catch (e) {
      onToast((e as ApiError).detail ?? 'Não foi possível carregar o financeiro.')
    }
  }, [onToast])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR'
  const dinheiro = (n: number) =>
    n.toLocaleString(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })
  // Rótulo do mês a partir de "2026-08". O dia 1 entra explícito porque
  // `new Date('2026-08')` é lido como UTC e, a oeste de Greenwich, volta
  // mostrando julho.
  const mesCurto = (m: string) => {
    const [a, mm] = m.split('-')
    return new Date(Number(a), Number(mm) - 1, 1)
      .toLocaleDateString(locale, { month: 'short', year: '2-digit' })
      .replace('.', '')
  }

  if (!dados) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Skeleton h={100} r={16} />
        <Skeleton h={220} r={16} />
        <Skeleton h={160} r={16} />
      </div>
    )
  }

  const { recurring: rec, received: receb, costs, margin } = dados
  const stripeOk = dados.stripe.connected && dados.stripe.reason === null

  // Escala compartilhada entre entradas e custos: barras com escalas separadas
  // fariam um custo pequeno parecer do tamanho de uma receita grande.
  const teto = Math.max(
    1,
    ...(receb?.months ?? []).map((m) => m.gross),
    ...costs.months.map((m) => m.total),
  )

  return (
    <div>
      <PageHeader title={textos.titulo} subtitle={textos.subtitulo} />

      {/* Os quatro números que resumem o mês. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
        <StatCard icon="billing" label={textos.mrr} value={dinheiro(rec.mrr)}
          sub={`${rec.active_subscriptions} · ${textos.mrrSub}`} />
        <StatCard icon="overview" label={textos.recebido}
          value={stripeOk && receb ? dinheiro(receb.current_month.net) : '—'}
          sub={stripeOk ? textos.recebidoSub : textos.semStripe} />
        <StatCard icon="settings" label={textos.custo} value={dinheiro(dados.current_month_cost)}
          sub={textos.custoSub} />
        <StatCard icon="spark" label={textos.lucro} value={dinheiro(margin.profit)}
          sub={`${margin.percent === null ? '—' : `${margin.percent}%`} · ${textos.lucroBase[margin.revenue_source] ?? margin.revenue_source}`} />
      </div>

      {/* Sem Stripe, dizer o que falta — não desenhar zeros. */}
      {!stripeOk && (
        <div style={{ marginTop: 16 }}>
          <Card>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', marginTop: 7, flexShrink: 0 }} />
              <div>
                <p style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 14.5 }}>
                  {dados.stripe.connected ? textos.erroStripe : textos.semStripe}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                  {dados.stripe.connected ? textos.erroStripeCorpo : textos.semStripeCorpo}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Entradas × custos, mês a mês. */}
      <div style={{ marginTop: 16 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <p style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 16 }}>{textos.porMes}</p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' }} />{textos.entrou}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--text-muted)', opacity: .55 }} />{textos.saiu}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(8px,2vw,22px)', height: 170, overflowX: 'auto', paddingBottom: 4 }}>
            {costs.months.map((c, i) => {
              const entrada = receb?.months[i]?.gross ?? 0
              return (
                <div key={c.month} style={{ flex: '1 1 0', minWidth: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4, width: '100%', justifyContent: 'center' }}>
                    <div
                      title={`${textos.entrou}: ${dinheiro(entrada)}`}
                      style={{
                        width: '38%', maxWidth: 26, borderRadius: '6px 6px 0 0',
                        // Altura mínima só para valor REAL: um traço em zero
                        // diria que entrou alguma coisa naquele mês.
                        height: entrada > 0 ? `${Math.max(3, (entrada / teto) * 100)}%` : 0,
                        background: 'var(--accent)',
                      }}
                    />
                    <div
                      title={`${textos.saiu}: ${dinheiro(c.total)}`}
                      style={{
                        width: '38%', maxWidth: 26, borderRadius: '6px 6px 0 0',
                        height: c.total > 0 ? `${Math.max(3, (c.total / teto) * 100)}%` : 0,
                        background: 'var(--text-muted)', opacity: .5,
                      }}
                    />
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11.5, whiteSpace: 'nowrap' }}>{mesCurto(c.month)}</span>
                </div>
              )
            })}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>{textos.porMesLegenda}</p>
        </Card>
      </div>

      {/* Detalhe do recebido: bruto, taxa e líquido são números diferentes. */}
      {stripeOk && receb && (
        <div style={{ marginTop: 16 }}>
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 440 }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    <th style={{ textAlign: 'left', padding: '0 10px 10px 0', fontWeight: 700 }}>{textos.porMes}</th>
                    <th style={{ textAlign: 'right', padding: '0 10px 10px', fontWeight: 700 }}>{textos.bruto}</th>
                    <th style={{ textAlign: 'right', padding: '0 10px 10px', fontWeight: 700 }}>{textos.taxas}</th>
                    <th style={{ textAlign: 'right', padding: '0 10px 10px', fontWeight: 700 }}>{textos.estornos}</th>
                    <th style={{ textAlign: 'right', padding: '0 0 10px 10px', fontWeight: 700 }}>{textos.liquido}</th>
                  </tr>
                </thead>
                <tbody>
                  {receb.months.map((m) => (
                    <tr key={m.month} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 10px 10px 0', color: 'var(--heading)', fontWeight: 600 }}>{mesCurto(m.month)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{dinheiro(m.gross)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)' }}>−{dinheiro(m.fees)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: m.refunds > 0 ? '#e11d48' : 'var(--text-muted)' }}>
                        {m.refunds > 0 ? `−${dinheiro(m.refunds)}` : '—'}
                      </td>
                      <td style={{ padding: '10px 0 10px 10px', textAlign: 'right', color: 'var(--heading)', fontWeight: 700 }}>{dinheiro(m.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginTop: 16 }}>
        {/* De onde vem a receita contratada. */}
        <Card>
          <p style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 15, marginBottom: 14 }}>{textos.porPlano}</p>
          {rec.by_plan.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{textos.vazio}</p>
          ) : (
            rec.by_plan.map((p) => (
              <div key={p.plan_name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--heading)', fontWeight: 600, fontSize: 14 }}>{p.plan_name}</span>
                <Chip tone="muted">{p.companies}</Chip>
                <span style={{ marginLeft: 'auto', color: 'var(--heading)', fontWeight: 700, fontSize: 14 }}>{dinheiro(p.mrr)}</span>
              </div>
            ))
          )}
          {rec.churn_at_risk > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <p style={{ color: '#e11d48', fontWeight: 700, fontSize: 14 }}>−{dinheiro(rec.churn_at_risk)} · {textos.churn}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 3 }}>{textos.churnSub}</p>
            </div>
          )}
        </Card>

        {/* De onde vem o custo. */}
        <Card>
          <p style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 15, marginBottom: 14 }}>{textos.origens}</p>
          {[
            { label: textos.origemIa, valor: costs.months[costs.months.length - 1]?.ai ?? 0 as number | null, extra: `${costs.ai_tokens_current_month.toLocaleString(locale)} tokens` },
            { label: textos.origemStorage, valor: dados.storage_now.amount, extra: `${dados.storage_now.gb} GB` },
            // Taxa vem `null` quando a Stripe não respondeu. Mostrar R$ 0,00
            // aqui seria o mesmo defeito que o resto da tela evita: afirmar
            // "não custou nada" quando o fato é "não deu para saber".
            { label: textos.origemTaxas, valor: costs.months[costs.months.length - 1]?.stripe_fees ?? null, extra: '' },
            { label: textos.origemFixo, valor: costs.months[costs.months.length - 1]?.fixed ?? 0, extra: '' },
          ].map((o) => (
            <div key={o.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--heading)', fontWeight: 600, fontSize: 14 }}>{o.label}</span>
              {o.extra && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{o.extra}</span>}
              <span style={{ marginLeft: 'auto', color: o.valor === null ? 'var(--text-muted)' : 'var(--heading)', fontWeight: 700, fontSize: 14 }}>{o.valor === null ? '—' : dinheiro(o.valor)}</span>
            </div>
          ))}
          <p style={{ color: 'var(--text-muted)', fontSize: 11.5, marginTop: 14, lineHeight: 1.5 }}>
            {textos.taxasUsadas}: US$ {costs.rates.ai_usd_per_million_tokens}/M tokens · US$ {costs.rates.storage_usd_per_gb_month}/GB ·
            US$ {costs.rates.fixed_monthly_usd}/{textos.unidadeMes} · USD {costs.rates.usd_to_brl}
            <br />
            {textos.taxasOnde}
          </p>
        </Card>
      </div>

      {/* Margem por empresa — o rateio que diz qual cliente compensa. */}
      <div style={{ marginTop: 16 }}>
        <Card>
          <p style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{textos.empresas}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 14 }}>{textos.rateio}</p>
          {dados.companies.length === 0 ? (
            <EmptyState icon="overview" title={textos.vazio} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 520 }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    <th style={{ textAlign: 'left', padding: '0 10px 10px 0', fontWeight: 700 }}>{textos.empresas}</th>
                    <th style={{ textAlign: 'left', padding: '0 10px 10px', fontWeight: 700 }}>{textos.companyPlan}</th>
                    <th style={{ textAlign: 'right', padding: '0 10px 10px', fontWeight: 700 }}>{textos.companyMrr}</th>
                    <th style={{ textAlign: 'right', padding: '0 10px 10px', fontWeight: 700 }}>{textos.companyCost}</th>
                    <th style={{ textAlign: 'right', padding: '0 0 10px 10px', fontWeight: 700 }}>{textos.companyMargin}</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.companies.map((c) => (
                    <tr key={c.tenant_id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 10px 10px 0' }}>
                        <div style={{ color: 'var(--heading)', fontWeight: 600 }}>{c.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.slug}</div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--heading)' }}>{c.plan_name ?? '—'}</span>
                          <Chip tone={TOM_ESTADO[c.status] ?? 'muted'}>{textos.estados[c.status] ?? c.status}</Chip>
                        </div>
                        {c.billing_cycle && (
                          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                            {textos.ciclos[c.billing_cycle] ?? c.billing_cycle}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: 'var(--heading)', fontWeight: 600 }}>{dinheiro(c.mrr)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)' }}>−{dinheiro(c.cost_total)}</td>
                      <td style={{ padding: '10px 0 10px 10px', textAlign: 'right', fontWeight: 700, color: c.margin < 0 ? '#e11d48' : 'var(--heading)' }}>
                        {dinheiro(c.margin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
