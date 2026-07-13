// Monta a área autenticada (#painel): CapabilityProvider faz o boot e gateia os
// estados; o Shell renderiza a sidebar por papel + a tela ativa.
// GATE de verificação de e-mail: enquanto o usuário logado não confirmou o
// e-mail (context.user.email_verified === false), mostramos uma tela cheia
// "Confirme seu e-mail" (código de 8 dígitos) no lugar do painel.
import { useEffect, useState } from 'react'
import { CapabilityProvider, useCaps } from '../app/capabilities'
import Shell from '../app/Shell'
import { api } from '../lib/api'
import { useTranslation } from '../i18n/LanguageProvider'
import type { Lang } from '../i18n/translations'
import { Button, Card } from '../app/ui'
import { Icon } from '../app/icons'

export default function Panel() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const sync = () => setOpen(window.location.hash.toLowerCase().startsWith('#painel'))
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  if (!open) return null
  return (
    <CapabilityProvider>
      <EmailGuard>
        <Shell />
      </EmailGuard>
    </CapabilityProvider>
  )
}

// ── i18n local (PT/EN/ES) — sem tocar em strings.ts / arquivos compartilhados ──
interface GateStrings {
  kicker: string
  title: string
  intro: (email: string) => string
  codeLabel: string
  placeholder: string
  confirm: string
  verifying: string
  resend: string
  sending: string
  resent: string
  errInvalid: string
  errGeneric: string
  logout: string
}

const GATE_I18N: Record<Lang, GateStrings> = {
  pt: {
    kicker: 'Verificação',
    title: 'Confirme seu e-mail',
    intro: (email) =>
      `Enviamos um código de 8 dígitos para ${email}. Digite-o abaixo para liberar o acesso ao painel.`,
    codeLabel: 'Código de verificação',
    placeholder: '00000000',
    confirm: 'Confirmar',
    verifying: 'Confirmando…',
    resend: 'Reenviar código',
    sending: 'Enviando…',
    resent: 'Enviamos um novo código para o seu e-mail.',
    errInvalid: 'Código inválido ou expirado.',
    errGeneric: 'Não foi possível confirmar agora. Tente novamente.',
    logout: 'Sair',
  },
  en: {
    kicker: 'Verification',
    title: 'Confirm your email',
    intro: (email) =>
      `We sent an 8-digit code to ${email}. Enter it below to unlock access to the panel.`,
    codeLabel: 'Verification code',
    placeholder: '00000000',
    confirm: 'Confirm',
    verifying: 'Confirming…',
    resend: 'Resend code',
    sending: 'Sending…',
    resent: 'We sent a new code to your email.',
    errInvalid: 'Invalid or expired code.',
    errGeneric: 'We could not confirm right now. Please try again.',
    logout: 'Sign out',
  },
  es: {
    kicker: 'Verificación',
    title: 'Confirma tu correo',
    intro: (email) =>
      `Enviamos un código de 8 dígitos a ${email}. Ingrésalo abajo para desbloquear el acceso al panel.`,
    codeLabel: 'Código de verificación',
    placeholder: '00000000',
    confirm: 'Confirmar',
    verifying: 'Confirmando…',
    resend: 'Reenviar código',
    sending: 'Enviando…',
    resent: 'Enviamos un nuevo código a tu correo.',
    errInvalid: 'Código inválido o expirado.',
    errGeneric: 'No pudimos confirmar ahora. Inténtalo de nuevo.',
    logout: 'Salir',
  },
}

// Gateia o Shell: só o mostra quando o e-mail está confirmado. Enquanto
// email_verified === false, exibe o card de verificação por cima do painel.
function EmailGuard({ children }: { children: React.ReactNode }) {
  const caps = useCaps()
  // O tipo PanelContext.user ainda não declara email_verified (arquivo compartilhado
  // — não editamos). O backend já envia o campo; lemos de forma segura.
  const user = caps.ctx.user as typeof caps.ctx.user & { email_verified?: boolean }

  if (user.email_verified === false) return <EmailGate email={user.email} />
  return <>{children}</>
}

function EmailGate({ email }: { email: string }) {
  const caps = useCaps()
  const { lang } = useTranslation()
  const tt = GATE_I18N[lang] ?? GATE_I18N.pt

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [sending, setSending] = useState(false)
  const [resent, setResent] = useState(false)

  const canSubmit = code.length === 8 && !verifying

  async function submit() {
    if (!canSubmit) return
    setVerifying(true)
    setError(null)
    setResent(false)
    try {
      await api.post('/auth/verify-email', { code })
      // Re-busca o contexto: com email_verified === true, o Guard libera o Shell.
      await caps.reload()
      // Não desligamos 'verifying' — o reload remonta a árvore quando ficar pronto.
    } catch (e) {
      const status = (e as { status?: number }).status
      setError(status === 400 ? tt.errInvalid : tt.errGeneric)
      setVerifying(false)
    }
  }

  async function resend() {
    if (sending) return
    setSending(true)
    setError(null)
    setResent(false)
    try {
      await api.post('/auth/resend-verification')
      setResent(true)
    } catch {
      setError(tt.errGeneric)
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-flex',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Icon name="shield" size={28} />
        </span>

        <p
          style={{
            color: 'var(--accent)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {tt.kicker}
        </p>
        <h2 style={{ color: 'var(--heading)', fontSize: 24, fontWeight: 800, marginBottom: 10 }}>
          {tt.title}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14.5, lineHeight: 1.5, marginBottom: 22 }}>
          {tt.intro(email)}
        </p>

        <label
          style={{
            display: 'block',
            color: 'var(--text-muted)',
            fontSize: 12.5,
            fontWeight: 600,
            marginBottom: 8,
            textAlign: 'left',
          }}
        >
          {tt.codeLabel}
        </label>
        <input
          className="app-input"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 8))
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          placeholder={tt.placeholder}
          aria-label={tt.codeLabel}
          style={{
            width: '100%',
            background: 'var(--surface-2)',
            border: `1px solid ${error ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 12,
            padding: '14px 16px',
            color: 'var(--heading)',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 10,
            textAlign: 'center',
            outline: 'none',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />

        {error && (
          <p style={{ color: 'var(--accent)', fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>
            {error}
          </p>
        )}
        {resent && !error && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 10 }}>{tt.resent}</p>
        )}

        <div style={{ marginTop: 20 }}>
          <Button
            onClick={() => void submit()}
            loading={verifying}
            disabled={!canSubmit}
            style={{ width: '100%' }}
          >
            {verifying ? tt.verifying : tt.confirm}
          </Button>
        </div>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="app-btn"
            onClick={() => void resend()}
            disabled={sending}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: sending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              padding: 4,
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? tt.sending : tt.resend}
          </button>
          <span style={{ color: 'var(--border)' }}>•</span>
          <button
            type="button"
            className="app-btn"
            onClick={() => void caps.logout()}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontWeight: 600,
              fontSize: 13.5,
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: 4,
            }}
          >
            {tt.logout}
          </button>
        </div>
      </Card>
    </div>
  )
}
