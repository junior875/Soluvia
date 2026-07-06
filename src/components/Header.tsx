import { useState } from 'react'
import { useTranslation } from '../i18n/LanguageProvider'

const NAV_LINKS = [
  { href: '#features', key: 'nav.features' },
  { href: '#planos', key: 'nav.plans' },
  { href: '#faq', key: 'nav.faq' },
]

/**
 * Logo Soluvia (PNG transparente, colorido).
 * Recebe um leve brilho branco para legibilidade sobre o header escuro,
 * sem caixa/chip ao redor.
 */
function Logo({ height = 88 }: { height?: number }) {
  return (
    <img
      src="/soluvia.png"
      alt="Soluvia"
      className="brand-logo"
      style={{ height, width: 'auto', display: 'block' }}
    />
  )
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const { t, lang } = useTranslation()
  const closeLabel = lang === 'en' ? 'Close' : lang === 'es' ? 'Cerrar' : 'Fechar'

  const openMenu = () => {
    setOpen(true)
    document.body.style.overflow = 'hidden'
  }
  const closeMenu = () => {
    setOpen(false)
    document.body.style.overflow = ''
  }

  return (
    <>
      <nav
        id="main-nav"
        role="navigation"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          padding: '18px 60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          transition: 'all 0.45s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <a href="#hero" style={{ textDecoration: 'none' }} aria-label="Soluvia">
          <Logo />
        </a>

        <div className="rsp-nav" style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} style={{ color: 'rgba(255,255,255,.78)', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}>
              {t(l.key)}
            </a>
          ))}
          <a href="#entrar" style={{ color: 'rgba(255,255,255,.9)', textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>
            Entrar
          </a>
          <a
            href="#assinar"
            style={{
              background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
              color: 'white',
              padding: '11px 26px',
              borderRadius: 100,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 16px var(--accent-shadow)',
            }}
          >
            {t('nav.start')}
          </a>
        </div>

        <button id="nav-hbg" aria-label="Menu" onClick={openMenu} style={{ background: 'none', border: 'none' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M3 6h16M3 11h16M3 16h16" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </nav>

      <div id="mobile-nav" className={open ? 'open' : ''}>
        <button
          aria-label={closeLabel}
          onClick={closeMenu}
          style={{
            position: 'absolute',
            top: 28,
            right: 28,
            background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 12,
            width: 44,
            height: 44,
            color: 'white',
            fontSize: 22,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
        <div style={{ marginBottom: 12 }}>
          <Logo height={60} />
        </div>
        {NAV_LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={closeMenu}>
            {t(l.key)}
          </a>
        ))}
        <a href="#entrar" onClick={closeMenu}>
          Entrar
        </a>
        <a
          href="#assinar"
          onClick={closeMenu}
          style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: 'white', padding: '16px 48px', borderRadius: 100, fontSize: 20, fontWeight: 700 }}
        >
          {t('nav.start')}
        </a>
      </div>
    </>
  )
}
