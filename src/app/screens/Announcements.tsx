/**
 * Central de avisos — divulgar que um canal está aberto, por e-mail.
 *
 * O aviso que existia antes só alcançava quem tem CONTA na plataforma, ou
 * seja, o time de compliance. Mas quem precisa saber que o canal de denúncia
 * abriu é o funcionário comum, que não é usuário do sistema. Canal publicado
 * que ninguém sabe que existe é canal que não existe — e é exatamente o que a
 * NR-1 e a Lei 14.457 não aceitam de um canal que se diz acessível.
 *
 * Por isso a tela tem dois públicos, e o padrão é a LISTA colada, não os
 * membros: o caso comum é a empresa mandando para a folha inteira.
 */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { ApiError, ChannelOut } from '../../lib/types'
import { useT } from '../strings'
import { Button, Card, Chip, EmptyState, Field, Input, PageHeader, Select, Skeleton } from '../ui'

type Aviso = {
  id: string
  channel_id: string | null
  channel_name: string
  audience: string
  subject: string
  message: string
  sent_count: number
  failed_count: number
  recipients_sample: string[]
  created_at: string
}

export default function Announcements() {
  const t = useT()
  const tx = t.announcements
  const [canais, setCanais] = useState<ChannelOut[] | null>(null)
  const [historico, setHistorico] = useState<Aviso[] | null>(null)
  const [canalId, setCanalId] = useState('')
  const [publico, setPublico] = useState<'list' | 'members'>('list')
  const [lista, setLista] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const flash = (m: string) => { setAviso(m); setTimeout(() => setAviso(null), 4000) }

  const carregar = useCallback(async () => {
    try {
      const [cs, hs] = await Promise.all([
        api.get<ChannelOut[]>('/channels'),
        api.get<Aviso[]>('/announcements'),
      ])
      setCanais(cs)
      setHistorico(hs)
      if (!canalId && cs.length) setCanalId(cs[0].id)
    } catch (e) {
      flash((e as ApiError).detail ?? tx.errLoad)
      setCanais([]); setHistorico([])
    }
    // `canalId` fora das dependências de propósito: incluí-lo recarregaria a
    // lista a cada troca de canal no seletor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx.errLoad])

  useEffect(() => { void carregar() }, [carregar])

  /** Só para a tela: o servidor valida de novo e é ele quem manda. */
  const quantosNaLista = lista
    .split(/[,;\s\n]+/)
    .map((x) => x.trim())
    .filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)).length

  const podeEnviar = !enviando && !!canalId && (publico === 'members' || quantosNaLista > 0)

  async function enviar() {
    if (!podeEnviar) return
    setEnviando(true)
    try {
      const r = await api.post<Aviso>('/announcements', {
        channel_id: canalId,
        audience: publico,
        recipients: publico === 'list' ? lista.split(/[\n,;]+/) : [],
        subject: assunto,
        message: mensagem,
      })
      flash(tx.sentOk(r.sent_count))
      setLista(''); setAssunto(''); setMensagem('')
      await carregar()
    } catch (e) {
      flash((e as ApiError).detail ?? tx.errSend)
    } finally { setEnviando(false) }
  }

  if (!canais || !historico) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Skeleton h={220} r={16} />
        <Skeleton h={140} r={16} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={tx.title} subtitle={tx.subtitle} />

      {aviso && (
        <div style={{ marginBottom: 14 }}>
          <Card><p style={{ color: 'var(--heading)', fontSize: 14 }}>{aviso}</p></Card>
        </div>
      )}

      <Card>
        {canais.length === 0 ? (
          <EmptyState icon="channels" title={tx.noChannels} body={tx.noChannelsBody} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label={tx.channel}>
              <Select value={canalId} onChange={(e) => setCanalId(e.target.value)}>
                {canais.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>

            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                {tx.audience}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {([['list', tx.audList], ['members', tx.audMembers]] as const).map(([id, rotulo]) => (
                  <button
                    key={id}
                    onClick={() => setPublico(id)}
                    className="app-btn"
                    style={{
                      borderRadius: 100, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                      border: '1px solid ' + (publico === id ? 'var(--accent)' : 'var(--border)'),
                      background: publico === id ? 'var(--accent)' : 'var(--surface-2)',
                      color: publico === id ? '#fff' : 'var(--text)',
                    }}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 8 }}>
                {publico === 'list' ? tx.audListHint : tx.audMembersHint}
              </p>
            </div>

            {publico === 'list' && (
              <Field label={tx.emails}>
                <textarea
                  className="app-input"
                  value={lista}
                  onChange={(e) => setLista(e.target.value)}
                  placeholder={tx.emailsPh}
                  rows={5}
                  style={{
                    width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '12px 14px', color: 'var(--heading)', fontSize: 14,
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical',
                  }}
                />
                <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 6 }}>
                  {quantosNaLista > 0 ? tx.countValid(quantosNaLista) : tx.emailsHint}
                </p>
              </Field>
            )}

            <Field label={tx.subject}>
              <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder={tx.subjectPh} />
            </Field>

            <Field label={tx.message}>
              <textarea
                className="app-input"
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder={tx.messagePh}
                rows={4}
                style={{
                  width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '12px 14px', color: 'var(--heading)', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical',
                }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 6 }}>{tx.messageHint}</p>
            </Field>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button leftIcon="check" onClick={() => void enviar()} loading={enviando} disabled={!podeEnviar}>
                {tx.send}
              </Button>
              <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{tx.sendHint}</span>
            </div>
          </div>
        )}
      </Card>

      <div style={{ height: 22 }} />

      <p style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{tx.history}</p>
      <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 14 }}>{tx.historyHint}</p>

      {historico.length === 0 ? (
        <Card><EmptyState icon="audit" title={tx.noHistory} /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {historico.map((a) => (
            <Card key={a.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 15 }}>
                    {a.subject || a.channel_name || tx.noSubject}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 2 }}>
                    {a.channel_name && `${a.channel_name} · `}
                    {new Date(a.created_at).toLocaleString()}
                  </div>
                  {a.recipients_sample.length > 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                      {a.recipients_sample.join(', ')}
                      {a.sent_count > a.recipients_sample.length &&
                        ` ${tx.andMore(a.sent_count - a.recipients_sample.length)}`}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Chip tone="green">{tx.sentCount(a.sent_count)}</Chip>
                  {/* Falha aparece só quando existe: um "0 falhas" fixo vira
                      ruído e some justamente no dia em que importa. */}
                  {a.failed_count > 0 && <Chip tone="accent">{tx.failedCount(a.failed_count)}</Chip>}
                  <Chip tone="muted">{a.audience === 'members' ? tx.audMembers : tx.audList}</Chip>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
