import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { localizeRole } from '../../lib/systemNames'
import type { MemberRow, ModulePermissions, PermissionCatalog, RoleOut } from '../../lib/types'
import { useCaps } from '../capabilities'
import { useT } from '../strings'
import { useTranslation } from '../../i18n/LanguageProvider'
import type { Lang } from '../../i18n/translations'
import { Avatar, Button, Card, Chip, Field, Input, Modal, PageHeader, Select, Skeleton } from '../ui'
import type { ApiError } from '../../lib/types'

const STATUS_TONE = { active: 'green', invited: 'accent', suspended: 'muted' } as const

// ── Overrides de permissão por membro ──────────────────────────────────────
type OverrideState = 'revoke' | 'default' | 'grant'
interface PermOverride { code: string; grant: boolean }
interface PermSnapshot { effective: string[]; overrides: PermOverride[] }

// i18n LOCAL (PT · EN · ES) — evita tocar em strings.ts compartilhado.
const PERM_I18N: Record<Lang, {
  manage: string; title: string; intro: string
  revoke: string; roleDefault: string; grant: string
  effective: string; inactive: string; fromRole: string
  ovGrant: string; ovRevoke: string
  empty: string; loadErr: string; saveErr: string; close: string
}> = {
  pt: {
    manage: 'Permissões',
    title: 'Permissões individuais',
    intro: 'Ajuste as permissões deste membro além da função. “Padrão” usa o que a função concede; “Conceder” ou “Revogar” criam um override individual.',
    revoke: 'Revogar', roleDefault: 'Padrão', grant: 'Conceder',
    effective: 'Ativa', inactive: 'Inativa', fromRole: 'Vem da função',
    ovGrant: 'Concedida por override', ovRevoke: 'Revogada por override',
    empty: 'Nenhuma permissão disponível.',
    loadErr: 'Falha ao carregar permissões.', saveErr: 'Falha ao salvar. Tente novamente.',
    close: 'Fechar',
  },
  en: {
    manage: 'Permissions',
    title: 'Individual permissions',
    intro: 'Adjust this member’s permissions beyond their role. “Default” uses whatever the role grants; “Grant” or “Revoke” create an individual override.',
    revoke: 'Revoke', roleDefault: 'Default', grant: 'Grant',
    effective: 'Active', inactive: 'Inactive', fromRole: 'From role',
    ovGrant: 'Granted by override', ovRevoke: 'Revoked by override',
    empty: 'No permissions available.',
    loadErr: 'Failed to load permissions.', saveErr: 'Failed to save. Please try again.',
    close: 'Close',
  },
  es: {
    manage: 'Permisos',
    title: 'Permisos individuales',
    intro: 'Ajusta los permisos de este miembro más allá de su rol. “Predeterminado” usa lo que concede el rol; “Conceder” o “Revocar” crean un override individual.',
    revoke: 'Revocar', roleDefault: 'Predeterminado', grant: 'Conceder',
    effective: 'Activa', inactive: 'Inactiva', fromRole: 'Del rol',
    ovGrant: 'Concedida por override', ovRevoke: 'Revocada por override',
    empty: 'No hay permisos disponibles.',
    loadErr: 'Error al cargar permisos.', saveErr: 'Error al guardar. Inténtalo de nuevo.',
    close: 'Cerrar',
  },
}

// Controle segmentado de 3 estados: [Revogar | Padrão (função) | Conceder].
function PermSeg({ value, disabled, labels, onChange }: {
  value: OverrideState
  disabled: boolean
  labels: { revoke: string; roleDefault: string; grant: string }
  onChange: (s: OverrideState) => void
}) {
  const opts: { key: OverrideState; label: string; bg: string; fg: string }[] = [
    { key: 'revoke', label: labels.revoke, bg: 'rgba(225,29,72,.16)', fg: '#e11d48' },
    { key: 'default', label: labels.roleDefault, bg: 'var(--surface)', fg: 'var(--heading)' },
    { key: 'grant', label: labels.grant, bg: 'rgba(22,163,74,.16)', fg: '#16a34a' },
  ]
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 2, opacity: disabled ? 0.55 : 1 }}>
      {opts.map((o) => {
        const active = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.key)}
            className="app-btn"
            style={{ padding: '5px 11px', borderRadius: 8, border: 'none', cursor: disabled ? 'default' : 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', background: active ? o.bg : 'transparent', color: active ? o.fg : 'var(--text-muted)', boxShadow: active ? '0 1px 2px rgba(0,0,0,.06)' : 'none', transition: 'background .15s, color .15s' }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Modal de gestão dos overrides de um membro (catálogo agrupado por módulo).
function PermissionsModal({ member, catalog, onClose }: {
  member: MemberRow | null
  catalog: ModulePermissions[]
  onClose: () => void
}) {
  const t = useT()
  const { lang } = useTranslation()
  const L = PERM_I18N[lang] ?? PERM_I18N.pt
  const [snap, setSnap] = useState<PermSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!member) { setSnap(null); setError(null); return }
    setLoading(true); setError(null)
    api.get<PermSnapshot>(`/memberships/${member.id}/permissions`)
      .then(setSnap)
      .catch(() => setError(L.loadErr))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member])

  const stateOf = (code: string): OverrideState => {
    const ov = snap?.overrides.find((o) => o.code === code)
    if (!ov) return 'default'
    return ov.grant ? 'grant' : 'revoke'
  }
  const isEffective = (code: string) => !!snap?.effective.includes(code)

  async function apply(code: string, next: OverrideState) {
    if (!member || busyCode || stateOf(code) === next) return
    setBusyCode(code); setError(null)
    try {
      const res = next === 'default'
        ? await api.delete<PermSnapshot>(`/memberships/${member.id}/permissions/${code}`)
        : await api.put<PermSnapshot>(`/memberships/${member.id}/permissions/${code}`, { grant: next === 'grant' })
      setSnap(res)
    } catch {
      setError(L.saveErr)
    } finally {
      setBusyCode(null)
    }
  }

  const memberName = member ? (member.full_name ?? member.email ?? member.invited_email) : ''

  return (
    <Modal open={!!member} onClose={onClose} title={L.title} kicker={memberName} maxWidth={720}>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>{L.intro}</p>
      {error && <div style={{ background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.4)', color: '#fca5a5', borderRadius: 12, padding: '10px 12px', fontSize: 13.5, marginBottom: 16 }}>{error}</div>}

      {loading || snap === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} h={64} r={14} />)}
        </div>
      ) : catalog.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13.5, padding: '8px 2px' }}>{L.empty}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {catalog.map((mod) => (
            <div key={mod.module} style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--surface-2)' }}>
                <span style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 14.5 }}>{t.modules[mod.module as keyof typeof t.modules] ?? mod.module}</span>
              </div>
              <div>
                {mod.permissions.map((p) => {
                  const st = stateOf(p.code)
                  const eff = isEffective(p.code)
                  const overridden = st !== 'default'
                  return (
                    <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', rowGap: 8 }}>
                      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                        <div style={{ color: 'var(--heading)', fontWeight: 600, fontSize: 14 }}>{p.label}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{p.description}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <Chip tone={eff ? 'green' : 'muted'}>{eff ? L.effective : L.inactive}</Chip>
                          {overridden
                            ? <Chip tone={st === 'grant' ? 'accent' : 'muted'}>{st === 'grant' ? L.ovGrant : L.ovRevoke}</Chip>
                            : eff ? <Chip tone="blue">{L.fromRole}</Chip> : null}
                        </div>
                      </div>
                      <PermSeg
                        value={st}
                        disabled={busyCode === p.code}
                        labels={{ revoke: L.revoke, roleDefault: L.roleDefault, grant: L.grant }}
                        onChange={(s) => void apply(p.code, s)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <Button variant="ghost" onClick={onClose}>{L.close}</Button>
      </div>
    </Modal>
  )
}

export default function People() {
  const { ctx, can, reload } = useCaps()
  const t = useT()
  const { lang } = useTranslation()
  const permL = PERM_I18N[lang] ?? PERM_I18N.pt
  const [members, setMembers] = useState<MemberRow[] | null>(null)
  const [roles, setRoles] = useState<RoleOut[]>([])
  const [permCatalog, setPermCatalog] = useState<ModulePermissions[]>([])
  const [permMember, setPermMember] = useState<MemberRow | null>(null)
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
  // Reenvia o convite: código NOVO por e-mail e prazo renovado. O link segue o
  // mesmo, então quem já o repassou por outro canal não precisa repassar de novo.
  const [resendId, setResendId] = useState<string | null>(null)
  const [resendMsg, setResendMsg] = useState<string | null>(null)
  async function resendInvite(id: string) {
    setResendId(id); setResendMsg(null)
    try {
      await api.post(`/memberships/${id}/resend-invite`, {})
      setResendMsg(t.people.resendOk)
    } catch (e) {
      // O 429 do cooldown já vem com o texto pronto ("Aguarde Ns…").
      setResendMsg((e as ApiError).detail ?? t.people.resendFail)
    } finally {
      setResendId(null)
      setTimeout(() => setResendMsg(null), 4000)
    }
  }
  const closeInvite = () => { setOpen(false); setInviteLink(null); setError(null) }

  const load = () => api.get<MemberRow[]>('/memberships').then(setMembers).catch(() => setMembers([]))
  useEffect(() => {
    void load()
    api.get<RoleOut[]>('/roles').then(setRoles).catch(() => {})
    api.get<PermissionCatalog>('/permissions').then((c) => setPermCatalog(c.modules)).catch(() => {})
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

  const resendBanner = resendMsg ? (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, color: 'var(--text)', marginBottom: 14 }}>{resendMsg}</div>
  ) : null

  return (
    <div className="app-screen">
      {resendBanner}
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
                {canManage && m.status === 'invited' && (
                  <button onClick={() => void resendInvite(m.id)} disabled={resendId === m.id} className="app-btn" title={t.people.resendHint} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: resendId === m.id ? 'default' : 'pointer', padding: '5px 12px', borderRadius: 100, fontSize: 12.5, fontWeight: 700, background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', opacity: resendId === m.id ? 0.6 : 1 }}>
                    {resendId === m.id ? t.people.resending : t.people.resend}
                  </button>
                )}
                {canManage && (
                  <button onClick={() => setPermMember(m)} className="app-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '5px 12px', borderRadius: 100, fontSize: 12.5, fontWeight: 700, background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                    {permL.manage}
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
            {error && <div style={{ background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.4)', color: '#fca5a5', borderRadius: 12, padding: '10px 12px', fontSize: 13.5, lineHeight: 1.5 }}>{error}</div>}
            <Field label={t.login.email}>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.people.emailPh} autoFocus />
            </Field>
            {/* A regra ANTES do erro. Descobrir que o endereço já existe só
                depois de preencher nome e papel e apertar enviar é aprender a
                regra do jeito caro — e a mensagem de recusa, sozinha, chega
                tarde demais para evitar a tentativa. */}
            <p style={{ marginTop: -6, color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.5 }}>
              {t.people.oneEmailRule}
            </p>
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

      <PermissionsModal member={permMember} catalog={permCatalog} onClose={() => setPermMember(null)} />
    </div>
  )
}
