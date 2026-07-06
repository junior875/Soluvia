// Contexto de autenticação: login único, seletor de empresa e guarda por permissão.
// A checagem real é sempre no back-end; aqui é só UX (Seção 13.6).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, login as apiLogin, logout as apiLogout, switchTenant as apiSwitch } from './api'
import type { MeResponse, MembershipSummary, TokenResponse } from './types'

interface AuthState {
  me: MeResponse | null
  loading: boolean
  // Contexto de tenant atual (após switch-tenant).
  tenantId: string | null
  permissions: string[]
  scope: Record<string, unknown>
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<MeResponse>
  selectTenant: (tenantId: string) => Promise<TokenResponse>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  // True se o token atual concede a permissão (ou curinga de módulo).
  can: (code: string) => boolean
  // Precisa do seletor de empresa? (mais de um vínculo e nenhum escolhido)
  needsTenantSelection: boolean
  memberships: MembershipSummary[]
}

const AuthContext = createContext<AuthContextValue | null>(null)

function hasPermission(permissions: string[], code: string): boolean {
  if (permissions.includes(code) || permissions.includes('*')) return true
  const mod = code.split('.', 1)[0]
  return permissions.includes(`${mod}.*`)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    me: null,
    loading: true,
    tenantId: null,
    permissions: [],
    scope: {},
  })

  const refreshMe = useCallback(async () => {
    try {
      const me = await api.get<MeResponse>('/auth/me')
      setState((s) => ({ ...s, me, loading: false }))
    } catch {
      setState((s) => ({ ...s, me: null, loading: false }))
    }
  }, [])

  // Tenta restaurar a sessão via cookie de refresh ao montar.
  useEffect(() => {
    void (async () => {
      try {
        await api.post<TokenResponse>('/auth/refresh', {}, { auth: false })
        await refreshMe()
      } catch {
        setState((s) => ({ ...s, loading: false }))
      }
    })()
  }, [refreshMe])

  const login = useCallback(
    async (email: string, password: string) => {
      await apiLogin(email, password)
      const me = await api.get<MeResponse>('/auth/me')
      setState((s) => ({ ...s, me, loading: false }))
      // Se houver exatamente um vínculo, já entra nele automaticamente.
      if (me.memberships.length === 1) {
        await selectTenantInternal(me.memberships[0].tenant_id)
      }
      return me
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const selectTenantInternal = async (tenantId: string) => {
    const data = await apiSwitch(tenantId)
    setState((s) => ({
      ...s,
      tenantId: data.tenant_id,
      permissions: data.permissions,
      scope: data.scope,
    }))
    return data
  }

  const selectTenant = useCallback((tenantId: string) => selectTenantInternal(tenantId), [])

  const logout = useCallback(async () => {
    await apiLogout()
    setState({ me: null, loading: false, tenantId: null, permissions: [], scope: {} })
  }, [])

  const can = useCallback((code: string) => hasPermission(state.permissions, code), [state.permissions])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      memberships: state.me?.memberships ?? [],
      needsTenantSelection:
        !!state.me && state.tenantId === null && (state.me.memberships.length ?? 0) > 1,
      login,
      selectTenant,
      logout,
      refreshMe,
      can,
    }),
    [state, login, selectTenant, logout, refreshMe, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
