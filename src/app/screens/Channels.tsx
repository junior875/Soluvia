import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import type { ApiError, ChannelOut } from '../../lib/types'
import { useCaps } from '../capabilities'
import { useT } from '../strings'
import { Button, Card, Chip, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton } from '../ui'
import { DuoIcon, type IconName } from '../icons'

/** Ícone duotone por MÓDULO do canal — desenhados para os dois temas:
 *  denúncia é o escudo, SAC é o fone de atendimento. */
const ICONE_DO_MODULO: Record<string, IconName> = { etica: 'cases', sac: 'headset' }

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
  // Só denúncia e SAC viram canal: são os que recebem relato de fora. Os
  // outros módulos do plano são telas de trabalho interno, e apareciam aqui
  // oferecendo um canal que nunca receberia nada.
  const MODULOS_DE_CANAL = ['etica', 'sac']
  const modules = ctx.enabled_modules.filter((m) => MODULOS_DE_CANAL.includes(m))

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
      await api.post('/channels', { module: moduleCode, name: name.trim(), config: {} })
      setOpen(false); setName(''); setSlug('')
      await load()
    } catch (err) {
      setError((err as ApiError).detail ?? 'Falha ao criar canal.')
    } finally { setBusy(false) }
  }

  // ── Editar (renomear) ──────────────────────────────────────────
  const [editando, setEditando] = useState<ChannelOut | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [erroEdit, setErroEdit] = useState<string | null>(null)

  function abrirEdicao(c: ChannelOut) {
    setEditando(c); setNovoNome(c.name); setErroEdit(null)
  }

  async function salvarEdicao(e: FormEvent) {
    e.preventDefault()
    if (!editando) return
    setBusy(true); setErroEdit(null)
    try {
      await api.patch(`/channels/${editando.id}`, { name: novoNome.trim() })
      setEditando(null)
      await load()
    } catch (err) {
      setErroEdit((err as ApiError).detail ?? t.channels.editFail)
    } finally { setBusy(false) }
  }

  // ── Arquivar / reativar (o "excluir" daqui é SOFT de propósito) ─
  // Apagar um canal de verdade levaria junto os CASOS dele — e relato de
  // denúncia é prova de compliance, não cache. Arquivado: some do formulário
  // público e para de receber; o histórico continua legível.
  const [arquivando, setArquivando] = useState<ChannelOut | null>(null)

  async function alternarAtivo(c: ChannelOut) {
    setBusy(true)
    try {
      await api.patch(`/channels/${c.id}`, { is_active: !c.is_active })
      setArquivando(null)
      await load()
    } catch (err) {
      setError((err as ApiError).detail ?? t.channels.editFail)
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
            <Card key={c.id} hover style={c.is_active ? undefined : { opacity: 0.62 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* Ícone do MÓDULO, duotone: escudo = denúncia, fone = SAC. */}
                <span style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DuoIcon name={ICONE_DO_MODULO[c.module] ?? 'channels'} size={22} />
                </span>
                <div>
                  <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 16 }}>{c.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>/{c.slug}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Chip tone="blue">{t.modules[c.module as keyof typeof t.modules] ?? c.module}</Chip>
                  <Chip tone={c.is_active ? 'green' : 'muted'}>{c.is_active ? t.channels.active : t.channels.inactive}</Chip>
                  {c.is_active && (
                    <Button variant="ghost" leftIcon="copy" onClick={() => void showLink(c.id)}>{t.channels.link}</Button>
                  )}
                  {canManage && (
                    <>
                      <Button variant="ghost" onClick={() => abrirEdicao(c)}>{t.common.edit}</Button>
                      {c.is_active ? (
                        <Button variant="outline" leftIcon="trash" onClick={() => setArquivando(c)}>
                          {t.channels.archive}
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={() => void alternarAtivo(c)} loading={busy}>
                          {t.channels.reactivate}
                        </Button>
                      )}
                    </>
                  )}
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
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t.channels.egName} autoFocus />
          </Field>
          <Button type="submit" loading={busy}>{t.common.create}</Button>
        </form>
      </Modal>

      {/* EDITAR — renomear (a trava de nome duplicado é do servidor). */}
      <Modal open={editando !== null} onClose={() => setEditando(null)} title={t.channels.editTitle} kicker={t.channels.title}>
        <form onSubmit={salvarEdicao} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {erroEdit && <div style={{ background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.4)', color: '#fca5a5', borderRadius: 12, padding: '10px 12px', fontSize: 13.5 }}>{erroEdit}</div>}
          <Field label={t.channels.name}>
            <Input required value={novoNome} onChange={(e) => setNovoNome(e.target.value)} autoFocus />
          </Field>
          <Button type="submit" loading={busy}>{t.common.save}</Button>
        </form>
      </Modal>

      {/* ARQUIVAR — o "excluir" daqui, de propósito reversível: apagar de
          verdade levaria os casos junto, e relato é prova, não cache. */}
      <Modal open={arquivando !== null} onClose={() => setArquivando(null)} title={t.channels.archiveTitle} kicker={arquivando?.name ?? ''}>
        <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
          {t.channels.archiveBody}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setArquivando(null)}>{t.common.cancel}</Button>
          <Button leftIcon="trash" loading={busy} onClick={() => arquivando && void alternarAtivo(arquivando)}>
            {t.channels.archive}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
