// Construtor de Fluxo: monta a CADEIA que um relato segue depois de enviado.
// As etapas 1/2/4/5 são trilhos fixos de compliance (Recebido → Triagem →
// … → Resposta → Encerrado). A etapa 3 (Investigação) é configurável: uma
// sequência de sub-etapas, cada uma com operador (papel), observadores, SLA e
// uma condição opcional (ex.: só entra se a gravidade for ≥ Alta).
// Salva em PUT /channels/{id}/flow. Textos triplo idioma via t.flow.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../lib/api'
import { localizeRole } from '../../lib/systemNames'
import type { ApiError, ChannelOut, FlowOut, FlowStageIn, MemberRow, RoleOut } from '../../lib/types'
import { useCaps } from '../capabilities'
import { useT } from '../strings'
import { Button, Card, EmptyState, Field, Input, PageHeader, SectionLabel, Select, Skeleton } from '../ui'
import { Icon } from '../icons'

type Draft = FlowStageIn & { key: string }
const SEVS = ['low', 'medium', 'high', 'critical'] as const
const uid = () => Math.random().toString(36).slice(2, 9)

export default function FlowBuilder() {
  const { can } = useCaps()
  const t = useT()
  const canEdit = can('etica.build_flow')

  const [channels, setChannels] = useState<ChannelOut[] | null>(null)
  const [roles, setRoles] = useState<RoleOut[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [channelId, setChannelId] = useState<string>('')
  const [flowName, setFlowName] = useState('Investigação')
  const [mode, setMode] = useState<'sequential' | 'parallel'>('sequential')
  const [closerMembershipId, setCloserMembershipId] = useState<string | null>(null)
  const [closerRoleId, setCloserRoleId] = useState<string | null>(null)
  const [closerRequireSignature, setCloserRequireSignature] = useState(false)
  const [stages, setStages] = useState<Draft[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600) }

  // Só canais do módulo de Ética têm fluxo de investigação.
  const ethicsChannels = useMemo(() => (channels ?? []).filter((c) => c.module === 'etica'), [channels])
  const roleName = (id: string | null) => roles.find((r) => r.id === id)?.name ?? '—'
  const sevLabel = (s: string) => (t.flow.sev as Record<string, string>)[s] ?? s

  useEffect(() => {
    void api.get<ChannelOut[]>('/channels').then(setChannels).catch(() => setChannels([]))
    void api.get<RoleOut[]>('/roles').then(setRoles).catch(() => {})
    void api.get<MemberRow[]>('/memberships').then((ms) => setMembers(ms.filter((m) => m.status === 'active'))).catch(() => {})
  }, [])

  useEffect(() => {
    if (!channelId && ethicsChannels.length) setChannelId(ethicsChannels[0].id)
  }, [ethicsChannels, channelId])

  // Carrega o fluxo do canal (404 = ainda não configurado → vazio).
  useEffect(() => {
    if (!channelId) return
    setStages(null)
    api.get<FlowOut>(`/channels/${channelId}/flow`)
      .then((f) => {
        setFlowName(f.name || 'Investigação')
        setMode(f.mode === 'parallel' ? 'parallel' : 'sequential')
        setCloserMembershipId(f.closer_membership_id ?? null)
        setCloserRoleId(f.closer_role_id ?? null)
        setCloserRequireSignature(!!f.closer_require_signature)
        setStages(f.stages.map((s) => ({
          key: uid(), name: s.name, operator_role_id: s.operator_role_id,
          operator_membership_id: s.operator_membership_id ?? null,
          parecer_config: s.parecer_config ?? {},
          require_signature: !!s.require_signature,
          watcher_role_ids: s.watcher_role_ids ?? [], sla_days: s.sla_days,
          is_conditional: s.is_conditional, condition: s.condition,
        })))
      })
      .catch(() => { setFlowName('Investigação'); setMode('sequential'); setCloserMembershipId(null); setCloserRoleId(null); setCloserRequireSignature(false); setStages([]) })
  }, [channelId])

  const patch = (key: string, p: Partial<Draft>) =>
    setStages((s) => (s ?? []).map((x) => (x.key === key ? { ...x, ...p } : x)))
  const addStage = () => setStages((s) => [...(s ?? []), {
    key: uid(), name: '', operator_role_id: null, operator_membership_id: null, parecer_config: {},
    require_signature: false, watcher_role_ids: [], sla_days: 5, is_conditional: false, condition: null,
  }])
  const toggleCfg = (key: string, field: 'decision' | 'rating' | 'urgency') => setStages((s) => (s ?? []).map((x) => {
    if (x.key !== key) return x
    const cfg = { ...(x.parecer_config ?? {}) }
    cfg[field] = !cfg[field]
    return { ...x, parecer_config: cfg }
  }))
  const remove = (key: string) => setStages((s) => (s ?? []).filter((x) => x.key !== key))
  const move = (i: number, dir: -1 | 1) => setStages((s) => {
    const a = [...(s ?? [])]; const j = i + dir
    if (j < 0 || j >= a.length) return a
    ;[a[i], a[j]] = [a[j], a[i]]; return a
  })
  const toggleWatcher = (key: string, rid: string) => setStages((s) => (s ?? []).map((x) => {
    if (x.key !== key) return x
    const has = x.watcher_role_ids.includes(rid)
    return { ...x, watcher_role_ids: has ? x.watcher_role_ids.filter((r) => r !== rid) : [...x.watcher_role_ids, rid] }
  }))

  async function save() {
    if (!channelId || !stages) return
    setBusy(true)
    try {
      const payload = {
        name: flowName.trim() || 'Investigação',
        mode,
        closer_membership_id: closerMembershipId,
        closer_role_id: closerRoleId,
        closer_require_signature: closerRequireSignature,
        stages: stages.map((s) => ({
          name: s.name.trim() || t.flow.untitled,
          operator_role_id: s.operator_role_id,
          operator_membership_id: s.operator_membership_id ?? null,
          parecer_config: s.parecer_config ?? {},
          require_signature: !!s.require_signature,
          watcher_role_ids: s.watcher_role_ids,
          sla_days: Number(s.sla_days) || 0,
          is_conditional: s.is_conditional,
          condition: s.is_conditional ? (s.condition ?? { field: 'severity', op: 'gte', value: 'high' }) : null,
        })),
      }
      await api.put(`/channels/${channelId}/flow`, payload)
      flash(t.flow.saved)
    } catch (e) {
      flash((e as ApiError).detail ?? t.flow.saveFail)
    } finally { setBusy(false) }
  }

  const Toast = toast && createPortal(
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--heading)', color: 'var(--surface)', padding: '12px 22px', borderRadius: 100, fontWeight: 700, fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,.3)', zIndex: 10002 }}>{toast}</div>,
    document.body,
  )

  if (channels === null) return <div className="app-screen"><Skeleton h={280} r={20} /></div>

  return (
    <div className="app-screen">
      <PageHeader
        title={t.flow.title}
        subtitle={t.flow.subtitle}
        action={canEdit && channelId && <Button leftIcon="check" onClick={() => void save()} loading={busy}>{t.flow.save}</Button>}
      />

      {ethicsChannels.length === 0 ? (
        <Card><EmptyState icon="flow" title={t.flow.noChannel} body={t.flow.noChannelBody} /></Card>
      ) : (
        <>
          <Card style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <Field label={t.flow.channel}>
                  <Select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                    {ethicsChannels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <Field label={t.flow.flowName}>
                  <Input value={flowName} onChange={(e) => setFlowName(e.target.value)} disabled={!canEdit} placeholder={t.flow.egName} />
                </Field>
              </div>
            </div>
          </Card>

          {/* Modo do fluxo + encerrador */}
          <Card style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 240 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.flow.mode}</div>
                <div style={{ display: 'inline-flex', background: 'var(--surface-2)', borderRadius: 100, padding: 4 }}>
                  {(['sequential', 'parallel'] as const).map((m) => (
                    <button key={m} type="button" disabled={!canEdit} onClick={() => setMode(m)} className="app-btn"
                      style={{ border: 'none', cursor: canEdit ? 'pointer' : 'default', padding: '8px 16px', borderRadius: 100, fontWeight: 700, fontSize: 13, background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-muted)' }}>
                      {m === 'sequential' ? t.flow.sequential : t.flow.parallel}
                    </button>
                  ))}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8, maxWidth: 320, lineHeight: 1.5 }}>{mode === 'sequential' ? t.flow.sequentialHint : t.flow.parallelHint}</p>
              </div>
              <div style={{ flex: 1, minWidth: 240, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label={t.flow.closerRole}>
                  <Select value={closerRoleId ?? ''} onChange={(e) => setCloserRoleId(e.target.value || null)} disabled={!canEdit}>
                    <option value="">{t.flow.noRole}</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{localizeRole(r.name)}</option>)}
                  </Select>
                </Field>
                <Field label={t.flow.closerPerson}>
                  <PersonPicker members={members} value={closerMembershipId} onChange={setCloserMembershipId} roleId={closerRoleId} disabled={!canEdit} anyLabel={t.flow.anyOfRole} searchPh={t.flow.searchPerson} noResults={t.flow.noPerson} />
                </Field>
                <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 9, color: 'var(--text)', fontSize: 13.5, cursor: canEdit ? 'pointer' : 'default' }}>
                  <input type="checkbox" checked={closerRequireSignature} disabled={!canEdit} onChange={(e) => setCloserRequireSignature(e.target.checked)} />
                  <Icon name="signature" size={15} />
                  <span style={{ fontWeight: 700 }}>{t.flow.closerRequireSig}</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Trilho visual da cadeia inteira */}
          <SectionLabel>{t.flow.rail}</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
            <RailPill label={t.flow.railReceived} tone="muted" />
            <Arrow />
            <RailPill label={t.flow.railTriage} tone="blue" />
            <Arrow />
            <RailPill label={`${t.flow.railInvestigation} (${stages?.length ?? 0})`} tone="accent" strong />
            <Arrow />
            <RailPill label={t.flow.railResponded} tone="blue" />
            <Arrow />
            <RailPill label={t.flow.railClosed} tone="green" />
          </div>

          {/* Sub-etapas configuráveis da investigação */}
          <SectionLabel>{t.flow.stages}</SectionLabel>
          {stages === null ? (
            <Skeleton h={160} r={16} />
          ) : stages.length === 0 ? (
            <Card><EmptyState icon="flow" title={t.flow.emptyStages} body={t.flow.emptyStagesBody}
              action={canEdit && <Button leftIcon="plus" onClick={addStage}>{t.flow.addStage}</Button>} /></Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {stages.map((s, i) => (
                <Card key={s.key}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ width: 30, height: 30, minWidth: 30, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>{i + 1}</span>
                    <Input value={s.name} onChange={(e) => patch(s.key, { name: e.target.value })} disabled={!canEdit} placeholder={t.flow.stageNamePh} style={{ flex: 1 }} />
                    {canEdit && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <IconBtn icon="chevron" title="↑" flip disabled={i === 0} onClick={() => move(i, -1)} />
                        <IconBtn icon="chevron" title="↓" disabled={i === stages.length - 1} onClick={() => move(i, 1)} />
                        <IconBtn icon="trash" title="x" danger onClick={() => remove(s.key)} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
                    <Field label={t.flow.operator}>
                      <Select value={s.operator_role_id ?? ''} onChange={(e) => patch(s.key, { operator_role_id: e.target.value || null })} disabled={!canEdit}>
                        <option value="">{t.flow.noRole}</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{localizeRole(r.name)}</option>)}
                      </Select>
                    </Field>
                    <Field label={t.flow.operatorPerson}>
                      <PersonPicker members={members} value={s.operator_membership_id ?? null} onChange={(id) => patch(s.key, { operator_membership_id: id })} roleId={s.operator_role_id} disabled={!canEdit} anyLabel={t.flow.anyOfRole} searchPh={t.flow.searchPerson} noResults={t.flow.noPerson} />
                    </Field>
                    <Field label={t.flow.sla}>
                      <Input type="number" min={0} max={365} value={String(s.sla_days)} onChange={(e) => patch(s.key, { sla_days: Number(e.target.value) })} disabled={!canEdit} />
                    </Field>
                  </div>

                  {/* O que essa pessoa faz nesta etapa (além do texto do parecer) */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.flow.doesWhat}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {([['decision', t.flow.cfgDecision], ['rating', t.flow.cfgRating], ['urgency', t.flow.cfgUrgency]] as const).map(([f, label]) => {
                        const on = !!(s.parecer_config ?? {})[f]
                        return (
                          <button key={f} type="button" disabled={!canEdit} onClick={() => toggleCfg(s.key, f)} className="app-btn"
                            style={{ cursor: canEdit ? 'pointer' : 'default', border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-2)', color: on ? 'var(--accent)' : 'var(--text-muted)', borderRadius: 100, padding: '6px 12px', fontSize: 12.5, fontWeight: 700 }}>
                            {on ? '✓ ' : ''}{label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Exigir assinatura digital do avaliador ao concluir esta etapa */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14, color: 'var(--text)', fontSize: 13.5, cursor: canEdit ? 'pointer' : 'default' }}>
                    <input type="checkbox" checked={!!s.require_signature} disabled={!canEdit} onChange={(e) => patch(s.key, { require_signature: e.target.checked })} />
                    <Icon name="signature" size={15} />
                    <span style={{ fontWeight: 700 }}>{t.flow.requireSig}</span>
                  </label>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0 27px', lineHeight: 1.5 }}>{t.flow.requireSigHint}</p>

                  <div style={{ marginTop: 14 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.flow.watchers}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {roles.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>}
                      {roles.map((r) => {
                        const on = s.watcher_role_ids.includes(r.id)
                        return (
                          <button key={r.id} type="button" disabled={!canEdit} onClick={() => toggleWatcher(s.key, r.id)} className="app-btn"
                            style={{ cursor: canEdit ? 'pointer' : 'default', border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-2)', color: on ? 'var(--accent)' : 'var(--text-muted)', borderRadius: 100, padding: '6px 12px', fontSize: 12.5, fontWeight: 700 }}>
                            {on ? '✓ ' : ''}{localizeRole(r.name)}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Condição opcional */}
                  <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: canEdit ? 'pointer' : 'default', color: 'var(--heading)', fontSize: 13.5, fontWeight: 700 }}>
                      <input type="checkbox" checked={s.is_conditional} disabled={!canEdit}
                        onChange={(e) => patch(s.key, { is_conditional: e.target.checked, condition: e.target.checked ? (s.condition ?? { field: 'severity', op: 'gte', value: 'high' }) : null })}
                        style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                      {t.flow.conditional}
                    </label>
                    {s.is_conditional && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t.flow.condPrefix}</span>
                        <Select value={s.condition?.op ?? 'gte'} onChange={(e) => patch(s.key, { condition: { field: 'severity', op: e.target.value, value: s.condition?.value ?? 'high' } })} disabled={!canEdit} style={{ maxWidth: 120 }}>
                          <option value="gte">≥</option>
                          <option value="eq">=</option>
                        </Select>
                        <Select value={s.condition?.value ?? 'high'} onChange={(e) => patch(s.key, { condition: { field: 'severity', op: s.condition?.op ?? 'gte', value: e.target.value } })} disabled={!canEdit} style={{ maxWidth: 160 }}>
                          {SEVS.map((sv) => <option key={sv} value={sv}>{sevLabel(sv)}</option>)}
                        </Select>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              {canEdit && <Button variant="ghost" leftIcon="plus" onClick={addStage}>{t.flow.addStage}</Button>}
            </div>
          )}

          {/* Salvar também no rodapé (além do topo) */}
          {canEdit && channelId && stages !== null && (
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <Button leftIcon="check" onClick={() => void save()} loading={busy}>{t.flow.save}</Button>
            </div>
          )}
        </>
      )}
      {Toast}
    </div>
  )
}

// Seletor de pessoa com BUSCA (nome/e-mail) e filtro pelo papel escolhido.
function PersonPicker({ members, value, onChange, roleId, disabled, anyLabel, searchPh, noResults }: {
  members: MemberRow[]
  value: string | null
  onChange: (id: string | null) => void
  roleId?: string | null
  disabled?: boolean
  anyLabel: string
  searchPh: string
  noResults: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ('') } }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const label = (m: MemberRow) => m.full_name || m.email || m.invited_email
  const selected = members.find((m) => m.id === value) ?? null
  const term = q.trim().toLowerCase()
  const list = members.filter((m) => {
    if (roleId && !m.roles.some((r) => r.role_id === roleId)) return false
    if (!term) return true
    return `${m.full_name ?? ''} ${m.email ?? ''} ${m.invited_email ?? ''}`.toLowerCase().includes(term)
  })
  const opt: CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 14px', color: selected ? 'var(--heading)' : 'var(--text-muted)', fontSize: 15, fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer', textAlign: 'left' }}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected ? label(selected) : anyLabel}</span>
        <Icon name="chevron" size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: 'rotate(90deg)' }} />
      </button>
      {open && !disabled && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 14px 40px rgba(0,0,0,.22)', overflow: 'hidden' }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPh}
              style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 11px', color: 'var(--heading)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div className="app-scroll" style={{ maxHeight: 240, overflowY: 'auto' }}>
            <button type="button" className="picker-opt" style={{ ...opt, background: 'none', color: 'var(--text-muted)', fontSize: 13.5 }} onClick={() => { onChange(null); setOpen(false); setQ('') }}>{anyLabel}</button>
            {list.length === 0 && <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>{noResults}</div>}
            {list.map((m) => (
              <button key={m.id} type="button" className="picker-opt" onClick={() => { onChange(m.id); setOpen(false); setQ('') }}
                style={{ ...opt, background: m.id === value ? 'var(--accent-soft)' : 'none' }}>
                <div style={{ color: 'var(--heading)', fontWeight: 600, fontSize: 14 }}>{label(m)}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.email || m.invited_email}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RailPill({ label, tone, strong }: { label: string; tone: 'muted' | 'blue' | 'accent' | 'green'; strong?: boolean }) {
  const bg = tone === 'accent' ? 'var(--accent-soft)' : tone === 'green' ? 'var(--green-soft)' : tone === 'blue' ? 'var(--blue-soft)' : 'var(--surface-2)'
  const fg = tone === 'accent' ? 'var(--accent)' : tone === 'green' ? 'var(--green)' : tone === 'blue' ? 'var(--blue)' : 'var(--text-muted)'
  return <span style={{ background: bg, color: fg, borderRadius: 100, padding: '8px 14px', fontSize: 12.5, fontWeight: strong ? 800 : 700, border: `1px solid ${strong ? 'var(--accent-border)' : 'transparent'}`, whiteSpace: 'nowrap' }}>{label}</span>
}
function Arrow() {
  return <Icon name="chevron" size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
}
function IconBtn({ icon, danger, flip, disabled, onClick }: { icon: 'chevron' | 'trash'; title: string; danger?: boolean; flip?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="app-btn"
      style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface-2)', color: danger ? '#d9534f' : 'var(--text-muted)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={15} style={flip ? { transform: 'rotate(90deg)' } : (icon === 'chevron' ? { transform: 'rotate(-90deg)' } : undefined)} />
    </button>
  )
}
