// Jornada self-service: escolher plano → dados da empresa/admin → pagamento na
// TELA HOSPEDADA DA STRIPE (Checkout). O cartão é coletado com segurança pela
// Stripe (PCI), nunca pelo nosso front. Abre como overlay quando a URL vira
// #assinar (CTAs da seção Planos).

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react'
import { BASE_URL, checkSlug, listPlans, startCheckout } from '../lib/api'
import type { ApiError, PlanOut } from '../lib/types'
import { useTranslation } from '../i18n/LanguageProvider'
import PrefSwitcher from './PrefSwitcher'

type Step = 'plan' | 'checkout'
type Cycle = 'monthly' | 'yearly'

const L = {
  pt: {
    kicker: 'Contratar Soluvia', close: 'Fechar', choosePlan: 'Escolha seu plano',
    monthly: 'Mensal', yearly: 'Anual', perMonth: 'mês', perYear: 'ano',
    upTo: 'Até', users: 'usuários', loadingPlans: 'Carregando planos…', retry: 'Tentar novamente',
    continue: 'Continuar', haveAccount: 'Já tem conta?', signIn: 'Entrar',
    yourCompany: 'Sua empresa', change: 'trocar', secCompany: 'Empresa', secAccount: 'Sua conta (Admin)',
    companyName: 'Nome da empresa', domain: 'Domínio corporativo (opcional)',
    address: 'Endereço da empresa (link)', addressHint: 'É o endereço público do seu canal.',
    addrChecking: 'Verificando disponibilidade…', addrOk: 'Disponível ✓',
    addrTaken: 'Este endereço já está em uso. Escolha outro.', addrInvalid: 'Use letras, números e hífens.',
    yourName: 'Seu nome', email: 'E-mail', password: 'Senha (mín. 8 caracteres)',
    redirecting: 'Redirecionando…', goPay: 'Ir para o pagamento seguro',
    stripe1a: 'Você será levado à página segura da', stripe1b: 'para informar o cartão.',
    stripe2: 'Em modo teste, use o cartão 4242 4242 4242 4242, validade futura e CVC qualquer.',
    errStart: 'Não foi possível iniciar o pagamento.',
    errServer: (u: string) => `Não foi possível falar com o servidor (${u}). Confira se o back-end está rodando.`,
    mod: { etica: 'Ética & Denúncias', privacidade: 'Privacidade (LGPD)', incidentes: 'Incidentes', nr1: 'NR-1 Psicossocial', assinatura: 'Assinatura Digital' } as Record<string, string>,
  },
  en: {
    kicker: 'Get Soluvia', close: 'Close', choosePlan: 'Choose your plan',
    monthly: 'Monthly', yearly: 'Yearly', perMonth: 'mo', perYear: 'yr',
    upTo: 'Up to', users: 'users', loadingPlans: 'Loading plans…', retry: 'Try again',
    continue: 'Continue', haveAccount: 'Already have an account?', signIn: 'Sign in',
    yourCompany: 'Your company', change: 'change', secCompany: 'Company', secAccount: 'Your account (Admin)',
    companyName: 'Company name', domain: 'Corporate domain (optional)',
    address: 'Company address (link)', addressHint: 'This is your channel’s public address.',
    addrChecking: 'Checking availability…', addrOk: 'Available ✓',
    addrTaken: 'This address is already taken. Pick another.', addrInvalid: 'Use letters, numbers and hyphens.',
    yourName: 'Your name', email: 'Email', password: 'Password (min. 8 characters)',
    redirecting: 'Redirecting…', goPay: 'Go to secure payment',
    stripe1a: 'You will be taken to the secure', stripe1b: 'page to enter your card.',
    stripe2: 'In test mode, use card 4242 4242 4242 4242, any future expiry and any CVC.',
    errStart: 'Could not start the payment.',
    errServer: (u: string) => `Could not reach the server (${u}). Check that the backend is running.`,
    mod: { etica: 'Ethics & Whistleblowing', privacidade: 'Privacy (LGPD)', incidentes: 'Incidents', nr1: 'NR-1 Psychosocial', assinatura: 'Digital Signature' } as Record<string, string>,
  },
  es: {
    kicker: 'Contratar Soluvia', close: 'Cerrar', choosePlan: 'Elige tu plan',
    monthly: 'Mensual', yearly: 'Anual', perMonth: 'mes', perYear: 'año',
    upTo: 'Hasta', users: 'usuarios', loadingPlans: 'Cargando planes…', retry: 'Reintentar',
    continue: 'Continuar', haveAccount: '¿Ya tienes cuenta?', signIn: 'Entrar',
    yourCompany: 'Tu empresa', change: 'cambiar', secCompany: 'Empresa', secAccount: 'Tu cuenta (Admin)',
    companyName: 'Nombre de la empresa', domain: 'Dominio corporativo (opcional)',
    address: 'Dirección de la empresa (enlace)', addressHint: 'Es la dirección pública de tu canal.',
    addrChecking: 'Verificando disponibilidad…', addrOk: 'Disponible ✓',
    addrTaken: 'Esta dirección ya está en uso. Elige otra.', addrInvalid: 'Usa letras, números y guiones.',
    yourName: 'Tu nombre', email: 'Correo', password: 'Contraseña (mín. 8 caracteres)',
    redirecting: 'Redirigiendo…', goPay: 'Ir al pago seguro',
    stripe1a: 'Serás llevado a la página segura de', stripe1b: 'para ingresar la tarjeta.',
    stripe2: 'En modo prueba, usa la tarjeta 4242 4242 4242 4242, vencimiento futuro y cualquier CVC.',
    errStart: 'No se pudo iniciar el pago.',
    errServer: (u: string) => `No se pudo contactar con el servidor (${u}). Verifica que el backend esté en ejecución.`,
    mod: { etica: 'Ética y Denuncias', privacidade: 'Privacidad (LGPD)', incidentes: 'Incidentes', nr1: 'NR-1 Psicosocial', assinatura: 'Firma Digital' } as Record<string, string>,
  },
}

const brl = (v: number | null) =>
  v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`

const slugify = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()

type SlugStatus = 'idle' | 'checking' | 'ok' | 'taken' | 'invalid'

const input: CSSProperties = {
  width: '100%',
  background: 'var(--surface-2, rgba(255,255,255,.06))',
  border: '1px solid var(--border, rgba(255,255,255,.14))',
  borderRadius: 12,
  padding: '13px 15px',
  color: 'var(--heading)',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
}
const labelStyle: CSSProperties = {
  display: 'block',
  color: 'var(--text-muted)',
  fontSize: 12.5,
  fontWeight: 600,
  marginBottom: 6,
}
const primaryBtn: CSSProperties = {
  width: '100%',
  background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
  color: '#fff',
  border: 'none',
  borderRadius: 100,
  padding: '15px 28px',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 10px 28px var(--accent-shadow,rgba(242,146,30,.3))',
}

export default function SignupFlow() {
  const { lang } = useTranslation()
  const tr = L[lang] ?? L.pt
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('plan')
  const [plans, setPlans] = useState<PlanOut[]>([])
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [planId, setPlanId] = useState<string | null>(null)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [company, setCompany] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const [domain, setDomain] = useState('')
  const [adminName, setAdminName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Enquanto o usuário não editar o slug manualmente, ele acompanha o nome da empresa.
  const effectiveSlug = slugTouched ? slug : slugify(company)

  // Checagem de disponibilidade do endereço (slug), com debounce.
  useEffect(() => {
    const s = effectiveSlug
    if (!s) { setSlugStatus('idle'); return }
    if (s !== slugify(s)) { setSlugStatus('invalid'); return }
    setSlugStatus('checking')
    let alive = true
    const h = setTimeout(async () => {
      try {
        const r = await checkSlug(s)
        if (alive) setSlugStatus(r.available ? 'ok' : 'taken')
      } catch { if (alive) setSlugStatus('idle') }
    }, 400)
    return () => { alive = false; clearTimeout(h) }
  }, [effectiveSlug])

  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.toLowerCase()
      const isOpen = h.startsWith('#assinar')
      setOpen(isOpen)
      if (isOpen) {
        setCycle(h.includes('anual') ? 'yearly' : 'monthly')
        setStep('plan')
        setError(null)
      }
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const loadPlans = useCallback(async () => {
    setError(null)
    setLoadingPlans(true)
    try {
      const p = await listPlans()
      setPlans(p)
      if (p.length) setPlanId((cur) => cur ?? p[Math.min(1, p.length - 1)].id)
    } catch (e) {
      const detail = (e as ApiError).detail
      setError(detail ?? tr.errServer(BASE_URL))
    } finally {
      setLoadingPlans(false)
    }
  }, [tr])

  useEffect(() => {
    if (open && !plans.length) void loadPlans()
  }, [open, plans.length, loadPlans])

  const selectedPlan = useMemo(() => plans.find((p) => p.id === planId) ?? null, [plans, planId])
  const price = (p: PlanOut) => (cycle === 'yearly' ? p.price_yearly : p.price_monthly)

  const close = () => {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setOpen(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!planId) return
    setError(null)
    setLoading(true)
    try {
      const { checkout_url } = await startCheckout({
        company: { name: company.trim(), corporate_domain: domain.trim() || undefined, slug: effectiveSlug || undefined },
        plan_id: planId,
        billing_cycle: cycle,
        admin: { full_name: adminName.trim(), email: email.trim(), password },
      })
      // Vai para a tela segura da Stripe.
      window.location.href = checkout_url
    } catch (err) {
      setError((err as ApiError).detail ?? tr.errStart)
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={close}
      className="m-scrim app-scroll"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--scrim)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}
    >
      <div onClick={(e) => e.stopPropagation()} className="m-modal" style={{ width: '100%', maxWidth: step === 'plan' ? 760 : 520, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: 'clamp(22px,4vw,40px)', boxShadow: '0 30px 80px rgba(0,0,0,.45)', color: 'var(--text)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)' }}>{tr.kicker}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PrefSwitcher compact />
            <button onClick={close} aria-label={tr.close} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.4)', color: '#fca5a5', borderRadius: 12, padding: '12px 14px', fontSize: 14, marginBottom: 16 }}>{error}</div>
        )}

        <div key={step} className="step-anim">
        {/* PASSO 1: PLANO */}
        {step === 'plan' && (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--heading)', margin: '4px 0 18px' }}>{tr.choosePlan}</h2>
            <div style={{ display: 'inline-flex', background: 'var(--surface-2)', borderRadius: 100, padding: 4, marginBottom: 24 }}>
              {(['monthly', 'yearly'] as Cycle[]).map((c) => (
                <button key={c} onClick={() => setCycle(c)} style={{ border: 'none', cursor: 'pointer', padding: '8px 20px', borderRadius: 100, fontWeight: 700, fontSize: 14, background: cycle === c ? 'var(--accent)' : 'transparent', color: cycle === c ? '#fff' : 'var(--text-muted)' }}>
                  {c === 'monthly' ? tr.monthly : tr.yearly}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              {plans.map((p) => {
                const active = p.id === planId
                return (
                  <button key={p.id} onClick={() => setPlanId(p.id)} style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--surface-2)', border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 18, padding: 20, transition: 'border-color .2s' }}>
                    <div style={{ fontWeight: 800, color: 'var(--heading)', fontSize: 17 }}>{p.name}</div>
                    <div style={{ margin: '8px 0', color: 'var(--heading)' }}>
                      <span style={{ fontSize: 28, fontWeight: 900 }}>{brl(price(p))}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/{cycle === 'yearly' ? tr.perYear : tr.perMonth}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{tr.upTo} {p.max_users} {tr.users}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {p.enabled_modules.map((m) => (
                        <span key={m} style={{ fontSize: 11, background: 'var(--accent-soft,rgba(242,146,30,.16))', color: 'var(--accent)', borderRadius: 100, padding: '3px 9px', fontWeight: 600 }}>{tr.mod[m] ?? m}</span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            {loadingPlans && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 18 }}>{tr.loadingPlans}</p>}
            {!loadingPlans && !plans.length && (
              <button onClick={() => void loadPlans()} style={{ ...primaryBtn, marginTop: 18, background: 'var(--surface-2)', color: 'var(--heading)', boxShadow: 'none', border: '1px solid var(--border)' }}>{tr.retry}</button>
            )}
            {plans.length > 0 && (
              <button disabled={!planId} onClick={() => setStep('checkout')} style={{ ...primaryBtn, marginTop: 24, opacity: planId ? 1 : 0.5 }}>{tr.continue}</button>
            )}

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5, marginTop: 14 }}>
              {tr.haveAccount} <a href="#entrar" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>{tr.signIn}</a>
            </p>
          </>
        )}

        {/* PASSO 2: EMPRESA + ADMIN → STRIPE */}
        {step === 'checkout' && selectedPlan && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--heading)', margin: '4px 0 6px' }}>{tr.yourCompany}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              {selectedPlan.name} · {brl(price(selectedPlan))}/{cycle === 'yearly' ? tr.perYear : tr.perMonth} ·{' '}
              <span style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 600 }} onClick={() => setStep('plan')}>{tr.change}</span>
            </p>

            <Section title={tr.secCompany}>
              <Field label={tr.companyName}><input className="app-input" style={input} required value={company} onChange={(e) => setCompany(e.target.value)} placeholder="ACME Ltda" /></Field>
              <Field label={tr.address}>
                <input
                  className="app-input"
                  style={{ ...input, borderColor: slugStatus === 'taken' || slugStatus === 'invalid' ? 'rgba(220,38,38,.6)' : slugStatus === 'ok' ? 'rgba(34,197,94,.6)' : input.border as string }}
                  required
                  value={effectiveSlug}
                  onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true) }}
                  placeholder="acme"
                />
                <p style={{ fontSize: 12.5, marginTop: 6, color: slugStatus === 'taken' || slugStatus === 'invalid' ? '#f87171' : slugStatus === 'ok' ? '#4ade80' : 'var(--text-muted)' }}>
                  {slugStatus === 'checking' ? tr.addrChecking
                    : slugStatus === 'ok' ? tr.addrOk
                    : slugStatus === 'taken' ? tr.addrTaken
                    : slugStatus === 'invalid' ? tr.addrInvalid
                    : tr.addressHint}
                </p>
              </Field>
              <Field label={tr.domain}><input className="app-input" style={input} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" /></Field>
            </Section>

            <Section title={tr.secAccount}>
              <Field label={tr.yourName}><input className="app-input" style={input} required value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Maria Silva" /></Field>
              <Field label={tr.email}><input className="app-input" style={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@acme.com" /></Field>
              <Field label={tr.password}><input className="app-input" style={input} type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
            </Section>

            {(() => {
              const slugBad = slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'checking' || !effectiveSlug
              return (
                <button type="submit" disabled={loading || slugBad} style={{ ...primaryBtn, marginTop: 8, opacity: loading || slugBad ? 0.6 : 1, cursor: loading || slugBad ? 'not-allowed' : 'pointer' }}>
                  {loading ? tr.redirecting : `${tr.goPay} — ${brl(price(selectedPlan))}`}
                </button>
              )
            })()}
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 12, lineHeight: 1.6 }}>
              🔒 {tr.stripe1a} <strong>Stripe</strong> {tr.stripe1b}<br />
              {tr.stripe2}
            </p>
          </form>
        )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}
