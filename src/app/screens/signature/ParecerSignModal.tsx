// Modal de assinatura do PARECER: rubrica (canvas) + localização (consentimento
// explícito) + CPF. Não faz POST — devolve os dados via onConfirm para
// o Cases enviar junto do parecer. Reaproveita SignaturePad + GeolocationConsentModal.
import { useEffect, useRef, useState } from 'react'
import type { SigGeo } from '../../../lib/types'
import { Modal, Button, Field, Input } from '../../ui'
import { Icon } from '../../icons'
import { useT } from '../../strings'
import RubricField, { type RubricFieldHandle } from './RubricField'
import GeolocationConsentModal from './GeolocationConsentModal'
import { cpfValido, maskCpf } from '../../../lib/cpf'

interface Props {
  open: boolean
  busy?: boolean
  onClose: () => void
  onConfirm: (data: { signature_image: string; geo: SigGeo; cpf: string | null }) => void
  // Rótulos opcionais — permitem reusar o mesmo modal fora do parecer (ex.: o
  // denunciante que se identifica assinando o próprio relato).
  title?: string
  kicker?: string
  cta?: string
  /** Pré-preenche a rubrica gerada. Vem por prop porque este modal também roda
   *  na página pública, fora do CapabilityProvider (lá começa vazio). */
  defaultName?: string
  /** true no PARECER, cuja assinatura o backend recusa sem CPF válido (422).
   *  Fica de fora no fluxo público: exigir CPF de denunciante seria barreira
   *  de identificação — decisão do canal, não deste modal. */
  requireCpf?: boolean
}

export default function ParecerSignModal({ open, busy, onClose, onConfirm, title, kicker, cta, defaultName, requireCpf }: Props) {
  const t = useT()
  const rubricRef = useRef<RubricFieldHandle>(null)
  const [image, setImage] = useState<string | null>(null)
  const [cpf, setCpf] = useState('')
  const [geo, setGeo] = useState<SigGeo>({ consent: false })
  const [geoOpen, setGeoOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { if (open) { setErr(null) } }, [open])

  const submit = () => {
    // Mensagem neutra: agora a rubrica também pode ser gerada do nome, então
    // "desenhe sua rubrica" deixou de descrever as duas formas.
    if (!image) { setErr(t.sig.rubricRequired); return }
    if (requireCpf && !cpf.trim()) { setErr(t.sig.cpfRequired); return }
    // CPF digitado errado é recusado nos DOIS fluxos: opcional não é licença
    // para guardar um número que não fecha os dígitos verificadores.
    if (cpf.trim() && !cpfValido(cpf)) { setErr(t.sig.cpfInvalid); return }
    setErr(null)
    onConfirm({ signature_image: image, geo, cpf: cpf.trim() || null })
  }

  const geoReady = geo.consent && geo.lat != null

  return (
    <>
      <Modal open={open} onClose={onClose} title={title ?? t.sig.signTitle} kicker={kicker ?? t.cases.inv.give} maxWidth={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Rubrica: desenhada à mão ou gerada a partir do nome. */}
          <RubricField ref={rubricRef} defaultName={defaultName} onChange={setImage} />

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

          {/* CPF: obrigatório no parecer (o backend recusa sem), opcional no público */}
          <Field label={requireCpf ? t.sig.cpfRequiredLabel : t.sig.cpf}>
            <Input value={cpf} onChange={(e) => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" autoComplete="off" />
          </Field>

          {err && <div style={{ background: 'rgba(217,83,79,.12)', border: '1px solid rgba(217,83,79,.4)', color: '#e08585', borderRadius: 12, padding: '11px 14px', fontSize: 13.5 }}>{err}</div>}

          {/* Com CPF obrigatório o botão fica TRAVADO até o número validar
              (dígitos verificadores) — errar e descobrir só no clique é o
              atrito que faz a pessoa desistir no meio. */}
          <Button
            onClick={submit}
            loading={busy}
            disabled={requireCpf ? !cpfValido(cpf) : false}
            leftIcon="signature"
            style={{ padding: '14px 24px', fontSize: 15.5 }}
          >
            {busy ? t.sig.signing : (cta ?? t.cases.inv.signAndSend)}
          </Button>
        </div>
      </Modal>

      <GeolocationConsentModal open={geoOpen} onClose={() => setGeoOpen(false)} onResolve={(g) => { setGeo(g); setGeoOpen(false) }} />
    </>
  )
}
