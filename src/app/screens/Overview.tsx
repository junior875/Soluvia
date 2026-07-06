import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { localizeRole } from '../../lib/systemNames'
import { useCaps } from '../capabilities'
import { goScreen } from '../nav'
import { useT } from '../strings'
import { Button, Card, Chip, PageHeader, SectionLabel, StatCard } from '../ui'
import { Icon, type IconName } from '../icons'

// Módulos → tela de acesso direto + permissão que libera o card.
// `logo` (opcional): a marca do módulo aparece no lugar do ícone genérico.
const MODULE_CARDS: { module: string; screen: string; icon: IconName; perm: string; logo?: string }[] = [
  { module: 'etica', screen: 'cases', icon: 'cases', perm: 'etica.view_cases', logo: '/canal-denuncias-icon.png' },
  { module: 'assinatura', screen: 'signature', icon: 'signature', perm: 'assinatura.view' },
  { module: 'nr1', screen: 'nr1', icon: 'nr1', perm: 'nr1.view_aggregated' },
  { module: 'privacidade', screen: 'cases', icon: 'lock', perm: 'privacidade.view_requests' },
  { module: 'incidentes', screen: 'cases', icon: 'shield', perm: 'incidentes.view' },
]

interface AuditRow {
  id: string
  action: string
  actor_name: string | null
  resource_type: string
  created_at: string
}

const normAct = (a: string) =>
  a.startsWith('lgpd.request') ? 'lgpd.request' : a.startsWith('billing.webhook') ? 'billing.webhook' : a

export default function Overview() {
  const { ctx, can } = useCaps()
  const t = useT()
  const [recent, setRecent] = useState<AuditRow[] | null>(null)

  useEffect(() => {
    if (!can('admin.view_audit')) return
    api.get<AuditRow[]>('/audit?limit=6').then(setRecent).catch(() => setRecent([]))
  }, [can])

  const modules = ctx.enabled_modules.filter((m) => m !== 'admin')
  const isAdmin = can('admin.manage_users')
  const myModules = MODULE_CARDS.filter((m) => ctx.enabled_modules.includes(m.module) && can(m.perm))

  return (
    <div className="app-screen">
      <PageHeader
        title={`${t.overview.title} ${ctx.tenant_name}`}
        subtitle={isAdmin ? t.overview.welcome : t.overview.welcomeMember}
      />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="billing" label={t.overview.plan} value={ctx.usage.plan_name} />
        <StatCard
          icon="people"
          label={t.overview.users}
          value={`${ctx.usage.active_users}/${ctx.usage.max_users}`}
          sub={`${ctx.usage.seats_available} ${t.overview.seatsFree}`}
        />
        <StatCard icon="overview" label={t.overview.modules} value={modules.length} />
        <StatCard icon="roles" label={t.overview.yourRoles} value={ctx.roles.length} />
      </div>

      {/* Módulos — acesso direto */}
      {myModules.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>{t.overview.modulesTitle}</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
            {myModules.map((m) => {
              const info = (t.overview.mod as Record<string, { name: string; desc: string }>)[m.module]
              return (
                <button
                  key={m.module}
                  onClick={() => goScreen(m.screen)}
                  className="app-card--hover"
                  style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, fontFamily: 'inherit', width: '100%' }}
                >
                  <span style={{ width: 46, height: 46, minWidth: 46, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {m.logo ? (
                      <img src={m.logo} alt="" className="module-logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                    ) : (
                      <Icon name={m.icon} size={23} />
                    )}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 15.5 }}>{info?.name ?? m.module}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.45 }}>{info?.desc ?? ''}</div>
                  </div>
                  <Icon name="chevron" size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }} className="ov-grid">
        {/* Atividade recente */}
        <Card>
          <SectionLabel>{t.overview.recent}</SectionLabel>
          {!can('admin.view_audit') ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t.overview.welcomeMember}</p>
          ) : recent === null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="app-skeleton" style={{ height: 18, borderRadius: 8 }} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t.common.empty}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recent.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--heading)', fontSize: 14, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <b style={{ fontWeight: 800 }}>{r.actor_name || t.audit.system}</b> {(t.audit.act as Record<string, string>)[normAct(r.action)] || r.action}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12.5, marginLeft: 'auto', flexShrink: 0 }}>{new Date(r.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Lateral: papéis + ações rápidas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionLabel>{t.overview.yourRoles}</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ctx.roles.map((r) => (
                <Chip key={r.name} dot={r.color}>{localizeRole(r.name)}</Chip>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {modules.map((m) => (
                <Chip key={m} tone="blue">{t.modules[m as keyof typeof t.modules] ?? m}</Chip>
              ))}
            </div>
          </Card>

          <Card>
            <SectionLabel>{t.overview.quick}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {can('admin.manage_users') && (
                <QuickAction icon="people" label={t.overview.quickInvite} onClick={() => goScreen('people')} />
              )}
              {can('admin.manage_roles') && (
                <>
                  <QuickAction icon="channels" label={t.overview.quickChannel} onClick={() => goScreen('channels')} />
                  <QuickAction icon="roles" label={t.overview.quickRoles} onClick={() => goScreen('roles')} />
                </>
              )}
              {!can('admin.manage_users') && !can('admin.manage_roles') && (
                <Button variant="ghost" onClick={() => goScreen('cases')}>{t.nav.cases}</Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon, label, onClick }: { icon: 'people' | 'channels' | 'roles'; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="app-nav-item" style={{ justifyContent: 'space-between' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <Icon name={icon} size={18} />
        {label}
      </span>
      <Icon name="chevron" size={16} />
    </button>
  )
}
