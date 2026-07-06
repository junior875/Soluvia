// Modal de assinatura do PARECER: rubrica (canvas) + localização (consentimento
// explícito) + CPF opcional. Não faz POST — devolve os dados via onConfirm para
// o Cases enviar junto do parecer. Reaproveita SignaturePad + GeolocationConsentModal.
import { useEffect, useRef, useState } from 'react'
import type { SigGeo } from '../../../lib/types'
import { Modal, Button, Field, Input } from '../../ui'
import { Icon } from '../../icons'
import { useT } from '../../strings'
import SignaturePad, { type SignaturePadHandle } from './SignaturePad'
import GeolocationConsentModal from './GeolocationConsentModal'

interface Props {
  open: boolean
  busy?: boolean
  onClose: () => void
  onConfirm: (data: { signature_image: string; geo: SigGeo; cpf: string | null }) => void
}

function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 11)].filter(Boolean)
  let out = p[0] ?? ''
  if (p[1]) out += '.' + p[1]
  if (p[2]) out += '.' + p[2]
  if (p[3]) out += '-' + p[3]
  return out
}

export default function ParecerSignModal({ open, busy, onClose, onConfirm }: Props) {
  const t = useT()
  const padRef = useRef<SignaturePadHandle>(null)
  const [image, setImage] = useState<string | null>(null)
  const [cpf, setCpf] = useState('')
  const [geo, setGeo] = useState<SigGeo>({ consent: false })
  const [geoOpen, setGeoOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { if (open) { setErr(null) } }, [open])

  const submit = () => {
    if (!image) { setErr(t.cases.inv.needRubric); return }
    setErr(null)
    onConfirm({ signature_image: image, geo, cpf: cpf.trim() || null })
  }

  const geoReady = geo.consent && geo.lat != null

  return (
    <>
      <Modal open={open} onClose={onClose} title={t.sig.signTitle} kicker={t.cases.inv.give} maxWidth={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Rubrica */}
          <Field label={t.sig.rubric}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: -2, marginBottom: 8 }}>{t.sig.rubricHint}</p>
            <SignaturePad ref={padRef} onChange={setImage} />
            <button type="button" onClick={() => padRef.current?.clear()} className="app-btn"
              style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>
              {t.sig.clear}
            </button>
          </Field>

          {/* Localização (consentimento) */}
          <Field label={t.sig.geoTitle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', border: `1px solid ${geoReady ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 12 }}>
              <span style={{ width: 34, height: 34, minWidth: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: geoReady ? 'var(--accent-soft)' : 'rgba(120,140,160,.14)', color: geoReady ? 'var(--accent)' : 'var(--text-muted)' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></svg>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--heading)', fontSize: 13.5, fontWeight: 700 }}>{geoReady ? t.sig.geoOn : t.sig.geoOff}</div>
                {geoReady
                  ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{geo.lat!.toFixed(5)}, {geo.lng?.toFixed(5)}</div>
                  : <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.sig.geoHint}</div>}
              </div>
              <button type="button" onClick={() => setGeoOpen(true)} className="app-btn" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--heading)', borderRadius: 100, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <Icon name={geoReady ? 'check' : 'plus'} size={14} />
                {geoReady ? t.sig.geoOn : t.sig.geoTitle}
              </button>
            </div>
          </Field>

          {/* CPF opcional */}
          <Field label={t.sig.cpf}>
            <Input value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" autoComplete="off" />
          </Field>

          {err && <div style={{ background: 'rgba(217,83,79,.12)', border: '1px solid rgba(217,83,79,.4)', color: '#e08585', borderRadius: 12, padding: '11px 14px', fontSize: 13.5 }}>{err}</div>}

          <Button onClick={submit} loading={busy} leftIcon="signature" style={{ padding: '14px 24px', fontSize: 15.5 }}>
            {busy ? t.sig.signing : t.cases.inv.signAndSend}
          </Button>
        </div>
      </Modal>

      <GeolocationConsentModal open={geoOpen} onClose={() => setGeoOpen(false)} onResolve={(g) => { setGeo(g); setGeoOpen(false) }} />
    </>
  )
}
