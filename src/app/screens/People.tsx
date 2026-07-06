import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { localizeRole } from '../../lib/systemNames'
import type { MemberRow, RoleOut } from '../../lib/types'
import { useCaps } from '../capabilities'
import { useT } from '../strings'
import { Avatar, Button, Card, Chip, Field, Input, Modal, PageHeader, Select, Skeleton } from '../ui'
import type { ApiError } from '../../lib/types'

const STATUS_TONE = { active: 'green', invited: 'accent', suspended: 'muted' } as const

export default function People() {
  const { ctx, can, reload } = useCaps()
  const t = useT()
  const [members, setMembers] = useState<MemberRow[] | null>(null)
  const [roles, setRoles] = useState<RoleOut[]>([])
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [roleId, setRoleId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const canManage = can('admin.manage_users')

  const copyText = (text: string, id: string) => {
    void navigator.clipboard?.writeText(text)
    setCopiedId(id); setTimeout(() => setCopiedId(null), 1600)
  }
  async function copyMemberInvite(id: string) {
    try {
      const r = await api.get<{ invite_url: string }>(`/memberships/${id}/invite-link`)
      copyText(r.invite_url, id)
    } catch { /* sem convite pendente */ }
  }
  const closeInvite = () => { setOpen(false); setInviteLink(null); setError(null) }

  const load = () => api.get<MemberRow[]>('/memberships').then(setMembers).catch(() => setMembers([]))
  useEffect(() => {
    void load()
    api.get<RoleOut[]>('/roles').then(setRoles).catch(() => {})
  }, [])

  async function invite(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<{ invite_url?: string | null }>('/memberships/invite', {
        email: email.trim(),
        full_name: name.trim() || null,
        role_id: roleId || null,
        scope: { channels: [], areas: [], committees: [] },
      })
      setEmail(''); setName(''); setRoleId('')
      await load()
      await reload() // atualiza contador de vagas
      // Sem e-mail configurado: mostra o link p/ o admin copiar e enviar.
      setInviteLink(res.invite_url ?? '')
    } catch (err) {
      setError((err as ApiError).detail ?? 'Falha ao convidar.')
    } finally {
      setBusy(false)
    }
  }

  const statusLabel = (s: string) => (t.people as Record<string, string>)[s] ?? s

  return (
    <div className="app-screen">
      <PageHeader
        title={t.people.title}
        subtitle={t.people.subtitle}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Chip tone="muted">{ctx.usage.active_users}/{ctx.usage.max_users} {t.people.seats}</Chip>
            {canManage && <Button leftIcon="plus" onClick={() => setOpen(true)}>{t.people.invite}</Button>}
          </div>
        }
      />

      <Card padding={10}>
        {members === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} h={48} r={12} />)}
          </div>
        ) : (
          members.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 14, flexWrap: 'wrap', rowGap: 10 }} className="app-card--hover">
              <Avatar name={m.full_name ?? m.invited_email} />
              <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                <div style={{ color: 'var(--heading)', fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.full_name ?? m.invited_email}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.email ?? m.invited_email}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {m.roles.map((r) => <Chip key={r.id} tone="blue">{localizeRole(r.role_name)}</Chip>)}
                <Chip tone={STATUS_TONE[m.status as keyof typeof STATUS_TONE] ?? 'muted'}>{statusLabel(m.status)}</Chip>
                {canManage && m.status === 'invited' && (
                  <button onClick={() => void copyMemberInvite(m.id)} className="app-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '5px 12px', borderRadius: 100, fontSize: 12.5, fontWeight: 700, background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                    {copiedId === m.id ? t.common.copied : t.people.copyInvite}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </Card>

      <Modal open={open} onClose={closeInvite} title={t.people.inviteTitle} kicker={t.people.title} maxWidth={440}>
        {inviteLink === null ? (
          <form onSubmit={invite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div style={{ background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.4)', color: '#fca5a5', borderRadius: 12, padding: '10px 12px', fontSize: 13.5 }}>{error}</div>}
            <Field label={t.login.email}>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.people.emailPh} autoFocus />
            </Field>
            <Field label={t.people.namePh}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.people.namePh} />
            </Field>
            <Field label={t.people.role}>
              <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                <option value="">{t.people.noRole}</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{localizeRole(r.name)}</option>)}
              </Select>
            </Field>
            <Button type="submit" loading={busy} style={{ marginTop: 4 }}>{busy ? t.people.sending : t.people.send}</Button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'rgba(43,182,115,.12)', border: '1px solid rgba(43,182,115,.4)', color: 'var(--green,#2bb673)', borderRadius: 12, padding: '11px 14px', fontSize: 13.5, fontWeight: 700 }}>✓ {t.people.inviteCreated}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.5 }}>{t.people.inviteLinkHint}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px', fontSize: 12.5, color: 'var(--text)' }}>{inviteLink}</code>
              <Button variant="ghost" onClick={() => copyText(inviteLink, 'modal')}>{copiedId === 'modal' ? t.common.copied : t.common.copy}</Button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" onClick={() => setInviteLink(null)} style={{ flex: 1 }}>{t.people.inviteAnother}</Button>
              <Button onClick={closeInvite} style={{ flex: 1 }}>{t.common.close}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
