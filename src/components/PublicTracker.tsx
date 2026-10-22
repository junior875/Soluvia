// Acompanhamento PÚBLICO do relato (sem login), aberto por #acompanhar.
// O denunciante informa protocolo + código e vê o status + as mensagens
// visíveis a ele, e pode responder — mesmo anônimo.
import { useEffect, useState, type CSSProperties } from 'react'
import { BASE_URL } from '../lib/api'
import { useTranslation } from '../i18n/LanguageProvider'
import { maskProtocolo } from '../lib/mascaras'
import PrefSwitcher from './PrefSwitcher'

interface Ev { type: string; content: string; created_at: string; from_reporter: boolean }
interface View { protocol: string; status: string; title: string; created_at: string; events: Ev[] }

const STATUS_LABEL: Record<string, Record<string, string>> = {
  pt: { received: 'Recebido', triage: 'Em triagem', investigation: 'Em investigação', responded: 'Respondido', closed: 'Encerrado' },
  en: { received: 'Received', triage: 'In triage', investigation: 'Investigating', responded: 'Answered', closed: 'Closed' },
  es: { received: 'Recibido', triage: 'En triaje', investigation: 'En investigación', responded: 'Respondido', closed: 'Cerrado' },
}
const L = {
  // `offline` e `oops` existem porque "Protocolo ou código inválido" era a
  // resposta para TUDO que dava errado, inclusive internet caída: a pessoa
  // relia o protocolo certo procurando um erro que não estava ali.
  pt: { title: 'Acompanhar relato', sub: 'Informe o protocolo e o código de acesso que você guardou.', protocol: 'Protocolo', code: 'Código de acesso', track: 'Acompanhar', tracking: 'Buscando…', notfound: 'Protocolo ou código inválido.', offline: 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo — o protocolo continua válido.', oops: 'Algo falhou do nosso lado. Tente de novo em instantes; o protocolo continua válido.', status: 'Status', timeline: 'Andamento', you: 'Você', team: 'Equipe responsável', yourReport: 'Seu relato', reply: 'Responder / complementar', send: 'Enviar', sending: 'Enviando…', back: 'Consultar outro', empty: 'Ainda não há mensagens.' },
  en: { title: 'Track report', sub: 'Enter the protocol and access code you saved.', protocol: 'Protocol', code: 'Access code', track: 'Track', tracking: 'Searching…', notfound: 'Invalid protocol or code.', offline: 'We could not reach the server. Check your connection and try again — your protocol is still valid.', oops: 'Something failed on our side. Please try again shortly; your protocol is still valid.', status: 'Status', timeline: 'Progress', you: 'You', team: 'Handling team', yourReport: 'Your report', reply: 'Reply / add info', send: 'Send', sending: 'Sending…', back: 'Look up another', empty: 'No messages yet.' },
  es: { title: 'Seguir denuncia', sub: 'Ingresa el protocolo y el código de acceso que guardaste.', protocol: 'Protocolo', code: 'Código de acceso', track: 'Seguir', tracking: 'Buscando…', notfound: 'Protocolo o código inválido.', offline: 'No pudimos contactar al servidor. Revisa tu conexión e inténtalo de nuevo — tu protocolo sigue siendo válido.', oops: 'Algo falló de nuestro lado. Inténtalo de nuevo en unos instantes; tu protocolo sigue siendo válido.', status: 'Estado', timeline: 'Progreso', you: 'Tú', team: 'Equipo responsable', yourReport: 'Tu denuncia', reply: 'Responder / añadir', send: 'Enviar', sending: 'Enviando…', back: 'Consultar otro', empty: 'Aún no hay mensajes.' },
}

export default function PublicTracker() {
  const { lang } = useTranslation()
  const tr = L[lang] ?? L.pt
  const [open, setOpen] = useState(() => window.location.hash.toLowerCase().startsWith('#acompanhar'))
  const [protocol, setProtocol] = useState('')
  const [code, setCode] = useState('')
  const [view, setView] = useState<View | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  useEffect(() => {
    const sync = () => setOpen(window.location.hash.toLowerCase().startsWith('#acompanhar'))
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  if (!open) return null

  async function lookup() {
    setErr(null); setBusy(true)
    try {
      const r = await fetch(`${BASE_URL}/public/cases/lookup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // Normalizado também aqui, e não só no que o campo mostra: o valor
        // pode ter vindo de um autofill, que não passa pelo `onChange`.
        body: JSON.stringify({ protocol: maskProtocolo(protocol), access_hash: code.trim() }),
      })
      // 404 = protocolo/código não conferem (é o que o servidor devolve para
      // os dois, de propósito). Qualquer outro status é problema NOSSO, e
      // dizer "protocolo inválido" nesse caso manda a pessoa caçar erro onde
      // não tem.
      if (r.status === 404) { setErr(tr.notfound); return }
      if (!r.ok) { setErr(tr.oops); return }
      setView(await r.json())
    } catch {
      // `fetch` só rejeita quando a requisição não chegou a ter resposta:
      // rede caída, DNS, servidor fora do ar.
      setErr(tr.offline)
    } finally { setBusy(false) }
  }
  async function sendReply() {
    if (!reply.trim() || !view) return
    setBusy(true)
    try {
      const r = await fetch(`${BASE_URL}/public/cases/${view.protocol}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol: view.protocol, access_hash: code.trim(), message: reply.trim() }),
      })
      if (r.ok) { setView(await r.json()); setReply('') }
    } finally { setBusy(false) }
  }

  const wrap: CSSProperties = { position: 'fixed', inset: 0, zIndex: 9998, overflowY: 'auto', background: 'var(--surface-2)', color: 'var(--text)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px 64px' }
  const card: CSSProperties = { width: '100%', maxWidth: 620, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 'clamp(22px,4vw,36px)', boxShadow: 'var(--card-shadow)' }
  const input: CSSProperties = { width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', color: 'var(--heading)', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const labelS: CSSProperties = { display: 'block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }
  // O "×" tinha de fazer DUAS coisas e não fazia nenhuma: `replaceState` apaga
  // o fragmento sem disparar `hashchange` (é a definição dele), e o
  // `location.hash = ''` que vinha depois era no-op, porque o hash já estava
  // vazio. Nenhum evento, `open` continuava `true`, e o overlay
  // (`position:fixed; inset:0`) seguia cobrindo a landing com a URL já na
  // raiz — só o F5 tirava.
  //
  // Agora: a URL preserva a `search` (antes a query era descartada), o estado
  // cai na hora e o `hashchange` é disparado à mão para quem mais escuta o
  // hash (o mesmo padrão do `LegalDocs.tsx`).
  const close = () => {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setOpen(false)
    // Reabrir o acompanhamento tem de começar do zero: fechar com um caso na
    // tela deixava protocolo, código e mensagens vivos no estado.
    setView(null); setProtocol(''); setCode(''); setReply(''); setErr(null)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }

  const header = (
    <div style={{ width: '100%', maxWidth: 620, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <img src="/soluvia.png" alt="Soluvia" className="brand-logo" style={{ height: 34, width: 'auto' }} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><PrefSwitcher compact /><button onClick={close} className="app-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer' }}>×</button></div>
    </div>
  )

  return (
    // `data-public-tracker` é o gancho estável do reteste de navegador: sem
    // ele, "o overlay saiu da tela?" dependia de adivinhar texto da landing.
    <div style={wrap} data-public-tracker>{header}
      <div style={card} className="app-modal">
        {!view ? (
          <>
            <h1 style={{ color: 'var(--heading)', fontSize: 'clamp(22px,4vw,28px)', fontWeight: 800 }}>{tr.title}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14.5, marginTop: 6 }}>{tr.sub}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
              {/* Máscara no `onChange`: o campo se formata em DG-XXXX-XXXX
                  enquanto a pessoa digita, então o que ela vê é a mesma
                  grafia que o servidor gravou. `autoCapitalize`/`autoCorrect`
                  são para o celular, que entrava em minúsculas e "corrigia"
                  os blocos. */}
              <div><label style={labelS}>{tr.protocol}</label><input style={{ ...input, textTransform: 'uppercase', letterSpacing: 0.5 }} value={protocol} onChange={(e) => setProtocol(maskProtocolo(e.target.value))} placeholder="DG-XXXX-XXXX" maxLength={12} autoCapitalize="characters" autoCorrect="off" spellCheck={false} autoComplete="off" autoFocus /></div>
              <div><label style={labelS}>{tr.code}</label><input style={input} value={code} onChange={(e) => setCode(e.target.value)} placeholder="••••••••" /></div>
              {err && <div style={{ background: 'rgba(217,83,79,.12)', border: '1px solid rgba(217,83,79,.4)', color: '#e08585', borderRadius: 12, padding: '11px 14px', fontSize: 13.5 }}>{err}</div>}
              <button onClick={() => void lookup()} disabled={busy} className="app-btn cta-sheen" style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff', border: 'none', borderRadius: 100, padding: '14px 28px', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 12px 30px var(--accent-shadow)', opacity: busy ? 0.6 : 1 }}>{busy ? tr.tracking : tr.track}</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>{view.protocol}</div>
                <h1 style={{ color: 'var(--heading)', fontSize: 22, fontWeight: 800 }}>{view.title}</h1>
              </div>
              <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 100, padding: '6px 16px', fontWeight: 800, fontSize: 14 }}>{(STATUS_LABEL[lang] ?? STATUS_LABEL.pt)[view.status] ?? view.status}</span>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>{tr.timeline}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {view.events.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{tr.empty}</p> : view.events.map((e, i) => (
                  <div key={i} style={{ background: e.from_reporter ? 'var(--accent-soft)' : 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: e.from_reporter ? 'var(--accent)' : 'var(--heading)' }}>{e.type === 'created' ? tr.yourReport : e.from_reporter ? tr.you : tr.team}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(e.created_at).toLocaleString(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US')}</span>
                    </div>
                    <div style={{ color: 'var(--text)', fontSize: 14, marginTop: 5, whiteSpace: 'pre-wrap' }}>{e.content}</div>
                  </div>
                ))}
              </div>
            </div>

            {view.status !== 'closed' && (
              <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <label style={labelS}>{tr.reply}</label>
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} style={{ ...input, minHeight: 72, resize: 'vertical' }} />
                <button onClick={() => void sendReply()} disabled={busy || !reply.trim()} className="app-btn" style={{ marginTop: 8, background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff', border: 'none', borderRadius: 100, padding: '11px 22px', fontWeight: 700, cursor: 'pointer', opacity: busy || !reply.trim() ? 0.6 : 1 }}>{busy ? tr.sending : tr.send}</button>
              </div>
            )}
            <button onClick={() => { setView(null); setProtocol(''); setCode('') }} className="app-btn" style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }}>{tr.back}</button>
          </>
        )}
      </div>
    </div>
  )
}
