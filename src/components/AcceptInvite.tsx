// Tela PÚBLICA de aceite de convite. Aberta pelo link:
//   /aceitar-convite?token=...
// Mostra a empresa/papel do convite, a pessoa define nome + senha, e entra
// direto no painel dela. (Enquanto não há e-mail, o link é copiado pelo admin.)
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { api, login, switchTenant } from '../lib/api'
import type { ApiError, MeResponse } from '../lib/types'
import { useTranslation } from '../i18n/LanguageProvider'
import PrefSwitcher from './PrefSwitcher'

interface Preview { valid: boolean; tenant_name: string | null; invited_email: string | null; role_name: string | null }

const L = {
  pt: { loading: 'Carregando convite…', invalid: 'Convite inválido ou expirado', invalidBody: 'Peça um novo link de convite ao administrador da empresa.', invited: 'Você foi convidado para', asRole: 'como', name: 'Seu nome', pass: 'Crie uma senha', passHint: 'Mínimo de 8 caracteres.', accept: 'Aceitar e entrar', accepting: 'Entrando…', short: 'A senha precisa de ao menos 8 caracteres.', fail: 'Não foi possível aceitar o convite.' },
  en: { loading: 'Loading invite…', invalid: 'Invalid or expired invite', invalidBody: 'Ask the company admin for a new invite link.', invited: 'You were invited to', asRole: 'as', name: 'Your name', pass: 'Create a password', passHint: 'At least 8 characters.', accept: 'Accept & enter', accepting: 'Entering…', short: 'Password must be at least 8 characters.', fail: 'Could not accept the invite.' },
  es: { loading: 'Cargando invitación…', invalid: 'Invitación inválida o expirada', invalidBody: 'Pide un nuevo enlace al administrador de la empresa.', invited: 'Te invitaron a', asRole: 'como', name: 'Tu nombre', pass: 'Crea una contraseña', passHint: 'Mínimo 8 caracteres.', accept: 'Aceptar y entrar', accepting: 'Entrando…', short: 'La contraseña necesita al menos 8 caracteres.', fail: 'No se pudo aceptar la invitación.' },
}

export function isAcceptInvitePath(): boolean {
  return window.location.pathname.replace(/\/$/, '') === '/aceitar-convite'
}

export default function AcceptInvite() {
  const { lang } = useTranslation()
  const tr = L[lang] ?? L.pt
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') ?? '', [])
  const [preview, setPreview] = useState<Preview | null | 'error'>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    api.get<Preview>(`/memberships/invite/${token}`).then((p) => setPreview(p)).catch(() => setPreview('error'))
  }, [token])

  async function accept() {
    if (preview === null || preview === 'error' || !preview.valid) return
    if (password.length < 8) { setErr(tr.short); return }
    setErr(null); setBusy(true)
    try {
      await api.post('/memberships/accept', { token, full_name: name.trim() || undefined, password })
      // Já loga a pessoa e a leva pro painel dela.
      await login(preview.invited_email ?? '', password)
      const me = await api.get<MeResponse>('/auth/me')
      const active = me.memberships.filter((m) => m.status === 'active')
      if (active.length) await switchTenant(active[0].tenant_id)
      window.location.href = '/#painel' // volta pra raiz (sai de /aceitar-convite)
    } catch (e) {
      setErr((e as ApiError).detail ?? tr.fail); setBusy(false)
    }
  }

  const wrap: CSSProperties = { minHeight: '100vh', background: 'var(--surface-2)', color: 'var(--text)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 16px' }
  const card: CSSProperties = { width: '100%', maxWidth: 460, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 'clamp(24px,4vw,38px)', boxShadow: 'var(--card-shadow)' }
  const input: CSSProperties = { width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 15px', color: 'var(--heading)', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const labelS: CSSProperties = { display: 'block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }

  const header = (
    <div style={{ width: '100%', maxWidth: 460, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <img src="/soluvia.png" alt="Soluvia" className="brand-logo" style={{ height: 34, width: 'auto' }} />
      <PrefSwitcher compact />
    </div>
  )

  if (preview === null) return <div style={wrap}>{header}<div style={card}>{tr.loading}</div></div>
  if (preview === 'error' || !preview.valid) {
    return <div style={wrap}>{header}<div style={card}><h1 style={{ color: 'var(--heading)', fontSize: 22, fontWeight: 800 }}>{tr.invalid}</h1><p style={{ color: 'var(--text-muted)', marginTop: 8 }}>{tr.invalidBody}</p></div></div>
  }

  return (
    <div style={wrap}>{header}
      <div style={card} className="app-modal">
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)' }}>{tr.invited}</div>
        <h1 style={{ color: 'var(--heading)', fontSize: 'clamp(22px,4vw,28px)', fontWeight: 800, marginTop: 4, letterSpacing: '-0.5px' }}>{preview.tenant_name}</h1>
        {preview.role_name && <p style={{ color: 'var(--text-muted)', fontSize: 14.5, marginTop: 4 }}>{tr.asRole} <strong style={{ color: 'var(--heading)' }}>{preview.role_name}</strong></p>}
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 6 }}>{preview.invited_email}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
          <div>
            <label style={labelS}>{tr.name}</label>
            <input className="app-input" style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={tr.name} autoFocus />
          </div>
          <div>
            <label style={labelS}>{tr.pass}</label>
            <input className="app-input" style={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 5 }}>{tr.passHint}</p>
          </div>
          {err && <div style={{ background: 'rgba(217,83,79,.12)', border: '1px solid rgba(217,83,79,.4)', color: '#e08585', borderRadius: 12, padding: '11px 14px', fontSize: 13.5 }}>{err}</div>}
          <button onClick={() => void accept()} disabled={busy} className="app-btn cta-sheen" style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff', border: 'none', borderRadius: 100, padding: '14px 28px', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 12px 30px var(--accent-shadow)', opacity: busy ? 0.6 : 1, marginTop: 4 }}>{busy ? tr.accepting : tr.accept}</button>
        </div>
      </div>
    </div>
  )
}
