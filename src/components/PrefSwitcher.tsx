// Switcher compacto de idioma + tema. Usado dentro dos modais (Signup/Login/
// onboarding), onde o menu de configurações da home fica coberto.

import { useTheme } from '../theme/ThemeProvider'
import { useTranslation } from '../i18n/LanguageProvider'
import { LANGS } from '../i18n/translations'
import { applyThemePref, getThemePref } from '../lib/prefs'

export default function PrefSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()
  const { lang, setLang } = useTranslation()
  const isDark = getThemePref() === 'dark' || (getThemePref() === 'system' && theme === 'dark')
  const themeLabel = ({ pt: 'Tema', en: 'Theme', es: 'Tema' } as Record<string, string>)[lang] ?? 'Tema'

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 100, padding: 3 }}>
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            style={{ border: 'none', cursor: 'pointer', padding: compact ? '4px 9px' : '5px 11px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: lang === l.code ? 'var(--accent)' : 'transparent', color: lang === l.code ? '#fff' : 'var(--text-muted)' }}
          >
            {l.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label={themeLabel}
        title={themeLabel}
        onClick={() => applyThemePref(isDark ? 'light' : 'dark', setTheme)}
        style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
      >
        {isDark ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8Z" /></svg>
        )}
      </button>
    </div>
  )
}
