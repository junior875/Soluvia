// Role Builder — editor granular de permissões (Seção 5 da spec).
// Identidade (nome/cor/ícone) + template base + checkboxes por módulo com
// marcar/desmarcar todos e contador X/Y + preview ao vivo. Cria e edita.

import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { desligarComDependentes, ligarComDeps } from '../lib/permDeps'
import { localizeRole } from '../lib/systemNames'
import type { ApiError, ModulePermissions, RoleOut } from '../lib/types'
import { useT } from './strings'
import { Button, Field, Input, Modal, SectionLabel, Select } from './ui'
import { Icon, type IconName } from './icons'

const COLORS = ['#4f46e5', '#16a34a', '#0ea5e9', '#9333ea', '#f2921e', '#e11d48', '#0e2c46', '#5d6b7a']
const ICONS: IconName[] = ['roles', 'people', 'channels', 'billing', 'audit', 'spark', 'overview', 'lock']

export function iconFor(name: string): IconName {
  return (ICONS as string[]).includes(name) ? (name as IconName) : 'roles'
}

interface Props {
  open: boolean
  onClose: () => void
  catalog: ModulePermissions[]
  templates: RoleOut[]
  role?: RoleOut | null
  onSaved: () => void
}

export default function RoleBuilder({ open, onClose, catalog, templates, role, onSaved }: Props) {
  const t = useT()
  const editing = !!role && !role.is_system
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [icon, setIcon] = useState<IconName>('roles')
  const [fromId, setFromId] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // (Re)inicializa quando abre / muda o papel em edição.
  useEffect(() => {
    if (!open) return
    setError(null)
    setFromId('')
    if (role) {
      setName(role.name)
      setColor(role.color)
      setIcon(iconFor(role.icon))
      setSelected(new Set(role.permissions))
    } else {
      setName('')
      setColor(COLORS[0])
      setIcon('roles')
      setSelected(new Set())
    }
  }, [open, role])

  // Aviso curto de "entrou/saiu de carona" — a regra "agir exige ler"
  // acontecendo na frente da pessoa, em vez de permissões mudando sozinhas.
  const [depAviso, setDepAviso] = useState<string | null>(null)

  const toggle = (code: string) =>
    setSelected((prev) => {
      // Ligar puxa as dependências; desligar carrega os dependentes. O
      // servidor fecha o conjunto de qualquer jeito (a garantia é lá) — aqui
      // é para a pessoa VER a regra.
      const ligando = !prev.has(code)
      const { proximo, carona } = ligando
        ? ligarComDeps(prev, code)
        : desligarComDependentes(prev, code)
      if (carona.length > 0) {
        const nomes = carona.map((c) => rotuloDe(c)).join(', ')
        setDepAviso(ligando ? t.roles.depOn(nomes) : t.roles.depOff(nomes))
        window.setTimeout(() => setDepAviso(null), 4200)
      }
      return proximo
    })

  /** Rótulo humano de um código, direto do catálogo carregado. */
  const rotuloDe = (code: string): string => {
    for (const m of catalog) {
      const p = m.permissions.find((x) => x.code === code)
      if (p) return p.label
    }
    return code
  }

  const applyTemplate = (id: string) => {
    setFromId(id)
    const tpl = templates.find((r) => r.id === id)
    setSelected(new Set(tpl?.permissions ?? []))
  }

  const toggleModule = (mod: ModulePermissions) => {
    const codes = mod.permissions.map((p) => p.code)
    const allOn = codes.every((c) => selected.has(c))
    setSelected((prev) => {
      const next = new Set(prev)
      codes.forEach((c) => (allOn ? next.delete(c) : next.add(c)))
      return next
    })
  }

  const modulesWithAccess = useMemo(
    () => catalog.filter((m) => m.permissions.some((p) => selected.has(p.code))).map((m) => m.module),
    [catalog, selected],
  )

  async function save() {
    if (!name.trim()) return setError(t.roles.name)
    setBusy(true)
    setError(null)
    const body = { name: name.trim(), color, icon, permissions: [...selected] }
    try {
      if (editing && role) await api.patch(`/roles/${role.id}`, body)
      else await api.post('/roles', { ...body, base_template: templates.find((r) => r.id === fromId)?.base_template ?? null })
      onSaved()
      onClose()
    } catch (err) {
      setError((err as ApiError).detail ?? 'Falha ao salvar.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!role || !confirm(t.roles.confirmRemove)) return
    setBusy(true)
    setError(null)
    try {
      await api.delete(`/roles/${role.id}`)
      onSaved()
      onClose()
    } catch (err) {
      setError((err as ApiError).detail ?? 'Falha ao remover.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? t.roles.builderEdit : t.roles.builderNew} kicker={t.roles.title} maxWidth={760}>
      {error && <div style={{ background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.4)', color: '#fca5a5', borderRadius: 12, padding: '10px 12px', fontSize: 13.5, marginBottom: 16 }}>{error}</div>}

      {/* Preview ao vivo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', marginBottom: 20 }}>
        <span style={{ width: 44, height: 44, borderRadius: 13, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 16 }}>{name || t.roles.name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{selected.size} {t.roles.activeCount}</div>
          {/* A regra "agir exige ler", acontecendo na frente da pessoa. */}
          {depAviso && (
            <div style={{ marginTop: 8, border: '1px solid var(--accent-border)', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 10, padding: '7px 11px', fontSize: 12.5, fontWeight: 700 }}>
              {depAviso}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
          {modulesWithAccess.map((m) => (
            <span key={m} style={{ fontSize: 11, background: 'var(--blue-soft)', color: 'var(--blue)', borderRadius: 100, padding: '3px 9px', fontWeight: 600 }}>
              {t.modules[m as keyof typeof t.modules] ?? m}
            </span>
          ))}
        </div>
      </div>

      {/* Identidade */}
      <SectionLabel>{t.roles.identity}</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }} className="rb-id">
        <Field label={t.roles.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.roles.egRole} autoFocus />
        </Field>
        {!editing && (
          <Field label={t.roles.from}>
            <Select value={fromId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">{t.roles.blank}</option>
              {templates.map((r) => <option key={r.id} value={r.id}>{localizeRole(r.name)} ({r.permissions.length})</option>)}
            </Select>
          </Field>
        )}
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>{t.roles.color}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} className="app-btn" style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--heading)' : '2px solid var(--border)', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>{t.roles.icon}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ICONS.map((ic) => (
              <button key={ic} type="button" onClick={() => setIcon(ic)} aria-label={ic} className="app-btn" style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: icon === ic ? 'var(--accent-soft)' : 'var(--surface-2)', color: icon === ic ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${icon === ic ? 'var(--accent-border)' : 'var(--border)'}`, cursor: 'pointer' }}>
                <Icon name={ic} size={17} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Permissões por módulo */}
      <SectionLabel>{t.roles.modulesH}</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {catalog.map((mod) => {
          const codes = mod.permissions.map((p) => p.code)
          const granted = codes.filter((c) => selected.has(c)).length
          const allOn = granted === codes.length
          return (
            <div key={mod.module} style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--surface-2)' }}>
                <span style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 14.5 }}>{t.modules[mod.module as keyof typeof t.modules] ?? mod.module}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 100, padding: '2px 9px', fontWeight: 600 }}>{granted}/{codes.length}</span>
                <button type="button" onClick={() => toggleModule(mod)} className="app-btn" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {allOn ? t.roles.none : t.roles.all}
                </button>
              </div>
              <div>
                {mod.permissions.map((p) => {
                  const on = selected.has(p.code)
                  return (
                    <button key={p.code} type="button" onClick={() => toggle(p.code)} className="app-btn" style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 14px', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ width: 20, height: 20, minWidth: 20, marginTop: 1, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--accent)' : 'transparent', border: `1.8px solid ${on ? 'var(--accent)' : 'var(--border)'}`, color: '#fff', transition: 'background .15s, border-color .15s' }}>
                        {on && <Icon name="check" size={13} strokeWidth={2.6} />}
                      </span>
                      <span>
                        <span style={{ display: 'block', color: 'var(--heading)', fontWeight: 600, fontSize: 14 }}>{p.label}</span>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5 }}>{p.description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 22 }}>
        {editing && (
          <Button variant="ghost" onClick={() => void remove()} style={{ color: '#e11d48' }}>{t.roles.remove}</Button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>{t.common.cancel}</Button>
          <Button loading={busy} onClick={() => void save()}>{busy ? t.roles.saving : t.roles.save}</Button>
        </div>
      </div>
    </Modal>
  )
}
