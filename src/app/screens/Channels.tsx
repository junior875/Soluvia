import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import type { ApiError, ChannelOut } from '../../lib/types'
import { useCaps } from '../capabilities'
import { useT } from '../strings'
import { Button, Card, Chip, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton } from '../ui'
import { Icon } from '../icons'

const slugify = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()

export default function Channels() {
  const { ctx, can } = useCaps()
  const t = useT()
  const [channels, setChannels] = useState<ChannelOut[] | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [moduleCode, setModuleCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [links, setLinks] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const canManage = can('admin.manage_roles')
  const modules = ctx.enabled_modules.filter((m) => m !== 'admin')

  const load = () => api.get<ChannelOut[]>('/channels').then(setChannels).catch(() => setChannels([]))
  useEffect(() => { void load() }, [])
  useEffect(() => { if (!moduleCode && modules.length) setModuleCode(modules[0]) }, [modules, moduleCode])

  async function showLink(id: string) {
    if (links[id]) return
    const r = await api.get<{ public_url: string }>(`/channels/${id}/public-link`)
    setLinks((m) => ({ ...m, [id]: r.public_url }))
  }
  const copy = (url: string, id: string) => {
    void navigator.clipboard?.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      await api.post('/channels', { module: moduleCode, name: name.trim(), slug: slug || slugify(name), config: {} })
      setOpen(false); setName(''); setSlug('')
      await load()
    } catch (err) {
      setError((err as ApiError).detail ?? 'Falha ao criar canal.')
    } finally { setBusy(false) }
  }

  return (
    <div className="app-screen">
      <PageHeader
        title={t.channels.title}
        subtitle={t.channels.subtitle}
        action={canManage && <Button leftIcon="plus" onClick={() => setOpen(true)}>{t.channels.create}</Button>}
      />

      {channels === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{[0, 1].map((i) => <Skeleton key={i} h={92} r={20} />)}</div>
      ) : channels.length === 0 ? (
        <Card><EmptyState icon="channels" title={t.channels.empty} action={canManage && <Button leftIcon="plus" onClick={() => setOpen(true)}>{t.channels.create}</Button>} /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {channels.map((c) => (
            <Card key={c.id} hover>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="channels" /></span>
                <div>
                  <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 16 }}>{c.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>/{c.slug}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Chip tone="blue">{t.modules[c.module as keyof typeof t.modules] ?? c.module}</Chip>
                  <Chip tone={c.is_active ? 'green' : 'muted'}>{c.is_active ? t.channels.active : t.channels.inactive}</Chip>
                  <Button variant="ghost" leftIcon="copy" onClick={() => void showLink(c.id)}>{t.channels.link}</Button>
                </div>
              </div>
              {links[c.id] && (
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px' }}>
                  <code style={{ color: 'var(--text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{links[c.id]}</code>
                  <Button onClick={() => copy(links[c.id], c.id)} style={{ padding: '8px 14px' }}>{copied === c.id ? t.common.copied : t.common.copy}</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t.channels.create} kicker={t.channels.title}>
        <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.4)', color: '#fca5a5', borderRadius: 12, padding: '10px 12px', fontSize: 13.5 }}>{error}</div>}
          <Field label={t.channels.module}>
            <Select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)}>
              {modules.map((m) => <option key={m} value={m}>{t.modules[m as keyof typeof t.modules] ?? m}</option>)}
            </Select>
          </Field>
          <Field label={t.channels.name}>
            <Input required value={name} onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)) }} placeholder={t.channels.egName} autoFocus />
          </Field>
          <Field label={t.channels.slug}>
            <Input required value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder={t.channels.egSlug} />
          </Field>
          <Button type="submit" loading={busy}>{t.common.create}</Button>
        </form>
      </Modal>
    </div>
  )
}
