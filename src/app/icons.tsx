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
  | 'bell'
  | 'megaphone'
  | 'clock'
  | 'inbox'
  | 'chart'
  | 'headset'
  | 'vault'
  | 'book'

const PATHS: Record<IconName, JSX.Element> = {
  vault: (
    <>
      <rect x="3" y="4" width="18" height="15" rx="2.5" />
      <circle cx="12" cy="11.5" r="3.6" />
      <path d="M12 9.4v-1M12 14.6v-1M14.1 11.5h1M8.9 11.5h1" />
      <path d="M6.5 19v2M17.5 19v2" />
    </>
  ),
  headset: (
    <>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13.5h2.5a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4.5ZM17.5 13.5H20V18a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-3.5a1 1 0 0 1 1-1Z" />
      <path d="M20 18v1.2a2 2 0 0 1-2 2h-4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.5 13.5L6 5.5a1 1 0 0 1 1-.7h10a1 1 0 0 1 1 .7l2.5 8v4.7a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-4.7Z" />
      <path d="M3.5 13.5H9a3 3 0 0 0 6 0h5.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v15a1 1 0 0 0 1 1h15" />
      <path d="M8.5 15.5v-4M13 15.5V8M17.5 15.5v-6.5" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3 10v4a1 1 0 0 0 1 1h2l6 4V5L6 9H4a1 1 0 0 0-1 1Z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M13.7 20a2 2 0 0 1-3.4 0" />
    </>
  ),
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
  book: (
    <>
      <path d="M12 6.5C10.5 5 8.6 4.3 6 4.3H3.6v13.4H6c2.6 0 4.5.7 6 2.2 1.5-1.5 3.4-2.2 6-2.2h2.4V4.3H18c-2.6 0-4.5.7-6 2.2Z" />
      <path d="M12 6.5v13.4" />
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

// ══════════════════════════════════════════════════════════════════
// DUOTONE — os ícones da NAV, desenhados à mão em duas camadas:
// um preenchimento suave atrás (a "sombra" da forma) e o traço na frente.
//
// As cores das camadas vêm de variáveis que o TEMA define (index.css):
// no claro o preenchimento é um véu discreto do accent; no escuro ele é um
// brilho mais denso e o traço clareia. É o que faz cada modo ter o SEU set —
// o mesmo desenho, entintado para o fundo em que vive.
// ══════════════════════════════════════════════════════════════════
type Duo = { back: JSX.Element; front: JSX.Element }

const DUO: Partial<Record<IconName, Duo>> = {
  overview: {
    // Só UM quadrante ganha o véu — o "você está aqui" do painel. O contorno
    // continua sendo o desenho; o preenchimento é acento, não silhueta.
    back: <rect x="13" y="11" width="7" height="9" rx="2" />,
    front: (
      <>
        <rect x="4" y="4" width="7" height="9" rx="1.5" />
        <rect x="13" y="4" width="7" height="5" rx="1.5" />
        <rect x="4" y="15" width="7" height="5" rx="1.5" />
        <rect x="13" y="11" width="7" height="9" rx="1.5" />
      </>
    ),
  },
  check: {
    // O traço desenha o selo; o véu é uma meia-lua interna, não a moeda cheia
    // que virava um botão pesado no escuro.
    back: <path d="M12 3.5a8.5 8.5 0 0 0 0 17V3.5Z" />,
    front: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.2 12.4l2.6 2.6 5-5.8" />
      </>
    ),
  },
  eye: {
    // Véu só na metade de baixo da amêndoa + pupila cheia: o olho continua
    // legível como traço, com profundidade em vez de mancha.
    back: (
      <>
        <path d="M2 12s3.6 6.5 10 6.5S22 12 22 12H2Z" />
        <circle cx="12" cy="12" r="2.8" />
      </>
    ),
    front: (
      <>
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.8" />
      </>
    ),
  },
  people: {
    back: <circle cx="9.5" cy="8" r="4" />,
    front: (
      <>
        <circle cx="9.5" cy="8" r="3.6" />
        <path d="M3.5 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
        <path d="M16 4.8a3.6 3.6 0 0 1 0 6.4M17.5 14.9c1.8.8 3 2.4 3 5.1" />
      </>
    ),
  },
  roles: {
    back: <path d="M12 2.8l7 2.8v5.2c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V5.6l7-2.8Z" />,
    front: (
      <>
        <path d="M12 2.8l7 2.8v5.2c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V5.6l7-2.8Z" />
        <path d="M9 11.8l2.2 2.2 4-4.6" />
      </>
    ),
  },
  channels: {
    back: <path d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />,
    front: (
      <>
        <path d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
        <path d="M7.5 9h9M7.5 12h5.5" />
      </>
    ),
  },
  audit: {
    back: <path d="M6 2.8h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1Z" />,
    front: (
      <>
        <path d="M6 2.8h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1Z" />
        <path d="M14 3v4h4M8.5 12h7M8.5 15.5h5" />
      </>
    ),
  },
  flow: {
    back: (
      <>
        <circle cx="6" cy="6" r="3.2" />
        <circle cx="6" cy="18" r="3.2" />
        <circle cx="18" cy="12" r="3.2" />
      </>
    ),
    front: (
      <>
        <circle cx="6" cy="6" r="2.4" />
        <circle cx="6" cy="18" r="2.4" />
        <circle cx="18" cy="12" r="2.4" />
        <path d="M8.4 6H13a3 3 0 0 1 3 3v.4M8.4 18H13a3 3 0 0 0 3-3v-.4" />
      </>
    ),
  },
  billing: {
    back: <rect x="2.5" y="5.5" width="19" height="13" rx="2" />,
    front: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
        <path d="M2.5 9.8h19M6 14.6h4" />
      </>
    ),
  },
  settings: {
    back: <circle cx="12" cy="12" r="8.5" />,
    front: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6" />
      </>
    ),
  },
  megaphone: {
    back: <path d="M3 10v4a1 1 0 0 0 1 1h2l6 4V5L6 9H4a1 1 0 0 0-1 1Z" />,
    front: (
      <>
        <path d="M3 10v4a1 1 0 0 0 1 1h2l6 4V5L6 9H4a1 1 0 0 0-1 1Z" />
        <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
      </>
    ),
  },
  bell: {
    back: <path d="M18 8a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />,
    front: (
      <>
        <path d="M18 8a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
        <path d="M13.7 20a2 2 0 0 1-3.4 0" />
      </>
    ),
  },
  signature: {
    back: <path d="M3 18c2.5 0 3-4 4.5-8.5S10 3 11 3s.8 3 .3 7-1 7.5.7 7.5c1.3 0 2-2 3-2s1.4 1 2.5 1L14 19.5H3V18Z" />,
    front: (
      <>
        <path d="M3 18c2.5 0 3-4 4.5-8.5S10 3 11 3s.8 3 .3 7-1 7.5.7 7.5c1.3 0 2-2 3-2s1.4 1 2.5 1" />
        <path d="M14 19.5c2-1.6 4-2.4 6-2.4" />
      </>
    ),
  },
  cases: {
    back: <path d="M12 2.8l7.5 3v6c0 4.9-3.2 8.7-7.5 10.4C7.7 20.5 4.5 16.7 4.5 11.8v-6l7.5-3Z" />,
    front: (
      <>
        <path d="M12 2.8l7.5 3v6c0 4.9-3.2 8.7-7.5 10.4C7.7 20.5 4.5 16.7 4.5 11.8v-6l7.5-3Z" />
        <path d="M12 8v5M12 16.2v.1" />
      </>
    ),
  },
  vault: {
    // O véu é a porta do cofre; o mecanismo fica em traço por cima.
    back: <rect x="3" y="4" width="18" height="15" rx="2.5" />,
    front: (
      <>
        <rect x="3" y="4" width="18" height="15" rx="2.5" />
        <circle cx="12" cy="11.5" r="3.6" />
        <path d="M12 9.4v-1M12 14.6v-1M14.1 11.5h1M8.9 11.5h1" />
        <path d="M6.5 19v2M17.5 19v2" />
      </>
    ),
  },
  headset: {
    back: <path d="M4 13a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-4l-1-1.5h5a1 1 0 0 0 1-1V13a7 7 0 1 0-14 0v5Z" />,
    front: (
      <>
        <path d="M4 13a8 8 0 0 1 16 0" />
        <path d="M4 13.5h2.5a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4.5ZM17.5 13.5H20V18a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-3.5a1 1 0 0 1 1-1Z" />
        <path d="M20 18v1.2a2 2 0 0 1-2 2h-4" />
      </>
    ),
  },
  clock: {
    back: <circle cx="12" cy="12" r="8.5" />,
    front: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
  },
  inbox: {
    back: <path d="M3.5 13.5L6 5.5a1 1 0 0 1 1-.7h10a1 1 0 0 1 1 .7l2.5 8v4.7a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-4.7Z" />,
    front: (
      <>
        <path d="M3.5 13.5L6 5.5a1 1 0 0 1 1-.7h10a1 1 0 0 1 1 .7l2.5 8v4.7a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-4.7Z" />
        <path d="M3.5 13.5H9a3 3 0 0 0 6 0h5.5" />
      </>
    ),
  },
  chart: {
    back: <path d="M6.7 11.5h3.6v6.5H6.7v-6.5ZM11.2 6h3.6v12h-3.6V6ZM15.7 9h3.6v9h-3.6V9Z" />,
    front: (
      <>
        <path d="M4 4v15a1 1 0 0 0 1 1h15" />
        <path d="M8.5 15.5v-4M13 15.5V8M17.5 15.5v-6.5" />
      </>
    ),
  },
  sun: {
    back: <circle cx="12" cy="12" r="5.2" />,
    front: (
      <>
        <circle cx="12" cy="12" r="3.9" />
        <path d="M12 2.8v2.2M12 19v2.2M2.8 12h2.2M19 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6" />
      </>
    ),
  },
  moon: {
    back: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />,
    front: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />,
  },
  menu: {
    back: <rect x="3" y="10.2" width="18" height="3.6" rx="1.8" />,
    front: <path d="M4 6.5h16M4 12h16M4 17.5h10" />,
  },
  globe: {
    back: <circle cx="12" cy="12" r="8.5" />,
    front: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5s1.2-6.2 3.6-8.5Z" />
      </>
    ),
  },
  logout: {
    back: <path d="M4 4.5h8v15H4a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" />,
    front: (
      <>
        <path d="M9.5 4.5H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h4.5" />
        <path d="M15 8l4 4-4 4M19 12H9.5" />
      </>
    ),
  },
  plus: {
    back: <circle cx="12" cy="12" r="8.8" />,
    front: <path d="M12 7.5v9M7.5 12h9" />,
  },
  spark: {
    back: <path d="M12 3l2.2 6.2L20 12l-5.8 2.8L12 21l-2.2-6.2L4 12l5.8-2.8L12 3Z" />,
    front: (
      <>
        <path d="M12 3l2.2 6.2L20 12l-5.8 2.8L12 21l-2.2-6.2L4 12l5.8-2.8L12 3Z" />
        <path d="M18.7 3.6v3M17.2 5.1h3" />
      </>
    ),
  },
}

/**
 * Ícone duotone da nav. Cai no traço simples quando o nome não tem versão
 * duo — assim um ícone novo nunca quebra a nav, só estreia sem o véu.
 */
export function DuoIcon({ name, size = 20, style }: IconProps) {
  const duo = DUO[name]
  if (!duo) return <Icon name={name} size={size} style={style} />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} aria-hidden="true">
      <g fill="var(--duo-fill, rgba(99,102,241,.15))" stroke="none">{duo.back}</g>
      <g
        stroke="var(--duo-stroke, currentColor)"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {duo.front}
      </g>
    </svg>
  )
}
