// Trata o retorno da tela hospedada da Stripe.
// success_url volta como  ?checkout=ok&session_id=...  → confirma o pagamento
// (POST /signup/complete), entra logado e vai para o painel.
// Confirma UMA ÚNICA VEZ por sessão (evita loop com StrictMode/remontagem).

import { useEffect, useRef, useState } from 'react'
import { completeCheckout } from '../lib/api'
import type { ApiError } from '../lib/types'
import { useTranslation } from '../i18n/LanguageProvider'

const DONE_KEY = 'diag_checkout_done'

const L = {
  pt: { confirming: 'Confirmando seu pagamento…', preparing: 'Estamos preparando o seu ambiente.',
    almost: 'Quase lá', signIn: 'Fazer login', errPay: 'Não foi possível confirmar o pagamento.' },
  en: { confirming: 'Confirming your payment…', preparing: 'We are setting up your environment.',
    almost: 'Almost there', signIn: 'Sign in', errPay: 'We could not confirm the payment.' },
  es: { confirming: 'Confirmando tu pago…', preparing: 'Estamos preparando tu entorno.',
    almost: 'Casi listo', signIn: 'Entrar', errPay: 'No se pudo confirmar el pago.' },
}

// Leva ao painel SEM F5: limpa a query e força a troca de rota (hashchange).
function goPanel() {
  history.replaceState(null, '', window.location.pathname)
  if (window.location.hash.toLowerCase() === '#painel') {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = 'painel'
  }
}

export default function CheckoutReturn() {
  const { lang } = useTranslation()
  const tr = L[lang] ?? L.pt
  const [phase, setPhase] = useState<'idle' | 'working' | 'error' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const params = new URLSearchParams(window.location.search)
    const checkout = params.get('checkout')
    const sessionId = params.get('session_id')

    if (checkout === 'cancel') {
      history.replaceState(null, '', window.location.pathname)
      window.location.hash = 'assinar'
      return
    }
    if (checkout !== 'ok' || !sessionId) return

    // Já confirmamos esta sessão? Vai direto pro painel (sem rechamar).
    if (sessionStorage.getItem(DONE_KEY) === sessionId) {
      goPanel()
      return
    }

    setPhase('working')
    completeCheckout(sessionId)
      .then(() => {
        sessionStorage.setItem(DONE_KEY, sessionId)
        goPanel()
        // ESSENCIAL: tira o overlay para o painel (já montado) aparecer sem F5.
        setPhase('done')
      })
      .catch((e: ApiError) => {
        setError(e.detail ?? tr.errPay)
        setPhase('error')
      })
  }, [])

  if (phase === 'idle' || phase === 'done') return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      {phase === 'working' ? (
        <div>
          <div style={{ width: 54, height: 54, margin: '0 auto 18px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.9s linear infinite' }} />
          <p style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 20 }}>{tr.confirming}</p>
          <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>{tr.preparing}</p>
        </div>
      ) : (
        <div style={{ maxWidth: 420 }}>
          <p style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>{tr.almost}</p>
          <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>{error}</p>
          <a href="#entrar" style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff', borderRadius: 100, padding: '12px 26px', fontWeight: 700, textDecoration: 'none' }}>{tr.signIn}</a>
        </div>
      )}
    </div>
  )
}
