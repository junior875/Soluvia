// Acompanhamento PÚBLICO do relato (sem login), aberto por #acompanhar.
// O denunciante informa protocolo + código e vê o status + as mensagens
// visíveis a ele, e pode responder — mesmo anônimo.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { BASE_URL } from '../lib/api'
import { useTranslation } from '../i18n/LanguageProvider'
import { maskProtocolo } from '../lib/mascaras'
import PrefSwitcher from './PrefSwitcher'

interface Ev { type: string; content: string; created_at: string; from_reporter: boolean }
// `module` é o módulo do canal de origem (`etica` | `sac` | ...), agora
// entregue por `POST /public/cases/lookup` e pelo `/reply`. É o dado que
// faltava: sem ele a tela não tinha como saber que o caso era um SAC e lia
// toda demanda de consumidor com vocabulário de denúncia.
interface View { protocol: string; status: string; title: string; created_at: string; module?: string | null; events: Ev[] }

const STATUS_LABEL: Record<string, Record<string, string>> = {
  pt: { received: 'Recebido', triage: 'Em triagem', investigation: 'Em investigação', responded: 'Respondido', closed: 'Encerrado' },
  en: { received: 'Received', triage: 'In triage', investigation: 'Investigating', responded: 'Answered', closed: 'Closed' },
  es: { received: 'Recibido', triage: 'En triaje', investigation: 'En investigación', responded: 'Respondido', closed: 'Cerrado' },
}
const L = {
  // `offline` e `oops` existem porque "Protocolo ou código inválido" era a
  // resposta para TUDO que dava errado, inclusive internet caída: a pessoa
  // relia o protocolo certo procurando um erro que não estava ali.
  pt: { title: 'Acompanhar protocolo', sub: 'Informe o protocolo e o código de acesso que você guardou.', protocol: 'Protocolo', code: 'Código de acesso', track: 'Acompanhar', tracking: 'Buscando…', notfound: 'Protocolo ou código inválido.', offline: 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo — o protocolo continua válido.', oops: 'Algo falhou do nosso lado. Tente de novo em instantes; o protocolo continua válido.', status: 'Status', timeline: 'Andamento', you: 'Você', team: 'Equipe responsável', yourReport: 'Seu relato', reply: 'Responder / complementar', send: 'Enviar', sending: 'Enviando…', back: 'Consultar outro', empty: 'Ainda não há mensagens.' },
  en: { title: 'Track protocol', sub: 'Enter the protocol and access code you saved.', protocol: 'Protocol', code: 'Access code', track: 'Track', tracking: 'Searching…', notfound: 'Invalid protocol or code.', offline: 'We could not reach the server. Check your connection and try again — your protocol is still valid.', oops: 'Something failed on our side. Please try again shortly; your protocol is still valid.', status: 'Status', timeline: 'Progress', you: 'You', team: 'Handling team', yourReport: 'Your report', reply: 'Reply / add info', send: 'Send', sending: 'Sending…', back: 'Look up another', empty: 'No messages yet.' },
  es: { title: 'Seguir protocolo', sub: 'Ingresa el protocolo y el código de acceso que guardaste.', protocol: 'Protocolo', code: 'Código de acceso', track: 'Seguir', tracking: 'Buscando…', notfound: 'Protocolo o código inválido.', offline: 'No pudimos contactar al servidor. Revisa tu conexión e inténtalo de nuevo — tu protocolo sigue siendo válido.', oops: 'Algo falló de nuestro lado. Inténtalo de nuevo en unos instantes; tu protocolo sigue siendo válido.', status: 'Estado', timeline: 'Progreso', you: 'Tú', team: 'Equipo responsable', yourReport: 'Tu denuncia', reply: 'Responder / añadir', send: 'Enviar', sending: 'Enviando…', back: 'Consultar otro', empty: 'Aún no hay mensajes.' },
}

// No SAC quem acompanha é CONSUMIDOR, e o que ele abriu é uma DEMANDA. Mesmo
// padrão do `SAC_WORDS` de `PublicReport.tsx`: só as palavras que mudam; o
// resto do dicionário acima é reaproveitado pelo spread.
//
// Só entram aqui chaves que a tela mostra DEPOIS da busca — é o único momento
// em que o módulo é conhecido. O que aparece antes (o `title` e o `sub`) ficou
// NEUTRO no dicionário base, senão o rótulo mudaria na frente da pessoa: ela
// leria "Acompanhar relato", buscaria, e o texto se reescreveria para
// "demanda". O título de denúncia saiu de lá por isso, e não por descuido.
//
// `title` NÃO tem variante de SAC de propósito: depois da busca o cabeçalho é
// `view.title`, que vem do servidor já flexionado ("Demanda" no SAC, "Relato"
// na ouvidoria). Uma chave aqui seria string morta.
const SAC_WORDS = {
  pt: { yourReport: 'Sua demanda', team: 'Equipe de atendimento' },
  en: { yourReport: 'Your request', team: 'Support team' },
  es: { yourReport: 'Tu demanda', team: 'Equipo de atención' },
} as const

export default function PublicTracker() {
  const { lang } = useTranslation()
  const base = L[lang] ?? L.pt
  const [open, setOpen] = useState(() => window.location.hash.toLowerCase().startsWith('#acompanhar'))
  const [protocol, setProtocol] = useState('')
  const [code, setCode] = useState('')
  const [view, setView] = useState<View | null>(null)
  // Vocabulário do módulo: no SAC troca "relato/denúncia" por "demanda".
  //
  // Derivado do CASO que está na tela, e não de um estado próprio. É de
  // propósito: toda saída passa por `limpar()`, que zera o `view` — então o
  // vocabulário volta ao neutro pelo mesmo caminho, sem depender de alguém
  // lembrar de resetar mais uma variável. Buscar um SAC e depois um relato de
  // ética na mesma aba não deixa "demanda" grudado na tela.
  const tr = view?.module === 'sac'
    ? { ...base, ...(SAC_WORDS[lang] ?? SAC_WORDS.pt) }
    : base
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  // Geração da sessão de consulta. Toda limpeza de tela (o "×" e o "Consultar
  // outro") incrementa este número, e quem está esperando resposta confere o
  // seu antes de escrever no estado.
  //
  // É o que fecha o vazamento: numa conexão lenta, clicar no "×" enquanto a
  // busca está no ar limpava o estado, mas a resposta chegava DEPOIS e o
  // `setView` repovoava tudo. Reabrir `#acompanhar` na mesma aba — colando a
  // URL, sem recarregar — mostrava o caso anterior inteiro (protocolo, título
  // e o texto do relato) a quem não informou protocolo nem código. Tela
  // pública, anônima e usada em computador compartilhado: o próximo da fila
  // lia o relato de quem passou antes.
  const geracao = useRef(0)
  // A requisição em voo, para ser abortada junto: sem isso ela continua
  // pendurada depois do fechamento, consumindo rede e trazendo o relato para a
  // memória da aba sem necessidade.
  const emVoo = useRef<AbortController | null>(null)

  // Zera a tela de consulta. Única porta de saída do estado — o "×", o botão
  // "Consultar outro" e qualquer saída do hash passam por aqui, para que o
  // conserto não dependa de alguém lembrar de repetir a lista de `set*`.
  function limpar() {
    geracao.current += 1
    emVoo.current?.abort()
    emVoo.current = null
    setView(null); setProtocol(''); setCode(''); setReply(''); setErr(null); setBusy(false)
  }

  useEffect(() => {
    const sync = () => setOpen(window.location.hash.toLowerCase().startsWith('#acompanhar'))
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  // Sair da tela por QUALQUER caminho limpa o estado: o "×" já chama `limpar`,
  // mas o botão voltar do navegador e um link que troque o fragmento também
  // tiram o overlay — e deixariam o relato vivo no estado da aba.
  useEffect(() => { if (!open) limpar() }, [open])
  if (!open) return null

  async function lookup() {
    // A geração desta busca. Se mudar até a resposta chegar, a tela já é de
    // outra pessoa (ou de outra consulta) e nada daqui pode aparecer nela.
    const minha = geracao.current
    const ctrl = new AbortController()
    emVoo.current?.abort()
    emVoo.current = ctrl
    setErr(null); setBusy(true)
    try {
      const r = await fetch(`${BASE_URL}/public/cases/lookup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // Normalizado também aqui, e não só no que o campo mostra: o valor
        // pode ter vindo de um autofill, que não passa pelo `onChange`.
        body: JSON.stringify({ protocol: maskProtocolo(protocol), access_hash: code.trim() }),
        signal: ctrl.signal,
      })
      if (geracao.current !== minha) return
      // 404 = protocolo/código não conferem (é o que o servidor devolve para
      // os dois, de propósito). Qualquer outro status é problema NOSSO, e
      // dizer "protocolo inválido" nesse caso manda a pessoa caçar erro onde
      // não tem.
      if (r.status === 404) { setErr(tr.notfound); return }
      if (!r.ok) { setErr(tr.oops); return }
      const dados = await r.json()
      // Ler o corpo também é espera: a tela pode ter sido fechada aqui.
      if (geracao.current !== minha) return
      setView(dados)
    } catch {
      // `fetch` só rejeita quando a requisição não chegou a ter resposta:
      // rede caída, DNS, servidor fora do ar — ou o `abort` do fechamento,
      // que não é erro de ninguém e não pode virar aviso na tela.
      if (geracao.current !== minha) return
      setErr(tr.offline)
    } finally {
      if (emVoo.current === ctrl) emVoo.current = null
      if (geracao.current === minha) setBusy(false)
    }
  }
  async function sendReply() {
    if (!reply.trim() || !view) return
    const minha = geracao.current
    const ctrl = new AbortController()
    emVoo.current?.abort()
    emVoo.current = ctrl
    setErr(null); setBusy(true)
    try {
      const r = await fetch(`${BASE_URL}/public/cases/${view.protocol}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol: view.protocol, access_hash: code.trim(), message: reply.trim() }),
        signal: ctrl.signal,
      })
      if (geracao.current !== minha) return
      // Falha no envio precisa das MESMAS três mensagens do lookup. Antes,
      // qualquer erro aqui só destravava o botão: o texto ficava na caixa, a
      // linha do tempo não mudava e a pessoa não tinha como saber se a
      // complementação chegou. Perder isso em silêncio é pior no /reply do
      // que no lookup, porque o conteúdo é dela.
      if (r.status === 404) { setErr(tr.notfound); return }
      if (!r.ok) { setErr(tr.oops); return }
      const dados = await r.json()
      if (geracao.current !== minha) return
      setView(dados); setReply('')
    } catch {
      if (geracao.current !== minha) return
      setErr(tr.offline)
    } finally {
      if (emVoo.current === ctrl) emVoo.current = null
      if (geracao.current === minha) setBusy(false)
    }
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
    // tela deixava protocolo, código e mensagens vivos no estado. `limpar`
    // também invalida a busca que estiver no ar, para que a resposta atrasada
    // não traga o caso de volta depois.
    limpar()
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
              <div><label style={labelS}>{tr.protocol}</label><input style={{ ...input, textTransform: 'uppercase', letterSpacing: 0.5 }} value={protocol} onChange={(e) => setProtocol(maskProtocolo(e.target.value))} placeholder="DG-XXXX-XXXX" autoCapitalize="characters" autoCorrect="off" spellCheck={false} autoComplete="off" autoFocus /></div>
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
                {/* O mesmo aviso do lookup, aqui também: sem este bloco, o
                    `setErr` do `sendReply` não teria onde aparecer, porque a
                    caixa de erro só existia na tela de busca. */}
                {err && <div style={{ background: 'rgba(217,83,79,.12)', border: '1px solid rgba(217,83,79,.4)', color: '#e08585', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, marginTop: 8 }}>{err}</div>}
                <button onClick={() => void sendReply()} disabled={busy || !reply.trim()} className="app-btn" style={{ marginTop: 8, background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff', border: 'none', borderRadius: 100, padding: '11px 22px', fontWeight: 700, cursor: 'pointer', opacity: busy || !reply.trim() ? 0.6 : 1 }}>{busy ? tr.sending : tr.send}</button>
              </div>
            )}
            {/* "Consultar outro" usa a MESMA porta de saída do "×": sem isso,
                um envio ainda no ar devolvia o caso anterior à tela depois de
                a pessoa já estar digitando outro protocolo. */}
            <button onClick={limpar} className="app-btn" style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }}>{tr.back}</button>
          </>
        )}
      </div>
    </div>
  )
}
