// Set de ícones SVG (traço uniforme, herdam currentColor) — combina com o logo.
import type { CSSProperties } from 'react'

export type IconName =
  | 'overview'
  | 'cases'
  | 'nr1'
  | 'people'
  | 'roles'
  | 'channels'
  | 'billing'
  | 'audit'
  | 'sun'
  | 'moon'
  | 'globe'
  | 'logout'
  | 'lock'
  | 'plus'
  | 'check'
  | 'close'
  | 'chevron'
  | 'copy'
  | 'menu'
  | 'spark'
  | 'shield'
  | 'settings'
  | 'download'
  | 'signature'
  | 'flow'
  | 'trash'
  | 'eye'
  | 'eyeOff'

const PATHS: Record<IconName, JSX.Element> = {
  eye: (
    <>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M10.6 6.7A9.7 9.7 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.4 4.1M6.4 7.9A17 17 0 0 0 2 12s3.6 6.5 10 6.5c1.5 0 2.8-.3 4-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      {/* A barra atravessa o olho inteiro: sem ela o "escondido" fica quase
          igual ao "visível" no tamanho de ícone, e o botão perde o sentido. */}
      <path d="M3 3l18 18" />
    </>
  ),
  flow: (
    <>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="12" r="2.4" />
      <path d="M8.4 6H13a3 3 0 0 1 3 3v.4M8.4 18H13a3 3 0 0 0 3-3v-.4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </>
  ),
  overview: <path d="M4 13h7V4H4v9Zm9 7h7v-9h-7v9ZM4 20h7v-5H4v5ZM13 4v5h7V4h-7Z" />,
  cases: (
    <>
      <path d="M3 7l9 5 9-5" />
      <rect x="3" y="5" width="18" height="14" rx="2" />
    </>
  ),
  nr1: <path d="M3 12h4l3 8 4-16 3 8h4" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 8.5a3 3 0 0 1 0 0M15.5 5.5a3 3 0 0 1 4.8 4.2M16 14.6a5 5 0 0 1 4.5 4.4" />
    </>
  ),
  roles: <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3Z" />,
  channels: (
    <>
      <path d="M4 9h3l8-4v14l-8-4H4z" />
      <path d="M18 9a3 3 0 0 1 0 6" />
    </>
  ),
  billing: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18" />
    </>
  ),
  audit: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 12h7M9 16h7M9 8h3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </>
  ),
  moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8Z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </>
  ),
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  lock: (
    <>
      <rect x="4.5" y="11" width="15" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12l4.5 4.5L19 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  spark: <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />,
  shield: <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3Z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1" />
    </>
  ),
  download: <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" />,
  signature: (
    <>
      <path d="M3 18c2.5 0 3-4 4.5-8.5S10 3 11 3s.8 3 .3 7-1 7.5.7 7.5c1.3 0 2-2 3-2s1.4 1 2.5 1" />
      <path d="M14 19.5c2-1.6 4-2.4 6-2.4" />
    </>
  ),
}

interface IconProps {
  name: IconName
  size?: number
  style?: CSSProperties
  strokeWidth?: number
}

export function Icon({ name, size = 20, style, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
