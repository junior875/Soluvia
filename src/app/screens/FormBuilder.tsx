// Construtor de Formulário do Canal. Dois modos:
//  • Manual — monta os campos na mão (tipo Google Forms).
//  • IA — um workspace de chat: o agente (DeepSeek via Agno) monta o formulário
//    seguindo NR-1 / Lei 14.457, e o preview ao lado atualiza ao vivo.
// Em qualquer modo, dá pra traduzir o form para PT/EN/ES (DeepSeek) num clique.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../lib/api'
import type { ApiError, ChannelOut } from '../../lib/types'
import { useT } from '../strings'
import { Button, Card, EmptyState, Input, PageHeader, SectionLabel, Select, Skeleton } from '../ui'
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
interface AIReply { message: string; form: { title: string; intro: string; identification: string; fields: Omit<FF, 'conditional'>[] } }

const TYPES: FieldType[] = ['short_text', 'long_text', 'single_choice', 'multi_choice', 'dropdown', 'date', 'yes_no', 'section', 'info']
const LANGS: { v: Lang; label: string }[] = [{ v: 'pt', label: 'PT' }, { v: 'en', label: 'EN' }, { v: 'es', label: 'ES' }]
const hasOptions = (t: FieldType) => t === 'single_choice' || t === 'multi_choice' || t === 'dropdown'
const slug = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'campo'

export default function FormBuilder() {
  const t = useT()
  const [channels, setChannels] = useState<ChannelOut[] | null>(null)
  const [channelId, setChannelId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData | null>(null)
  // Meta de cada formulário (título/status/nº campos) p/ o rail "Meus formulários".
  const [formsMeta, setFormsMeta] = useState<Record<string, { title: string; published: boolean; count: number }>>({})
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')
  const [lang, setLang] = useState<Lang>('pt')
  // Form MOSTRADO na pré-visualização — no idioma base é o `form` ao vivo; num
  // idioma traduzido é a versão localizada (buscada), sem afetar a edição da base.
  const [previewForm, setPreviewForm] = useState<FormData | null>(null)
  const [translating, setTranslating] = useState(false)
  // Chat do assistente (por canal).
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  useEffect(() => {
    api.get<ChannelOut[]>('/channels')
      .then((cs) => {
        const et = cs.filter((c) => c.module === 'etica')
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
    setForm(null); setMsgs([])
    api.get<FormData>(`/channels/${channelId}/form`).then((f) => { setForm(f); setLang((f.base_lang as Lang) || 'pt') }).catch(() => {})
    api.get<{ public_url: string }>(`/channels/${channelId}/public-link`).then((r) => setPublicUrl(r.public_url)).catch(() => {})
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

  async function save(publish = false, overrideLang?: Lang) {
    if (!form || !channelId) return
    const saveLang = overrideLang ?? lang
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

  async function sendAI(text?: string) {
    const message = (text ?? aiInput).trim()
    if (!message || !channelId || aiBusy) return
    setAiInput(''); setMsgs((m) => [...m, { role: 'you', content: message }]); setAiBusy(true)
    try {
      const r = await api.post<AIReply>(`/channels/${channelId}/form/ai`, { message, lang })
      setMsgs((m) => [...m, { role: 'assistant', content: r.message }])
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
            <Button leftIcon="check" onClick={() => void save(true)} loading={busy}>{t.fb.publish}</Button>
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
                  <Icon name="audit" size={16} style={{ color: active ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
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
              onSend={sendAI}
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

      {toast && createPortal(
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--heading)', color: 'var(--surface)', padding: '12px 22px', borderRadius: 100, fontWeight: 700, fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,.3)', zIndex: 10002 }}>{toast}</div>,
        document.body,
      )}
    </div>
  )
}

const iconBtn: CSSProperties = { width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }

function AIChat({ t, msgs, aiBusy, aiInput, setAiInput, onSend }: {
  t: ReturnType<typeof useT>; msgs: ChatMsg[]; aiBusy: boolean; aiInput: string
  setAiInput: (v: string) => void; onSend: (text?: string) => void
}) {
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
      <SectionLabel>{t.fb.ai.title}</SectionLabel>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '10px 2px' }}>
        {msgs.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 380 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Icon name="audit" size={22} /></div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{t.fb.ai.intro}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              {t.fb.ai.starters.map((s) => (
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
