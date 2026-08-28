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
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import type { ApiError, ChannelOut } from '../../lib/types'
import { Icon } from '../icons'
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

type Contato = { email: string; name: string; status: string }

export default function Announcements() {
  const t = useT()
  const tx = t.announcements
  const [canais, setCanais] = useState<ChannelOut[] | null>(null)
  const [historico, setHistorico] = useState<Aviso[] | null>(null)
  const [canalId, setCanalId] = useState('')
  // "contacts" substituiu o antigo "membros": em vez de um público invisível,
  // a pessoa VÊ quem vai receber, com rosto e caixa de marcar.
  const [publico, setPublico] = useState<'contacts' | 'list'>('contacts')
  const [contatos, setContatos] = useState<Contato[] | null>(null)
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  // E-mails AVULSOS somados aos contatos marcados: o RH quer avisar a folha e
  // também o consultor externo que nem tem cadastro — sem trocar de modo.
  const [extras, setExtras] = useState('')
  const [lista, setLista] = useState('')
  const [assunto, setAssunto] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  // Prévia: o HTML REAL do e-mail, vindo do mesmo template do envio.
  const [previewHtml, setPreviewHtml] = useState('')
  const previewTimer = useRef<number | null>(null)

  const flash = (m: string) => { setAviso(m); setTimeout(() => setAviso(null), 4000) }

  const carregar = useCallback(async () => {
    try {
      const [cs, hs, cts] = await Promise.all([
        api.get<ChannelOut[]>('/channels'),
        api.get<Aviso[]>('/announcements'),
        api.get<Contato[]>('/announcements/contacts').catch(() => [] as Contato[]),
      ])
      setCanais(cs)
      setHistorico(hs)
      setContatos(cts)
      // Todos marcados por padrão: o caso comum é avisar a empresa inteira, e
      // desmarcar exceções é mais barato do que marcar um a um.
      setMarcados(new Set(cts.map((c) => c.email)))
      if (!canalId && cs.length) setCanalId(cs[0].id)
    } catch (e) {
      flash((e as ApiError).detail ?? tx.errLoad)
      setCanais([]); setHistorico([]); setContatos([])
    }
    // `canalId` fora das dependências de propósito: incluí-lo recarregaria a
    // lista a cada troca de canal no seletor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx.errLoad])

  useEffect(() => { void carregar() }, [carregar])

  // Prévia ao vivo, com folga de digitação: pedir a cada tecla seria uma
  // chamada por letra; 600ms depois da última é imperceptível e barato.
  useEffect(() => {
    if (!canalId) return
    if (previewTimer.current) window.clearTimeout(previewTimer.current)
    previewTimer.current = window.setTimeout(() => {
      void api.post<{ html: string }>('/announcements/preview', {
        channel_id: canalId, audience: 'list', recipients: [],
        subject: assunto, message: mensagem,
      }).then((r) => setPreviewHtml(r.html)).catch(() => setPreviewHtml(''))
    }, 600)
    return () => { if (previewTimer.current) window.clearTimeout(previewTimer.current) }
  }, [assunto, mensagem, canalId])

  /** Só para a tela: o servidor valida de novo e é ele quem manda. */
  const quantosNaLista = lista
    .split(/[,;\s\n]+/)
    .map((x) => x.trim())
    .filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)).length

  const extrasValidos = extras
    .split(/[\n,;\s]+/)
    .map((x) => x.trim())
    .filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x))

  const podeEnviar = !enviando && !!canalId
    && (publico === 'list' ? quantosNaLista > 0 : marcados.size + extrasValidos.length > 0)

  async function enviar() {
    if (!podeEnviar) return
    setEnviando(true)
    try {
      const r = await api.post<Aviso>('/announcements', {
        channel_id: canalId,
        // Contatos marcados viajam como LISTA: o servidor já sabe validar,
        // deduplicar e limitar esse formato. Os avulsos entram junto.
        audience: 'list',
        recipients: publico === 'list'
          ? lista.split(/[\n,;]+/)
          : [...marcados, ...extrasValidos],
        subject: assunto,
        message: mensagem,
      })
      flash(tx.sentOk(r.sent_count))
      setLista(''); setExtras(''); setAssunto(''); setMensagem('')
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
                {([['contacts', tx.audContacts], ['list', tx.audList]] as const).map(([id, rotulo]) => (
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
                {publico === 'list' ? tx.audListHint : tx.audContactsHint}
              </p>
            </div>

            {publico === 'contacts' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 13.5 }}>
                    {tx.contactsCount(marcados.size, contatos?.length ?? 0)}
                  </span>
                  <button
                    type="button" className="app-btn"
                    onClick={() => setMarcados(
                      marcados.size === (contatos?.length ?? 0)
                        ? new Set()
                        : new Set((contatos ?? []).map((c) => c.email)),
                    )}
                    style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', borderRadius: 100, padding: '5px 13px', fontSize: 12.5, fontWeight: 700 }}
                  >
                    {marcados.size === (contatos?.length ?? 0) ? tx.uncheckAll : tx.checkAll}
                  </button>
                </div>
                <div className="app-scroll" style={{ border: '1px solid var(--border)', borderRadius: 12, maxHeight: 240, overflowY: 'auto', background: 'var(--surface-2)' }}>
                  {(contatos ?? []).length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 14px', margin: 0 }}>{tx.noContacts}</p>
                  )}
                  {(contatos ?? []).map((c) => {
                    const on = marcados.has(c.email)
                    return (
                      <label key={c.email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                        <input
                          type="checkbox" checked={on}
                          onChange={() => setMarcados((m) => {
                            const novo = new Set(m)
                            if (on) novo.delete(c.email); else novo.add(c.email)
                            return novo
                          })}
                          style={{ width: 15, height: 15, accentColor: 'var(--accent)' }}
                        />
                        <span style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 13.5, flex: '0 0 auto' }}>{c.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</span>
                        {c.status !== 'active' && <Chip tone="muted">{tx.invited}</Chip>}
                      </label>
                    )
                  })}
                </div>

                {/* E-mails AVULSOS somados aos marcados: o consultor externo,
                    o sócio sem cadastro — sem obrigar a trocar de modo. */}
                <div style={{ marginTop: 12 }}>
                  <Field label={tx.extraEmails}>
                    <Input
                      value={extras}
                      onChange={(e) => setExtras(e.target.value)}
                      placeholder={tx.extraEmailsPh}
                    />
                    <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 6 }}>
                      {extrasValidos.length > 0 ? tx.extraCount(extrasValidos.length) : tx.extraEmailsHint}
                    </p>
                  </Field>
                </div>
              </div>
            )}

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

            {/* PRÉVIA — o HTML exato que o destinatário recebe, do MESMO
                template do envio. Aprovar um layout que ninguém recebe é o
                risco de qualquer prévia montada à parte. */}
            {previewHtml && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
                  <Icon name="eye" size={14} /> {tx.previewTitle}
                </div>
                {/* Prévia é RETRATO, não página: o botão do e-mail real leva ao
                    canal, mas aqui dentro clicar só abriria uma tela branca do
                    sandbox. Dupla trava: CSS injetado desliga os links do HTML
                    e um véu transparente engole qualquer clique que sobrar. */}
                <div style={{ position: 'relative' }}>
                  <iframe
                    title={tx.previewTitle}
                    srcDoc={'<style>a{pointer-events:none !important;cursor:default !important}</style>' + previewHtml}
                    sandbox=""
                    style={{ width: '100%', height: 420, border: '1px solid var(--border)', borderRadius: 14, background: '#fff', display: 'block' }}
                  />
                  <div aria-hidden style={{ position: 'absolute', inset: 0, cursor: 'default' }} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>{tx.previewHint}</p>
              </div>
            )}

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
