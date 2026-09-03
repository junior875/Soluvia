/**
 * A CARTEIRA da plataforma — o estoque de tokens de IA que a Soluqtion tem.
 *
 * Responde a pergunta de cima, que faltava: quantos tokens NÓS temos? Sem ela,
 * distribuir cota para as empresas era chutar — dava para prometer 10 milhões
 * a cada uma sem nada avisar que o provedor só tem 3 no total.
 *
 * É um CAIXA, não um contador: cada compra entra como lançamento, o saldo é
 * derivado, e o extrato fica. Alocar mais do que se tem é permitido (nem toda
 * empresa usa a cota inteira) — mas aparece em vermelho, decisão consciente.
 */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { ApiError } from '../../lib/types'
import { DuoIcon, type IconName } from '../../app/icons'

type Lancamento = {
  id: string
  tokens: number
  note: string
  cost_cents: number
  currency: string
  created_at: string
}

type Carteira = {
  purchased: number
  allocated: number
  consumed: number
  free_to_allocate: number
  remaining: number
  tenants: number
  cost_cents: number
  cost_per_million_cents: number
  loads: Lancamento[]
}

type Lang = 'pt' | 'en' | 'es'

const I18N: Record<Lang, Record<string, string>> = {
  pt: {
    titulo: 'Carteira de tokens',
    sub: 'O estoque da plataforma: o que compramos, o que prometemos às empresas e o que sobra.',
    comprado: 'Comprado', alocado: 'Alocado às empresas', consumido: 'Consumido', livre: 'Livre para alocar',
    livreHint: 'comprado − alocado', restante: 'restante no provedor',
    precoMedio: 'preço médio', porMilhao: '/ milhão', salvarPreco: 'Salvar preço',
    ancorado: 'O estoque acompanha este saldo: recarga feita no provedor entra sozinha no extrato.',
    overbooked: 'Prometido acima do estoque — nem toda empresa usa a cota, mas a decisão é sua.',
    lancar: 'Lançar carga', tokens: 'Tokens (negativo = estorno)', custo: 'Custo (US$, opcional)',
    nota: 'Origem (ex.: compra DeepSeek 28/08)', enviar: 'Lançar',
    extrato: 'Extrato', vazio: 'Nenhuma carga lançada ainda — comece registrando quantos tokens a plataforma tem hoje.',
    apagar: 'Apagar', confirmar: 'Confirmar?', lancado: 'Carga lançada.', apagado: 'Lançamento apagado.',
    erro: 'Falha na carteira.',
  },
  en: {
    titulo: 'Token wallet',
    sub: "The platform's stock: what we bought, what we promised to companies, and what's left.",
    comprado: 'Purchased', alocado: 'Allocated to companies', consumido: 'Consumed', livre: 'Free to allocate',
    livreHint: 'purchased − allocated', restante: 'remaining at the provider',
    precoMedio: 'average price', porMilhao: '/ million', salvarPreco: 'Save price',
    ancorado: 'Stock follows this balance: a top-up made at the provider lands in the ledger on its own.',
    overbooked: 'Promised beyond the stock — not every company uses its quota, but the call is yours.',
    lancar: 'Add load', tokens: 'Tokens (negative = refund)', custo: 'Cost (US$, optional)',
    nota: 'Source (e.g. DeepSeek purchase 08/28)', enviar: 'Add',
    extrato: 'Ledger', vazio: 'No loads yet — start by recording how many tokens the platform has today.',
    apagar: 'Delete', confirmar: 'Confirm?', lancado: 'Load added.', apagado: 'Load deleted.',
    erro: 'Wallet failure.',
  },
  es: {
    titulo: 'Cartera de tokens',
    sub: 'El stock de la plataforma: lo comprado, lo prometido a las empresas y lo que queda.',
    comprado: 'Comprado', alocado: 'Asignado a empresas', consumido: 'Consumido', livre: 'Libre para asignar',
    livreHint: 'comprado − asignado', restante: 'restante en el proveedor',
    precoMedio: 'precio medio', porMilhao: '/ millón', salvarPreco: 'Guardar precio',
    ancorado: 'El stock sigue este saldo: una recarga hecha en el proveedor entra sola en el extracto.',
    overbooked: 'Prometido por encima del stock — no toda empresa usa su cuota, pero la decisión es tuya.',
    lancar: 'Registrar carga', tokens: 'Tokens (negativo = reembolso)', custo: 'Costo (US$, opcional)',
    nota: 'Origen (ej.: compra DeepSeek 28/08)', enviar: 'Registrar',
    extrato: 'Extracto', vazio: 'Sin cargas todavía — empieza registrando cuántos tokens tiene la plataforma hoy.',
    apagar: 'Borrar', confirmar: '¿Confirmar?', lancado: 'Carga registrada.', apagado: 'Carga borrada.',
    erro: 'Fallo en la cartera.',
  },
}

const fld: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '9px 12px', color: 'var(--heading)', fontSize: 14, boxSizing: 'border-box',
}

export default function PlatformWallet({ lang, formatar, onToast, onSaldo }: {
  lang: Lang
  formatar: (n: number) => string
  onToast: (m: string) => void
  /** Avisa o console do saldo novo — o drawer da empresa mostra o "livre". */
  onSaldo?: (livre: number) => void
}) {
  const L = I18N[lang] ?? I18N.pt
  const [w, setW] = useState<Carteira | null>(null)
  const [tokens, setTokens] = useState('')
  const [custo, setCusto] = useState('')
  const [nota, setNota] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmando, setConfirmando] = useState<string | null>(null)

  const aplicar = useCallback((c: Carteira) => {
    setW(c)
    onSaldo?.(c.free_to_allocate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Saldo REAL no provedor + preço por milhão editável (config sem deploy).
  const [saldo, setSaldo] = useState<{ configured: boolean; available?: boolean | null; balances?: { currency: string; total: string; granted: string; topped_up: string }[]; error?: string; reconciled?: { recarga_cents?: number } } | null>(null)
  const [precoMilhao, setPrecoMilhao] = useState('')
  useEffect(() => {
    api.get<Carteira>('/platform/wallet').then(aplicar).catch(() => setW(null))
    api.get<typeof saldo>('/platform/ai-balance').then(setSaldo).catch(() => setSaldo(null))
    api.get<Record<string, number>>('/platform/config')
      .then((c) => setPrecoMilhao(String(c.deepseek_preco_milhao_usd ?? '')))
      .catch(() => {})
  }, [aplicar])

  const salvarPreco = async () => {
    const v = Number(precoMilhao.replace(',', '.'))
    if (!v || v <= 0) return
    try {
      await api.put('/platform/config', { key: 'deepseek_preco_milhao_usd', value: v })
      onToast('OK')
    } catch (e) { onToast((e as ApiError).detail ?? L.erro) }
  }

  async function lancar() {
    const n = Math.round(Number(tokens.replace(/[.,\s]/g, '')))
    if (!n || busy) return
    setBusy(true)
    try {
      const c = await api.post<Carteira>('/platform/wallet/loads', {
        tokens: n,
        note: nota.trim(),
        cost_cents: Math.round((Number(custo.replace(',', '.')) || 0) * 100),
      })
      aplicar(c)
      setTokens(''); setCusto(''); setNota('')
      onToast(L.lancado)
    } catch (e) {
      onToast((e as ApiError).detail ?? L.erro)
    } finally { setBusy(false) }
  }

  async function apagar(id: string) {
    if (confirmando !== id) { setConfirmando(id); window.setTimeout(() => setConfirmando(null), 2600); return }
    setBusy(true)
    try {
      aplicar(await api.delete<Carteira>(`/platform/wallet/loads/${id}`))
      onToast(L.apagado)
    } catch (e) {
      onToast((e as ApiError).detail ?? L.erro)
    } finally { setBusy(false); setConfirmando(null) }
  }

  if (!w) return null

  const negativo = w.free_to_allocate < 0
  const cards: { icon: IconName; rotulo: string; valor: string; extra?: string; alerta?: boolean }[] = [
    { icon: 'billing', rotulo: L.comprado, valor: formatar(w.purchased),
      extra: w.cost_cents > 0 ? `US$ ${(w.cost_per_million_cents / 100).toFixed(2)} ${L.porMilhao} · ${L.precoMedio}` : undefined },
    { icon: 'chart', rotulo: L.alocado, valor: formatar(w.allocated) },
    { icon: 'spark', rotulo: L.consumido, valor: formatar(w.consumed),
      extra: `${formatar(w.remaining)} ${L.restante}` },
    { icon: 'vault', rotulo: L.livre, valor: formatar(w.free_to_allocate),
      extra: L.livreHint, alerta: negativo },
  ]

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 17, marginBottom: 2 }}>{L.titulo}</div>
      <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: '0 0 14px' }}>{L.sub}</p>

      {/* A carteirinha: os quatro números que governam a distribuição. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
        {cards.map((c) => (
          <div key={c.rotulo} style={{ background: 'var(--surface)', border: `1px solid ${c.alerta ? 'rgba(225,29,72,.55)' : 'var(--border)'}`, borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: c.alerta ? '#e11d48' : 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>
              <DuoIcon name={c.icon} size={15} /> {c.rotulo}
            </div>
            <div style={{ color: c.alerta ? '#e11d48' : 'var(--heading)', fontWeight: 800, fontSize: 22, letterSpacing: '-.02em' }}>{c.valor}</div>
            {c.extra && <div style={{ color: c.alerta ? '#e11d48' : 'var(--text-muted)', fontSize: 11.5, marginTop: 3 }}>{c.extra}</div>}
          </div>
        ))}
      </div>
      {negativo && (
        <p style={{ background: 'rgba(225,29,72,.09)', border: '1px solid rgba(225,29,72,.4)', color: '#e11d48', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, lineHeight: 1.5, margin: '0 0 12px' }}>
          {L.overbooked}
        </p>
      )}

      {/* Saldo REAL da conta DeepSeek — a previsibilidade que o lançamento
          manual nunca deu: lê da fonte, não da memória de quem comprou. */}
      {saldo?.configured && (
        <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 14, marginBottom: 12, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Saldo DeepSeek</div>
            {saldo.error ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>provedor sem resposta agora</div>
            ) : (
              <>
                <div style={{ color: 'var(--heading)', fontSize: 22, fontWeight: 800, marginTop: 2 }}>
                  {saldo.balances?.[0] ? `${saldo.balances[0].currency} ${saldo.balances[0].total}` : '—'}
                  {saldo.available === false && <span style={{ color: '#e11d48', fontSize: 12, marginLeft: 8 }}>esgotado</span>}
                </div>
                {/* O elo que faltava: dizer que este número CONVERSA com o
                    estoque. Recarga feita no site do provedor entra sozinha no
                    extrato — ninguém precisa lembrar de lançar. */}
                <div style={{ color: 'var(--text-muted)', fontSize: 11.5, marginTop: 3, maxWidth: 300, lineHeight: 1.5 }}>
                  {saldo.reconciled?.recarga_cents
                    ? `Recarga de US$ ${(saldo.reconciled.recarga_cents / 100).toFixed(2)} detectada e lançada no estoque.`
                    : L.ancorado}
                </div>
              </>
            )}
          </div>
          <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700, marginLeft: 'auto' }}>
            {L.precoMedio} (US$ {L.porMilhao})
            <span style={{ display: 'flex', gap: 6 }}>
              <input value={precoMilhao} onChange={(e) => setPrecoMilhao(e.target.value)} inputMode="decimal" style={{ ...fld, width: 110 }} />
              {/* Este botão SALVA o preço de referência — ele não compra
                  nada. Rotulado "OK" parecia confirmar um lançamento. */}
              <button onClick={() => void salvarPreco()} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 100, padding: '7px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>{L.salvarPreco}</button>
            </span>
          </label>
        </div>
      )}

      {/* Lançar carga: é AQUI que se registra o total de tokens da plataforma. */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{L.lancar}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Rótulo PERMANENTE em cada campo: placeholder some ao digitar, e a
              pessoa ficava com caixas anônimas na frente — sem saber qual era
              tokens, qual era custo e qual era origem. */}
          <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700 }}>{L.tokens}
            <input value={tokens} onChange={(e) => setTokens(e.target.value)} placeholder="1000000" inputMode="numeric" style={{ ...fld, width: 200 }} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700 }}>{L.custo}
            <input value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0.00" inputMode="decimal" style={{ ...fld, width: 170 }} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700, flex: '1 1 220px' }}>{L.nota}
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="compra DeepSeek 28/08" style={{ ...fld, width: '100%' }} />
          </label>
          <button disabled={busy || !tokens.trim()} onClick={() => void lancar()}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 100, padding: '9px 20px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', opacity: busy || !tokens.trim() ? 0.6 : 1 }}>
            {L.enviar}
          </button>
        </div>
      </div>

      {/* Extrato — o histórico auditável; apagar é só para erro de digitação. */}
      <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{L.extrato}</div>
      {w.loads.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{L.vazio}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {w.loads.map((x) => (
            <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', flexWrap: 'wrap' }}>
              <span style={{ color: x.tokens < 0 ? '#e11d48' : '#16a34a', fontWeight: 800, fontSize: 14, minWidth: 110 }}>
                {x.tokens > 0 ? '+' : ''}{formatar(x.tokens)}
              </span>
              <span style={{ color: 'var(--text)', fontSize: 13, flex: '1 1 200px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {x.note || '—'}
              </span>
              {x.cost_cents > 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>US$ {(x.cost_cents / 100).toFixed(2)}</span>
              )}
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(x.created_at).toLocaleDateString()}</span>
              <button disabled={busy} onClick={() => void apagar(x.id)}
                style={{ background: 'transparent', border: '1px solid var(--border)', color: confirmando === x.id ? '#e11d48' : 'var(--text-muted)', borderRadius: 100, padding: '4px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {confirmando === x.id ? L.confirmar : L.apagar}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
