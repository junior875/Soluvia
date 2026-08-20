// CapabilityProvider — o boot do painel e a fonte da verdade de "o que pode".
// Restaura a sessão (refresh + switch-tenant), busca GET /auth/context e expõe
// can()/hasModule()/isContractable()/ctx. Renderiza estados (loading/login/
// seletor de empresa) com o design system; só monta o Shell quando 'ready'.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  api,
  getAccessToken,
  getStoredTenantId,
  logout as apiLogout,
  refreshSession,
  switchTenant,
} from '../lib/api'
import type { MembershipSummary, MeResponse, PanelContext } from '../lib/types'
import { useTheme } from '../theme/ThemeProvider'
import { useTranslation } from '../i18n/LanguageProvider'
import { applyServerPrefs } from '../lib/prefs'
import { useT } from './strings'
import { Button, Card } from './ui'
import { Icon } from './icons'
import Onboarding from '../components/Onboarding'
import { guardarDestino } from './destino'

type Status = 'loading' | 'ready' | 'login' | 'select' | 'error'

interface Caps {
  ctx: PanelContext
  can: (code: string) => boolean
  hasModule: (m: string) => boolean
  isContractable: (m: string) => boolean
  reload: () => Promise<void>
  logout: () => Promise<void>
}

const CapCtx = createContext<Caps | null>(null)

export function useCaps(): Caps {
  const c = useContext(CapCtx)
  if (!c) throw new Error('useCaps precisa estar dentro de <CapabilityProvider>')
  return c
}

function hasPermission(perms: string[], code: string): boolean {
  if (perms.includes(code) || perms.includes('*')) return true
  return perms.includes(`${code.split('.', 1)[0]}.*`)
}

const goHome = () => {
  history.replaceState(null, '', window.location.pathname + window.location.search)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function CapabilityProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const { setTheme } = useTheme()
  const { setLang } = useTranslation()
  const [status, setStatus] = useState<Status>('loading')
  const [ctx, setCtx] = useState<PanelContext | null>(null)
  const [choices, setChoices] = useState<MembershipSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadContext = useCallback(async (tenantId: string) => {
    setStatus('loading')
    try {
      await switchTenant(tenantId)
      const data = await api.get<PanelContext>('/auth/context')
      setCtx(data)
      // Aplica as preferências salvas no servidor (tema/idioma/fonte) — cross-device.
      applyServerPrefs(data.user, setTheme, setLang)
      setStatus('ready')
    } catch {
      setError('Falha ao carregar o contexto da empresa.')
      setStatus('error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const boot = useCallback(async () => {
    setStatus('loading')
    setError(null)
    if (!getAccessToken()) {
      const ok = await refreshSession()
      if (!ok) return setStatus('login')
    }
    let me: MeResponse
    try {
      me = await api.get<MeResponse>('/auth/me')
    } catch {
      return setStatus('login')
    }
    const active = me.memberships.filter((m) => m.status === 'active')
    if (active.length === 0) return setStatus('error'), setError(t.states.noCompany)
    const stored = getStoredTenantId()
    const tenantId =
      stored && active.some((m) => m.tenant_id === stored)
        ? stored
        : active.length === 1
          ? active[0].tenant_id
          : null
    if (!tenantId) {
      setChoices(active)
      return setStatus('select')
    }
    await loadContext(tenantId)
    // 't' é só p/ a mensagem de "sem empresa"; fora das deps p/ não re-bootar ao trocar idioma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadContext])

  useEffect(() => {
    void boot()
  }, [boot])

  const value = useMemo<Caps | null>(
    () =>
      ctx
        ? {
            ctx,
            can: (code) => hasPermission(ctx.permissions, code),
            hasModule: (m) => ctx.enabled_modules.includes(m),
            isContractable: (m) => ctx.contractable_modules.includes(m),
            reload: () => loadContext(ctx.tenant_id),
            logout: async () => {
              await apiLogout()
              goHome()
            },
          }
        : null,
    [ctx, loadContext],
  )

  // ── Estados não-prontos (mesma identidade visual) ──────────────
  if (status !== 'ready' || !value) {
    return (
      <ShellLess>
        {status === 'loading' && (
          <p style={{ color: 'var(--text-muted)' }}>{t.states.loadingPanel}</p>
        )}
        {status === 'login' && (
          <Card style={{ maxWidth: 420, textAlign: 'center' }}>
            <h2 style={{ color: 'var(--heading)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{t.states.sessionExpired}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>{t.states.sessionExpiredBody}</p>
            {/* Guarda o destino ANTES de trocar o hash: depois da troca a
                informação já se perdeu, e é justamente aqui que ela some —
                quem chega do e-mail de triagem está em
                `#painel/cases?protocolo=…` neste exato momento. */}
            <Button onClick={() => { guardarDestino(); window.location.hash = 'entrar' }}>{t.states.login}</Button>
          </Card>
        )}
        {status === 'error' && (
          <Card style={{ maxWidth: 460 }}>
            <p style={{ color: 'var(--heading)', marginBottom: 16 }}>{error}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button onClick={() => (window.location.hash = 'assinar')}>{t.states.subscribe}</Button>
              <Button variant="ghost" onClick={goHome}>{t.states.backToSite}</Button>
            </div>
          </Card>
        )}
        {status === 'select' && (
          <Card style={{ maxWidth: 460, width: '100%' }}>
            <h2 style={{ color: 'var(--heading)', fontSize: 20, fontWeight: 800, marginBottom: 14 }}>{t.states.chooseCompany}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {choices.map((m) => (
                <button key={m.id} onClick={() => void loadContext(m.tenant_id)} className="app-btn" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--heading)', cursor: 'pointer', fontWeight: 700 }}>
                  <span>{m.tenant_name}</span>
                  <Icon name="chevron" size={18} />
                </button>
              ))}
            </div>
          </Card>
        )}
      </ShellLess>
    )
  }

  return (
    <CapCtx.Provider value={value}>
      {children}
      {/* Primeiro acesso da CONTA: tela de preferências (tema/idioma/fonte). */}
      {value.ctx.user.onboarded === false && <Onboarding forceOpen />}
    </CapCtx.Provider>
  )
}

// Container de tela cheia para os estados (sem o shell ainda).
function ShellLess({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {children}
    </div>
  )
}
