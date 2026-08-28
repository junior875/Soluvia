/**
 * Chat do agente que monta o FLUXO.
 *
 * Mesma forma do chat do Form Builder — conversas em abas, mensagens de espera,
 * Enter envia — porque é a que já funciona e mudar o gesto entre duas telas do
 * mesmo produto só confunde.
 *
 * O que existe SÓ aqui é a lista de PENDÊNCIAS. O agente foi instruído a nunca
 * escolher responsável por conta própria: ele desenha e pergunta. Sem mostrar o
 * que ficou em aberto, a pessoa salvaria um fluxo com blocos sem dono — que
 * trava na primeira etapa sem ninguém perceber.
 */
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../icons'
import { useT } from '../strings'
import { Button, Card, SectionLabel } from '../ui'

export type ChatMsg = { role: 'you' | 'ai'; content: string }
export type ChatSummary = { chat_id: string; title: string; messages: number }

export default function FlowAgentChat({
  msgs, busy, input, setInput, onSend, agentModule,
  chats, chatId, onOpenChat, onNewChat, onDeleteChat,
  missing, warnings = [], rejected = [], canUndo = false, onUndo,
}: {
  msgs: ChatMsg[]
  busy: boolean
  input: string
  setInput: (v: string) => void
  onSend: (text?: string) => void
  agentModule: string
  chats: ChatSummary[]
  chatId: string | null
  onOpenChat: (id: string) => void
  onNewChat: () => void
  onDeleteChat: (id: string) => void
  /** O que o agente ainda precisa saber para o fluxo funcionar. */
  missing: string[]
  /** Alertas sobre COMO o fluxo vai rodar (paralelo, prazo do decreto…). */
  warnings?: string[]
  /** Operações que o aplicador recusou (nome inexistente, bloco fora da lista). */
  rejected?: string[]
  /** O último turno mexeu no canvas — dá para voltar. */
  canUndo?: boolean
  onUndo?: () => void
}) {
  const t = useT()
  const tx = t.flow.ai
  const isSac = agentModule === 'sac'
  const scrollRef = useRef<HTMLDivElement>(null)
  const [wi, setWi] = useState(0)

  // Rola SÓ o container do chat. `scrollIntoView` rolaria a página junto, e
  // enviar com Enter faria a tela inteira descer.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])

  useEffect(() => {
    if (!busy) { setWi(0); return }
    const id = setInterval(() => setWi((w) => (w + 1) % tx.waiting.length), 1900)
    return () => clearInterval(id)
  }, [busy, tx.waiting.length])

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 300px)', minHeight: 440 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <SectionLabel>{tx.title}</SectionLabel>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 100, background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
          <img src={isSac ? '/sac-icon.svg' : '/canal-denuncias-icon.png'} alt="" className="module-logo" style={{ width: 14, height: 14, objectFit: 'contain' }} />
          {isSac ? tx.agentSac : tx.agentEtica}
        </span>
      </div>

      {/* Conversas: dá para voltar numa antiga sem perder a atual. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 2 }}>
        <button
          type="button" onClick={onNewChat} className="app-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer', border: '1px dashed var(--accent-border)', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 100, padding: '6px 13px', fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap' }}
        >
          <Icon name="plus" size={13} /> {tx.newChat}
        </button>
        {chats.length > 0 && (
          <div className="app-scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 3 }}>
            {chats.map((c) => {
              const on = c.chat_id === chatId
              return (
                <span key={c.chat_id} style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    type="button" onClick={() => onOpenChat(c.chat_id)} title={c.title} className="app-btn"
                    style={{ maxWidth: 190, cursor: 'pointer', borderRadius: 100, padding: '6px 26px 6px 13px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-2)', color: on ? 'var(--accent)' : 'var(--text-muted)' }}
                  >
                    {c.title}
                  </button>
                  <button
                    type="button" onClick={() => onDeleteChat(c.chat_id)}
                    aria-label={tx.deleteChat} title={tx.deleteChat}
                    style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 17, height: 17, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >
                    <Icon name="close" size={11} />
                  </button>
                </span>
              )
            })}
          </div>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '10px 2px' }}>
        {msgs.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 400 }}>
            <img
              src={isSac ? '/sac-icon.svg' : '/canal-denuncias-icon.png'}
              alt="" className="module-logo"
              style={{ width: 52, height: 52, objectFit: 'contain', marginBottom: 12 }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{isSac ? tx.introSac : tx.intro}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              {(isSac ? tx.startersSac : tx.starters).map((s) => (
                <button key={s} onClick={() => onSend(s)} className="app-btn" style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', borderRadius: 100, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>{s}</button>
              ))}
            </div>
          </div>
        ) : msgs.map((m, i) => (
          <div key={i} className="chat-in" style={{ alignSelf: m.role === 'you' ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, textAlign: m.role === 'you' ? 'right' : 'left' }}>{m.role === 'you' ? tx.you : tx.assistant}</div>
            <div style={{ background: m.role === 'you' ? 'var(--accent)' : 'var(--surface-2)', color: m.role === 'you' ? '#fff' : 'var(--text)', border: m.role === 'you' ? 'none' : '1px solid var(--border)', borderRadius: 14, padding: '10px 14px', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="chat-in" style={{ alignSelf: 'flex-start', maxWidth: '86%' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>{tx.assistant}</div>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 14px', fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="typing"><i /><i /><i /></span>
              <span style={{ color: 'var(--text-muted)' }}>{tx.waiting[wi]}</span>
            </div>
          </div>
        )}
      </div>

      {/* Faixa de estado do último turno: desfazer, o que o agente não pôde
          aplicar, o que falta e como o fluxo vai rodar. Fixa acima do campo —
          não some ao rolar a conversa. */}
      {canUndo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', borderRadius: 12, padding: '8px 12px', marginTop: 8 }}>
          <span style={{ color: 'var(--text)', fontSize: 12.5, flex: 1 }}>{tx.appliedNote}</span>
          <button type="button" className="app-btn" onClick={onUndo}
            style={{ cursor: 'pointer', border: '1px solid var(--accent)', background: 'var(--surface)', color: 'var(--accent)', borderRadius: 100, padding: '5px 13px', fontSize: 12.5, fontWeight: 800 }}>
            {tx.undo}
          </button>
        </div>
      )}
      {rejected.length > 0 && (
        <div style={{ border: '1px solid #e11d48', background: 'rgba(225,29,72,.07)', borderRadius: 12, padding: '10px 12px', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#e11d48', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 }}>
            <Icon name="close" size={12} /> {tx.rejectedTitle}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text)', fontSize: 12.5, lineHeight: 1.6 }}>
            {rejected.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}
      {missing.length > 0 && (
        <div style={{ border: '1px solid #d97706', background: 'rgba(217,119,6,.08)', borderRadius: 12, padding: '10px 12px', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#d97706', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 }}>
            <Icon name="bell" size={13} /> {tx.missingTitle}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text)', fontSize: 12.5, lineHeight: 1.6 }}>
            {missing.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', borderRadius: 12, padding: '10px 12px', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-muted)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 }}>
            <Icon name="flow" size={13} /> {tx.logicTitle}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text)', fontSize: 12.5, lineHeight: 1.6 }}>
            {warnings.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <textarea
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
          placeholder={tx.placeholder} rows={2}
          style={{ flex: 1, minWidth: 0, resize: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', color: 'var(--heading)', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }}
        />
        <Button onClick={() => onSend()} loading={busy} disabled={!input.trim()}>{tx.send}</Button>
      </div>
    </Card>
  )
}
