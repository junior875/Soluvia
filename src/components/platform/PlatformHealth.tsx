/**
 * Aba SISTEMA — o diagnóstico das integrações.
 *
 * "O cliente não recebe e-mail", "a prova sumiu", "o lembrete não chegou": os
 * três chamados mais comuns têm a mesma origem, uma integração desconfigurada.
 * Sem esta tela, responder qualquer um deles exigia abrir o painel da
 * DigitalOcean e conferir variável por variável.
 *
 * Mostra o ESTADO, nunca o segredo: se a chave está presente, não qual é.
 */
import { useEffect, useState, type CSSProperties } from 'react'
import { api } from '../../lib/api'
import type { ApiError } from '../../lib/types'

export type Saude = {
  environment: string
  email: { configured: boolean; sender: string; sent?: { total: number; ultimos_30d: number; hoje: number } }
  storage: { configured: boolean; bucket: string | null; region: string; ephemeral_warning: boolean }
  reminders: { enabled: boolean; interval_minutes: number; cases_awaiting_triage: number }
  ai: { configured: boolean }
}

export type HealthTextos = {
  title: string
  email: string
  storage: string
  reminders: string
  ai: string
  ok: string
  off: string
  sender: string
  bucket: string
  ephemeral: string
  every: string
  awaitingTriage: string
  environment: string
  loading: string
  sentTotal: string
  sent30d: string
  sentToday: string
}

export default function PlatformHealth({
  textos,
  onToast,
  card,
}: {
  textos: HealthTextos
  onToast: (msg: string) => void
  card: CSSProperties
}) {
  const [saude, setSaude] = useState<Saude | null>(null)

  useEffect(() => {
    api
      .get<Saude>('/platform/health')
      .then(setSaude)
      .catch((e) => onToast((e as ApiError).detail ?? 'Erro'))
  }, [onToast])

  if (!saude) return <div style={{ ...card, color: 'var(--text-muted)', fontSize: 13.5 }}>{textos.loading}</div>

  const selo = (ligado: boolean) => (
    <span
      style={{
        fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em',
        color: ligado ? 'var(--green,#2bb673)' : '#e08585',
      }}
    >
      {ligado ? `✓ ${textos.ok}` : `● ${textos.off}`}
    </span>
  )

  const linha = (rotulo: string, valor: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, marginTop: 4 }}>
      <span style={{ color: 'var(--text-muted)' }}>{rotulo}</span>
      <span style={{ color: 'var(--text)', textAlign: 'right', wordBreak: 'break-all' }}>{valor}</span>
    </div>
  )

  const bloco = (titulo: string, ligado: boolean, filhos: React.ReactNode) => (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 14.5 }}>{titulo}</span>
        {selo(ligado)}
      </div>
      <div style={{ marginTop: 8 }}>{filhos}</div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
      {bloco(
        textos.email,
        saude.email.configured,
        <>
          {linha(textos.sender, saude.email.sender)}
          {/* A contabilização que faltava: total entregue, 30 dias e hoje.
              Simulação de dev fica fora — o número fecha com a fatura. */}
          {saude.email.sent && (
            <>
              {linha(textos.sentTotal, saude.email.sent.total.toLocaleString())}
              {linha(textos.sent30d, saude.email.sent.ultimos_30d.toLocaleString())}
              {linha(textos.sentToday, saude.email.sent.hoje.toLocaleString())}
            </>
          )}
        </>,
      )}

      {bloco(
        textos.storage,
        saude.storage.configured,
        <>
          {linha(textos.bucket, saude.storage.bucket ?? '—')}
          {saude.storage.ephemeral_warning && (
            // O aviso mais caro do painel: sem bucket, o arquivo vai para o
            // disco do container e some no deploy seguinte — sem erro nenhum.
            <p style={{ marginTop: 8, background: 'rgba(217,83,79,.12)', border: '1px solid rgba(217,83,79,.35)', color: '#e08585', borderRadius: 10, padding: '8px 10px', fontSize: 12, lineHeight: 1.5 }}>
              {textos.ephemeral}
            </p>
          )}
        </>,
      )}

      {bloco(
        textos.reminders,
        saude.reminders.enabled,
        <>
          {linha(textos.every, `${saude.reminders.interval_minutes} min`)}
          {linha(textos.awaitingTriage, String(saude.reminders.cases_awaiting_triage))}
        </>,
      )}

      {bloco(textos.ai, saude.ai.configured, linha(textos.environment, saude.environment))}
    </div>
  )
}
