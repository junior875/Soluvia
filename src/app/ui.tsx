// Design system do painel — primitivos amarrados aos tokens de marca (index.css).
// Mesma linguagem visual do site: Poppins, cards arredondados, rótulos laranja
// em maiúsculas, headings navy, e suporte a tema claro/escuro automático.

import { useState } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from './icons'
import { currentLang } from '../lib/api'

type Tone = 'accent' | 'blue' | 'muted' | 'green' | 'navy'

const TONE: Record<Tone, { bg: string; fg: string }> = {
  accent: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  blue: { bg: 'var(--blue-soft)', fg: 'var(--blue)' },
  green: { bg: 'rgba(22,163,74,.14)', fg: '#16a34a' },
  muted: { bg: 'rgba(120,140,160,.14)', fg: 'var(--text-muted)' },
  navy: { bg: 'rgba(14,44,70,.1)', fg: 'var(--heading)' },
}

// ── Card ───────────────────────────────────────────────────────
export function Card({
  children,
  hover,
  onClick,
  style,
  padding = 22,
}: {
  children: ReactNode
  hover?: boolean
  onClick?: () => void
  style?: CSSProperties
  padding?: number
}) {
  return (
    <div
      onClick={onClick}
      className={hover || onClick ? 'app-card app-card--hover' : 'app-card'}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding,
        boxShadow: 'var(--card-shadow)',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── SectionLabel (rótulo laranja maiúsculo) ────────────────────
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 12 }}>
      {children}
    </p>
  )
}

// ── PageHeader ─────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="app-pagehead" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ color: 'var(--heading)', fontSize: 'clamp(23px,3.4vw,34px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 6 }}>{subtitle}</p>}
      </div>
      {action && <div className="app-ph-act">{action}</div>}
    </div>
  )
}

// ── Chip / Badge ───────────────────────────────────────────────
export function Chip({ children, tone = 'accent', dot }: { children: ReactNode; tone?: Tone; dot?: string }) {
  const c = TONE[tone]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, background: c.bg, color: c.fg, borderRadius: 100, padding: '4px 11px' }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />}
      {children}
    </span>
  )
}

// ── StatCard ───────────────────────────────────────────────────
export function StatCard({ icon, label, value, sub }: { icon: IconName; label: string; value: ReactNode; sub?: string }) {
  return (
    <Card hover>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={19} />
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ color: 'var(--heading)', fontSize: 30, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
      {sub && <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 6 }}>{sub}</p>}
    </Card>
  )
}

// ── Button ─────────────────────────────────────────────────────
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline'
  leftIcon?: IconName
  loading?: boolean
}
export function Button({ variant = 'primary', leftIcon, loading, children, style, disabled, ...rest }: BtnProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 100,
    padding: '11px 20px',
    fontSize: 14.5,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    border: '1px solid transparent',
    transition: 'transform .12s var(--ease-out), filter .2s, background .2s',
    opacity: disabled || loading ? 0.6 : 1,
  }
  const variants: Record<string, CSSProperties> = {
    primary: { background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff', boxShadow: '0 8px 22px var(--accent-shadow)' },
    ghost: { background: 'var(--surface-2)', color: 'var(--heading)', border: '1px solid var(--border)' },
    outline: { background: 'transparent', color: 'var(--heading)', border: '1.5px solid var(--border)' },
  }
  return (
    <button className="app-btn" style={{ ...base, ...variants[variant], ...style }} disabled={disabled || loading} {...rest}>
      {leftIcon && !loading && <Icon name={leftIcon} size={17} />}
      {loading ? '…' : children}
    </button>
  )
}

export function IconButton({ icon, label, onClick, active }: { icon: IconName; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="app-btn"
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
      }}
    >
      <Icon name={icon} size={18} />
    </button>
  )
}

// ── Field / Input ──────────────────────────────────────────────
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="app-input"
      style={{
        width: '100%',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '12px 14px',
        color: 'var(--heading)',
        fontSize: 15,
        outline: 'none',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
        ...props.style,
      }}
    />
  )
}

/**
 * Rótulos do botão de revelar. Ficam AQUI, e não vindos por propriedade, porque
 * o campo de senha aparece em seis telas espalhadas por quatro dicionários
 * diferentes — pedir o texto a cada chamador significaria mexer nos quatro e
 * esquecer de um, e o esquecido vira `undefined` no leitor de tela.
 */
const SENHA_LABEL: Record<string, { mostrar: string; ocultar: string }> = {
  pt: { mostrar: 'Mostrar senha', ocultar: 'Ocultar senha' },
  en: { mostrar: 'Show password', ocultar: 'Hide password' },
  es: { mostrar: 'Mostrar contraseña', ocultar: 'Ocultar contraseña' },
}

/**
 * Campo de senha com o olho para revelar o que foi digitado.
 *
 * Não é conforto: senha mascarada é a causa mais comum de "não consigo entrar"
 * que na verdade era um caractere trocado. Sem poder conferir, a pessoa repete
 * o mesmo erro e conclui que a conta está quebrada.
 *
 * Aceita `style` de fora porque o site público e o painel têm caixas de texto
 * com aparências diferentes, e este componente atende os dois.
 */
export function PasswordInput({ style, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const rotulo = SENHA_LABEL[currentLang()] ?? SENHA_LABEL.pt
  const revealLabel = rotulo.mostrar
  const hideLabel = rotulo.ocultar
  // Sempre nasce oculta: lembrar "estava visível" exporia a senha por uma
  // decisão que a pessoa tomou noutra tela, noutro dia, talvez sozinha.
  const [visivel, setVisivel] = useState(false)
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        {...props}
        type={visivel ? 'text' : 'password'}
        className="app-input"
        style={{
          width: '100%',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '12px 14px',
          color: 'var(--heading)',
          fontSize: 15,
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          ...style,
          // Depois do spread de propósito: o texto não pode correr por baixo do
          // botão, qualquer que seja o padding que venha de fora.
          paddingRight: 46,
        }}
      />
      <button
        type="button"                        // sem isto, o clique ENVIA o formulário
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? hideLabel : revealLabel}
        aria-pressed={visivel}
        title={visivel ? hideLabel : revealLabel}
        style={{
          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 9, cursor: 'pointer',
          background: 'transparent', border: 'none',
          color: visivel ? 'var(--accent)' : 'var(--text-muted)',
        }}
      >
        <Icon name={visivel ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  )
}

export function Select(props: InputHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const { children, style, ...rest } = props
  return (
    <select
      {...rest}
      className="app-input"
      style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', color: 'var(--heading)', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer', ...style }}
    >
      {children}
    </select>
  )
}

// ── Skeleton ───────────────────────────────────────────────────
export function Skeleton({ w = '100%', h = 16, r = 8, style }: { w?: number | string; h?: number; r?: number; style?: CSSProperties }) {
  return <div className="app-skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

// ── EmptyState ─────────────────────────────────────────────────
export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
      <span style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 16, background: 'var(--surface-2)', color: 'var(--text-muted)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon name={icon} size={26} />
      </span>
      <p style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 16 }}>{title}</p>
      {body && <p style={{ fontSize: 14, marginTop: 6, maxWidth: 360, marginInline: 'auto' }}>{body}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

// ── Avatar ─────────────────────────────────────────────────────
export function Avatar({ name, color }: { name: string; color?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
  return (
    <span style={{ width: 36, height: 36, minWidth: 36, borderRadius: 11, background: color ?? 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13.5 }}>
      {initials || '?'}
    </span>
  )
}

// ── Modal ──────────────────────────────────────────────────────
export function Modal({ open, onClose, title, kicker, children, maxWidth = 460 }: { open: boolean; onClose: () => void; title: string; kicker?: string; children: ReactNode; maxWidth?: number }) {
  if (!open) return null
  // Portal para o body: garante que o modal cubra a VIEWPORT inteira, e não fique
  // preso dentro do painel (que tem zoom/animação e capturava o position:fixed).
  return createPortal(
    <div onClick={onClose} className="app-modal-scrim app-scroll" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--scrim)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', padding: '32px 16px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} className="app-modal" style={{ width: '100%', maxWidth, margin: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 'clamp(22px,4vw,32px)', boxShadow: '0 30px 80px rgba(0,0,0,.45)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            {kicker && <SectionLabel>{kicker}</SectionLabel>}
            <h2 style={{ color: 'var(--heading)', fontSize: 22, fontWeight: 800 }}>{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="app-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <Icon name="close" size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
