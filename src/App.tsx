import { useEffect } from 'react'
import Header from './components/Header'
import Reveal from './components/Reveal'
import Magnetic from './components/Magnetic'
import StatRing from './components/StatRing'
import RiskForm from './components/RiskForm'
import Shield from './components/Shield'
import Faq from './components/Faq'
import ContactForm from './components/ContactForm'
import WhatsappButton from './components/WhatsappButton'
import SettingsMenu from './components/SettingsMenu'
import SignupFlow from './components/SignupFlow'
import LoginModal from './components/LoginModal'
import Panel from './components/Panel'
import PlatformConsole from './components/PlatformConsole'
import CheckoutReturn from './components/CheckoutReturn'
import LegalDocs from './components/LegalDocs'
import PublicReport, { isPublicReportPath } from './components/PublicReport'
import AcceptInvite, { isAcceptInvitePath } from './components/AcceptInvite'
import VerifierPage, { isVerifierPath } from './components/VerifierPage'
import PublicTracker from './components/PublicTracker'
import { useTranslation } from './i18n/LanguageProvider'

/* ════════════════════════════════════════════
   Soluvia — Home page (Vite + React + TypeScript)
   • Tema claro/escuro via tokens CSS (var(--token))
   • i18n PT/EN/ES via useTranslation()
═══════════════════════════════════════════ */

// Tokens de cor — apontam para as variáveis CSS de tema (index.css)
const C = {
  accent: 'var(--accent)',
  accentGrad: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
  accentSoft: 'var(--accent-soft)',
  accentBorder: 'var(--accent-border)',
  accentShadow: 'var(--accent-shadow)',
  blue: 'var(--blue)',
  navy: 'var(--navy)',
  navy2: 'var(--navy-2)',
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  text: 'var(--text)',
  muted: 'var(--text-muted)',
  heading: 'var(--heading)',
  border: 'var(--border)',
  shadow: 'var(--card-shadow)',
  sectionNavy: 'var(--section-navy)',
  footerBg: 'var(--footer-bg)',
} as const

// Fundos "lux": cor sólida com aurora sutil (laranja+azul) por baixo do conteúdo,
// dando profundidade sem mexer no z-index do conteúdo (vai no próprio background).
const navyLux =
  'radial-gradient(55% 50% at 85% -8%, rgba(242,146,30,.12), transparent 60%), radial-gradient(52% 48% at -6% 108%, rgba(47,111,176,.17), transparent 62%), var(--section-navy)'
const surfaceLux =
  'radial-gradient(46% 40% at 100% -5%, rgba(242,146,30,.06), transparent 60%), radial-gradient(42% 40% at -5% 105%, rgba(47,111,176,.07), transparent 62%), var(--surface)'

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 6l3 3 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function App() {
  const { t, dict } = useTranslation()

  // Scroll progress + nav sólida + parallax do hero
  useEffect(() => {
    const nav = document.getElementById('main-nav')
    const progress = document.getElementById('scroll-progress')
    const hero = document.getElementById('hero-content')

    const onScroll = () => {
      const y = window.scrollY
      const total = document.documentElement.scrollHeight - window.innerHeight
      if (progress) progress.style.width = `${(y / Math.max(total, 1)) * 100}%`

      if (nav) {
        const solid = y > 60
        nav.style.background = solid ? 'rgba(8,19,32,0.92)' : 'transparent'
        nav.style.backdropFilter = solid ? 'blur(20px)' : 'none'
        nav.style.setProperty('-webkit-backdrop-filter', solid ? 'blur(20px)' : 'none')
        nav.style.boxShadow = solid ? '0 2px 28px rgba(0,0,0,0.28)' : 'none'
      }

      if (hero && y < window.innerHeight * 1.2) {
        const ratio = y / window.innerHeight
        hero.style.transform = `translateY(${y * 0.28}px)`
        hero.style.opacity = String(Math.max(0, 1 - ratio * 1.4))
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Configs visuais (ícones/cores); textos vêm do dicionário (dict)
  const problemaCards = [
    { bg: C.accentSoft, icon: <><circle cx="14" cy="14" r="10" stroke="var(--accent)" strokeWidth="2.5" /><path d="M14 9v5M14 18v1" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" /></>, delay: 0.1 },
    { bg: 'var(--blue-soft)', icon: <><rect x="4" y="6" width="20" height="16" rx="3" stroke="var(--blue)" strokeWidth="2.5" /><path d="M4 10h20M9 6V4M19 6V4" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" /></>, delay: 0.25 },
    { bg: 'rgba(120,140,160,.12)', icon: <><circle cx="14" cy="10" r="5" stroke="var(--heading)" strokeWidth="2.5" /><path d="M6 24c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="var(--heading)" strokeWidth="2.5" strokeLinecap="round" /></>, delay: 0.4 },
  ]

  const featureCards = [
    { dark: false, num: '01', numC: C.accent, grad: C.accentGrad, shadow: C.accentShadow, glow: 'rgba(242,146,30,.08)', icon: <><circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2.5" /><path d="M16.5 16.5L22 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></>, delay: 0 },
    { dark: true, num: '02', numC: C.blue, grad: 'linear-gradient(135deg,var(--blue),#1f5790)', shadow: 'rgba(47,111,176,.4)', glow: 'rgba(47,111,176,.22)', icon: <><rect x="3" y="3" width="20" height="14" rx="3" stroke="white" strokeWidth="2.5" /><path d="M8 20h10M13 17v3" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></>, delay: 0.15 },
    { dark: true, num: '03', numC: C.accent, grad: C.accentGrad, shadow: C.accentShadow, glow: 'rgba(242,146,30,.2)', icon: <><rect x="4" y="2" width="18" height="22" rx="3" stroke="white" strokeWidth="2.5" /><path d="M8 9h10M8 13h7" stroke="white" strokeWidth="2" strokeLinecap="round" /><path d="M14 18l2.5 2.5L21 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>, delay: 0.28 },
    { dark: false, num: '04', numC: C.heading, grad: 'linear-gradient(135deg,var(--navy),var(--navy-2))', shadow: 'rgba(14,44,70,.3)', glow: 'rgba(47,111,176,.08)', icon: <><path d="M13 3L4 7v8c0 5 3.5 9.5 9 11 5.5-1.5 9-6 9-11V7L13 3z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" /><path d="M9 13l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></>, delay: 0.42 },
  ]

  const formPoints = [
    { bg: C.accentSoft, icon: <><circle cx="9" cy="9" r="7" stroke="var(--accent)" strokeWidth="2" /><path d="M9 5v4M9 12v1" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" /></>, delay: 0.42 },
    { bg: 'var(--blue-soft)', icon: <path d="M9 2L3 5v4.5C3 13.2 5.7 16.2 9 17c3.3-.8 6-3.8 6-7.5V5L9 2z" stroke="var(--blue)" strokeWidth="2" strokeLinejoin="round" />, delay: 0.52 },
    { bg: 'rgba(255,255,255,.08)', icon: <><circle cx="9" cy="6" r="3.5" stroke="white" strokeWidth="2" strokeOpacity=".8" /><path d="M3 16c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity=".8" /></>, delay: 0.62 },
  ]

  const securityPoints = [
    { grad: 'linear-gradient(135deg,var(--navy),var(--navy-2))', icon: <path d="M8 2L2 4.5v5C2 12.8 4.5 15.4 8 16c3.5-.6 6-3.2 6-8.5v-3L8 2z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />, delay: 0.42 },
    { grad: 'linear-gradient(135deg,var(--blue),#1f5790)', icon: <><rect x="3" y="7" width="10" height="8" rx="2" stroke="white" strokeWidth="1.8" /><path d="M5 7V5a3 3 0 016 0v2" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></>, delay: 0.52 },
    { grad: C.accentGrad, icon: <><circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.8" /><path d="M5.5 8l2 2 3-3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>, delay: 0.62 },
  ]

  // Link público do canal (/c/slug/token): página de relato isolada, sem site.
  if (isPublicReportPath()) return <PublicReport />
  // Aceite de convite (/aceitar-convite?token=...): registro da pessoa convidada.
  if (isAcceptInvitePath()) return <AcceptInvite />
  // Verificação pública de assinatura (/verificar/{token}): sem login.
  if (isVerifierPath()) return <VerifierPage />

  return (
    <>
      <div id="scroll-progress" style={{ position: 'fixed', top: 0, left: 0, height: 3, width: '0%', background: C.accentGrad, zIndex: 300, pointerEvents: 'none' }} />

      <Header />

      {/* ══════════════ HERO ══════════════ */}
      <section id="hero" data-screen-label="Hero" className="grain" style={{ minHeight: '100vh', background: C.sectionNavy, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Mesh gradient vivo */}
        <div style={{ position: 'absolute', inset: '-25%', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(38% 46% at 22% 28%, rgba(47,111,176,.5), transparent 62%), radial-gradient(34% 42% at 82% 30%, rgba(242,146,30,.4), transparent 60%), radial-gradient(46% 52% at 62% 82%, rgba(26,63,94,.7), transparent 66%)', filter: 'blur(46px) saturate(1.15)', animation: 'meshDrift 20s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: -80, right: -80, width: 680, height: 680, borderRadius: '50%', background: 'radial-gradient(circle,rgba(47,111,176,.26) 0%,transparent 65%)', animation: 'orbPulse 7s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -60, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(242,146,30,.2) 0%,transparent 65%)', animation: 'orbPulse2 9s ease-in-out infinite 2s', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)', backgroundSize: '72px 72px', pointerEvents: 'none' }} />

        <div id="hero-content" style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: 920, padding: '0 40px' }}>
          <Reveal as="h1" delay={0.1} y={44} duration={0.9} style={{ fontSize: 'clamp(50px,7.5vw,92px)', fontWeight: 900, color: 'white', lineHeight: 1.04, letterSpacing: '-2.5px', marginBottom: 30 }}>
            {t('hero.title1')}
            <br />
            <span style={{ color: C.accent }}>{t('hero.titleAccent')}</span>
            <br />
            {t('hero.title3')}
          </Reveal>

          <Reveal as="p" delay={0.28} y={44} duration={0.9} style={{ fontSize: 'clamp(17px,2.1vw,22px)', color: 'rgba(255,255,255,.62)', fontWeight: 400, lineHeight: 1.75, marginBottom: 52, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            {t('hero.subtitle')}
          </Reveal>

          <Reveal as="div" delay={0.42} y={44} duration={0.9} className="rsp-ctabtns" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Magnetic strength={0.4}>
              <a href="#assinar" className="cta-sheen" style={{ display: 'block', background: C.accentGrad, color: 'white', padding: '18px 44px', borderRadius: 100, fontSize: 17, fontWeight: 700, textDecoration: 'none', boxShadow: '0 10px 36px var(--accent-shadow)' }}>{t('hero.ctaPrimary')}</a>
            </Magnetic>
            <Magnetic strength={0.4}>
              <a href="#features" style={{ display: 'block', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.2)', color: 'white', padding: '18px 44px', borderRadius: 100, fontSize: 17, fontWeight: 600, textDecoration: 'none', backdropFilter: 'blur(12px)' }}>{t('hero.ctaSecondary')}</a>
            </Magnetic>
          </Reveal>
        </div>

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 30, display: 'flex', justifyContent: 'center', zIndex: 5, pointerEvents: 'none' }}>
          <svg width="24" height="40" viewBox="0 0 24 40" fill="none" style={{ animation: 'scrollBounce 2.2s ease-in-out infinite' }}>
            <rect x="1.5" y="1.5" width="21" height="37" rx="10.5" stroke="rgba(255,255,255,.3)" strokeWidth="2" />
            <rect x="10" y="7" width="4" height="10" rx="2" fill="rgba(255,255,255,.45)" />
          </svg>
        </div>
      </section>

      {/* ══════════════ PROBLEMA ══════════════ */}
      <section data-screen-label="Problema" className="rsp-sec" style={{ background: surfaceLux, padding: '128px 60px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ maxWidth: 680, marginBottom: 80 }}>
            <Reveal as="p" y={36} style={{ color: C.accent, fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>{t('problema.kicker')}</Reveal>
            <Reveal as="h2" delay={0.15} y={36} style={{ fontSize: 'clamp(34px,5vw,64px)', fontWeight: 900, color: C.heading, lineHeight: 1.08, letterSpacing: '-2px' }}>
              {t('problema.title1')}
              <br />
              {t('problema.title2')}
              <br />
              <span style={{ color: C.accent }}>{t('problema.titleAccent')}</span>
            </Reveal>
          </div>

          <div className="rsp-g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 48 }}>
            {problemaCards.map((c, i) => (
              <Reveal key={i} delay={c.delay} y={52}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">{c.icon}</svg>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: C.heading, marginBottom: 12 }}>{dict.problema.cards[i].t}</h3>
                <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.75 }}>{dict.problema.cards[i].p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ MISSÃO / AMBIENTE ══════════════ */}
      <section id="ambiente" data-screen-label="Ambiente" className="rsp-sec" style={{ background: navyLux, padding: '128px 60px' }}>
        <div className="rsp-g2" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <Reveal as="p" y={32} style={{ color: C.accent, fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>{t('mission.kicker')}</Reveal>
            <Reveal as="h2" delay={0.15} y={32} style={{ fontSize: 'clamp(30px,4.5vw,54px)', fontWeight: 900, color: 'white', lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 24 }}>
              {t('mission.title1')}
              <br />
              {t('mission.title2')}
              <br />
              <span style={{ color: C.blue }}>{t('mission.titleAccent')}</span>
            </Reveal>
            <Reveal as="p" delay={0.28} y={32} style={{ fontSize: 17, color: 'rgba(255,255,255,.62)', lineHeight: 1.8, marginBottom: 40 }}>{t('mission.body')}</Reveal>
            <Reveal as="div" delay={0.4} y={32} className="mission-stats" style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {dict.mission.stats.map((s: { v: string; l: string }, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 32 }}>
                  {i > 0 && <div className="mission-div" style={{ width: 1, background: 'rgba(255,255,255,.1)' }} />}
                  <div>
                    <div className="stat-num" style={{ fontSize: 36, fontWeight: 900, color: i === 0 ? C.accent : i === 1 ? C.blue : 'white', letterSpacing: '-1.5px', lineHeight: 1 }}>{s.v}</div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', fontWeight: 500, marginTop: 6, maxWidth: 120 }}>{s.l}</div>
                  </div>
                </div>
              ))}
            </Reveal>
          </div>

          {/* Foto da equipe — troque o placeholder por <img src="/equipe.jpg" .../> em public/ */}
          <Reveal delay={0.2} x={52} y={0} duration={1} className="rsp-imgw" style={{ height: 520, borderRadius: 24, overflow: 'hidden', position: 'relative' }}>
            <img src="/equipe.avif" alt={t('mission.imageNote')} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(8,19,32,.35))', pointerEvents: 'none' }} />
          </Reveal>
        </div>
      </section>

      {/* ══════════════ FEATURES ══════════════ */}
      <section id="features" data-screen-label="Funcionalidades" className="rsp-sec" style={{ background: C.surface2, padding: '128px 60px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <Reveal as="p" y={30} style={{ color: C.accent, fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>{t('features.kicker')}</Reveal>
            <Reveal as="h2" delay={0.15} y={30} style={{ fontSize: 'clamp(34px,5vw,60px)', fontWeight: 900, color: C.heading, lineHeight: 1.08, letterSpacing: '-2px' }}>{t('features.title')}</Reveal>
            <Reveal as="p" delay={0.28} y={30} style={{ fontSize: 18, color: C.muted, marginTop: 20, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>{t('features.subtitle')}</Reveal>
          </div>

          <div className="rsp-gfeat" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 22 }}>
            {featureCards.map((c, i) => (
              <Reveal key={c.num} delay={c.delay} y={60} scale={0.96} duration={0.95} style={{ background: c.dark ? C.navy : C.surface, borderRadius: 26, padding: 52, position: 'relative', overflow: 'hidden', boxShadow: c.dark ? 'none' : C.shadow, border: c.dark ? 'none' : `1px solid ${C.border}` }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: c.dark ? 200 : 180, height: c.dark ? 200 : 180, background: `radial-gradient(circle at 80% 20%,${c.glow},transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ width: 54, height: 54, borderRadius: 15, background: c.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 30, boxShadow: `0 8px 22px ${c.shadow}` }}>
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">{c.icon}</svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: c.numC }}>{c.num}</span>
                <h3 style={{ fontSize: 27, fontWeight: 800, color: c.dark ? 'white' : C.heading, margin: '10px 0 16px', letterSpacing: '-.5px' }}>{dict.features.items[i].t}</h3>
                <p style={{ fontSize: 16, color: c.dark ? 'rgba(255,255,255,.6)' : C.muted, lineHeight: 1.75 }}>{dict.features.items[i].p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FORMULÁRIO (preview) ══════════════ */}
      <section id="formulario" data-screen-label="Formulário Preview" className="rsp-sec" style={{ background: navyLux, padding: '128px 60px' }}>
        <div className="rsp-g2" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <Reveal as="p" x={-44} y={0} duration={0.9} style={{ color: C.accent, fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>{t('form.kicker')}</Reveal>
            <Reveal as="h2" delay={0.15} x={-44} y={0} duration={0.9} style={{ fontSize: 'clamp(30px,4.5vw,56px)', fontWeight: 900, color: 'white', lineHeight: 1.08, letterSpacing: '-1.5px', marginBottom: 28 }}>
              {t('form.title1')}
              <br />
              {t('form.title2')}
              <br />
              <span style={{ color: C.blue }}>{t('form.titleAccent')}</span>
            </Reveal>
            <Reveal as="p" delay={0.28} x={-44} y={0} duration={0.9} style={{ fontSize: 17, color: 'rgba(255,255,255,.6)', lineHeight: 1.8, marginBottom: 44 }}>{t('form.body')}</Reveal>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {formPoints.map((r, i) => (
                <Reveal key={i} delay={r.delay} x={-30} y={0} duration={0.8} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, minWidth: 40, borderRadius: '50%', background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">{r.icon}</svg>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,.8)', fontSize: 16, fontWeight: 500 }}>{dict.form.points[i]}</span>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Mockup do formulário */}
          <Reveal delay={0.2} x={60} y={0} duration={1}>
            <RiskForm />
          </Reveal>
        </div>
      </section>

      {/* ══════════════ STATS ══════════════ */}
      <section data-screen-label="Estatísticas" className="rsp-sec" style={{ background: C.accentGrad, padding: '128px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -40, width: 320, height: 320, borderRadius: '50%', background: 'rgba(0,0,0,.06)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 80 }}>
            <Reveal as="h2" y={30} style={{ fontSize: 'clamp(34px,5vw,60px)', fontWeight: 900, color: 'white', lineHeight: 1.08, letterSpacing: '-2px' }}>{t('stats.title')}</Reveal>
          </div>
          <div className="rsp-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 40, textAlign: 'center' }}>
            <Reveal delay={0} y={44}><StatRing target={500} suffix="+" percent={0.86} label={dict.stats.labels[0]} /></Reveal>
            <Reveal delay={0.18} y={44}><StatRing target={98} suffix="%" percent={0.98} label={dict.stats.labels[1]} /></Reveal>
            <Reveal delay={0.36} y={44}><StatRing target={24} suffix="/7" percent={1} label={dict.stats.labels[2]} /></Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════ PLANOS ══════════════ */}
      <section id="planos" data-screen-label="Planos" className="rsp-sec" style={{ background: surfaceLux, padding: '128px 60px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <Reveal as="p" y={30} style={{ color: C.accent, fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>{t('plans.kicker')}</Reveal>
            <Reveal as="h2" delay={0.15} y={30} style={{ fontSize: 'clamp(32px,5vw,58px)', fontWeight: 900, color: C.heading, lineHeight: 1.08, letterSpacing: '-2px' }}>
              {t('plans.title1')}
              <br />
              {t('plans.title2')}
            </Reveal>
            <Reveal as="p" delay={0.28} y={30} style={{ fontSize: 18, color: C.muted, marginTop: 20, lineHeight: 1.6 }}>{t('plans.subtitle')}</Reveal>
          </div>

          <div className="rsp-gpric" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1080, margin: '0 auto', alignItems: 'stretch' }}>
            {dict.plans.tiers.map((p: { name: string; price: string; users: string; popular?: boolean; features: string[] }, i: number) => {
              const pop = !!p.popular
              return (
                <Reveal key={p.name} delay={i * 0.12} y={48} scale={0.97} duration={0.9} style={{ background: pop ? C.navy : C.surface2, border: pop ? 'none' : `1px solid ${C.border}`, borderRadius: 28, padding: '44px 32px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {pop && <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: 'radial-gradient(circle at 80% 20%,rgba(242,146,30,.22),transparent 70%)', pointerEvents: 'none' }} />}
                  {pop && <div style={{ alignSelf: 'flex-start', background: C.accentGrad, color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 100, marginBottom: 18 }}>{dict.plans.popular}</div>}
                  <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: pop ? 'rgba(255,255,255,.5)' : C.muted, marginBottom: 16 }}>{p.name}</p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 46, fontWeight: 900, color: pop ? 'white' : C.heading, letterSpacing: '-2px', lineHeight: 1 }}>{p.price}</span>
                    <span style={{ fontSize: 17, color: pop ? 'rgba(255,255,255,.55)' : C.muted, fontWeight: 500, paddingBottom: 7 }}>{dict.plans.per}</span>
                  </div>
                  <p style={{ fontSize: 14, color: pop ? 'rgba(242,146,30,.95)' : C.muted, fontWeight: 600, marginBottom: 30 }}>{p.users}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 36 }}>
                    {p.features.map((f: string) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 22, height: 22, minWidth: 22, borderRadius: '50%', background: pop ? 'rgba(242,146,30,.22)' : 'rgba(120,140,160,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckIcon color={pop ? 'var(--accent)' : 'var(--heading)'} /></div>
                        <span style={{ fontSize: 14.5, color: pop ? 'rgba(255,255,255,.85)' : C.text }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <a href="#assinar" style={{ marginTop: 'auto', display: 'block', textAlign: 'center', padding: '15px 28px', borderRadius: 100, fontSize: 16, fontWeight: 700, textDecoration: 'none', ...(pop ? { background: C.accentGrad, color: 'white', boxShadow: '0 8px 28px var(--accent-shadow)' } : { border: '2px solid var(--heading)', color: C.heading }) }}>{dict.plans.cta}</a>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════ FAQ ══════════════ */}
      <Faq />

      {/* ══════════════ SEGURANÇA ══════════════ */}
      <section id="seguranca" data-screen-label="Zona Segura" className="rsp-sec" style={{ background: surfaceLux, padding: '128px 60px' }}>
        <div className="rsp-g2" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 100, alignItems: 'center' }}>
          <Reveal delay={0} x={-52} y={0} duration={1} style={{ display: 'flex', justifyContent: 'center' }}>
            <Shield />
          </Reveal>

          <div>
            <Reveal as="p" x={44} y={0} duration={0.9} style={{ color: C.accent, fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>{t('security.kicker')}</Reveal>
            <Reveal as="h2" delay={0.15} x={44} y={0} duration={0.9} style={{ fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 900, color: C.heading, lineHeight: 1.08, letterSpacing: '-1.5px', marginBottom: 28 }}>
              {t('security.title1')}
              <br />
              {t('security.title2')}
              <br />
              <span style={{ color: C.accent }}>{t('security.titleAccent')}</span>
            </Reveal>
            <Reveal as="p" delay={0.28} x={44} y={0} duration={0.9} style={{ fontSize: 17, color: C.muted, lineHeight: 1.8, marginBottom: 40 }}>{t('security.body')}</Reveal>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {securityPoints.map((r, i) => (
                <Reveal key={i} delay={r.delay} x={32} y={0} duration={0.8} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: C.surface2, borderRadius: 14 }}>
                  <div style={{ width: 38, height: 38, minWidth: 38, borderRadius: '50%', background: r.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">{r.icon}</svg>
                  </div>
                  <span style={{ color: C.heading, fontSize: 15, fontWeight: 600 }}>{dict.security.points[i]}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ CONTATO ══════════════ */}
      <section id="contato" data-screen-label="Contato" className="rsp-sec" style={{ background: navyLux, padding: '128px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', right: '5%', transform: 'translateY(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(242,146,30,.1) 0%,transparent 65%)', pointerEvents: 'none' }} />

        <div className="rsp-g2" style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
          <div style={{ paddingTop: 20 }}>
            <Reveal as="p" y={30} style={{ color: C.accent, fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>{t('contact.kicker')}</Reveal>
            <Reveal as="h2" delay={0.15} y={30} style={{ fontSize: 'clamp(34px,5vw,60px)', fontWeight: 900, color: 'white', lineHeight: 1.08, letterSpacing: '-2px', marginBottom: 24 }}>
              {t('contact.title1')}
              <br />
              {t('contact.title2')}
              <br />
              <span style={{ color: C.accent }}>{t('contact.titleAccent')}</span>
              <br />
              {t('contact.title4')}
            </Reveal>
            <Reveal as="p" delay={0.28} y={30} style={{ fontSize: 17, color: 'rgba(255,255,255,.55)', lineHeight: 1.8, marginBottom: 48 }}>{t('contact.body')}</Reveal>
            <Reveal as="div" delay={0.38} y={20} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, minWidth: 42, borderRadius: '50%', background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3h12v12H3V3z" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round" /><path d="M3 6l6 4 6-4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </div>
                <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 15 }}>{t('contact.email')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, minWidth: 42, borderRadius: '50%', background: 'rgba(37,211,102,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3.5 3C3.5 3 2 3 2 4.5c0 1 .5 4 4 7.5s6.5 4 7.5 4c1.5 0 1.5-1.5 1.5-1.5v-2c0-.5-.4-.9-.9-.9H12c-.5 0-.9.4-1 .8-.1.5-.7 1.2-1.5.7C8 13 5 10 5 8.5c-.5-.8.2-1.4.7-1.5.4-.1.8-.5.8-1V4.4c0-.5-.4-.9-.9-.9L3.5 3z" stroke="#25d366" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                </div>
                <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 15 }}>{t('contact.response')}</span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2} y={40} duration={0.9}>
            <ContactForm />
          </Reveal>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="rsp-foot rsp-sec" style={{ background: C.footerBg, padding: '48px 60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <img src="/soluvia.png" alt="Soluvia" style={{ height: 48, width: 'auto', display: 'block', filter: 'drop-shadow(0 0 3px rgba(255,255,255,.8)) drop-shadow(0 0 1px rgba(255,255,255,.9))' }} />
        <p style={{ color: 'rgba(255,255,255,.28)', fontSize: 13 }}>{t('footer.rights')}</p>
        <div style={{ display: 'flex', gap: 28 }}>
          <a href="#privacidade" style={{ color: 'rgba(255,255,255,.4)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>{t('footer.privacy')}</a>
          <a href="#termos" style={{ color: 'rgba(255,255,255,.4)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>{t('footer.terms')}</a>
          <a href="#contato" style={{ color: 'rgba(255,255,255,.4)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>{t('footer.contact')}</a>
        </div>
      </footer>

      <SettingsMenu />
      <WhatsappButton phone="5500000000000" />
      <SignupFlow />
      <LoginModal />
      <Panel />
      <PlatformConsole />
      <CheckoutReturn />
      <LegalDocs />
      <PublicTracker />
      {/* O onboarding ("Welcome to Soluvia", escolher tema/idioma) NAO mora
          aqui. Quem chega no site e VISITANTE, e a primeira coisa que ele via
          era um assistente de preferencias de uma conta que ele nem tem —
          cobrindo a apresentacao do produto inteira antes de qualquer palavra.
          Quem monta o onboarding e `capabilities.tsx`, e so quando a CONTA
          ainda nao passou por ele (`user.onboarded === false`). */}
    </>
  )
}
