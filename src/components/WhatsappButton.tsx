import { useState } from 'react'
import { useTranslation } from '../i18n/LanguageProvider'

interface WhatsappButtonProps {
  /** Número no formato internacional, somente dígitos. Ex.: 5511999999999 */
  phone?: string
}

const SIZE = 58

export default function WhatsappButton({ phone = '5500000000000' }: WhatsappButtonProps) {
  const [hover, setHover] = useState(false)
  const { t } = useTranslation()

  return (
    <div className="fab-wa" style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 500, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          opacity: hover ? 1 : 0,
          transform: hover ? 'translateX(0)' : 'translateX(8px)',
          transition: 'opacity .25s ease, transform .25s ease',
          background: 'var(--navy)',
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
          padding: '10px 18px',
          borderRadius: 100,
          whiteSpace: 'nowrap',
          boxShadow: '0 6px 20px rgba(0,0,0,.25)',
          border: '1px solid rgba(255,255,255,.08)',
          pointerEvents: 'none',
        }}
      >
        {t('wa.tooltip')}
      </div>

      <a
        href={`https://wa.me/${phone}`}
        target="_blank"
        rel="noreferrer"
        aria-label={t('wa.tooltip')}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          position: 'relative',
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          background: 'linear-gradient(150deg,#2ec566 0%,#1aa64f 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          boxShadow: hover ? '0 10px 26px rgba(16,90,50,.4)' : '0 6px 18px rgba(16,90,50,.28)',
          transform: hover ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'transform .25s ease, box-shadow .25s ease',
        }}
      >
        {/* Glifo WhatsApp corporativo (linha limpa) */}
        <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path
            d="M16 4.5c-6.35 0-11.5 5.15-11.5 11.5 0 2.03.53 3.98 1.54 5.71L4.5 27.5l5.95-1.5a11.45 11.45 0 0 0 5.55 1.42h.01c6.35 0 11.49-5.15 11.49-11.5 0-3.07-1.2-5.96-3.37-8.13A11.43 11.43 0 0 0 16 4.5z"
            fill="#fff"
          />
          <path
            d="M16 6.6a9.38 9.38 0 0 0-9.4 9.4c0 1.86.55 3.6 1.5 5.06l.22.35-.92 3.36 3.45-.9.34.2a9.34 9.34 0 0 0 4.8 1.32h.01a9.4 9.4 0 0 0 6.64-16.04A9.34 9.34 0 0 0 16 6.6z"
            fill="url(#waG)"
          />
          <path
            d="M12.6 11.1c-.2-.46-.42-.47-.62-.48l-.53-.01c-.18 0-.48.07-.74.34-.25.27-.97.95-.97 2.32s1 2.69 1.14 2.87c.14.18 1.94 3.1 4.79 4.23 2.37.93 2.85.75 3.36.7.51-.04 1.66-.67 1.9-1.33.23-.66.23-1.22.16-1.34-.07-.11-.25-.18-.53-.32-.27-.14-1.66-.82-1.91-.91-.26-.09-.44-.14-.63.14-.18.27-.72.91-.88 1.1-.16.18-.32.21-.6.07-.27-.14-1.16-.43-2.21-1.36-.82-.73-1.37-1.63-1.53-1.9-.16-.28-.02-.43.12-.56.12-.12.27-.32.41-.48.14-.16.18-.27.27-.46.09-.18.05-.34-.02-.48-.07-.14-.61-1.52-.86-2.07z"
            fill="#fff"
          />
          <defs>
            <linearGradient id="waG" x1="16" y1="6.6" x2="16" y2="25.4" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2ec566" />
              <stop offset="1" stopColor="#1aa64f" />
            </linearGradient>
          </defs>
        </svg>

        {/* Selo IA */}
        <div
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
            borderRadius: 100,
            minWidth: 22,
            height: 22,
            padding: '0 7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg)',
            boxShadow: '0 2px 8px rgba(0,0,0,.25)',
          }}
        >
          <span style={{ color: 'white', fontSize: 10, fontWeight: 800, letterSpacing: '.5px' }}>IA</span>
        </div>
      </a>
    </div>
  )
}
