// Preferências de interface: tema (claro/escuro/sistema), idioma padrão e
// tamanho de fonte. Persistidas localmente (por navegador) e no servidor
// (cross-device) quando logado. Aplicadas no boot do app.

import { api, getAccessToken } from './api'
import type { Theme } from '../theme/ThemeProvider'
import type { Lang } from '../i18n/translations'

export type ThemePref = 'light' | 'dark' | 'system'

const FONT_KEY = 'soluvia.fontScale'
const THEMEPREF_KEY = 'soluvia.themePref'
const LANG_KEY = 'soluvia.lang'
const THEME_KEY = 'soluvia.theme'

export const FONT_STEPS = [0.9, 1.0, 1.12, 1.25]

const ls = {
  get: (k: string): string | null => {
    try { return localStorage.getItem(k) } catch { return null }
  },
  set: (k: string, v: string) => {
    try { localStorage.setItem(k, v) } catch { /* modo privado */ }
  },
}

// ── Tamanho da fonte (zoom no conteúdo do painel) ──────────────────
export function getFontScale(): number {
  const v = parseFloat(ls.get(FONT_KEY) ?? '1')
  return Number.isFinite(v) ? Math.min(1.4, Math.max(0.85, v)) : 1
}

export function applyFontScale(scale: number): void {
  document.documentElement.style.setProperty('--app-zoom', String(scale))
  ls.set(FONT_KEY, String(scale))
}

// ── Preferência de tema (sistema resolve a cor do SO) ──────────────
export function getThemePref(): ThemePref {
  const v = ls.get(THEMEPREF_KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

function osTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Aplica a preferência de tema usando o setter do ThemeProvider. */
export function applyThemePref(pref: ThemePref, setTheme: (t: Theme) => void): void {
  ls.set(THEMEPREF_KEY, pref)
  setTheme(pref === 'system' ? osTheme() : pref)
}

// ── Boot: aplica o que está salvo antes do React montar ────────────
export function initPrefsEarly(): void {
  applyFontScale(getFontScale())
  if (getThemePref() === 'system') ls.set(THEME_KEY, osTheme())
}

// ── Sync com o servidor ────────────────────────────────────────────
export interface ServerPrefs {
  theme: string
  language: string
  font_scale: number
  onboarded: boolean
  marketing_consent: boolean
}

/** Aplica preferências vindas do servidor (login em outro device). */
export function applyServerPrefs(
  prefs: ServerPrefs,
  setTheme: (t: Theme) => void,
  setLang: (l: Lang) => void,
): void {
  if (prefs.theme === 'light' || prefs.theme === 'dark' || prefs.theme === 'system') {
    applyThemePref(prefs.theme, setTheme)
  }
  if (prefs.language && prefs.language !== 'auto') {
    ls.set(LANG_KEY, prefs.language)
    setLang(prefs.language as Lang)
  }
  if (prefs.font_scale) applyFontScale(prefs.font_scale)
}

/** Envia preferências ao servidor (best-effort; só se logado). */
export function pushPrefs(partial: Partial<ServerPrefs & { accept_terms: boolean }>): void {
  if (!getAccessToken()) return
  void api.patch('/me/preferences', partial).catch(() => {})
}
