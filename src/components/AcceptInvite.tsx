// Tela PÚBLICA de aceite de convite. Aberta pelo link:
//   /aceitar-convite?token=...
// Mostra a empresa/papel do convite, a pessoa define nome + senha, e entra
// direto no painel dela. (Enquanto não há e-mail, o link é copiado pelo admin.)
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { api, forgetStoredTenantId, login, switchTenant } from '../lib/api'
import { PasswordInput } from '../app/ui'
import type { ApiError, MeResponse } from '../lib/types'
import { useTranslation } from '../i18n/LanguageProvider'
import PrefSwitcher from './PrefSwitcher'

interface Preview { valid: boolean; tenant_name: string | null; invited_email: string | null; role_name: string | null; conta_existente?: boolean }

const L = {
  pt: { loading: 'Carregando convite…', invalid: 'Convite inválido ou expirado', invalidBody: 'Peça um novo link de convite ao administrador da empresa.', invited: 'Você foi convidado para', asRole: 'como', name: 'Seu nome', pass: 'Crie uma senha', passHint: 'Mínimo de 8 caracteres.', accept: 'Aceitar e entrar', accepting: 'Entrando…', short: 'A senha precisa de ao menos 8 caracteres.', fail: 'Não foi possível aceitar o convite.', codeLabel: 'Código do e-mail', codeHint: 'Enviamos 8 dígitos para o e-mail acima.', codeNext: 'Continuar', codeChecking: 'Conferindo…', codeShort: 'O código tem 8 dígitos.', step1: 'Passo 1 de 2 · confirme que o e-mail é seu', step2: 'Passo 2 de 2 · escolha sua senha', back: 'Voltar', existingNote: 'Você já tem conta na Soluvia com este e-mail. Aceitar adiciona esta empresa ao seu login — seu e-mail e sua senha continuam os mesmos.', existingStep: 'Confirme que o e-mail é seu', existingAccept: 'Aceitar convite', existingBusy: 'Aceitando…' },
  en: { loading: 'Loading invite…', invalid: 'Invalid or expired invite', invalidBody: 'Ask the company admin for a new invite link.', invited: 'You were invited to', asRole: 'as', name: 'Your name', pass: 'Create a password', passHint: 'At least 8 characters.', accept: 'Accept & enter', accepting: 'Entering…', short: 'Password must be at least 8 characters.', fail: 'Could not accept the invite.', codeLabel: 'Code from the email', codeHint: 'We sent 8 digits to the address above.', codeNext: 'Continue', codeChecking: 'Checking…', codeShort: 'The code has 8 digits.', step1: 'Step 1 of 2 · confirm the email is yours', step2: 'Step 2 of 2 · choose your password', back: 'Back', existingNote: 'You already have a Soluvia account with this email. Accepting adds this company to your login — your email and password stay the same.', existingStep: 'Confirm the email is yours', existingAccept: 'Accept invite', existingBusy: 'Accepting…' },
  es: { loading: 'Cargando invitación…', invalid: 'Invitación inválida o expirada', invalidBody: 'Pide un nuevo enlace al administrador de la empresa.', invited: 'Te invitaron a', asRole: 'como', name: 'Tu nombre', pass: 'Crea una contraseña', passHint: 'Mínimo 8 caracteres.', accept: 'Aceptar y entrar', accepting: 'Entrando…', short: 'La contraseña necesita al menos 8 caracteres.', fail: 'No se pudo aceptar la invitación.', codeLabel: 'Código del correo', codeHint: 'Enviamos 8 dígitos al correo de arriba.', codeNext: 'Continuar', codeChecking: 'Comprobando…', codeShort: 'El código tiene 8 dígitos.', step1: 'Paso 1 de 2 · confirma que el correo es tuyo', step2: 'Paso 2 de 2 · elige tu contraseña', back: 'Volver', existingNote: 'Ya tienes una cuenta de Soluvia con este correo. Aceptar añade esta empresa a tu acceso — tu correo y tu contraseña siguen iguales.', existingStep: 'Confirma que el correo es tuyo', existingAccept: 'Aceptar invitación', existingBusy: 'Aceptando…' },
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
  // O convite tem DOIS passos: primeiro o código que foi para o e-mail, depois
  // a senha. Ter o link não basta — é preciso ter aberto a caixa de entrada.
  const [step, setStep] = useState<'code' | 'password'>('code')
  const [code, setCode] = useState('')

  const soDigitos = (v: string) => v.replace(/[^0-9]/g, '')

  const contaExistente = preview !== null && preview !== 'error' && preview.conta_existente === true

  async function checkCode() {
    const limpo = soDigitos(code)
    if (limpo.length !== 8) { setErr(tr.codeShort); return }
    setErr(null); setBusy(true)
    try {
      // Confere SEM consumir o código: assim o erro aparece agora, e não depois
      // de a pessoa digitar nome e senha à toa.
      await api.post('/memberships/check-code', { token, code: limpo }, { auth: false })
      if (contaExistente) {
        // Quem já tem conta não define nada: o código É o aceite. A senha
        // continua sendo UMA só, a mesma de sempre.
        // Sem auth: o aceite é público e se prova pelo código. Mandar o token
        // da sessão antiga aqui só criaria uma dança de refresh sem função.
        await api.post('/memberships/accept', { token, code: limpo }, { auth: false })
        // A lista de empresas acabou de mudar, então a pessoa tem de cair no
        // HUB — não na empresa antiga. Esquecer a empresa guardada é o que faz
        // o boot perguntar em vez de entrar direto; sem isso, quem já estava
        // logado neste navegador nunca veria a empresa nova.
        forgetStoredTenantId()
        try {
          // Sessão viva? Vai direto ao painel, que abre no hub.
          await api.get('/auth/me')
          window.location.href = '/#painel'
        } catch {
          // Sem sessão: entra primeiro; o login também abre o hub com 2+.
          window.location.href = '/#entrar'
        }
        return
      }
      setCode(limpo); setStep('password')
    } catch (e) {
      setErr((e as ApiError).detail ?? tr.fail)
    } finally { setBusy(false) }
  }

  useEffect(() => {
    api.get<Preview>(`/memberships/invite/${token}`).then((p) => setPreview(p)).catch(() => setPreview('error'))
  }, [token])

  async function accept() {
    if (preview === null || preview === 'error' || !preview.valid) return
    if (password.length < 8) { setErr(tr.short); return }
    setErr(null); setBusy(true)
    try {
      await api.post('/memberships/accept', { token, code, full_name: name.trim() || undefined, password })
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

        {contaExistente && (
          <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', color: 'var(--heading)', borderRadius: 12, padding: '11px 14px', fontSize: 13, marginTop: 12 }}>
            {tr.existingNote}
          </div>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 14, fontWeight: 600 }}>
          {contaExistente ? tr.existingStep : step === 'code' ? tr.step1 : tr.step2}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
          {step === 'code' ? (
            <div>
              <label style={labelS}>{tr.codeLabel}</label>
              <input
                className="app-input"
                style={{ ...input, fontSize: 26, fontWeight: 800, letterSpacing: '.34em', textAlign: 'center', fontFamily: 'ui-monospace,SFMono-Regular,Consolas,monospace' }}
                value={code}
                onChange={(e) => setCode(soDigitos(e.target.value).slice(0, 8))}
                onKeyDown={(e) => { if (e.key === 'Enter') void checkCode() }}
                placeholder="00000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                autoFocus
              />
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 5 }}>{tr.codeHint}</p>
            </div>
          ) : (
            <>
              <div>
                <label style={labelS}>{tr.name}</label>
                <input className="app-input" style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={tr.name} autoFocus />
              </div>
              <div>
                <label style={labelS}>{tr.pass}</label>
                <PasswordInput style={input} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void accept() }} placeholder="••••••••" />
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 5 }}>{tr.passHint}</p>
              </div>
            </>
          )}

          {err && <div style={{ background: 'rgba(217,83,79,.12)', border: '1px solid rgba(217,83,79,.4)', color: '#e08585', borderRadius: 12, padding: '11px 14px', fontSize: 13.5 }}>{err}</div>}

          <button
            onClick={() => void (step === 'code' ? checkCode() : accept())}
            disabled={busy}
            className="app-btn cta-sheen"
            style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff', border: 'none', borderRadius: 100, padding: '14px 28px', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 12px 30px var(--accent-shadow)', opacity: busy ? 0.6 : 1, marginTop: 4 }}
          >
            {busy
              ? (contaExistente ? tr.existingBusy : step === 'code' ? tr.codeChecking : tr.accepting)
              : (contaExistente ? tr.existingAccept : step === 'code' ? tr.codeNext : tr.accept)}
          </button>

          {step === 'password' && (
            <button onClick={() => { setStep('code'); setErr(null) }} className="app-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              &larr; {tr.back}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
