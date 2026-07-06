// Shell do painel: sidebar montada por capacidade + topbar (tema/idioma/sair) +
// área de conteúdo que renderiza a tela ativa (navegação por hash #painel/<id>).

import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '../theme/ThemeProvider'
import { useTranslation } from '../i18n/LanguageProvider'
import { LANGS } from '../i18n/translations'
import { useCaps } from './capabilities'
import { useT } from './strings'
import { SCREENS, evaluate, type ScreenState } from './registry'
import { currentScreenId, goScreen } from './nav'
import { Avatar, IconButton } from './ui'
import { Icon } from './icons'

const GROUPS = ['main', 'modules', 'config', 'admin'] as const

export default function Shell() {
  const caps = useCaps()
  const { ctx } = caps
  const t = useT()
  const { theme, toggle } = useTheme()
  const { lang, setLang } = useTranslation()
  const [active, setActive] = useState(currentScreenId())
  const [drawer, setDrawer] = useState(false)

  // Telas visíveis (ok|locked) com seu estado, na ordem do registro.
  const evaluated = useMemo(
    () => SCREENS.map((s) => ({ s, state: evaluate(s.requires, caps) as ScreenState })).filter((x) => x.state !== 'hidden'),
    [caps],
  )
  const okIds = useMemo(() => new Set(evaluated.filter((x) => x.state === 'ok').map((x) => x.s.id)), [evaluated])

  // Sincroniza tela ativa com o hash; cai p/ 1ª permitida se inválida.
  useEffect(() => {
    const sync = () => {
      const id = currentScreenId()
      setActive(okIds.has(id) ? id : 'overview')
      setDrawer(false)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [okIds])

  const ActiveScreen = SCREENS.find((s) => s.id === active)?.Component ?? SCREENS[0].Component

  return (
    <div className="app-bg" style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', color: 'var(--text)' }}>
      {/* Backdrop mobile */}
      <div className={`app-sidebar-backdrop ${drawer ? 'open' : ''}`} onClick={() => setDrawer(false)} />

      {/* Sidebar */}
      <aside className={`app-sidebar ${drawer ? 'open' : ''}`} style={{ width: 260, minWidth: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '16px 14px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/soluvia.png" alt="Soluvia" className={theme === 'dark' ? 'brand-logo' : undefined} style={{ width: '78%', maxWidth: 196, height: 'auto', display: 'block' }} />
        </div>

        <nav className="app-scroll" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {GROUPS.map((g) => {
            const items = evaluated.filter((x) => x.s.group === g)
            if (!items.length) return null
            return (
              <div key={g} style={{ marginBottom: 8 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', padding: '8px 13px 6px' }}>{t.nav[g]}</p>
                {items.map(({ s, state }) => {
                  const isActive = state === 'ok' && active === s.id
                  return (
                    <button
                      key={s.id}
                      className={`app-nav-item ${isActive ? 'active' : ''} ${state === 'locked' ? 'locked' : ''}`}
                      onClick={() => (state === 'locked' ? goScreen('billing') : goScreen(s.id))}
                    >
                      {s.logo ? (
                        <img src={s.logo} alt="" className="module-logo" style={{ width: 27, height: 27, minWidth: 27, objectFit: 'contain', margin: '-4px 0' }} />
                      ) : (
                        <Icon name={s.icon} size={18} />
                      )}
                      <span style={{ flex: 1 }}>{t.nav[s.navKey]}</span>
                      {state === 'locked' && <Icon name="lock" size={15} />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={ctx.user.full_name} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ctx.user.full_name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ctx.user.email}</div>
            </div>
            <IconButton icon="logout" label={t.common.logout} onClick={() => void caps.logout()} />
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {/* Topbar */}
        <header style={{ height: 64, minHeight: 64, borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 clamp(16px,3vw,28px)' }}>
          <button className="app-btn app-burger" aria-label="Menu" onClick={() => setDrawer(true)} style={{ display: 'none', width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <Icon name="menu" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--heading)', fontWeight: 800, minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            <span className="pnl-topbar-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ctx.tenant_name}</span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Idioma */}
            <div className="pnl-lang" style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 100, padding: 3 }}>
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)} className="app-btn" style={{ border: 'none', cursor: 'pointer', padding: '5px 11px', borderRadius: 100, fontSize: 12.5, fontWeight: 700, background: lang === l.code ? 'var(--accent)' : 'transparent', color: lang === l.code ? '#fff' : 'var(--text-muted)' }}>
                  {l.label}
                </button>
              ))}
            </div>
            {/* Tema */}
            <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={t.topbar.theme} onClick={toggle} />
          </div>
        </header>

        {/* Tela ativa */}
        <div className="app-scroll" style={{ flex: 1, overflowY: 'auto', padding: 'clamp(18px,3vw,34px)' }}>
          <div className="app-zoomable" style={{ maxWidth: 1080, margin: '0 auto' }}>
            <div key={active}>
              <ActiveScreen />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
