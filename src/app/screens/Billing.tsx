import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { ApiError, PlanChangePreview, PlanOut, SubscriptionState } from '../../lib/types'
import { useTranslation } from '../../i18n/LanguageProvider'
import { useCaps } from '../capabilities'
import { useT } from '../strings'
import { Button, Card, Chip, Modal, PageHeader, SectionLabel, Skeleton, StatCard } from '../ui'
import { Icon } from '../icons'

interface TenantInfo {
  card_brand: string | null
  card_last4: string | null
  billing_cycle: string | null
  subscription_status: string | null
  current_period_end: string | null
  subscription_canceled_at: string | null
}

type Rel = 'current' | 'cycle' | 'upgrade' | 'downgrade'
const brl = (v: number | null) => (v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`)
const LOCALE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' }

export default function Billing() {
  const { ctx, can, reload } = useCaps()
  const t = useT()
  const { lang } = useTranslation()
  const fmtDate = (iso: string | null) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleDateString(LOCALE[lang] ?? 'pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return '—'
    }
  }

  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [plans, setPlans] = useState<PlanOut[]>([])
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [preview, setPreview] = useState<{ plan: PlanOut; data: PlanChangePreview | null } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const canBill = can('admin.billing')

  const loadTenant = () =>
    api.get<TenantInfo>('/tenants/current').then((tn) => {
      setTenant(tn)
      if (tn.billing_cycle === 'yearly') setCycle('yearly')
    }).catch(() => {})

  useEffect(() => {
    void loadTenant()
    api.get<PlanOut[]>('/plans').then(setPlans).catch(() => {})
  }, [])

  const status = tenant?.subscription_status ?? 'active'
  const canceled = status === 'canceled'
  const currentName = ctx.usage.plan_name
  const currentCycle = tenant?.billing_cycle ?? 'monthly'
  const currentPlan = plans.find((p) => p.name === currentName)
  const curM = currentPlan?.price_monthly ?? 0
  const price = (p: PlanOut) => (cycle === 'yearly' ? p.price_yearly : p.price_monthly)

  const relation = (p: PlanOut): Rel => {
    if (p.name === currentName) return cycle === currentCycle ? 'current' : 'cycle'
    return (p.price_monthly ?? 0) > curM ? 'upgrade' : 'downgrade'
  }
  const relLabel = (r: Rel) =>
    r === 'upgrade' ? t.billing.doUpgrade : r === 'downgrade' ? t.billing.doDowngrade : r === 'cycle' ? t.billing.switchCycle : t.billing.currentPlan

  async function openPreview(p: PlanOut) {
    setPreview({ plan: p, data: null })
    try {
      const data = await api.get<PlanChangePreview>(`/billing/preview?plan_id=${p.id}&billing_cycle=${cycle}`)
      setPreview({ plan: p, data })
    } catch (err) {
      alert((err as ApiError).detail ?? t.billing.errCalc)
      setPreview(null)
    }
  }

  async function confirmChange() {
    if (!preview?.data) return
    setConfirming(true)
    try {
      await api.post<SubscriptionState>('/billing/change', { plan_id: preview.plan.id, billing_cycle: cycle })
      await reload()
      await loadTenant()
      setPreview(null)
    } catch (err) {
      alert((err as ApiError).detail ?? t.billing.errChange)
    } finally {
      setConfirming(false)
    }
  }

  async function doCancel() {
    setBusy(true)
    try {
      await api.post<SubscriptionState>('/billing/cancel', {})
      await reload()
      await loadTenant()
      setCancelOpen(false)
    } catch (err) {
      alert((err as ApiError).detail ?? t.billing.errCancel)
    } finally {
      setBusy(false)
    }
  }

  async function doReactivate() {
    setBusy(true)
    try {
      await api.post<SubscriptionState>('/billing/reactivate', {})
      await reload()
      await loadTenant()
    } catch (err) {
      alert((err as ApiError).detail ?? t.billing.errReactivate)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-screen">
      <PageHeader title={t.billing.title} subtitle={t.billing.subtitle} />

      {/* Resumo: plano, status, vagas e cartão */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="billing" label={t.billing.current} value={ctx.usage.plan_name} sub={tenant?.billing_cycle ? t.billing[tenant.billing_cycle as 'monthly' | 'yearly'] : undefined} />
        <StatCard
          icon={canceled ? 'lock' : 'check'}
          label={t.billing.status}
          value={<span style={{ color: canceled ? '#e0a23c' : 'var(--green, #2bb673)' }}>{canceled ? t.billing.canceledTag : t.billing.active}</span>}
          sub={`${canceled ? t.billing.accessUntil : t.billing.renews} ${fmtDate(tenant?.current_period_end ?? null)}`}
        />
        <StatCard icon="people" label={t.billing.seats} value={`${ctx.usage.active_users}/${ctx.usage.max_users}`} />
        <Card hover>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{tenant?.card_brand?.[0] ?? '•'}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>{t.billing.card}</span>
          </div>
          <div style={{ color: 'var(--heading)', fontSize: 18, fontWeight: 800 }}>{tenant?.card_last4 ? `${tenant.card_brand ?? 'Cartão'} •••• ${tenant.card_last4}` : t.billing.cardOnFile}</div>
        </Card>
      </div>

      {/* Banner de cancelada */}
      {canceled && (
        <Card style={{ borderColor: 'rgba(224,162,60,.5)', background: 'rgba(224,162,60,.08)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Icon name="lock" size={20} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ color: 'var(--heading)', fontWeight: 700 }}>{t.billing.canceledBanner}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 2 }}>{t.billing.accessUntil} {fmtDate(tenant?.current_period_end ?? null)}</div>
            </div>
            {canBill && <Button onClick={() => void doReactivate()} loading={busy}>{t.billing.reactivate}</Button>}
          </div>
        </Card>
      )}

      {canBill && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <SectionLabel>{t.billing.upgrade}</SectionLabel>
            <div style={{ display: 'inline-flex', background: 'var(--surface-2)', borderRadius: 100, padding: 4 }}>
              {(['monthly', 'yearly'] as const).map((c) => (
                <button key={c} onClick={() => setCycle(c)} className="app-btn" style={{ border: 'none', cursor: 'pointer', padding: '7px 18px', borderRadius: 100, fontWeight: 700, fontSize: 13.5, background: cycle === c ? 'var(--accent)' : 'transparent', color: cycle === c ? '#fff' : 'var(--text-muted)' }}>
                  {t.billing[c]}
                </button>
              ))}
            </div>
          </div>

          {plans.length === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={240} r={20} />)}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
              {plans.map((p) => {
                const rel = relation(p)
                const isCurrent = rel === 'current'
                return (
                  <Card key={p.id} hover style={isCurrent ? { borderColor: 'var(--accent)', borderWidth: 2 } : undefined}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 17 }}>{p.name}</span>
                      {isCurrent && <Chip>{t.billing.currentPlan}</Chip>}
                      {rel === 'upgrade' && <Chip tone="green">▲</Chip>}
                      {rel === 'downgrade' && <Chip tone="muted">▼</Chip>}
                    </div>
                    <div style={{ color: 'var(--heading)', marginBottom: 12 }}>
                      <span style={{ fontSize: 28, fontWeight: 900 }}>{brl(price(p))}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/{cycle === 'yearly' ? t.billing.yearly : t.billing.monthly}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      <Chip tone="muted">{p.max_users} {t.billing.seats.toLowerCase()}</Chip>
                      {p.enabled_modules.map((m) => <Chip key={m} tone="blue">{t.modules[m as keyof typeof t.modules] ?? m}</Chip>)}
                    </div>
                    <Button variant={isCurrent ? 'ghost' : rel === 'downgrade' ? 'outline' : 'primary'} disabled={isCurrent} onClick={() => void openPreview(p)} style={{ width: '100%' }}>
                      {isCurrent ? '✓ ' + t.billing.currentPlan : relLabel(rel)}
                    </Button>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Gerenciar assinatura (cancelar) */}
          {!canceled && (
            <div style={{ marginTop: 30 }}>
              <SectionLabel>{t.billing.dangerZone}</SectionLabel>
              <Card style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ color: 'var(--heading)', fontWeight: 700 }}>{t.billing.cancelSub}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 2 }}>{t.billing.accessUntil} {fmtDate(tenant?.current_period_end ?? null)}</div>
                  </div>
                  <button className="app-btn" onClick={() => setCancelOpen(true)} style={{ cursor: 'pointer', borderRadius: 100, padding: '11px 20px', fontSize: 14.5, fontWeight: 700, fontFamily: 'inherit', background: 'transparent', color: '#d9534f', border: '1.5px solid rgba(217,83,79,.5)' }}>
                    {t.billing.cancelSub}
                  </button>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Modal: revisar mudança (proporcional) */}
      <Modal open={!!preview} onClose={() => setPreview(null)} kicker={t.billing.fromTo} title={t.billing.changeTitle} maxWidth={460}>
        {!preview?.data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Skeleton h={20} /><Skeleton h={56} r={14} /><Skeleton h={44} r={100} /></div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', borderRadius: 14, background: 'var(--surface-2)', marginBottom: 16 }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{preview.data.current_plan} · {t.billing[preview.data.current_cycle as 'monthly' | 'yearly']}</div>
                <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 17 }}>→ {preview.data.new_plan}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--heading)' }}>{brl(preview.data.new_price)}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/{t.billing[preview.data.billing_cycle as 'monthly' | 'yearly']}</span>
              </div>
            </div>

            {preview.data.seat_block ? (
              <div style={{ background: 'rgba(217,83,79,.12)', border: '1px solid rgba(217,83,79,.4)', color: '#e08585', borderRadius: 12, padding: '12px 14px', fontSize: 13.5, marginBottom: 16 }}>
                {t.billing.seatWarn} ({preview.data.active_users}/{preview.data.new_max_users})
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                {preview.data.amount_due_now > 0 ? (
                  <Row label={`${t.billing.payNow} · ${preview.data.days_remaining} ${t.billing.daysLeft}`} value={brl(preview.data.amount_due_now)} strong />
                ) : preview.data.credit_next_cycle > 0 ? (
                  <Row label={t.billing.creditNext} value={`− ${brl(preview.data.credit_next_cycle)}`} />
                ) : (
                  <Row label={t.billing.noCharge} value="—" />
                )}
                <Row label={t.billing.renews} value={fmtDate(preview.data.next_renewal)} />
              </div>
            )}

            <Button onClick={() => void confirmChange()} loading={confirming} disabled={preview.data.seat_block} style={{ width: '100%' }}>
              {t.billing.confirmChange}
            </Button>
          </>
        )}
      </Modal>

      {/* Modal: cancelar assinatura */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} kicker={t.billing.dangerZone} title={t.billing.cancelTitle} maxWidth={440}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14.5, lineHeight: 1.6, marginBottom: 8 }}>{t.billing.cancelBody}</p>
        <p style={{ color: 'var(--heading)', fontSize: 14, fontWeight: 700, marginBottom: 20 }}>{t.billing.accessUntil} {fmtDate(tenant?.current_period_end ?? null)}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="app-btn" onClick={() => void doCancel()} disabled={busy} style={{ flex: 1, minWidth: 150, cursor: 'pointer', borderRadius: 100, padding: '12px 20px', fontWeight: 700, fontFamily: 'inherit', background: '#d9534f', color: '#fff', border: 'none', opacity: busy ? 0.6 : 1 }}>
            {busy ? '…' : t.billing.cancelSub}
          </button>
          <Button variant="ghost" onClick={() => setCancelOpen(false)} style={{ flex: 1, minWidth: 150 }}>{t.billing.keep}</Button>
        </div>
      </Modal>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{label}</span>
      <span style={{ color: 'var(--heading)', fontWeight: strong ? 900 : 700, fontSize: strong ? 18 : 14.5 }}>{value}</span>
    </div>
  )
}
