import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { localizeRole } from '../../lib/systemNames'
import type { ModulePermissions, PermissionCatalog, RoleOut } from '../../lib/types'
import { useCaps } from '../capabilities'
import { useT } from '../strings'
import { Button, Card, Chip, PageHeader, Skeleton } from '../ui'
import { Icon } from '../icons'
import RoleBuilder, { iconFor } from '../RoleBuilder'

export default function Roles() {
  const { can, reload } = useCaps()
  const t = useT()
  const [roles, setRoles] = useState<RoleOut[] | null>(null)
  const [catalog, setCatalog] = useState<ModulePermissions[]>([])
  const [open, setOpen] = useState(false)
  const [editRole, setEditRole] = useState<RoleOut | null>(null)
  const canManage = can('admin.manage_roles')

  const loadRoles = () => api.get<RoleOut[]>('/roles').then(setRoles).catch(() => setRoles([]))
  useEffect(() => {
    void loadRoles()
    api.get<PermissionCatalog>('/permissions').then((c) => setCatalog(c.modules)).catch(() => {})
  }, [])

  const templates = (roles ?? []).filter((r) => r.is_system)

  const openCreate = () => { setEditRole(null); setOpen(true) }
  const openEdit = (r: RoleOut) => { if (!r.is_system && canManage) { setEditRole(r); setOpen(true) } }
  const onSaved = async () => { await loadRoles(); await reload() }

  return (
    <div className="app-screen">
      <PageHeader
        title={t.roles.title}
        subtitle={t.roles.subtitle}
        action={canManage && <Button leftIcon="plus" onClick={openCreate}>{t.roles.new}</Button>}
      />

      {roles === null ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} h={150} r={20} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {roles.map((r) => {
            const clickable = !r.is_system && canManage
            return (
              <Card key={r.id} hover={clickable} onClick={clickable ? () => openEdit(r) : undefined}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 12, background: r.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={iconFor(r.icon)} size={19} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 16 }}>{localizeRole(r.name)}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.permissions.length} {t.roles.permissions}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Chip tone={r.is_system ? 'muted' : 'accent'}>{r.is_system ? t.roles.system : t.roles.custom}</Chip>
                    {clickable && <Icon name="chevron" size={16} style={{ color: 'var(--text-muted)' }} />}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {r.module_summary.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                  ) : (
                    r.module_summary.map((m) => (
                      <Chip key={m.module} tone="blue">
                        {t.modules[m.module as keyof typeof t.modules] ?? m.module} {m.granted}/{m.total}
                      </Chip>
                    ))
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <RoleBuilder
        open={open}
        onClose={() => setOpen(false)}
        catalog={catalog}
        templates={templates}
        role={editRole}
        onSaved={onSaved}
      />
    </div>
  )
}
