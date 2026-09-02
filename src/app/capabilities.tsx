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
import { localizeRole } from '../lib/systemNames'
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
  /** Vínculos ativos desta pessoa — o hub só aparece quando há mais de um. */
  memberships: MembershipSummary[]
  /** Volta ao hub de empresas SEM deslogar — para entrar na outra empresa. */
  openHub: () => void
  /** Troca DIRETO para o vínculo dado — o caminho do menu de perfil. */
  switchTenant: (tenantId: string) => Promise<void>
  /** Permissões ganhas desde a última visita ao manual — vira o número na nav. */
  manualNovas: string[]
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
  // TODOS os vínculos ativos, guardados desde o boot: é o que permite abrir o
  // hub DEPOIS de logado (trocar de empresa) sem uma nova ida ao /auth/me.
  const [vinculos, setVinculos] = useState<MembershipSummary[]>([])
  // Superadmin que TAMBÉM é gente de empresa: o console é mais um destino do
  // hub, não um desvio — o mesmo desenho do seletor de login.
  const [ehPlataforma, setEhPlataforma] = useState(false)
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
      // Guardar ANTES de mostrar o login: neste instante o endereço ainda é o
      // do e-mail (`#painel/cases?caso=…`), e é a última chance de saber para
      // onde a pessoa ia. Sem isto, só sobrevivia o destino de quem JÁ estava
      // logado e teve a sessão expirada no meio — o clique vindo da caixa de
      // entrada, que é o caso comum, terminava sempre no painel genérico.
      if (!ok) { guardarDestino(); return setStatus('login') }
    }
    let me: MeResponse
    try {
      me = await api.get<MeResponse>('/auth/me')
    } catch {
      guardarDestino()
      return setStatus('login')
    }
    const active = me.memberships.filter((m) => m.status === 'active')
    setVinculos(active)
    setEhPlataforma(me.is_platform_admin === true)
    if (active.length === 0) return setStatus('error'), setError(t.states.noCompany)
    const stored = getStoredTenantId()
    const tenantId =
      stored && active.some((m) => m.tenant_id === stored)
        ? stored
        : active.length === 1
          ? active[0].tenant_id
          : null
    // O e-mail sabe de qual empresa é o caso (`empresa=<slug>` no link). Com
    // 2+ vínculos o boot parava no hub e a escolha ENGOLIA o destino — a
    // pessoa clicava em "abrir e dar meu parecer" e terminava na visão geral
    // de outra empresa. Se o link nomeia a empresa e a pessoa tem vínculo
    // nela, entra direto — na empresa certa, na tela certa.
    if (!tenantId) {
      const query = window.location.hash.split('?')[1]
      const slugDoLink = query ? new URLSearchParams(query).get('empresa') : null
      const doLink = slugDoLink ? active.find((m) => m.tenant_slug === slugDoLink) : null
      if (doLink) {
        await loadContext(doLink.tenant_id)
        return
      }
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
            manualNovas: ctx.manual_new_permissions ?? [],
            isContractable: (m) => ctx.contractable_modules.includes(m),
            reload: () => loadContext(ctx.tenant_id),
            logout: async () => {
              await apiLogout()
              goHome()
            },
            memberships: vinculos,
            // Reusa o estado 'select' do boot: o MESMO hub das duas portas —
            // login e troca — para a pessoa nunca aprender duas telas.
            openHub: () => {
              setChoices(vinculos)
              setStatus('select')
            },
            // Trocar de empresa também troca de TELA (a rota atual pode nem
            // existir lá) — mesma regra do hub.
            switchTenant: async (tenantId: string) => {
              window.location.hash = 'painel'
              await loadContext(tenantId)
            },
          }
        : null,
    [ctx, loadContext, vinculos],
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
          <Card style={{ maxWidth: 480, width: '100%' }}>
            <h2 style={{ color: 'var(--heading)', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{t.states.chooseCompany}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>{t.states.chooseCompanyBody}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ehPlataforma && (
                <button
                  type="button"
                  onClick={() => { window.location.hash = 'plataforma' }}
                  className="app-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderRadius: 14, border: '1.5px solid var(--accent)', background: 'var(--accent-soft)', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ width: 40, height: 40, minWidth: 40, borderRadius: 12, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="settings" size={19} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', color: 'var(--heading)', fontWeight: 800, fontSize: 15 }}>{t.states.platformConsole}</span>
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, marginTop: 2 }}>{t.states.platformConsoleHint}</span>
                  </span>
                  <Icon name="chevron" size={17} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </button>
              )}
              {choices.map((m) => {
                const atual = ctx !== null && ctx.tenant_id === m.tenant_id
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      // Trocar de empresa também troca de TELA: a rota atual
                      // (um caso aberto, um construtor) pode nem existir lá.
                      window.location.hash = 'painel'
                      void loadContext(m.tenant_id)
                    }}
                    className="app-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${atual ? 'var(--accent)' : 'var(--border)'}`, background: atual ? 'var(--accent-soft)' : 'var(--surface-2)', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <span style={{ width: 40, height: 40, minWidth: 40, borderRadius: 12, background: atual ? 'var(--accent)' : 'var(--surface)', border: '1px solid var(--border)', color: atual ? '#fff' : 'var(--accent)', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(m.tenant_name || '?').trim().charAt(0).toUpperCase()}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', color: 'var(--heading)', fontWeight: 800, fontSize: 15 }}>
                        {m.tenant_name}
                        {atual && <span style={{ marginLeft: 8, color: 'var(--accent)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.states.currentCompany}</span>}
                      </span>
                      {/* O PAPEL em cada empresa: é o que diferencia os dois
                          vínculos quando os nomes não bastam. */}
                      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, marginTop: 2 }}>
                        {(m.roles ?? []).map(localizeRole).join(', ') || t.states.memberRole}
                      </span>
                    </span>
                    <Icon name="chevron" size={17} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </button>
                )
              })}
            </div>
            {/* Aberto de DENTRO (trocando): dá para desistir e ficar onde está.
                No login não há "onde está" — o botão só existe com contexto. */}
            {ctx !== null && (
              <button
                type="button"
                onClick={() => setStatus('ready')}
                className="app-btn"
                style={{ marginTop: 14, width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
              >
                {t.states.stayHere}
              </button>
            )}
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
