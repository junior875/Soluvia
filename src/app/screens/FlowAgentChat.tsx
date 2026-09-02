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
import ChipUsoIA from '../../components/ChipUsoIA'
import { useTranslation } from '../../i18n/LanguageProvider'

export type ChatMsg = { role: 'you' | 'ai'; content: string }
export type ChatSummary = { chat_id: string; title: string; messages: number }

export default function FlowAgentChat({
  msgs, busy, input, setInput, onSend, agentModule,
  chats, chatId, onOpenChat, onNewChat, onDeleteChat,
  missing, warnings = [], rejected = [], podeDesfazer = 0, onUndo,
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
  /** Quantos passos dá para voltar (a pilha guarda 3). */
  podeDesfazer?: number
  onUndo?: () => void
}) {
  const t = useT()
  const { lang } = useTranslation()
  const tx = t.flow.ai
  const isSac = agentModule === 'sac'
  const scrollRef = useRef<HTMLDivElement>(null)
  const [wi, setWi] = useState(0)
  const [detalhes, setDetalhes] = useState(false)

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
        <ChipUsoIA lang={lang} versao={msgs.length} />
        {podeDesfazer > 0 && (
          // Uma seta, no cabeçalho — não uma faixa. A faixa de "apliquei,
          // quer desfazer?" ocupava uma linha inteira a cada turno e, somada
          // às outras três, empurrava a conversa e o campo de escrever para
          // fora da tela.
          <button
            type="button" onClick={onUndo} className="app-btn" title={tx.undo}
            aria-label={tx.undo}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              border: '1px solid var(--accent-border)', background: 'var(--accent-soft)',
              color: 'var(--accent)', borderRadius: 100, padding: '4px 10px',
              fontSize: 11.5, fontWeight: 800,
            }}
          >
            <span style={{ display: 'flex', transform: 'rotate(180deg)' }}>
              <Icon name="chevron" size={12} />
            </span>
            {tx.undo}{podeDesfazer > 1 ? ` (${podeDesfazer})` : ''}
          </button>
        )}
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
      {/* UMA linha de estado, não quatro faixas.
          O agente devolve, no mesmo turno, o que recusou, o que falta definir
          e como o fluxo vai rodar. Cada um virava um bloco com borda, título e
          lista — e os quatro somados comiam o painel: a conversa encolhia e o
          campo de escrever saía da tela. Agora é uma linha com as contagens,
          que abre quem quiser ler. */}
      {(rejected.length > 0 || missing.length > 0 || warnings.length > 0) && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button" onClick={() => setDetalhes((v) => !v)} className="app-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', cursor: 'pointer',
              border: '1px solid var(--border)', background: 'var(--surface-2)',
              borderRadius: 12, padding: '7px 11px', color: 'var(--text)',
              fontSize: 12.5, fontWeight: 700, textAlign: 'left', whiteSpace: 'normal',
            }}
          >
            {rejected.length > 0 && (
              <span style={{ color: '#e11d48', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="close" size={11} /> {rejected.length}
              </span>
            )}
            {missing.length > 0 && (
              <span style={{ color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="bell" size={11} /> {missing.length}
              </span>
            )}
            {warnings.length > 0 && (
              <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="flow" size={11} /> {warnings.length}
              </span>
            )}
            <span style={{ flex: 1, minWidth: 0, color: 'var(--text-muted)', fontWeight: 600 }}>
              {missing.length > 0 ? tx.missingTitle : rejected.length > 0 ? tx.rejectedTitle : tx.logicTitle}
            </span>
            <span style={{ display: 'flex', flexShrink: 0, transform: detalhes ? 'rotate(180deg)' : 'none', color: 'var(--text-muted)' }}>
              <Icon name="chevron" size={13} />
            </span>
          </button>

          {detalhes && (
            <div className="app-scroll" style={{ maxHeight: 168, overflowY: 'auto', marginTop: 6, display: 'grid', gap: 6 }}>
              {[
                { itens: rejected, cor: '#e11d48', titulo: tx.rejectedTitle },
                { itens: missing, cor: '#d97706', titulo: tx.missingTitle },
                { itens: warnings, cor: 'var(--text-muted)', titulo: tx.logicTitle },
              ].filter((g) => g.itens.length > 0).map((g) => (
                <div key={g.titulo} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 11px' }}>
                  <div style={{ color: g.cor, fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
                    {g.titulo}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--text)', fontSize: 12.3, lineHeight: 1.55 }}>
                    {g.itens.map((m, k) => <li key={k}>{m}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
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
