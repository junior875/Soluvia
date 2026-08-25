// Cliente de API da Diagnostica (Seção 13 da especificação).
// - injeta o access token no header Authorization
// - intercepta 401 e tenta refresh automaticamente (single-flight)
// - mantém o access token em memória; o refresh fica em cookie httpOnly
// - ao trocar de tenant, atualiza o token armazenado

import { SIG_PROFILE_PREFIX } from './storageKeys'
import type {
  ApiError,
  CheckoutStartRequest,
  CheckoutStartResponse,
  PlanOut,
  SignupRequest,
  SignupResponse,
  SlugCheckResponse,
  TokenResponse,
} from './types'

// Chamadas RELATIVAS: o front pede /api/v1/... na mesma origem da página e o
// Vite (dev) REPASSA para o backend (proxy em vite.config.ts → :8791). Sem CORS,
// sem cookie cross-site e sem problema de IPv6 (localhost vs 127.0.0.1).
// Em produção, sirva o front e a API sob o mesmo domínio (ou proxie /api).
const BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined) || '/api/v1'

// ── Estado do token em memória (nunca em localStorage) ──────────────
// O access token fica só em memória; o tenant escolhido é persistido em
// localStorage para restaurar a sessão (via refresh) após um reload.
const TENANT_KEY = 'diag_tenant'
let accessToken: string | null = null
let currentTenantId: string | null = null
const listeners = new Set<(token: string | null) => void>()

export function setAccessToken(token: string | null): void {
  accessToken = token
  listeners.forEach((l) => l(token))
}

export function getAccessToken(): string | null {
  return accessToken
}

export function getCurrentTenantId(): string | null {
  return currentTenantId
}

function setCurrentTenantId(id: string | null): void {
  currentTenantId = id
  try {
    if (id) localStorage.setItem(TENANT_KEY, id)
    else localStorage.removeItem(TENANT_KEY)
  } catch {
    /* localStorage indisponível (modo privado) — segue só em memória */
  }
}

export function getStoredTenantId(): string | null {
  try {
    return currentTenantId ?? localStorage.getItem(TENANT_KEY)
  } catch {
    return currentTenantId
  }
}

export function onTokenChange(listener: (token: string | null) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// ── Refresh single-flight: várias 401 concorrentes esperam 1 refresh ──
let refreshPromise: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const resp = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
        if (!resp.ok) return false
        const data = (await resp.json()) as TokenResponse
        setAccessToken(data.access_token)
        // O token do /auth/refresh nasce SEM empresa: o refresh token guarda só
        // o usuário. Sem recolocar o contexto aqui, o retry que vem a seguir
        // bate em `get_tenant_context` e volta 403 "Selecione uma empresa" —
        // que era o erro que aparecia ao salvar um fluxo depois de um tempo
        // parado, justamente quando o token de 15 min vence.
        //
        // Admin de plataforma não tem empresa guardada e segue sem tenant, que
        // é o contexto correto para ele.
        if (getStoredTenantId()) await doReswitch()
        return true
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

// ── Re-scope single-flight: no bootstrap/reload, uma chamada de tenant pode
// disparar ANTES do switch-tenant terminar e voltar 403. Reemitimos o token
// com escopo (switch-tenant no tenant guardado) e repetimos a requisição. ──
let reswitchPromise: Promise<boolean> | null = null

async function doReswitch(): Promise<boolean> {
  if (!reswitchPromise) {
    reswitchPromise = (async () => {
      try {
        const tid = getStoredTenantId()
        if (!tid) return false
        const resp = await fetch(`${BASE_URL}/auth/switch-tenant`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ tenant_id: tid }),
        })
        if (!resp.ok) return false
        const data = (await resp.json()) as TokenResponse
        setAccessToken(data.access_token)
        setCurrentTenantId(data.tenant_id)
        return true
      } catch {
        return false
      } finally {
        reswitchPromise = null
      }
    })()
  }
  return reswitchPromise
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  auth?: boolean // default true
  // Duas recuperações DIFERENTES, cada uma com sua vez. Uma flag só fazia o
  // refresh gastar a única tentativa e a re-seleção de empresa — que era a
  // correção de fato — nunca acontecer.
  _refreshed?: boolean
  _reswitched?: boolean
}

// Idioma atual (o LanguageProvider persiste em 'soluvia.lang') → header X-Lang,
// para o backend traduzir as mensagens de erro (detail) no idioma do usuário.
export function currentLang(): string {
  try {
    return localStorage.getItem('soluvia.lang') || 'pt'
  } catch {
    return 'pt'
  }
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, _refreshed = false, _reswitched = false, headers, ...rest } = options

  const finalHeaders: Record<string, string> = {
    'X-Lang': currentLang(),
    ...(headers as Record<string, string> | undefined),
  }
  // Só envia Content-Type quando há corpo — evita preflight extra em GETs.
  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json'
  }
  if (auth && accessToken) {
    finalHeaders['Authorization'] = `Bearer ${accessToken}`
  }

  const resp = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  // 401 → tenta um refresh transparente e repete a requisição uma vez.
  if (resp.status === 401 && auth && !_refreshed) {
    const ok = await doRefresh()
    if (ok) {
      return apiFetch<T>(path, { ...options, _refreshed: true })
    }
    setAccessToken(null)
  }

  // 403 → o token pode ainda não estar no escopo do tenant (corrida no bootstrap).
  // Reemite o token com escopo e repete UMA vez. (Não vale para rotas /auth/*.)
  if (resp.status === 403 && auth && !_reswitched && !path.startsWith('/auth/')) {
    const ok = await doReswitch()
    if (ok) {
      return apiFetch<T>(path, { ...options, _reswitched: true })
    }
  }

  if (resp.status === 204) {
    return undefined as T
  }

  const text = await resp.text()
  const data = text ? JSON.parse(text) : null

  if (!resp.ok) {
    const detail =
      (data && (data.detail as string)) || `Erro ${resp.status} ao chamar ${path}`
    const error: ApiError = { status: resp.status, detail }
    throw error
  }
  return data as T
}

// ── Upload multipart (FormData) ─────────────────────────────────────
// O fetch nativo define o boundary do Content-Type sozinho; NÃO envie o header
// manualmente. Reaproveita o refresh transparente de 401 igual ao apiFetch.
async function apiUpload<T>(path: string, form: FormData, retried = false): Promise<T> {
  const headers: Record<string, string> = { 'X-Lang': currentLang() }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const resp = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: form,
  })

  if (resp.status === 401 && !retried) {
    const ok = await doRefresh()
    if (ok) return apiUpload<T>(path, form, true)
    setAccessToken(null)
  }
  if (resp.status === 403 && !retried) {
    const ok = await doReswitch()
    if (ok) return apiUpload<T>(path, form, true)
  }

  const text = await resp.text()
  const data = text ? JSON.parse(text) : null
  if (!resp.ok) {
    const detail = (data && (data.detail as string)) || `Erro ${resp.status} ao enviar ${path}`
    const error: ApiError = { status: resp.status, detail }
    throw error
  }
  return data as T
}

// ── GET de um binário autenticado (blobs: PDF/DOCX assinado) ─────────
async function apiGetBlob(path: string, retried = false): Promise<{ blob: Blob; filename: string; mime: string }> {
  const headers: Record<string, string> = {}
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const resp = await fetch(`${BASE_URL}${path}`, { credentials: 'include', headers })

  if (resp.status === 401 && !retried) {
    const ok = await doRefresh()
    if (ok) return apiGetBlob(path, true)
    setAccessToken(null)
  }
  if (resp.status === 403 && !retried) {
    const ok = await doReswitch()
    if (ok) return apiGetBlob(path, true)
  }
  if (!resp.ok) {
    const error: ApiError = { status: resp.status, detail: `Falha no download (${resp.status})` }
    throw error
  }
  const blob = await resp.blob()
  const cd = resp.headers.get('content-disposition') || ''
  const match = /filename="?([^"]+)"?/.exec(cd)
  return {
    blob,
    filename: match ? match[1] : 'arquivo',
    mime: resp.headers.get('content-type') || blob.type || 'application/octet-stream',
  }
}

async function apiPostBlob(path: string, body: unknown, retried = false): Promise<{ blob: Blob; filename: string; mime: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: 'POST', credentials: 'include', headers, body: JSON.stringify(body ?? {}),
  })
  if (resp.status === 401 && !retried) {
    const ok = await doRefresh()
    if (ok) return apiPostBlob(path, body, true)
    setAccessToken(null)
  }
  if (resp.status === 403 && !retried) {
    const ok = await doReswitch()
    if (ok) return apiPostBlob(path, body, true)
  }
  if (!resp.ok) {
    const error: ApiError = { status: resp.status, detail: `Falha ao gerar o arquivo (${resp.status})` }
    throw error
  }
  const blob = await resp.blob()
  const cd = resp.headers.get('content-disposition') || ''
  const match = /filename="?([^"]+)"?/.exec(cd)
  return { blob, filename: match ? match[1] : 'arquivo.pdf', mime: resp.headers.get('content-type') || blob.type || 'application/pdf' }
}

// ── Helpers semânticos ──────────────────────────────────────────────
export const api = {
  get: <T>(path: string, opts?: RequestOptions) => apiFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'DELETE' }),
  /** POST multipart/form-data (uploads de arquivo). */
  upload: <T>(path: string, form: FormData) => apiUpload<T>(path, form),
  /** GET de um binário autenticado (devolve blob + filename + mime). */
  getBlob: (path: string) => apiGetBlob(path),
  /** POST JSON que devolve um binário autenticado (ex.: export PDF). */
  postBlob: (path: string, body: unknown) => apiPostBlob(path, body),
}

/** Salva um blob como download no navegador. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// ── Fluxo de autenticação ───────────────────────────────────────────
export async function login(email: string, password: string): Promise<TokenResponse> {
  const data = await api.post<TokenResponse>('/auth/login', { email, password }, { auth: false })
  setAccessToken(data.access_token)
  setCurrentTenantId(data.tenant_id)
  return data
}

export async function switchTenant(tenantId: string): Promise<TokenResponse> {
  // Emite um novo access token no contexto do tenant escolhido e o armazena.
  const data = await api.post<TokenResponse>('/auth/switch-tenant', { tenant_id: tenantId })
  setAccessToken(data.access_token)
  setCurrentTenantId(data.tenant_id)
  return data
}

/** Rubricas guardadas no aparelho não podem sobreviver ao fim da sessão: é uma
 *  imagem legível do nome completo de quem assinou. */
function clearSignatureProfiles(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(SIG_PROFILE_PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  } catch { /* modo privado / storage indisponível */ }
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } finally {
    setAccessToken(null)
    setCurrentTenantId(null)
    clearSignatureProfiles()
  }
}

/** Exclui a própria conta (self-service) e encerra a sessão local. */
export async function deleteAccount(): Promise<void> {
  await api.delete('/me/account')
  setAccessToken(null)
  setCurrentTenantId(null)
  clearSignatureProfiles()
}

/** Restaura o access token a partir do cookie de refresh (após um reload).
 *  Não mexe no tenant salvo — o painel re-seleciona via switchTenant(). */
export async function refreshSession(): Promise<boolean> {
  try {
    const data = await api.post<TokenResponse>('/auth/refresh', {}, { auth: false })
    setAccessToken(data.access_token)
    return true
  } catch {
    return false
  }
}

// ── Jornada self-service (planos + cartão + criação da conta) ───────
export function listPlans(): Promise<PlanOut[]> {
  return api.get<PlanOut[]>('/plans', { auth: false })
}

export function checkSlug(slug: string): Promise<SlugCheckResponse> {
  return api.get<SlugCheckResponse>(`/signup/check-slug?slug=${encodeURIComponent(slug)}`, {
    auth: false,
  })
}

export async function signup(payload: SignupRequest): Promise<SignupResponse> {
  // [legado/mock] Contrata o plano com cartão mockado e já entra autenticado.
  const data = await api.post<SignupResponse>('/signup', payload, { auth: false })
  setAccessToken(data.access_token)
  setCurrentTenantId(data.tenant.id)
  return data
}

/** Inicia o pagamento: devolve a URL da tela hospedada da Stripe. */
export function startCheckout(payload: CheckoutStartRequest): Promise<CheckoutStartResponse> {
  return api.post<CheckoutStartResponse>('/signup/checkout', payload, { auth: false })
}

/** Confirma o pagamento (ao voltar da Stripe) e já entra autenticado. */
export async function completeCheckout(sessionId: string): Promise<SignupResponse> {
  const data = await api.post<SignupResponse>('/signup/complete', { session_id: sessionId }, { auth: false })
  setAccessToken(data.access_token)
  setCurrentTenantId(data.tenant.id)
  return data
}

/** Baixa um arquivo autenticado (export LGPD) disparando o download no navegador. */
export async function downloadAuthedFile(path: string): Promise<void> {
  const resp = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
  if (!resp.ok) {
    const err: ApiError = { status: resp.status, detail: `Falha no download (${resp.status})` }
    throw err
  }
  const blob = await resp.blob()
  const cd = resp.headers.get('content-disposition') || ''
  const match = /filename="?([^"]+)"?/.exec(cd)
  const name = match ? match[1] : 'export'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export { BASE_URL }
