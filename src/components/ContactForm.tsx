import { useState, type FormEvent } from 'react'
import { useTranslation } from '../i18n/LanguageProvider'

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 12,
  padding: '14px 16px',
  color: 'white',
  fontSize: 15,
  outline: 'none',
} as const

const labelStyle = {
  display: 'block',
  color: 'rgba(255,255,255,.6)',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 8,
} as const

export default function ContactForm() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { t } = useTranslation()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    // Sem back-end: simula o envio. Integre aqui sua API / e-mail / CRM.
    setTimeout(() => setSubmitted(true), 1100)
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,.06)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 28,
        padding: 'clamp(26px, 6vw, 48px)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
      }}
    >
      {!submitted ? (
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            opacity: submitting ? 0 : 1,
            transform: submitting ? 'translateY(-16px)' : 'translateY(0)',
            transition: 'opacity .4s ease, transform .4s ease',
          }}
        >
          <div className="rsp-fgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>{t('contact.form.name')}</label>
              <input required type="text" placeholder={t('contact.form.namePh')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('contact.form.company')}</label>
              <input required type="text" placeholder={t('contact.form.companyPh')} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>{t('contact.form.email')}</label>
            <input required type="email" placeholder={t('contact.form.emailPh')} style={inputStyle} />
          </div>

          <div className="rsp-fgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>{t('contact.form.phone')}</label>
              <input type="tel" placeholder={t('contact.form.phonePh')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t('contact.form.plan')}</label>
              <select style={{ ...inputStyle, background: 'rgba(14,44,70,.9)', color: 'rgba(255,255,255,.8)', cursor: 'pointer' }}>
                <option value="">{t('contact.form.planPh')}</option>
                <option value="mensal">{t('contact.form.planMonthly')}</option>
                <option value="anual">{t('contact.form.planAnnual')}</option>
                <option value="duvida">{t('contact.form.planDoubt')}</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
              color: 'white',
              padding: '18px 32px',
              borderRadius: 100,
              fontSize: 17,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Poppins',sans-serif",
              boxShadow: '0 10px 32px var(--accent-shadow)',
              marginTop: 8,
            }}
          >
            {submitting ? t('contact.form.submitting') : t('contact.form.submit')}
          </button>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.3)', fontSize: 13 }}>{t('contact.form.noSpam')}</p>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20, padding: '20px 0' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,var(--accent),var(--accent-2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 32px var(--accent-shadow)',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M8 18l8 8 12-12" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 style={{ fontSize: 26, fontWeight: 800, color: 'white', letterSpacing: '-.5px' }}>{t('contact.success.title')}</h3>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', lineHeight: 1.7, maxWidth: 320 }}>{t('contact.success.body')}</p>
        </div>
      )}
    </div>
  )
}
