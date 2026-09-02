// Construtor de Formulário do Canal. Dois modos:
//  • Manual — monta os campos na mão (tipo Google Forms).
//  • IA — um workspace de chat: o agente (DeepSeek via Agno) monta o formulário
//    seguindo NR-1 / Lei 14.457, e o preview ao lado atualiza ao vivo.
// Em qualquer modo, dá pra traduzir o form para PT/EN/ES (DeepSeek) num clique.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../lib/api'
import type { ApiError, ChannelOut, MemberRow } from '../../lib/types'
import { useT } from '../strings'
import ChipUsoIA from '../../components/ChipUsoIA'
import { useTranslation } from '../../i18n/LanguageProvider'
import { Button, Card, EmptyState, Input, Modal, PageHeader, SectionLabel, Select, Skeleton } from '../ui'
import { Icon } from '../icons'

type FieldType =
  | 'short_text' | 'long_text' | 'single_choice' | 'multi_choice'
  | 'dropdown' | 'date' | 'yes_no' | 'rating' | 'section' | 'info'

interface FF {
  key: string; type: FieldType; label: string; help: string
  required: boolean; options: string[]; sensitive: boolean; conditional: null
}
interface FormData {
  channel_id: string; title: string; intro: string; identification: string
  fields: FF[]; published: boolean; version: number; published_at: string | null
  base_lang: string; available_langs: string[]
}
type Lang = 'pt' | 'en' | 'es'
interface ChatMsg { role: 'you' | 'assistant'; content: string }
interface ChatSummary { chat_id: string; title: string; messages: number; updated_at: number | null }
interface AIReply { chat_id: string; message: string; form: { title: string; intro: string; identification: string; fields: Omit<FF, 'conditional'>[] } }

const TYPES: FieldType[] = ['short_text', 'long_text', 'single_choice', 'multi_choice', 'dropdown', 'date', 'yes_no', 'section', 'info']
const LANGS: { v: Lang; label: string }[] = [{ v: 'pt', label: 'PT' }, { v: 'en', label: 'EN' }, { v: 'es', label: 'ES' }]
const hasOptions = (t: FieldType) => t === 'single_choice' || t === 'multi_choice' || t === 'dropdown'
const slug = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'campo'

// i18n LOCAL (só desta tela) para o fluxo "Avisar a empresa". Mantido aqui para
// não tocar em strings.ts / translations.ts — chaveado pelo idioma da interface.
const NOTIFY_I18N = {
  pt: {
    button: 'Avisar a empresa', title: 'Avisar a empresa', kicker: 'Formulário publicado',
    intro: 'Envie o link do formulário por e-mail para os membros da empresa.',
    all: 'Avisar todos', allHint: 'Manda o aviso para todos os membros da empresa.',
    pick: 'Escolher quem avisar', pickHint: 'Selecione as pessoas que devem receber o aviso.',
    send: 'Enviar', back: 'Voltar', selectAll: 'Todos', clear: 'Limpar',
    empty: 'Nenhum membro para avisar.', invited: 'Convite pendente',
    sentOk: (n: number) => `Avisados: ${n}`, errNotify: 'Não foi possível enviar os avisos.',
  },
  en: {
    button: 'Notify the company', title: 'Notify the company', kicker: 'Form published',
    intro: 'Email the form link to the company members.',
    all: 'Notify everyone', allHint: 'Sends the notice to every company member.',
    pick: 'Choose who to notify', pickHint: 'Pick the people who should get the notice.',
    send: 'Send', back: 'Back', selectAll: 'All', clear: 'Clear',
    empty: 'No members to notify.', invited: 'Pending invite',
    sentOk: (n: number) => `Notified: ${n}`, errNotify: 'Could not send the notifications.',
  },
  es: {
    button: 'Avisar a la empresa', title: 'Avisar a la empresa', kicker: 'Formulario publicado',
    intro: 'Envía el enlace del formulario por correo a los miembros de la empresa.',
    all: 'Avisar a todos', allHint: 'Envía el aviso a todos los miembros de la empresa.',
    pick: 'Elegir a quién avisar', pickHint: 'Selecciona a las personas que recibirán el aviso.',
    send: 'Enviar', back: 'Volver', selectAll: 'Todos', clear: 'Limpiar',
    empty: 'No hay miembros para avisar.', invited: 'Invitación pendiente',
    sentOk: (n: number) => `Avisados: ${n}`, errNotify: 'No fue posible enviar los avisos.',
  },
} as const

export default function FormBuilder() {
  const t = useT()
  // Idioma da INTERFACE (≠ idioma do formulário, que é o `lang` mais abaixo).
  const { lang: uiLang } = useTranslation()
  const nt = NOTIFY_I18N[uiLang]
  const [channels, setChannels] = useState<ChannelOut[] | null>(null)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData | null>(null)
  // Assinatura do conteúdo no último salvamento. `null` = ainda carregando.
  const [salvo, setSalvo] = useState<string | null>(null)
  // Meta de cada formulário (título/status/nº campos) p/ o rail "Meus formulários".
  const [formsMeta, setFormsMeta] = useState<Record<string, { title: string; published: boolean; count: number }>>({})
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')
  // Qual especialista atende este canal (vem do módulo). Só para MOSTRAR na tela:
  // quem manda é o backend, que decide pelo canal.
  const [agentModule, setAgentModule] = useState<string>('etica')
  // Conversas deste formulário (as desta pessoa). `chatId` é a aberta.
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [chatId, setChatId] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>('pt')
  // Form MOSTRADO na pré-visualização — no idioma base é o `form` ao vivo; num
  // idioma traduzido é a versão localizada (buscada), sem afetar a edição da base.
  const [previewForm, setPreviewForm] = useState<FormData | null>(null)
  const [translating, setTranslating] = useState(false)
  // Chat do assistente (por canal).
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  // "Avisar a empresa": modal com dois passos (escolher / selecionar membros).
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [notifyView, setNotifyView] = useState<'choose' | 'pick'>('choose')
  const [members, setMembers] = useState<MemberRow[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notifyBusy, setNotifyBusy] = useState(false)

  useEffect(() => {
    api.get<ChannelOut[]>('/channels')
      .then((cs) => {
        // TODO(nunca mais): isto filtrava `module === 'etica'` e escondia os
        // canais de SAC — não havia como montar o formulário de um SAC. O tipo
        // do formulário É o módulo do canal, então listamos todo canal que a
        // pessoa pode editar; o backend confere a permissão por canal.
        const et = cs.filter((c) => c.module === 'etica' || c.module === 'sac')
        setChannels(et); if (et.length) setChannelId(et[0].id)
        // Carrega a meta de cada form (título/status) p/ montar o rail de formulários.
        void Promise.all(et.map((c) =>
          api.get<FormData>(`/channels/${c.id}/form`)
            .then((f) => [c.id, { title: f.title, published: f.published, count: f.fields.length }] as const)
            .catch(() => [c.id, null] as const),
        )).then((entries) => {
          const map: Record<string, { title: string; published: boolean; count: number }> = {}
          for (const [id, m] of entries) if (m) map[id] = m
          setFormsMeta(map)
        })
      })
      .catch(() => setChannels([]))
  }, [])

  // Mantém o card ativo em sincronia com o que você edita (título/status/nº campos).
  useEffect(() => {
    if (form && channelId) setFormsMeta((m) => ({ ...m, [channelId]: { title: form.title, published: form.published, count: form.fields.length } }))
  }, [form, channelId])

  useEffect(() => {
    if (!channelId) return
    setForm(null); setSalvo(null); setMsgs([])
    api.get<FormData>(`/channels/${channelId}/form`).then((f) => { setForm(f); setSalvo(assinatura(f)); setLang((f.base_lang as Lang) || 'pt') }).catch(() => {})
    api.get<{ public_url: string }>(`/channels/${channelId}/public-link`).then((r) => setPublicUrl(r.public_url)).catch(() => {})
    // Reabre a conversa anterior com o agente. O histórico sempre esteve salvo
    // (é o que dá memória a ele), mas a tela zerava o chat e parecia perdido.
    // Não gasta token: é leitura da memória.
    void reloadChats(channelId)
    api.get<{ module: string; chat_id: string | null; messages: { role: string; content: string }[] }>(`/channels/${channelId}/form/ai/history`)
      .then((h) => {
        setAgentModule(h.module); setChatId(h.chat_id)
        setMsgs(h.messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'you', content: m.content,
        })))
      })
      .catch(() => {})
  }, [channelId])

  // Pré-visualização segue o "Idioma do formulário": no idioma BASE mostra o form ao
  // vivo (reflete edições); num idioma traduzido busca a versão localizada no backend.
  useEffect(() => {
    if (!form || !channelId) { setPreviewForm(null); return }
    const base = (form.base_lang as Lang) || 'pt'
    if (lang === base) { setPreviewForm(form); return }
    let cancelled = false
    api.get<FormData>(`/channels/${channelId}/form?lang=${lang}`)
      .then((f) => { if (!cancelled) setPreviewForm(f) })
      .catch(() => { if (!cancelled) setPreviewForm(form) })
    return () => { cancelled = true }
  }, [lang, form, channelId])

  /** Só o que é publicável entra na assinatura — versão e idiomas mudam
   *  sozinhos no salvamento e marcariam "alterado" sem ninguém ter mexido. */
  const assinatura = (f: FormData) =>
    JSON.stringify({ title: f.title, intro: f.intro, identification: f.identification, fields: f.fields })

  const sujo = !!form && salvo !== null && assinatura(form) !== salvo

  const patch = (p: Partial<FormData>) => setForm((f) => (f ? { ...f, ...p } : f))
  const updateField = (i: number, p: Partial<FF>) => setForm((f) => {
    if (!f) return f
    const fields = f.fields.slice(); fields[i] = { ...fields[i], ...p }; return { ...f, fields }
  })
  const addField = () => setForm((f) => f ? { ...f, fields: [...f.fields, { key: `campo_${f.fields.length + 1}`, type: 'short_text', label: 'Nova pergunta', help: '', required: false, options: [], sensitive: false, conditional: null }] } : f)
  const removeField = (i: number) => setForm((f) => f ? { ...f, fields: f.fields.filter((_, k) => k !== i) } : f)
  const move = (i: number, dir: -1 | 1) => setForm((f) => {
    if (!f) return f
    const j = i + dir; if (j < 0 || j >= f.fields.length) return f
    const fields = f.fields.slice();[fields[i], fields[j]] = [fields[j], fields[i]]; return { ...f, fields }
  })

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600) }

  // ── Avisar a empresa ──────────────────────────────────────────────
  const openNotify = () => { setNotifyView('choose'); setSelected(new Set()); setNotifyOpen(true) }

  const openPick = () => {
    setNotifyView('pick')
    if (members === null) {
      api.get<MemberRow[]>('/memberships').then(setMembers).catch(() => setMembers([]))
    }
  }

  const toggleMember = (id: string) => setSelected((s) => {
    const next = new Set(s)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  // recipients: null → todos; array de ids → só esses. O backend 400 se o form
  // ainda não estiver publicado; nesse caso mostramos o detail no toast.
  async function notify(recipients: string[] | null) {
    if (!channelId || notifyBusy) return
    setNotifyBusy(true)
    try {
      const r = await api.post<{ sent: number }>(`/channels/${channelId}/form/notify`, { recipients })
      flash(nt.sentOk(r.sent))
      setNotifyOpen(false)
    } catch (e) {
      flash((e as ApiError).detail ?? nt.errNotify)
    } finally { setNotifyBusy(false) }
  }

  async function save(publish = false, overrideLang?: Lang) {
    if (!form || !channelId) return
    // O idioma que vai no salvamento é o do CONTEÚDO em `form`, que é sempre o
    // base — a tradução vive em `previewForm`, à parte. Mandar o idioma do
    // seletor (que é de pré-visualização) fazia o servidor entender "reescrevi
    // este form em inglês": trocava o base e apagava as traduções bem na hora
    // de publicar.
    const saveLang = overrideLang ?? ((form.base_lang as Lang) || 'pt')
    setBusy(true)
    try {
      // Chave estável e válida (<=60, só [a-z0-9_], única). Preserva a key do
      // agente/campo quando já é válida; senão gera a partir do rótulo.
      const seen = new Set<string>()
      const mkKey = (x: FF, i: number) => {
        let base = /^[a-z0-9_]{1,60}$/.test(x.key) ? x.key : `${slug(x.label).slice(0, 46)}_${i}`
        base = base.slice(0, 60) || `campo_${i}`
        while (seen.has(base)) base = `${base.slice(0, 57)}_${i}`.slice(0, 60)
        seen.add(base)
        return base
      }
      const payload = {
        title: form.title, intro: form.intro, identification: form.identification, lang: saveLang,
        fields: form.fields.map((x, i) => ({ ...x, key: mkKey(x, i) })),
      }
      const saved = await api.put<FormData>(`/channels/${channelId}/form`, payload)
      // A assinatura sai do PAYLOAD, não do estado: é exatamente o que foi
      // para o servidor. As chaves dos campos são normalizadas no envio
      // (`mkKey`), então comparar com o estado marcaria "alterado" logo após
      // salvar, e o botão de publicar nunca liberaria.
      setSalvo(JSON.stringify({
        title: payload.title, intro: payload.intro,
        identification: payload.identification, fields: payload.fields,
      }))
      setForm((f) => (f ? { ...f, fields: payload.fields } : f))
      setForm((f) => f ? { ...f, base_lang: saveLang, available_langs: saved.available_langs ?? [saveLang], published: publish ? f.published : f.published } : f)
      if (publish) {
        const p = await api.post<FormData>(`/channels/${channelId}/form/publish`, {})
        setForm((f) => f ? { ...f, published: true, version: p.version } : f)
      }
      flash(publish ? t.fb.published : t.fb.saved)
    } catch (e) {
      alert((e as ApiError).detail ?? t.fb.errSave)
    } finally { setBusy(false) }
  }

  async function translateAll() {
    if (!channelId || !form) return
    setTranslating(true)
    try {
      // Traduz SEMPRE a partir do idioma base — mesmo que o preview esteja num
      // idioma ainda não traduzido (senão gravaríamos a base com o rótulo errado).
      const base = (form.base_lang as Lang) || 'pt'
      await save(false, base)
      const r = await api.post<FormData>(`/channels/${channelId}/form/translate`, {})
      patch({ available_langs: r.available_langs ?? ['pt', 'en', 'es'] })
      flash(t.fb.translated)
    } catch (e) {
      alert((e as ApiError).detail ?? t.fb.errTranslate)
    } finally { setTranslating(false) }
  }

  const reloadChats = (cid: string) =>
    api.get<{ chats: ChatSummary[] }>(`/channels/${cid}/form/ai/chats`)
      .then((r) => setChats(r.chats)).catch(() => setChats([]))

  /** Abre uma conversa antiga: troca as mensagens da tela pelas dela. */
  async function openChat(id: string) {
    if (!channelId || id === chatId) return
    setMsgs([]); setChatId(id)
    try {
      const h = await api.get<{ messages: { role: string; content: string }[] }>(
        `/channels/${channelId}/form/ai/history?chat_id=${encodeURIComponent(id)}`)
      setMsgs(h.messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'you', content: m.content })))
    } catch { /* conversa some se foi apagada noutra aba */ }
  }

  /** Começa do zero: sem chat_id, o backend cria uma conversa nova no 1º envio. */
  function newChat() { setChatId(null); setMsgs([]) }

  async function deleteChat(id: string) {
    if (!channelId) return
    try { await api.delete(`/channels/${channelId}/form/ai/chats/${encodeURIComponent(id)}`) } catch { /* já apagada */ }
    if (id === chatId) newChat()
    void reloadChats(channelId)
  }

  async function sendAI(text?: string) {
    const message = (text ?? aiInput).trim()
    if (!message || !channelId || aiBusy) return
    setAiInput(''); setMsgs((m) => [...m, { role: 'you', content: message }]); setAiBusy(true)
    try {
      const r = await api.post<AIReply>(`/channels/${channelId}/form/ai`, { message, lang, chat_id: chatId })
      setChatId(r.chat_id)
      setMsgs((m) => [...m, { role: 'assistant', content: r.message }])
      void reloadChats(channelId)   // título/ordem da lista mudam a cada turno
      setForm((f) => f ? { ...f, title: r.form.title, intro: r.form.intro, identification: r.form.identification, fields: r.form.fields.map((x) => ({ ...x, conditional: null })) } : f)
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', content: (e as ApiError).detail ?? 'Falha ao falar com o assistente.' }])
    } finally { setAiBusy(false) }
  }

  if (channels === null) return <div className="app-screen"><Skeleton h={220} r={20} /></div>
  if (channels.length === 0) {
    return (
      <div className="app-screen">
        <PageHeader title={t.fb.title} subtitle={t.fb.subtitle} />
        <Card><EmptyState icon="channels" title={t.fb.noChannel} body={t.fb.noChannelBody} /></Card>
      </div>
    )
  }

  const langsReady = form?.available_langs ?? ['pt']
  // Idioma escolhido para pré-visualizar ainda SEM tradução salva no banco →
  // cobrimos o preview com um véu e um convite para traduzir num clique.
  const needsTranslation = !!form && !langsReady.includes(lang)

  return (
    <div className="app-screen">
      <PageHeader
        title={t.fb.title}
        subtitle={t.fb.subtitle}
        action={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button variant="ghost" onClick={() => void save(false)} loading={busy}>{t.fb.save}</Button>
            {/* Publicar troca o formulário que o denunciante vê. Com alteração
                pendente, o clique publicaria uma versão diferente da que está
                na tela — e isso não tem desfazer. */}
            <Button leftIcon="check" onClick={() => void save(true)} loading={busy} disabled={sujo}>{t.fb.publish}</Button>
            {sujo && (
              <span style={{ color: '#e0a23c', fontSize: 12.5, alignSelf: 'center' }}>{t.fb.needsSave}</span>
            )}
          </div>
        }
      />

      {/* Rail "Meus formulários": um card por canal (nome + título + status). */}
      <div style={{ marginBottom: 18 }}>
        <SectionLabel>{t.fb.myForms}</SectionLabel>
        <div className="app-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
          {channels.map((c) => {
            const meta = formsMeta[c.id]
            const active = c.id === channelId
            return (
              <button
                key={c.id}
                onClick={() => setChannelId(c.id)}
                className="app-card--hover"
                style={{
                  minWidth: 210, maxWidth: 260, flexShrink: 0, textAlign: 'left', cursor: 'pointer',
                  padding: '13px 15px', borderRadius: 14, fontFamily: 'inherit',
                  background: active ? 'var(--accent-soft)' : 'var(--surface)',
                  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex', flexDirection: 'column', gap: 5,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {/* A marca do módulo diz de que TIPO é este formulário — é o
                      módulo do canal que decide, inclusive qual agente atende. */}
                  <img
                    src={c.module === 'sac' ? '/sac-icon.svg' : '/canal-denuncias-icon.png'}
                    alt="" className="module-logo"
                    style={{ width: 18, height: 18, minWidth: 18, objectFit: 'contain' }}
                  />
                  <span style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {c.module === 'sac' ? t.fb.kindSac : t.fb.kindEtica}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta?.title || t.fb.untitled}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: meta?.published ? 'var(--green,#2bb673)' : 'var(--text-muted)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta?.published ? 'var(--green,#2bb673)' : 'var(--text-muted)', flexShrink: 0 }} />
                  {meta?.published ? t.fb.publishedTag : t.fb.draft}{meta ? ` · ${meta.count} ${t.fb.fieldsWord}` : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Barra de controle: modo + idioma + traduzir */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ display: 'inline-flex', background: 'var(--surface-2)', borderRadius: 100, padding: 4 }}>
          {(['manual', 'ai'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className="app-btn" style={{ border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 100, fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-muted)' }}>
              {m === 'ai' && <Icon name="audit" size={14} />}{t.fb.mode[m]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600 }}>{t.fb.langBuild}</span>
          <div style={{ display: 'inline-flex', background: 'var(--surface-2)', borderRadius: 100, padding: 3 }}>
            {LANGS.map((l) => (
              <button key={l.v} onClick={() => setLang(l.v)} className="app-btn" style={{ border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 100, fontWeight: 800, fontSize: 12, background: lang === l.v ? 'var(--accent)' : 'transparent', color: lang === l.v ? '#fff' : 'var(--text-muted)' }}>{l.label}</button>
            ))}
          </div>
        </div>

        <Button variant="outline" leftIcon="globe" onClick={() => void translateAll()} loading={translating}>{t.fb.translate}</Button>
        {langsReady.length > 1 && (
          <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{t.fb.langsReady} <b style={{ color: 'var(--heading)' }}>{langsReady.map((l) => l.toUpperCase()).join(' · ')}</b></span>
        )}
      </div>

      {!form ? <Skeleton h={300} r={20} /> : (
        <div className="fb-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          {/* COLUNA ESQUERDA: editor manual OU chat da IA */}
          {mode === 'manual' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Card>
                <SectionLabel>{t.fb.identity}</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Input value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder={t.fb.formTitle} />
                  <Input value={form.intro} onChange={(e) => patch({ intro: e.target.value })} placeholder={t.fb.formIntro} />
                  <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{t.fb.identification}</label>
                    <div style={{ display: 'inline-flex', background: 'var(--surface-2)', borderRadius: 100, padding: 4, flexWrap: 'wrap' }}>
                      {(['optional', 'required', 'forbidden'] as const).map((m) => (
                        <button key={m} onClick={() => patch({ identification: m })} className="app-btn" style={{ border: 'none', cursor: 'pointer', padding: '7px 14px', borderRadius: 100, fontWeight: 700, fontSize: 12.5, background: form.identification === m ? 'var(--accent)' : 'transparent', color: form.identification === m ? '#fff' : 'var(--text-muted)' }}>
                          {t.fb.id[m]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {form.fields.map((f, i) => (
                <Card key={i}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: 13 }}>{i + 1}</span>
                    <Input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder={t.fb.question} style={{ flex: 1 }} />
                    <button className="app-btn" onClick={() => move(i, -1)} title="↑" style={iconBtn}>↑</button>
                    <button className="app-btn" onClick={() => move(i, 1)} title="↓" style={iconBtn}>↓</button>
                    <button className="app-btn" onClick={() => removeField(i)} title={t.fb.remove} style={{ ...iconBtn, color: '#d9534f' }}><Icon name="close" size={16} /></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Select value={f.type} onChange={(e) => updateField(i, { type: e.target.value as FieldType })}>
                      {TYPES.map((v) => <option key={v} value={v}>{t.fb.types[v]}</option>)}
                    </Select>
                    <Input value={f.help} onChange={(e) => updateField(i, { help: e.target.value })} placeholder={t.fb.help} />
                  </div>
                  {hasOptions(f.type) && (
                    <textarea
                      value={f.options.join('\n')}
                      onChange={(e) => updateField(i, { options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                      placeholder={t.fb.optionsPh}
                      className="app-input"
                      style={{ width: '100%', marginTop: 10, minHeight: 74, resize: 'vertical', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', color: 'var(--heading)', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                    <Toggle checked={f.required} onChange={(v) => updateField(i, { required: v })} label={t.fb.required} />
                    <Toggle checked={f.sensitive} onChange={(v) => updateField(i, { sensitive: v })} label={t.fb.sensitive} />
                  </div>
                </Card>
              ))}

              <Button variant="outline" leftIcon="plus" onClick={addField} style={{ alignSelf: 'flex-start' }}>{t.fb.addField}</Button>
            </div>
          ) : (
            <AIChat
              t={t} msgs={msgs} aiBusy={aiBusy} aiInput={aiInput} setAiInput={setAiInput}
              onSend={sendAI} agentModule={agentModule}
              chats={chats} chatId={chatId} onOpenChat={openChat} onNewChat={newChat} onDeleteChat={deleteChat}
            />
          )}

          {/* COLUNA DIREITA: preview ao vivo */}
          <Card style={{ position: 'sticky', top: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <SectionLabel>{t.fb.preview}</SectionLabel>
              <span style={{ fontSize: 12, fontWeight: 700, color: form.published ? 'var(--green,#2bb673)' : 'var(--text-muted)' }}>
                {form.published ? `● ${t.fb.publishedTag} v${form.version}` : `○ ${t.fb.draft}`}
              </span>
            </div>
            <h2 style={{ color: 'var(--heading)', fontSize: 22, fontWeight: 800 }}>{(previewForm ?? form).title || '—'}</h2>
            {(previewForm ?? form).intro && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{(previewForm ?? form).intro}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
              {(previewForm ?? form).fields.map((f, i) => <Preview key={i} f={f} t={t} />)}
            </div>
            {publicUrl && (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{t.fb.publicLink}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, color: 'var(--text)' }}>{publicUrl}</code>
                  <Button variant="ghost" onClick={() => { void navigator.clipboard?.writeText(publicUrl); flash(t.common.copied) }}>{t.common.copy}</Button>
                </div>
                {!form.published && <p style={{ color: '#e0a23c', fontSize: 12.5, marginTop: 8 }}>{t.fb.publishHint}</p>}
                <Button variant="outline" leftIcon="people" onClick={openNotify} style={{ marginTop: 12, width: '100%' }}>{nt.button}</Button>
              </div>
            )}

            {/* Véu quando o idioma pré-visualizado ainda não foi traduzido. */}
            {needsTranslation && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 20, zIndex: 6, background: 'rgba(242,146,30,.14)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 18, paddingTop: 'clamp(40px, 10vh, 110px)', boxSizing: 'border-box' }}>
                <div className="chat-in" style={{ background: 'var(--surface)', border: '1.5px solid var(--accent)', borderRadius: 16, padding: '22px 24px', maxWidth: 340, textAlign: 'center', boxShadow: '0 18px 44px rgba(8,22,38,.22)' }}>
                  <span style={{ width: 54, height: 54, borderRadius: 16, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Icon name="globe" size={25} /></span>
                  <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 16.5 }}>{t.fb.previewOffTitle} · {LANGS.find((l) => l.v === lang)?.label}</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 6, lineHeight: 1.6 }}>{t.fb.previewOffBody}</p>
                  <Button leftIcon="globe" onClick={() => void translateAll()} loading={translating} style={{ marginTop: 16 }}>{t.fb.previewOffCta}</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal open={notifyOpen} onClose={() => setNotifyOpen(false)} title={nt.title} kicker={nt.kicker} maxWidth={notifyView === 'pick' ? 520 : 460}>
        {notifyView === 'choose' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{nt.intro}</p>
            <button onClick={() => void notify(null)} disabled={notifyBusy} className="app-card--hover app-btn" style={choiceCard}>
              <span style={choiceIcon}><Icon name="people" size={20} /></span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', color: 'var(--heading)', fontWeight: 800, fontSize: 15 }}>{nt.all}</span>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, marginTop: 2 }}>{nt.allHint}</span>
              </span>
            </button>
            <button onClick={openPick} disabled={notifyBusy} className="app-card--hover app-btn" style={choiceCard}>
              <span style={choiceIcon}><Icon name="roles" size={20} /></span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', color: 'var(--heading)', fontWeight: 800, fontSize: 15 }}>{nt.pick}</span>
                <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, marginTop: 2 }}>{nt.pickHint}</span>
              </span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {members === null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton h={52} r={12} /><Skeleton h={52} r={12} /><Skeleton h={52} r={12} />
              </div>
            ) : members.length === 0 ? (
              <EmptyState icon="people" title={nt.empty} />
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700 }}>{selected.size} / {members.length}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="app-btn" onClick={() => setSelected(new Set(members.map((m) => m.id)))} style={miniBtn}>{nt.selectAll}</button>
                    <button className="app-btn" onClick={() => setSelected(new Set())} style={miniBtn}>{nt.clear}</button>
                  </div>
                </div>
                <div className="app-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', paddingRight: 2 }}>
                  {members.map((m) => {
                    const on = selected.has(m.id)
                    const name = m.full_name || m.email || m.invited_email
                    const sub = m.status === 'invited' ? nt.invited : (m.email || m.invited_email)
                    return (
                      <button key={m.id} onClick={() => toggleMember(m.id)} className="app-btn" style={{ ...memberRow, borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
                        <span style={{ ...checkbox, borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--accent)' : 'transparent' }}>
                          {on && <Icon name="check" size={13} style={{ color: '#fff' }} />}
                        </span>
                        <span style={{ minWidth: 0, textAlign: 'left', flex: 1 }}>
                          <span style={{ display: 'block', color: 'var(--heading)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 4 }}>
              <Button variant="ghost" onClick={() => setNotifyView('choose')}>{nt.back}</Button>
              <Button leftIcon="check" onClick={() => void notify([...selected])} loading={notifyBusy} disabled={selected.size === 0}>{nt.send}</Button>
            </div>
          </div>
        )}
      </Modal>

      {toast && createPortal(
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--heading)', color: 'var(--surface)', padding: '12px 22px', borderRadius: 100, fontWeight: 700, fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,.3)', zIndex: 10002 }}>{toast}</div>,
        document.body,
      )}
    </div>
  )
}

const iconBtn: CSSProperties = { width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }

// Estilos do modal "Avisar a empresa".
const choiceCard: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', cursor: 'pointer', padding: '14px 16px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'var(--surface-2)', fontFamily: 'inherit' }
const choiceIcon: CSSProperties = { width: 40, height: 40, flexShrink: 0, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
const miniBtn: CSSProperties = { cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', borderRadius: 100, padding: '5px 12px', fontSize: 12, fontWeight: 700 }
const memberRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, width: '100%', cursor: 'pointer', padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface-2)', fontFamily: 'inherit' }
const checkbox: CSSProperties = { width: 20, height: 20, flexShrink: 0, borderRadius: 6, border: '2px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }

function AIChat({ t, msgs, aiBusy, aiInput, setAiInput, onSend, agentModule, chats, chatId, onOpenChat, onNewChat, onDeleteChat }: {
  t: ReturnType<typeof useT>; msgs: ChatMsg[]; aiBusy: boolean; aiInput: string
  setAiInput: (v: string) => void; onSend: (text?: string) => void
  /** Módulo do canal — diz qual especialista está atendendo. */
  agentModule: string
  chats: ChatSummary[]; chatId: string | null
  onOpenChat: (id: string) => void; onNewChat: () => void; onDeleteChat: (id: string) => void
}) {
  const { lang } = useTranslation()
  const isSac = agentModule === 'sac'
  const scrollRef = useRef<HTMLDivElement>(null)
  const [wi, setWi] = useState(0)
  // Rola SÓ o container do chat (não a página). scrollIntoView rolava todos os
  // ancestrais, inclusive a janela → "a tela descia" ao enviar com Enter.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [msgs, aiBusy])
  // Enquanto o agente pensa, revezamos mensagens de espera (nos 3 idiomas).
  useEffect(() => {
    if (!aiBusy) { setWi(0); return }
    const id = setInterval(() => setWi((w) => (w + 1) % t.fb.ai.waiting.length), 1900)
    return () => clearInterval(id)
  }, [aiBusy, t.fb.ai.waiting.length])
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 260px)', minHeight: 460 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <SectionLabel>{t.fb.ai.title}</SectionLabel>
        <ChipUsoIA lang={lang} versao={msgs.length} />
        {/* Deixa explícito QUEM está atendendo — antes não havia como saber que
            o agente muda conforme o módulo do canal. */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 100, background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
          <img src={agentModule === 'sac' ? '/sac-icon.svg' : '/canal-denuncias-icon.png'} alt="" className="module-logo" style={{ width: 14, height: 14, objectFit: 'contain' }} />
          {agentModule === 'sac' ? t.fb.ai.agentSac : t.fb.ai.agentEtica}
        </span>
      </div>
      {/* Conversas deste formulário: dá para voltar numa antiga sem perder a
          atual. O formulário salvo é um só — o que muda é o fio da conversa. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 2 }}>
        <button
          type="button" onClick={onNewChat} className="app-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer', border: '1px dashed var(--accent-border)', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 100, padding: '6px 13px', fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap' }}
        >
          <Icon name="plus" size={13} /> {t.fb.ai.newChat}
        </button>
        {chats.length > 0 && (
          <div className="app-scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 3 }}>
            {chats.map((c) => {
              const on = c.chat_id === chatId
              return (
                <span key={c.chat_id} style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    type="button" onClick={() => onOpenChat(c.chat_id)} title={c.title}
                    className="app-btn"
                    style={{ maxWidth: 190, cursor: 'pointer', borderRadius: 100, padding: '6px 26px 6px 13px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-2)', color: on ? 'var(--accent)' : 'var(--text-muted)' }}
                  >
                    {c.title}
                  </button>
                  <button
                    type="button" onClick={() => onDeleteChat(c.chat_id)}
                    aria-label={t.fb.ai.deleteChat} title={t.fb.ai.deleteChat}
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
            {/* Boas-vindas do MÓDULO: com o especialista de SAC ativo, falar de
                NR-1 e Lei 14.457 (ouvidoria) confundia — é outra lei, outro
                público. A marca do módulo entra no lugar do ícone genérico. */}
            <img
              src={isSac ? '/sac-icon.svg' : '/canal-denuncias-icon.png'}
              alt="" className="module-logo"
              style={{ width: 52, height: 52, objectFit: 'contain', marginBottom: 12 }}
            />
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{isSac ? t.fb.ai.introSac : t.fb.ai.intro}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              {(isSac ? t.fb.ai.startersSac : t.fb.ai.starters).map((s) => (
                <button key={s} onClick={() => onSend(s)} className="app-btn" style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', borderRadius: 100, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>{s}</button>
              ))}
            </div>
          </div>
        ) : msgs.map((m, i) => (
          <div key={i} className="chat-in" style={{ alignSelf: m.role === 'you' ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, textAlign: m.role === 'you' ? 'right' : 'left' }}>{m.role === 'you' ? t.fb.ai.you : t.fb.ai.assistant}</div>
            <div style={{ background: m.role === 'you' ? 'var(--accent)' : 'var(--surface-2)', color: m.role === 'you' ? '#fff' : 'var(--text)', border: m.role === 'you' ? 'none' : '1px solid var(--border)', borderRadius: 14, padding: '10px 14px', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
        {aiBusy && (
          <div className="chat-in" style={{ alignSelf: 'flex-start', maxWidth: '86%' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>{t.fb.ai.assistant}</div>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 14px', fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="typing"><i /><i /><i /></span>
              <span style={{ color: 'var(--text-muted)' }}>{t.fb.ai.waiting[wi]}</span>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <textarea
          value={aiInput} onChange={(e) => setAiInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
          placeholder={t.fb.ai.placeholder} rows={2}
          style={{ flex: 1, minWidth: 0, resize: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', color: 'var(--heading)', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }}
        />
        <Button onClick={() => onSend()} loading={aiBusy} disabled={!aiInput.trim()}>{t.fb.ai.send}</Button>
      </div>
    </Card>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button className="app-btn" onClick={() => onChange(!checked)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
      <span style={{ width: 38, height: 22, borderRadius: 100, background: checked ? 'var(--accent)' : 'var(--surface-2)', border: '1px solid var(--border)', position: 'relative', transition: 'background .2s' }}>
        <span style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
      </span>
      {label}
    </button>
  )
}

function Preview({ f, t }: { f: FF; t: ReturnType<typeof useT> }) {
  if (f.type === 'section') return <h3 style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 16, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>{f.label}</h3>
  if (f.type === 'info') return <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{f.label}</p>
  const inputStyle: CSSProperties = { width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text-muted)', fontSize: 14, boxSizing: 'border-box' }
  return (
    <div>
      <label style={{ display: 'block', color: 'var(--heading)', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
        {f.label} {f.required && <span style={{ color: 'var(--accent)' }}>*</span>}
      </label>
      {f.help && <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: -3, marginBottom: 6 }}>{f.help}</p>}
      {f.type === 'long_text' ? <div style={{ ...inputStyle, minHeight: 64 }}>{t.fb.answerPh}</div>
        : f.type === 'date' ? <div style={inputStyle}>dd/mm/aaaa</div>
        : f.type === 'dropdown' ? <div style={inputStyle}>{f.options[0] ?? t.fb.choosePh} ▾</div>
        : f.type === 'single_choice' || f.type === 'multi_choice' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(f.options.length ? f.options : [`${t.fb.optionEg} 1`, `${t.fb.optionEg} 2`]).map((o, k) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14 }}>
                <span style={{ width: 16, height: 16, borderRadius: f.type === 'multi_choice' ? 4 : '50%', border: '2px solid var(--border)' }} />{o}
              </span>
            ))}
          </div>
        )
        : f.type === 'yes_no' ? <div style={{ display: 'flex', gap: 8 }}><span style={inputStyle}>{t.fb.previewYes}</span><span style={inputStyle}>{t.fb.previewNo}</span></div>
        : <div style={inputStyle}>{t.fb.answerPh}</div>}
    </div>
  )
}
