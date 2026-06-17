import { useState, type ReactNode } from 'react'
import { useTranslation } from '../i18n/LanguageProvider'
import { LANGS, type Lang } from '../i18n/translations'
import { useTheme, type Theme } from '../theme/ThemeProvider'

function GearIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 1.5v3M12 19.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1.5 12h3M19.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

export default function SettingsMenu() {
  const [open, setOpen] = useState(false)
  const { lang, setLang, t } = useTranslation()
  const { theme, setTheme } = useTheme()

  const segWrap = {
    display: 'flex',
    gap: 6,
    background: 'var(--surface-2)',
    borderRadius: 12,
    padding: 5,
  } as const

  const segBtn = (active: boolean) =>
    ({
      flex: 1,
      border: 'none',
      cursor: 'pointer',
      borderRadius: 8,
      padding: '9px 10px',
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "'Poppins',sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      transition: 'all .2s ease',
      background: active ? 'linear-gradient(135deg,var(--accent),var(--accent-2))' : 'transparent',
      color: active ? '#fff' : 'var(--text-muted)',
      boxShadow: active ? '0 4px 14px var(--accent-shadow)' : 'none',
    }) as const

  const themeOptions: { value: Theme; label: string; icon: ReactNode }[] = [
    { value: 'light', label: t('settings.light'), icon: <SunIcon /> },
    { value: 'dark', label: t('settings.dark'), icon: <MoonIcon /> },
  ]

  return (
    <>
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 490 }} />}
      <div className="fab-gear" style={{ position: 'fixed', right: 32, bottom: 104, zIndex: 500 }}>
        {/* Painel */}
        {open && (
          <div
            role="dialog"
            aria-label={t('settings.title')}
            style={{
              position: 'absolute',
              bottom: 64,
              right: 0,
              width: 268,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: 20,
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16, letterSpacing: '.3px' }}>
              {t('settings.title')}
            </div>

            {/* Idioma */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
              {t('settings.language')}
            </div>
            <div style={{ ...segWrap, marginBottom: 18 }}>
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code as Lang)} style={segBtn(lang === l.code)}>
                  {l.label}
                </button>
              ))}
            </div>

            {/* Tema */}
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
              {t('settings.theme')}
            </div>
            <div style={segWrap}>
              {themeOptions.map((o) => (
                <button key={o.value} onClick={() => setTheme(o.value)} style={segBtn(theme === o.value)}>
                  {o.icon}
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botão engrenagem */}
        <button
          aria-label={t('settings.title')}
          onClick={() => setOpen((v) => !v)}
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(150deg,#e6eaef 0%,#c2cad3 100%)',
            color: '#27374a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(0,0,0,.32)',
            transition: 'transform .3s ease',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          <GearIcon />
        </button>
      </div>
    </>
  )
}
