/**
 * O medidor de uso do assistente que acompanha TODO chat de agente.
 *
 * Quem conversa com o assistente está gastando um limite mensal e não via
 * isso em lugar nenhum — descobria só quando o agente parava de responder.
 * O chip mostra a porcentagem JÁ USADA do limite da pessoa (o crédito alocado
 * para ela; sem limite pessoal, o da empresa), nas cores que o resto do
 * produto usa para a mesma história: âmbar aos 85%, vermelho no esgotado.
 *
 * Busca o número ao montar e a cada conversa enviada (prop `versao`): o gasto
 * acontece exatamente quando o agente responde, e um medidor congelado no
 * valor da abertura da tela mentiria justamente durante o uso.
 */
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { AiUsage } from '../lib/types'

const RÓTULO = { pt: 'do seu limite de IA', en: 'of your AI limit', es: 'de tu límite de IA' } as const

export default function ChipUsoIA({ lang, versao = 0 }: { lang: string; versao?: number }) {
  const [uso, setUso] = useState<AiUsage | null>(null)

  useEffect(() => {
    void api.get<AiUsage>('/ai/usage').then(setUso).catch(() => setUso(null))
  }, [versao])

  if (!uso) return null

  // O limite que vale para ESTA pessoa: o pessoal quando existe; senão o da
  // empresa. Ilimitado dos dois lados → não há porcentagem a mostrar.
  const limite = !uso.my_unlimited && uso.my_limit > 0 ? uso.my_limit : (!uso.unlimited && uso.limit > 0 ? uso.limit : 0)
  const usado = !uso.my_unlimited && uso.my_limit > 0 ? uso.my_used : uso.used
  if (limite <= 0) return null

  const pct = Math.min(100, Math.round((usado / limite) * 100))
  const cor = pct >= 100 ? '#d64545' : pct >= 85 ? '#d97706' : 'var(--accent)'
  const fundo = pct >= 100 ? 'rgba(214,69,69,.12)' : pct >= 85 ? 'rgba(217,119,6,.12)' : 'var(--accent-soft)'
  const rotulo = RÓTULO[lang as keyof typeof RÓTULO] ?? RÓTULO.pt

  return (
    <span
      title={`${usado.toLocaleString()} / ${limite.toLocaleString()} tokens`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
        padding: '4px 11px', borderRadius: 100, background: fundo,
        border: `1px solid ${cor}`, color: cor, fontSize: 11.5, fontWeight: 800,
      }}
    >
      <span style={{ width: 34, height: 5, borderRadius: 4, background: 'rgba(127,127,127,.25)', overflow: 'hidden', display: 'inline-block' }}>
        <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: cor }} />
      </span>
      {pct}% {rotulo}
    </span>
  )
}
