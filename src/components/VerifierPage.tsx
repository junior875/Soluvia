// Página PÚBLICA de verificação de assinatura (sem login). Aberta pelo link:
//   /verificar/{token}
// GET /signature/verify/{token} → mostra um grande "Assinatura válida" (verde) ou
// "Inválida" (vermelho). White-label: usa o nome do tenant quando presente.
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { BASE_URL } from '../lib/api'
import type { VerifyResult } from '../lib/types'
import { useTranslation } from '../i18n/LanguageProvider'
import PrefSwitcher from './PrefSwitcher'

const L = {
  pt: {
    loading: 'Verificando assinatura…',
    valid: 'Assinatura válida',
    invalid: 'Assinatura inválida',
    validBody: 'Este documento tem uma assinatura eletrônica íntegra registrada nesta plataforma.',
    reasonLabel: 'Motivo',
    level: 'Nível',
    algo: 'Algoritmo',
    signedAt: 'Assinado em',
    tsa: 'Carimbo do tempo',
    docHash: 'Hash do documento (SHA-256)',
    chain: 'Cadeia de evidências',
    chainOk: 'Íntegra',
    chainBroken: 'Comprometida',
    poweredBy: 'Verificação de assinatura digital',
    genericReason: 'Não foi possível verificar esta assinatura.',
    fail: 'Falha ao verificar. Verifique o link e tente novamente.',
  },
  en: {
    loading: 'Verifying signature…',
    valid: 'Valid signature',
    invalid: 'Invalid signature',
    validBody: 'This document has an intact electronic signature registered on this platform.',
    reasonLabel: 'Reason',
    level: 'Level',
    algo: 'Algorithm',
    signedAt: 'Signed at',
    tsa: 'Timestamp',
    docHash: 'Document hash (SHA-256)',
    chain: 'Evidence chain',
    chainOk: 'Intact',
    chainBroken: 'Broken',
    poweredBy: 'Digital signature verification',
    genericReason: 'This signature could not be verified.',
    fail: 'Verification failed. Check the link and try again.',
  },
  es: {
    loading: 'Verificando firma…',
    valid: 'Firma válida',
    invalid: 'Firma inválida',
    validBody: 'Este documento tiene una firma electrónica íntegra registrada en esta plataforma.',
    reasonLabel: 'Motivo',
    level: 'Nivel',
    algo: 'Algoritmo',
    signedAt: 'Firmado el',
    tsa: 'Sello de tiempo',
    docHash: 'Hash del documento (SHA-256)',
    chain: 'Cadena de evidencias',
    chainOk: 'Íntegra',
    chainBroken: 'Comprometida',
    poweredBy: 'Verificación de firma digital',
    genericReason: 'No se pudo verificar esta firma.',
    fail: 'Falló la verificación. Revisa el enlace e inténtalo de nuevo.',
  },
}

export function isVerifierPath(): boolean {
  return /^\/verificar\/[^/]+/.test(window.location.pathname)
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function VerifierPage() {
  const { lang } = useTranslation()
  const tr = L[lang] ?? L.pt
  const token = useMemo(() => {
    const m = window.location.pathname.match(/^\/verificar\/([^/]+)/)
    return m ? decodeURIComponent(m[1]) : ''
  }, [])

  const [result, setResult] = useState<VerifyResult | null | 'error'>(null)

  useEffect(() => {
    fetch(`${BASE_URL}/signature/verify/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((v: VerifyResult) => setResult(v))
      .catch(() => setResult('error'))
  }, [token])

  const wrap: CSSProperties = { minHeight: '100vh', background: 'var(--surface-2)', color: 'var(--text)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px 64px' }
  const card: CSSProperties = { width: '100%', maxWidth: 560, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 'clamp(24px,4vw,40px)', boxShadow: 'var(--card-shadow)' }

  const brandName = result && result !== 'error' && result.tenant_name ? result.tenant_name : null

  const Header = (
    <div style={{ width: '100%', maxWidth: 560, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      {brandName ? (
        <span style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px' }}>{brandName}</span>
      ) : (
        <img src="/soluvia.png" alt="Soluvia" className="brand-logo" style={{ height: 34, width: 'auto' }} />
      )}
      <PrefSwitcher compact />
    </div>
  )

  if (result === null) {
    return (
      <div style={wrap}>{Header}
        <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)' }} className="app-modal">{tr.loading}</div>
      </div>
    )
  }

  if (result === 'error') {
    return (
      <div style={wrap}>{Header}
        <div style={{ ...card, textAlign: 'center' }} className="app-modal">
          <StatusBadge valid={false} />
          <h1 style={{ color: 'var(--heading)', fontSize: 26, fontWeight: 800, marginTop: 18 }}>{tr.invalid}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14.5, marginTop: 10, lineHeight: 1.6 }}>{tr.fail}</p>
        </div>
      </div>
    )
  }

  const valid = result.valid
  const rows: [string, string | null | undefined][] = valid
    ? [
        [tr.level, result.level],
        [tr.algo, result.algo],
        [tr.signedAt, fmtDate(result.signed_at)],
        result.tsa_time ? [tr.tsa, fmtDate(result.tsa_time)] : [tr.tsa, null],
        [tr.docHash, result.document_sha256],
      ]
    : []

  return (
    <div style={wrap}>{Header}
      <div style={{ ...card, textAlign: 'center' }} className="app-modal">
        <StatusBadge valid={valid} />
        <h1 style={{ color: 'var(--heading)', fontSize: 'clamp(24px,5vw,30px)', fontWeight: 800, marginTop: 18 }}>{valid ? tr.valid : tr.invalid}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14.5, marginTop: 10, lineHeight: 1.6 }}>
          {valid ? tr.validBody : (result.reason || tr.genericReason)}
        </p>

        {!valid && result.reason && (
          <div style={{ marginTop: 18, background: 'rgba(217,83,79,.1)', border: '1px solid rgba(217,83,79,.35)', color: '#d9534f', borderRadius: 14, padding: '12px 16px', fontSize: 14, fontWeight: 600, textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, opacity: 0.8, marginBottom: 3 }}>{tr.reasonLabel}</span>
            {result.reason}
          </div>
        )}

        {valid && (
          <div style={{ marginTop: 22, display: 'grid', gap: 12, textAlign: 'left' }}>
            {result.chain_intact != null && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>{tr.chain}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: result.chain_intact ? '#16a34a' : '#d9534f' }}>
                  <Dot ok={!!result.chain_intact} />
                  {result.chain_intact ? tr.chainOk : tr.chainBroken}
                </span>
              </div>
            )}
            {rows.filter(([, v]) => v).map(([label, value]) => (
              <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 14px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 3 }}>{label}</span>
                <span style={{ color: 'var(--heading)', fontSize: 14, fontWeight: 600, wordBreak: 'break-all', fontFamily: label === tr.docHash ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3Z" /></svg>
          {tr.poweredBy}
        </p>
      </div>
    </div>
  )
}

function StatusBadge({ valid }: { valid: boolean }) {
  const color = valid ? '16,163,74' : '217,83,79'
  return (
    <div style={{ width: 84, height: 84, borderRadius: '50%', margin: '0 auto', background: `rgba(${color},.14)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid rgba(${color},.4)` }}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        {valid
          ? <path d="M12 23l7 7 14-15" stroke={`rgb(${color})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M14 14l16 16M30 14L14 30" stroke={`rgb(${color})`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </div>
  )
}

function Dot({ ok }: { ok: boolean }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? '#16a34a' : '#d9534f', display: 'inline-block' }} />
}
