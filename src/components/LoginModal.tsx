// Tela de login (overlay). Abre quando a URL vira #entrar (botão "Entrar" do
// header). Faz login único, trata 0/1/N empresas e redireciona para #painel.

import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { BASE_URL, login, switchTenant } from '../lib/api'
import { PasswordInput } from '../app/ui'
import { api } from '../lib/api'
import type { ApiError, MembershipSummary, MeResponse } from '../lib/types'
import { useTranslation } from '../i18n/LanguageProvider'
import { localizeRole } from '../lib/systemNames'
import PrefSwitcher from './PrefSwitcher'
import { consumirDestino, limparDestino } from '../app/destino'

const L = {
  pt: {
    kicker: 'Acessar a Soluvia', close: 'Fechar', signIn: 'Entrar', signingIn: 'Entrando…',
    email: 'E-mail', password: 'Senha', chooseCompany: 'Em qual empresa você quer entrar?',
    chooseCompanyBody: 'Sua identidade é única; o acesso muda conforme a empresa.', member: 'membro',
    platformConsole: 'Console da plataforma', platformConsoleHint: 'todas as empresas',
    noAccount: 'Ainda não tem conta?', subscribe: 'Assinar um plano',
    errNoCompany: 'Sua conta ainda não faz parte de nenhuma empresa ativa. Assine um plano para começar.',
    errInvalid: 'E-mail ou senha inválidos.',
    errServer: (u: string) => `Não foi possível falar com o servidor (${u}). O back-end está rodando?`,
    forgot: 'Esqueci a senha', forgotTitle: 'Redefinir senha',
    forgotBody: 'Enviaremos um código de 8 dígitos para o seu e-mail.',
    sendCode: 'Enviar código', sending: 'Enviando…', codeLabel: 'Código (8 dígitos)',
    newPassword: 'Nova senha', resetBtn: 'Redefinir senha', backToLogin: 'Voltar ao login',
    codeSent: 'Se o e-mail existir, enviamos um código. Confira sua caixa (e o spam).',
    resetOk: 'Senha redefinida! Faça login com a nova senha.',
    errCode: 'Código inválido ou expirado.',
  },
  en: {
    kicker: 'Access Soluvia', close: 'Close', signIn: 'Sign in', signingIn: 'Signing in…',
    email: 'Email', password: 'Password', chooseCompany: 'Which company do you want to enter?',
    chooseCompanyBody: 'Your identity is unique; access changes per company.', member: 'member',
    platformConsole: 'Platform console', platformConsoleHint: 'all companies',
    noAccount: "Don't have an account yet?", subscribe: 'Subscribe to a plan',
    errNoCompany: 'Your account is not part of any active company yet. Subscribe to a plan to get started.',
    errInvalid: 'Invalid email or password.',
    errServer: (u: string) => `Could not reach the server (${u}). Is the backend running?`,
    forgot: 'Forgot password', forgotTitle: 'Reset password',
    forgotBody: "We'll send an 8-digit code to your email.",
    sendCode: 'Send code', sending: 'Sending…', codeLabel: 'Code (8 digits)',
    newPassword: 'New password', resetBtn: 'Reset password', backToLogin: 'Back to sign in',
    codeSent: 'If the email exists, we sent a code. Check your inbox (and spam).',
    resetOk: 'Password reset! Sign in with your new password.',
    errCode: 'Invalid or expired code.',
  },
  es: {
    kicker: 'Acceder a Soluvia', close: 'Cerrar', signIn: 'Entrar', signingIn: 'Entrando…',
    email: 'Correo', password: 'Contraseña', chooseCompany: '¿En qué empresa quieres entrar?',
    chooseCompanyBody: 'Tu identidad es única; el acceso cambia según la empresa.', member: 'miembro',
    platformConsole: 'Consola de la plataforma', platformConsoleHint: 'todas las empresas',
    noAccount: '¿Aún no tienes cuenta?', subscribe: 'Suscribir un plan',
    errNoCompany: 'Tu cuenta aún no forma parte de ninguna empresa activa. Suscribe un plan para empezar.',
    errInvalid: 'Correo o contraseña inválidos.',
    errServer: (u: string) => `No se pudo contactar con el servidor (${u}). ¿El backend está en ejecución?`,
    forgot: 'Olvidé la contraseña', forgotTitle: 'Restablecer contraseña',
    forgotBody: 'Enviaremos un código de 8 dígitos a tu correo.',
    sendCode: 'Enviar código', sending: 'Enviando…', codeLabel: 'Código (8 dígitos)',
    newPassword: 'Nueva contraseña', resetBtn: 'Restablecer', backToLogin: 'Volver al inicio',
    codeSent: 'Si el correo existe, enviamos un código. Revisa tu bandeja (y spam).',
    resetOk: '¡Contraseña restablecida! Inicia sesión con la nueva.',
    errCode: 'Código inválido o expirado.',
  },
}

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

const goToPanel = () => {
  // Volta para onde a pessoa ia antes do login, quando havia um destino.
  // `#painel` fixo era o que fazia o protocolo do e-mail evaporar: o login
  // funcionava, o painel abria, e o caso ficava para trás.
  window.location.hash = consumirDestino() ?? 'painel'
}

export default function LoginModal() {
  const { lang } = useTranslation()
  const tr = L[lang] ?? L.pt
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Quando a pessoa tem mais de uma empresa, mostramos o seletor.
  const [choices, setChoices] = useState<MembershipSummary[] | null>(null)
  // O seletor ganha o Console da plataforma no topo quando quem entrou é o
  // superadmin — para ele o console é um destino a mais, não um desvio.
  const [plataformaNoHub, setPlataformaNoHub] = useState(false)
  // Fluxo de recuperação de senha: 'login' | 'forgot' | 'reset'.
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  async function handleForgot(e: FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: email.trim() }, { auth: false })
      setNotice(tr.codeSent); setView('reset')
    } catch (err) { setError((err as ApiError).detail ?? tr.errServer(BASE_URL)) }
    finally { setLoading(false) }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      await api.post('/auth/reset-password',
        { email: email.trim(), code: code.trim(), new_password: newPassword }, { auth: false })
      setNotice(tr.resetOk); setView('login'); setPassword(''); setCode(''); setNewPassword('')
    } catch (err) {
      const st = (err as ApiError).status
      setError(st === 400 ? tr.errCode : (err as ApiError).detail ?? tr.errServer(BASE_URL))
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const sync = () => {
      const isOpen = window.location.hash.toLowerCase().startsWith('#entrar')
      setOpen(isOpen)
      if (isOpen) {
        setError(null)
        setChoices(null)
      }
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const close = () => {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setOpen(false)
  }

  async function enterTenant(tenantId: string) {
    await switchTenant(tenantId)
    goToPanel()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const tok = await login(email.trim(), password)
      // Um destino de painel guardado não serve para o admin de plataforma, que
      // opera FORA de qualquer empresa — descarta em vez de carregar para o
      // próximo login de outra pessoa nesta aba.
      if (tok.is_platform_admin) limparDestino()
      const me = await api.get<MeResponse>('/auth/me')
      const active = me.memberships.filter((m) => m.status === 'active')
      if (tok.is_platform_admin) {
        // O superadmin também pode ser gente de empresa. Se ele tem vínculos,
        // a pergunta "onde eu entro?" é a mesma de qualquer pessoa com mais de
        // um lugar — e o console é só mais um destino, listado primeiro. Sem
        // vínculo nenhum não há o que perguntar: vai direto ao console.
        if (active.length === 0) { window.location.hash = 'plataforma'; return }
        setPlataformaNoHub(true)
        setChoices(active)
        return
      }
      setPlataformaNoHub(false)
      if (active.length === 0) {
        setError(tr.errNoCompany)
      } else if (active.length === 1) {
        await enterTenant(active[0].tenant_id)
      } else {
        setChoices(active) // seletor de empresa
      }
    } catch (err) {
      const detail = (err as ApiError).detail
      const status = (err as ApiError).status
      setError(
        status === 401
          ? tr.errInvalid
          : detail ?? tr.errServer(BASE_URL),
      )
    } finally {
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--scrim)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="m-modal"
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 24,
          padding: 'clamp(24px,4vw,38px)',
          boxShadow: '0 30px 80px rgba(0,0,0,.45)',
          color: 'var(--text)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)' }}>
            {tr.kicker}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PrefSwitcher compact />
            <button onClick={close} aria-label={tr.close} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.4)', color: '#fca5a5', borderRadius: 12, padding: '12px 14px', fontSize: 14, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {notice && (
          <div style={{ background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.4)', color: '#6ee7b7', borderRadius: 12, padding: '12px 14px', fontSize: 14, marginBottom: 16 }}>
            {notice}
          </div>
        )}

        {/* Seletor de empresa (quando há mais de um vínculo). */}
        {choices ? (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--heading)', margin: '2px 0 6px' }}>
              {tr.chooseCompany}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 18 }}>
              {tr.chooseCompanyBody}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plataformaNoHub && (
                <button
                  onClick={() => { window.location.hash = 'plataforma'; setOpen(false) }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: '1.5px solid var(--accent)',
                    background: 'var(--accent-soft)',
                    color: 'var(--heading)',
                    cursor: 'pointer',
                    fontWeight: 800,
                  }}
                >
                  <span>{tr.platformConsole}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>
                    {tr.platformConsoleHint}
                  </span>
                </button>
              )}
              {choices.map((m) => (
                <button
                  key={m.id}
                  onClick={() => void enterTenant(m.tenant_id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--heading)',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  <span>{m.tenant_name}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>
                    {m.roles.map(localizeRole).join(', ') || tr.member}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : view === 'forgot' ? (
          <form onSubmit={handleForgot}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--heading)', margin: '2px 0 8px' }}>{tr.forgotTitle}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>{tr.forgotBody}</p>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{tr.email}</label>
              <input className="app-input" style={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" autoFocus />
            </div>
            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}>{loading ? tr.sending : tr.sendCode}</button>
            <p style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" onClick={() => { setView('login'); setError(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>{tr.backToLogin}</button>
            </p>
          </form>
        ) : view === 'reset' ? (
          <form onSubmit={handleReset}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--heading)', margin: '2px 0 18px' }}>{tr.forgotTitle}</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{tr.email}</label>
              <input className="app-input" style={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{tr.codeLabel}</label>
              <input className="app-input" style={{ ...input, letterSpacing: 4, textAlign: 'center', fontSize: 18 }} inputMode="numeric" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="00000000" autoFocus />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{tr.newPassword}</label>
              <PasswordInput style={input} required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}>{loading ? tr.sending : tr.resetBtn}</button>
            <p style={{ textAlign: 'center', marginTop: 16 }}>
              <button type="button" onClick={() => { setView('login'); setError(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>{tr.backToLogin}</button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--heading)', margin: '2px 0 18px' }}>
              {tr.signIn}
            </h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{tr.email}</label>
              <input className="app-input" style={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" autoFocus />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{tr.password}</label>
              <PasswordInput style={input} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <button type="button" onClick={() => { setView('forgot'); setError(null); setNotice(null) }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>{tr.forgot}</button>
            </div>
            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}>
              {loading ? tr.signingIn : tr.signIn}
            </button>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5, marginTop: 16 }}>
              {tr.noAccount}{' '}
              <a href="#assinar" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
                {tr.subscribe}
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
