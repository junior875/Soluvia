// Onboarding de primeira visita (estilo Apple): apresenta as configurações,
// a pessoa escolhe tema / idioma / tamanho de texto (aplicados AO VIVO) — ou pula.
// A própria tela reage ao tema escolhido (clara x escura), virando um preview real.
// Aparece uma vez por navegador (localStorage) e persiste no servidor se logado.

import { useState, type CSSProperties, type ReactNode } from 'react'
import { useTheme } from '../theme/ThemeProvider'
import { useTranslation } from '../i18n/LanguageProvider'
import { LANGS, type Lang } from '../i18n/translations'
import {
  FONT_STEPS,
  applyFontScale,
  applyThemePref,
  getFontScale,
  getThemePref,
  pushPrefs,
  type ThemePref,
} from '../lib/prefs'
import { useT } from '../app/strings'

const WELCOMED_KEY = 'soluvia.welcomed'
const alreadyWelcomed = () => {
  try { return localStorage.getItem(WELCOMED_KEY) === '1' } catch { return true }
}

type Step = 'welcome' | 'theme' | 'language' | 'font' | 'done'
const ORDER: Step[] = ['welcome', 'theme', 'language', 'font', 'done']

export default function Onboarding({ forceOpen = false }: { forceOpen?: boolean }) {
  const t = useT()
  const { theme, setTheme } = useTheme()
  const { lang, setLang } = useTranslation()
  // `forceOpen` (vindo do painel quando a CONTA ainda não passou pelo onboarding)
  // ignora o flag do navegador — garante que todo recém-cadastrado veja a tela.
  const [visible, setVisible] = useState(() => forceOpen || !alreadyWelcomed())
  const [idx, setIdx] = useState(0)
  const [themePref, setThemePref] = useState<ThemePref>(getThemePref())
  const [font, setFont] = useState(getFontScale())

  if (!visible) return null
  const step = ORDER[idx]
  const dark = theme === 'dark'

  // Paleta que segue o tema atual (faz a tela mudar de claro p/ escuro ao vivo).
  const c = {
    fg: dark ? '#ffffff' : '#0e2c46',
    muted: dark ? 'rgba(255,255,255,.72)' : '#5d6b7a',
    soft: dark ? 'rgba(255,255,255,.55)' : '#7a8794',
    cardBg: dark ? 'rgba(255,255,255,.06)' : '#ffffff',
    cardBorder: dark ? 'rgba(255,255,255,.16)' : 'rgba(20,40,70,.12)',
    chipBg: dark ? 'rgba(255,255,255,.10)' : 'rgba(14,44,70,.05)',
    chipBorder: dark ? 'rgba(255,255,255,.18)' : 'rgba(20,40,70,.14)',
    chipFg: dark ? 'rgba(255,255,255,.85)' : '#0e2c46',
    dotOff: dark ? 'rgba(255,255,255,.25)' : 'rgba(14,44,70,.20)',
  }

  const finish = () => {
    try { localStorage.setItem(WELCOMED_KEY, '1') } catch { /* ok */ }
    pushPrefs({ onboarded: true })
    setVisible(false)
  }
  const next = () => (idx >= ORDER.length - 1 ? finish() : setIdx(idx + 1))
  const back = () => setIdx(Math.max(0, idx - 1))

  const chooseTheme = (p: ThemePref) => { setThemePref(p); applyThemePref(p, setTheme); pushPrefs({ theme: p }) }
  const chooseFont = (s: number) => { setFont(s); applyFontScale(s); pushPrefs({ font_scale: s }) }
  const chooseLang = (l: Lang) => { setLang(l); pushPrefs({ language: l }) }

  return (
    <div
      className={dark ? 'brand-bg' : 'brand-bg-light'}
      style={{ position: 'fixed', inset: 0, zIndex: 10003, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', color: c.fg, textAlign: 'center' }}
    >
      {step !== 'done' && (
        <button onClick={finish} style={{ position: 'absolute', top: 22, right: 24, background: c.chipBg, border: `1px solid ${c.chipBorder}`, color: c.chipFg, borderRadius: 100, padding: '8px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
          {t.onb.skip}
        </button>
      )}

      <div key={step} className="ob-step" style={{ width: '100%', maxWidth: 560 }}>
        {step === 'welcome' && (
          <>
            <img src="/soluvia.png" alt="Soluvia" className="ob-logo" style={{ height: 96, width: 'auto', margin: '0 auto 26px' }} />
            <h1 style={{ fontSize: 'clamp(30px,6vw,46px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.05, color: c.fg }}>{t.onb.welcome}</h1>
            <p style={{ color: c.muted, fontSize: 17, marginTop: 14 }}>{t.onb.tagline}</p>
            <p style={{ color: c.soft, fontSize: 15, marginTop: 8 }}>{t.onb.personalize}</p>
          </>
        )}

        {step === 'theme' && (
          <>
            <StepTitle color={c.fg}>{t.onb.themeQ}</StepTitle>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              {([['light', t.settings.light, '#f4f6f9', '#0e2c46'], ['dark', t.settings.dark, '#0c1c2b', '#fff'], ['system', t.settings.system, 'linear-gradient(135deg,#f4f6f9 50%,#0c1c2b 50%)', '#f2921e']] as const).map(([v, label, bg, fg]) => (
                <button key={v} onClick={() => chooseTheme(v)} style={{ cursor: 'pointer', width: 150, borderRadius: 18, padding: 16, background: c.cardBg, border: `2px solid ${themePref === v ? '#f2921e' : c.cardBorder}`, color: c.fg, transition: 'background .3s, border-color .2s, color .3s' }}>
                  <div style={{ height: 64, borderRadius: 12, background: bg, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: fg, fontWeight: 900, fontSize: 22, border: '1px solid rgba(120,140,160,.2)' }}>Aa</div>
                  <span style={{ fontWeight: 700 }}>{label}</span>
                </button>
              ))}
            </div>
            <p style={{ color: c.soft, fontSize: 13.5, marginTop: 18 }}>
              {dark ? '🌙' : '☀️'} {dark ? t.settings.dark : t.settings.light}
            </p>
          </>
        )}

        {step === 'language' && (
          <>
            <StepTitle color={c.fg}>{t.onb.langQ}</StepTitle>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => chooseLang(l.code)} style={{ cursor: 'pointer', minWidth: 130, borderRadius: 16, padding: '18px 22px', background: lang === l.code ? 'rgba(242,146,30,.16)' : c.cardBg, border: `2px solid ${lang === l.code ? '#f2921e' : c.cardBorder}`, color: c.fg, fontWeight: 800, fontSize: 17 }}>
                  {l.label}
                  <div style={{ fontSize: 12.5, color: c.soft, fontWeight: 500, marginTop: 4 }}>{l.code === 'pt' ? 'Português' : l.code === 'en' ? 'English' : 'Español'}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'font' && (
          <>
            <StepTitle color={c.fg}>{t.onb.fontQ}</StepTitle>
            <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center', background: c.chipBg, border: `1px solid ${c.chipBorder}`, borderRadius: 100, padding: 8 }}>
              {FONT_STEPS.map((s, i) => (
                <button key={s} onClick={() => chooseFont(s)} style={{ cursor: 'pointer', width: 56, height: 56, borderRadius: '50%', border: 'none', background: font === s ? '#f2921e' : 'transparent', color: font === s ? '#fff' : c.fg, fontWeight: 800, fontSize: 13 + i * 4 }}>A</button>
              ))}
            </div>
            <p style={{ marginTop: 22, color: c.muted, fontSize: `${15 * font}px` }}>{lang === 'en' ? 'Soluvia — digital trust.' : lang === 'es' ? 'Soluvia — confianza digital.' : 'Soluvia — confiança digital.'}</p>
          </>
        )}

        {step === 'done' && (
          <>
            <div style={{ width: 84, height: 84, borderRadius: '50%', margin: '0 auto 22px', background: 'linear-gradient(135deg,#f2921e,#e07b12)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 50px rgba(242,146,30,.5)' }}>
              <svg width="42" height="42" viewBox="0 0 36 36" fill="none"><path d="M8 18l8 8 12-12" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h1 style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 900, letterSpacing: '-1px', color: c.fg }}>{t.onb.doneTitle}</h1>
            <p style={{ color: c.muted, fontSize: 16, marginTop: 12 }}>{t.onb.doneBody}</p>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 38, alignItems: 'center' }}>
        {idx > 0 && step !== 'done' && (
          <button onClick={back} style={{ background: 'transparent', border: `1px solid ${c.chipBorder}`, color: c.fg, borderRadius: 100, padding: '13px 26px', fontWeight: 700, cursor: 'pointer' }}>{t.onb.back}</button>
        )}
        <button onClick={next} className="cta-sheen" style={{ background: 'linear-gradient(135deg,#f2921e,#e07b12)', border: 'none', color: '#fff', borderRadius: 100, padding: '14px 40px', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 12px 34px rgba(242,146,30,.45)' }}>
          {step === 'welcome' ? t.onb.start : step === 'done' ? t.onb.enter : t.onb.next}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 30 }}>
        {ORDER.map((_, i) => (
          <span key={i} style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 100, background: i === idx ? '#f2921e' : c.dotOff, transition: 'width .3s, background .3s' }} />
        ))}
      </div>
    </div>
  )
}

function StepTitle({ children, color }: { children: ReactNode; color: string }) {
  const s: CSSProperties = { fontSize: 'clamp(24px,4vw,34px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 28, color }
  return <h2 style={s}>{children}</h2>
}
