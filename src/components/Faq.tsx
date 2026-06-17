import { useState } from 'react'
import Reveal from './Reveal'
import { useTranslation } from '../i18n/LanguageProvider'

interface FaqEntry {
  q: string
  a: string
}

const VISIBLE_COUNT = 2

function FaqItem({ entry, isOpen, onToggle }: { entry: FaqEntry; isOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, marginBottom: 12, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--heading)', lineHeight: 1.3 }}>{entry.q}</span>
        <div
          style={{
            width: 36,
            height: 36,
            minWidth: 36,
            borderRadius: '50%',
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform .35s ease',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            fontSize: 22,
            fontWeight: 300,
            color: 'var(--heading)',
          }}
        >
          +
        </div>
      </button>
      <div
        style={{
          maxHeight: isOpen ? 360 : 0,
          opacity: isOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height .4s cubic-bezier(.16,1,.3,1), opacity .3s ease',
        }}
      >
        <p style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.8, padding: '0 32px 28px' }}>{entry.a}</p>
      </div>
    </div>
  )
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { t, dict } = useTranslation()

  const items = dict.faq.items as FaqEntry[]
  const visible = showAll ? items : items.slice(0, VISIBLE_COUNT)

  return (
    <section id="faq" data-screen-label="FAQ" className="rsp-sec" style={{ background: 'var(--surface-2)', padding: '128px 60px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <Reveal as="p" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 18 }}>
            {t('faq.kicker')}
          </Reveal>
          <Reveal as="h2" delay={0.15} style={{ fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 900, color: 'var(--heading)', lineHeight: 1.1, letterSpacing: '-1.5px' }}>
            {t('faq.title1')}
            <br />
            {t('faq.title2')}
          </Reveal>
        </div>

        {visible.map((entry, i) => (
          <Reveal key={entry.q} delay={Math.min(i, 1) * 0.1} y={30}>
            <FaqItem entry={entry} isOpen={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? null : i)} />
          </Reveal>
        ))}

        {!showAll && items.length > VISIBLE_COUNT && (
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <button
              onClick={() => setShowAll(true)}
              style={{
                background: 'transparent',
                border: '2px solid var(--border)',
                color: 'var(--text-muted)',
                padding: '14px 36px',
                borderRadius: 100,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Poppins',sans-serif",
                transition: 'all .25s ease',
              }}
            >
              {t('faq.seeMore')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
