// Auditoria: trilha legível ("olhou, entendeu") em triplo idioma. Descrições
// humanas do que ocorreu (segue o idioma), filtros de período/ação/pessoa, busca,
// agrupamento por dia e export PDF (do conjunto filtrado, com a marca Soluvia).
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { api, saveBlob } from '../../lib/api'
import type { AuditRow } from '../../lib/types'
import { useTranslation } from '../../i18n/LanguageProvider'
import { useT } from '../strings'
import { Button, Card, EmptyState, Input, PageHeader, Select, Skeleton } from '../ui'
import { Icon, type IconName } from '../icons'

const LOCALE = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' } as const

type Cat = 'case' | 'signature' | 'flow' | 'channel' | 'role' | 'billing' | 'account' | 'tenant' | 'other'
const CAT_ICON: Record<Cat, IconName> = {
  case: 'cases', signature: 'signature', flow: 'flow', channel: 'channels',
  role: 'people', billing: 'billing', account: 'lock', tenant: 'shield', other: 'audit',
}
// [bg, fg]
const CAT_STYLE: Record<Cat, [string, string]> = {
  case: ['var(--accent-soft)', 'var(--accent)'], signature: ['var(--accent-soft)', 'var(--accent)'],
  billing: ['var(--accent-soft)', 'var(--accent)'], tenant: ['var(--accent-soft)', 'var(--accent)'],
  flow: ['var(--blue-soft)', 'var(--blue)'], channel: ['var(--blue-soft)', 'var(--blue)'],
  account: ['var(--blue-soft)', 'var(--blue)'], role: ['var(--green-soft)', 'var(--green)'],
  other: ['var(--surface-2)', 'var(--text-muted)'],
}
const CATS: Cat[] = ['case', 'signature', 'flow', 'channel', 'role', 'billing', 'account', 'tenant', 'other']

function catOf(action: string): Cat {
  if (action.startsWith('signature.')) return 'signature'
  if (action.startsWith('flow.')) return 'flow'
  if (action.startsWith('case.')) return 'case'
  if (action.startsWith('channel.')) return 'channel'
  if (action.startsWith('role.') || action.startsWith('membership.')) return 'role'
  if (action.startsWith('billing.')) return 'billing'
  if (action.startsWith('account.') || action.startsWith('lgpd.')) return 'account'
  if (action.startsWith('tenant.')) return 'tenant'
  return 'other'
}
function normAction(action: string): string {
  if (action.startsWith('lgpd.request')) return 'lgpd.request'
  if (action.startsWith('billing.webhook')) return 'billing.webhook'
  return action
}
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10)

export default function Audit() {
  const t = useT()
  const { lang } = useTranslation()
  const locale = LOCALE[lang] ?? 'pt-BR'

  const [rows, setRows] = useState<AuditRow[] | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [cat, setCat] = useState<'all' | Cat>('all')
  const [person, setPerson] = useState('all')
  const [q, setQ] = useState('')
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600) }

  // Busca no servidor (período). Ação/pessoa/texto filtram no cliente.
  useEffect(() => {
    const params = new URLSearchParams()
    if (from) params.set('date_from', `${from}T00:00:00`)
    if (to) params.set('date_to', `${to}T23:59:59`)
    params.set('limit', from || to ? '2000' : '500')
    setRows(null)
    api.get<AuditRow[]>(`/audit?${params.toString()}`).then(setRows).catch(() => setRows([]))
  }, [from, to])

  // Integridade da cadeia (tamper-evidence): recalcula os hashes no servidor.
  const [integrity, setIntegrity] = useState<{ intact: boolean; total: number; broken_at: number | null } | null>(null)
  useEffect(() => {
    api.get<{ intact: boolean; total: number; broken_at: number | null }>('/audit/verify')
      .then(setIntegrity).catch(() => setIntegrity(null))
  }, [])

  const verbOf = (r: AuditRow) => (t.audit.act as Record<string, string>)[normAction(r.action)] || r.action
  const whoOf = (r: AuditRow) => r.actor_name || t.audit.system
  const detailOf = (r: AuditRow) => {
    const resLabel = (t.audit.res as Record<string, string>)[r.resource_type] || r.resource_type
    let d = r.resource_id ? `${resLabel} · ${String(r.resource_id).slice(0, 8)}` : resLabel
    const m = r.metadata || {}
    if (typeof m.level === 'string') d += ` · ${m.level}`
    if (typeof m.new_status === 'string') d += ` · ${m.new_status}`
    return d
  }

  const people = useMemo(() => {
    const set = new Set<string>()
    ;(rows ?? []).forEach((r) => r.actor_name && set.add(r.actor_name))
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (rows ?? []).filter((r) => {
      if (cat !== 'all' && catOf(r.action) !== cat) return false
      if (person !== 'all' && (r.actor_name || t.audit.system) !== person) return false
      if (needle) {
        const hay = `${whoOf(r)} ${verbOf(r)} ${r.action} ${detailOf(r)}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cat, person, q, lang])

  // Agrupa por dia (mantém ordem desc do backend).
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: AuditRow[] }[] = []
    const todayK = new Date().toISOString().slice(0, 10)
    const yK = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
    for (const r of filtered) {
      const k = dayKey(r.created_at)
      let g = out.find((x) => x.key === k)
      if (!g) {
        const label = k === todayK ? t.audit.today : k === yK ? t.audit.yesterday
          : new Date(r.created_at).toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
        g = { key: k, label, items: [] }
        out.push(g)
      }
      g.items.push(r)
    }
    return out
  }, [filtered, locale, t])

  const clearFilters = () => { setFrom(''); setTo(''); setCat('all'); setPerson('all'); setQ('') }
  const hasFilters = from || to || cat !== 'all' || person !== 'all' || q.trim()

  async function exportPdf() {
    setExporting(true)
    try {
      const parts: string[] = []
      if (from || to) parts.push(`${from || '…'} → ${to || '…'}`)
      if (cat !== 'all') parts.push((t.audit.cat as Record<string, string>)[cat])
      if (person !== 'all') parts.push(person)
      if (q.trim()) parts.push(`“${q.trim()}”`)
      const payload = {
        title: t.audit.exportTitle,
        subtitle: parts.join('  ·  '),
        section: t.audit.title,
        columns: [
          { key: 'when', label: t.audit.colWhen },
          { key: 'who', label: t.audit.colWho },
          { key: 'what', label: t.audit.colWhat },
          { key: 'detail', label: t.audit.colDetail },
        ],
        rows: filtered.map((r) => ({
          when: new Date(r.created_at).toLocaleString(locale),
          who: whoOf(r), what: cap(verbOf(r)), detail: detailOf(r),
        })),
        meta: { [t.audit.events]: String(filtered.length) },
      }
      const { blob, filename } = await api.postBlob('/audit/export', payload)
      saveBlob(blob, filename)
      flash(t.audit.exportOk)
    } catch {
      flash(t.audit.exportFail)
    } finally { setExporting(false) }
  }

  const Toast = toast && createPortal(
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--heading)', color: 'var(--surface)', padding: '12px 22px', borderRadius: 100, fontWeight: 700, fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,.3)', zIndex: 10002 }}>{toast}</div>,
    document.body,
  )

  const fieldStyle = { width: '100%', boxSizing: 'border-box', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', color: 'var(--heading)', fontFamily: 'inherit', fontSize: 13.5, colorScheme: 'dark light' } as const

  return (
    <div className="app-screen">
      <PageHeader
        title={t.audit.title}
        subtitle={t.audit.subtitle}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {integrity && (
              <span
                title={integrity.intact ? t.audit.integrityHint : t.audit.integrityBrokenHint}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 100,
                  fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap',
                  background: integrity.intact ? 'var(--green-soft, rgba(22,163,74,.12))' : 'rgba(217,83,79,.12)',
                  color: integrity.intact ? 'var(--green, #16a34a)' : '#d9534f',
                  border: `1px solid ${integrity.intact ? 'rgba(22,163,74,.35)' : 'rgba(217,83,79,.35)'}`,
                }}
              >
                <Icon name={integrity.intact ? 'shield' : 'lock'} size={14} />
                {integrity.intact ? t.audit.integrityOk : t.audit.integrityBroken}
              </span>
            )}
            <Button leftIcon="download" onClick={() => void exportPdf()} loading={exporting} disabled={!filtered.length}>{exporting ? t.audit.exporting : t.audit.export}</Button>
          </div>
        }
      />

      {/* Barra de filtros */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--heading)', fontWeight: 800, fontSize: 13.5, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            <Icon name="audit" size={15} /> {t.audit.filters}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}><b style={{ color: 'var(--heading)' }}>{filtered.length}</b> {t.audit.events}</span>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="app-btn" style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>{t.audit.clear}</button>
            )}
          </span>
        </div>
        <div className="audit-filters">
          <Fld label={t.audit.from}><input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} style={fieldStyle} /></Fld>
          <Fld label={t.audit.to}><input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} style={fieldStyle} /></Fld>
          <Fld label={t.audit.action}>
            <Select value={cat} onChange={(e) => setCat(e.target.value as 'all' | Cat)}>
              <option value="all">{t.audit.all}</option>
              {CATS.map((c) => <option key={c} value={c}>{(t.audit.cat as Record<string, string>)[c]}</option>)}
            </Select>
          </Fld>
          <Fld label={t.audit.person}>
            <Select value={person} onChange={(e) => setPerson(e.target.value)}>
              <option value="all">{t.audit.allPeople}</option>
              {people.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Fld>
          <Fld label={t.audit.search} span>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.audit.search} />
          </Fld>
        </div>
      </Card>

      {rows === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={56} r={14} />)}</div>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon="audit" title={t.audit.empty} /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon="audit" title={t.audit.noMatch} action={<Button variant="ghost" onClick={clearFilters}>{t.audit.clear}</Button>} /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.map((g) => (
            <div key={g.key}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8, paddingLeft: 4 }}>{cap(g.label)}</div>
              <Card padding={6}>
                {g.items.map((r) => {
                  const c = catOf(r.action)
                  const [bg, fg] = CAT_STYLE[c]
                  return (
                    <div key={r.id} className="app-card--hover" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 12px', borderRadius: 12 }}>
                      <span style={{ width: 38, height: 38, minWidth: 38, borderRadius: 11, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={CAT_ICON[c]} size={19} />
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ color: 'var(--heading)', fontWeight: 600, fontSize: 14.5, lineHeight: 1.3 }}>
                          <span style={{ fontWeight: 800 }}>{whoOf(r)}</span> {verbOf(r)}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detailOf(r)}</div>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12.5, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{new Date(r.created_at).toLocaleTimeString(locale)}</span>
                    </div>
                  )
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
      {Toast}
    </div>
  )
}

function Fld({ label, children, span }: { label: string; children: ReactNode; span?: boolean }) {
  return (
    <label className={span ? 'af-span' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
      {children}
    </label>
  )
}
