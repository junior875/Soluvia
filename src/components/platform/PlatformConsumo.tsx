/**
 * Tela de CONSUMO do console — serve armazenamento e tokens de IA.
 *
 * O pedido foi por abas dedicadas que listam todas as empresas e vão abrindo.
 * A pergunta que as duas respondem é a mesma — quanto cada empresa consome
 * daquilo que a plataforma paga — então são o MESMO componente com unidade
 * diferente. Duas telas separadas seriam duas coisas para manter em sincronia.
 *
 * Duas leituras convivem de propósito:
 *
 *  · o TOTAL da plataforma é o que fecha com a fatura do provedor;
 *  · a LISTA por empresa é o que se reparte, ordenada pelo MAIOR consumo — a
 *    tela existe para achar o fora da curva, não para ler em ordem alfabética.
 */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { ApiError } from '../../lib/types'
import { Button, Card, Chip, EmptyState, Input, PageHeader, Skeleton } from '../../app/ui'

type Linha = {
  tenant_id: string
  name: string
  slug: string
  used: number
  limit: number
  percent: number | null
  over: boolean
  /** Só no armazenamento: de onde vieram os bytes. */
  evidence?: number
  signatures?: number
  plan_name?: string | null
}

type Painel = {
  total: number
  over: number
  linhas: Linha[]
  evidence?: number
  signatures?: number
  /** Teto da plataforma (config) e o que sobra dele — só no armazenamento. */
  ceiling?: number
  free?: number
  ceilingPercent?: number | null
}

/**
 * Barra de proporção.
 *
 * Sem teto ela NÃO aparece: uma barra em 0% diria "sobra espaço", quando o que
 * existe é ausência de medida. Some a barra e o texto ao lado diz "sem limite".
 */
function Barra({ percent }: { percent: number | null }) {
  if (percent === null) {
    return (
      <div style={{ height: 7, borderRadius: 100, background: 'var(--surface-2)', minWidth: 90 }} />
    )
  }
  return (
    <div style={{ height: 7, borderRadius: 100, background: 'var(--surface-2)', overflow: 'hidden', minWidth: 90 }}>
      <div
        style={{
          // Piso de 1.5% só para uso REAL: sem ele, uma empresa com 3 MB de 500
          // GB vira uma barra invisível e some da tela. Em zero a barra fica
          // vazia mesmo — um risco ali diria que já se consumiu alguma coisa.
          width: percent === 0 ? '0%' : `${Math.max(1.5, Math.min(100, percent))}%`,
          height: '100%',
          borderRadius: 100,
          // Mesma escala da barra de consumo do painel (Settings.tsx): vermelho
          // no estouro, âmbar na antessala dele, cor da marca no resto. Inventar
          // outra faria o mesmo dado ter dois significados de cor no produto.
          background: percent >= 100 ? '#e11d48' : percent >= 85 ? '#f59e0b' : 'var(--accent)',
          transition: 'width .35s ease',
        }}
      />
    </div>
  )
}

export type ConsumoTextos = {
  titulo: string
  subtitulo: string
  totalLabel: string
  totalSub: string
  overLabel: string
  /** Frase do chip global: já inclui o substantivo ("empresas no teto"). */
  overGlobal: string
  noLimit: string
  salvar: string
  salvo: string
  dica: string
  vazio: string
  evidence?: string
  signatures?: string
}

export default function PlatformConsumo({
  endpoint,
  textos,
  onToast,
  formatar,
  paraEnvio,
  rotaLimite,
  campoLimite,
  discriminado,
  rotuloTeto,
  unidade,
}: {
  /** `/platform/storage` ou `/platform/ai-usage`. */
  endpoint: string
  textos: ConsumoTextos
  onToast: (msg: string) => void
  /** Como o número vira texto legível (MB/GB, milhares de tokens…). */
  formatar: (n: number) => string
  /** Como o que a pessoa digitou vira o valor que o servidor espera. */
  paraEnvio: (digitado: string) => number
  rotaLimite: (tenantId: string) => string
  campoLimite: string
  /** Armazenamento mostra a divisão provas × assinaturas; IA não tem divisão. */
  discriminado?: boolean
  /** Barra extra "usado ÷ teto da plataforma" + rótulo do que sobra. */
  rotuloTeto?: { deTeto: string; livre: string }
  /** Unidade ativa — vai no placeholder do campo de limite. */
  unidade?: string
}) {
  const [dados, setDados] = useState<Painel | null>(null)
  const [edicao, setEdicao] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const r = await api.get<Record<string, any>>(endpoint)
      const linhas: Linha[] = (r.tenants ?? []).map((t: Record<string, any>) => ({
        tenant_id: t.tenant_id,
        name: t.name,
        slug: t.slug,
        used: t.used_bytes ?? t.used ?? 0,
        limit: t.limit_bytes ?? t.limit ?? 0,
        percent: t.percent ?? null,
        over: !!t.over,
        evidence: t.evidence_bytes,
        signatures: t.signature_bytes,
        plan_name: t.plan_name,
      }))
      setDados({
        total: r.total_bytes ?? r.total_used ?? 0,
        over: r.companies_over_limit ?? 0,
        evidence: r.evidence_bytes,
        signatures: r.signature_bytes,
        ceiling: r.ceiling_bytes,
        free: r.free_bytes,
        ceilingPercent: r.ceiling_percent,
        linhas,
      })
    } catch (e) {
      onToast((e as ApiError).detail ?? 'Não foi possível carregar o consumo.')
    }
  }, [endpoint, onToast])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(linha: Linha) {
    const digitado = edicao[linha.tenant_id] ?? ''
    const valor = paraEnvio(digitado)
    if (!Number.isFinite(valor) || valor < 0) {
      onToast('Informe um número válido. 0 = sem limite.')
      return
    }
    setOcupado(linha.tenant_id)
    try {
      await api.post(rotaLimite(linha.tenant_id), { [campoLimite]: valor })
      setEdicao((prev) => {
        const proximo = { ...prev }
        delete proximo[linha.tenant_id]
        return proximo
      })
      onToast(`${textos.salvo} — ${linha.name}`)
      await carregar()
    } catch (e) {
      onToast((e as ApiError).detail ?? 'Erro ao salvar o limite.')
    } finally {
      setOcupado(null)
    }
  }

  if (!dados) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Skeleton h={96} r={16} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} h={78} r={16} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={textos.titulo} subtitle={textos.subtitulo} />

      {/* O total da plataforma — o número que fecha com a fatura do provedor. */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.05em',
              }}
            >
              {textos.totalLabel}
            </p>
            <p
              style={{
                color: 'var(--heading)',
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: '-1.2px',
                lineHeight: 1.15,
                marginTop: 2,
              }}
            >
              {formatar(dados.total)}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 4 }}>{textos.totalSub}</p>
            {/* O teto da PLATAFORMA (config editável): a pergunta "quanto ainda
                cabe?" que a soma por empresa sozinha nunca respondeu. */}
            {rotuloTeto && dados.ceiling != null && dados.ceiling > 0 && (
              <div style={{ marginTop: 10, maxWidth: 380 }}>
                <div style={{ height: 8, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(100, dados.ceilingPercent ?? 0)}%`,
                    background: (dados.ceilingPercent ?? 0) >= 85 ? '#d97706' : 'var(--accent)',
                  }} />
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                  {formatar(dados.total)} {rotuloTeto.deTeto} {formatar(dados.ceiling)}
                  {' · '}{rotuloTeto.livre} <b style={{ color: 'var(--heading)' }}>{formatar(dados.free ?? 0)}</b>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
            {discriminado && (
              <>
                <Chip tone="blue">
                  {textos.evidence}: {formatar(dados.evidence ?? 0)}
                </Chip>
                <Chip tone="navy">
                  {textos.signatures}: {formatar(dados.signatures ?? 0)}
                </Chip>
              </>
            )}
            {dados.over > 0 && (
              <Chip tone="accent">
                {dados.over} {textos.overGlobal}
              </Chip>
            )}
          </div>
        </div>
      </Card>

      <div style={{ height: 16 }} />

      {dados.linhas.length === 0 ? (
        <EmptyState icon="overview" title={textos.vazio} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dados.linhas.map((l) => (
            <Card key={l.tenant_id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                  <div
                    style={{
                      color: 'var(--heading)',
                      fontWeight: 700,
                      fontSize: 15,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                    {l.over && <Chip tone="accent">{textos.overLabel}</Chip>}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 2 }}>
                    {l.slug}
                    {l.plan_name ? ` · ${l.plan_name}` : ''}
                  </div>
                </div>

                <div style={{ flex: '2 1 220px', minWidth: 160 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--heading)', fontWeight: 700 }}>{formatar(l.used)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {l.limit > 0 ? formatar(l.limit) : textos.noLimit}
                    </span>
                  </div>
                  <Barra percent={l.percent} />
                  {discriminado && l.evidence !== undefined && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 11.5, marginTop: 6 }}>
                      {textos.evidence} {formatar(l.evidence)} · {textos.signatures} {formatar(l.signatures ?? 0)}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 116 }}>
                    <Input
                      value={edicao[l.tenant_id] ?? ''}
                      onChange={(e) => setEdicao({ ...edicao, [l.tenant_id]: e.target.value })}
                      placeholder={unidade ?? textos.dica}
                      inputMode="numeric"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    loading={ocupado === l.tenant_id}
                    disabled={(edicao[l.tenant_id] ?? '') === ''}
                    onClick={() => void salvar(l)}
                  >
                    {textos.salvar}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
