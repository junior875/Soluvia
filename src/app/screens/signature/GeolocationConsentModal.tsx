// Modal de CONSENTIMENTO de geolocalização. Regra de ouro: nunca chamamos
// navigator.geolocation antes de um clique explícito de "Permitir". Se o usuário
// negar aqui, ou negar no prompt do navegador, ou não houver suporte, devolvemos
// consent:false. Só em caso de sucesso devolvemos as coordenadas.
import { useState } from 'react'
import { Modal, Button } from '../../ui'
import { useT } from '../../strings'
import type { SigGeo } from '../../../lib/types'

interface Props {
  open: boolean
  onResolve: (geo: SigGeo) => void
  onClose: () => void
}

export default function GeolocationConsentModal({ open, onResolve, onClose }: Props) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const allow = () => {
    setNote(null)
    if (!('geolocation' in navigator)) {
      // Sem suporte → consentiu, mas não há coordenadas para anexar.
      onResolve({ consent: true })
      return
    }
    setBusy(true)
    // O consentimento explícito já foi dado (este clique). Só AGORA chamamos a API.
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBusy(false)
        onResolve({ consent: true, lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy })
      },
      (err) => {
        setBusy(false)
        // Negou no prompt do navegador ou falhou → assina sem localização.
        setNote(err.code === err.PERMISSION_DENIED ? t.sig.geoDenied : t.sig.geoUnavailable)
        onResolve({ consent: false })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  const deny = () => {
    setNote(null)
    onResolve({ consent: false })
  }

  return (
    <Modal open={open} onClose={onClose} title={t.sig.consentTitle} kicker={t.sig.geoTitle} maxWidth={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ width: 44, height: 44, minWidth: 44, borderRadius: 14, background: 'var(--blue-soft)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.6" />
            </svg>
          </span>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.65 }}>{t.sig.consentBody}</p>
        </div>

        {note && (
          <div style={{ background: 'rgba(224,162,60,.12)', border: '1px solid rgba(224,162,60,.4)', color: '#c9871f', borderRadius: 12, padding: '10px 14px', fontSize: 13 }}>{note}</div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button onClick={allow} loading={busy} leftIcon="check" style={{ flex: 1 }}>{busy ? t.sig.geoGetting : t.sig.consentAllow}</Button>
          <Button variant="ghost" onClick={deny} disabled={busy} style={{ flex: 1 }}>{t.sig.consentDeny}</Button>
        </div>
      </div>
    </Modal>
  )
}
