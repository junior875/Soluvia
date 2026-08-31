// Ato de assinar: rubrica (canvas) + CPF OBRIGATÓRIO (mascarado) + localização com
// consentimento explícito. Monta o corpo e chama POST /signature/documents/{id}/sign.
import { useEffect, useRef, useState } from 'react'
import { api } from '../../../lib/api'
import type { ApiError, SigGeo, Signature, SignRequest } from '../../../lib/types'
import { useCaps } from '../../capabilities'
import { Modal, Button, Field, Input } from '../../ui'
import { Icon } from '../../icons'
import { useT } from '../../strings'
import RubricField, { type RubricFieldHandle } from './RubricField'
import GeolocationConsentModal from './GeolocationConsentModal'
import { sigProfileKey } from '../../../lib/storageKeys'
import { cpfValido, maskCpf } from '../../../lib/cpf'

// Perfil do signatário salvo NESTE dispositivo (localStorage), POR USUÁRIO.
// Guarda só a imagem da rubrica — nunca o CPF, nunca a localização — e é apagado
// no logout (lib/api.ts). A chave era global e o CPF era restaurado: em máquina
// compartilhada, a próxima pessoa abria o modal com o CPF de quem assinou antes
// já preenchido, e ele ia parar no evidence_hash dela.

interface Props {
  open: boolean
  documentId: string
  fieldId?: string | null
  onClose: () => void
  onSigned: (sig: Signature) => void
}

// Máscara + validação vêm de lib/cpf — o mesmo algoritmo do backend, que é
// quem dá a garantia (422 sem CPF válido). Aqui só se aponta o erro mais cedo.

export default function SignModal({ open, documentId, fieldId, onClose, onSigned }: Props) {
  const t = useT()
  const rubricRef = useRef<RubricFieldHandle>(null)
  const [image, setImage] = useState<string | null>(null)
  const [cpf, setCpf] = useState('')
  const [geo, setGeo] = useState<SigGeo>({ consent: false })
  const [geoOpen, setGeoOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // Opt-IN: o que se persiste agora é o nome completo renderizado de forma
  // legível, não mais um rabisco. Ligado por padrão era demais.
  const [remember, setRemember] = useState(false)
  const [sigType, setSigType] = useState<'rubric' | 'seal'>('rubric')
  const user = useCaps().ctx.user
  const fullName = user.full_name
  const profileKey = sigProfileKey(user.id)

  // Ao abrir, restaura a rubrica DESTE usuário. O CPF nunca é restaurado.
  useEffect(() => {
    if (!open) return
    try {
      const raw = localStorage.getItem(profileKey)
      if (!raw) return
      const p = JSON.parse(raw) as { image?: string }
      if (p.image) { setImage(p.image); setTimeout(() => rubricRef.current?.load(p.image!), 80) }
    } catch { /* perfil ausente/corrompido */ }
  }, [open, profileKey])

  const reset = () => {
    rubricRef.current?.clear()
    setImage(null); setCpf(''); setGeo({ consent: false }); setErr(null)
    setSigType('rubric')   // reabre sempre no modo em que o RubricField existe
  }

  const close = () => {
    // Fechar sem assinar também tem que respeitar o "não guardar neste aparelho".
    if (!remember) { try { localStorage.removeItem(profileKey) } catch { /* storage indisponível */ } }
    reset(); onClose()
  }

  async function submit() {
    // Rubrica sem imagem = documento assinado com a caixa marcada EM BRANCO:
    // o carimbo (artifacts._stamp_one) não entra em nenhum ramo com rubric_png
    // nulo, e a assinatura ainda assim entra na cadeia. Como a rubrica gerada só
    // existe depois do debounce + carga das fontes, essa janela é real.
    if (sigType === 'rubric' && !image) { setErr(t.sig.rubricRequired); return }
    // CPF é obrigatório e conferido AQUI, com o cartão ainda na mão — o
    // backend recusa de qualquer forma (422), mas o erro cedo é mais gentil.
    if (!cpf.trim()) { setErr(t.sig.cpfRequired); return }
    if (!cpfValido(cpf)) { setErr(t.sig.cpfInvalid); return }
    setErr(null); setBusy(true)
    try {
      const body: SignRequest = {
        field_id: fieldId ?? null,
        level: 'advanced',
        signature_type: sigType,
        cpf: cpf.trim(),
        geo,
        signature_image: sigType === 'rubric' ? image : null,
      }
      const sig = await api.post<Signature>(`/signature/documents/${documentId}/sign`, body)
      // Salva/limpa o perfil do signatário (rubrica + CPF), NUNCA a localização.
      try {
        if (remember && image) localStorage.setItem(profileKey, JSON.stringify({ image }))
        else localStorage.removeItem(profileKey)
      } catch { /* storage indisponível */ }
      reset()
      onSigned(sig)
    } catch (e) {
      setErr((e as ApiError).detail ?? t.sig.signFail)
    } finally {
      setBusy(false)
    }
  }

  // Estado visual da linha de localização.
  const geoLabel = geo.consent
    ? (geo.lat != null ? t.sig.geoOn : t.sig.geoTitle)
    : t.sig.geoOff

  return (
    <>
      <Modal open={open} onClose={close} title={t.sig.signTitle} kicker={t.sig.signKicker} maxWidth={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Tipo de assinatura */}
          <Field label={t.sig.typeLabel}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['rubric', 'seal'] as const).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => {
                    if (tp === sigType) return
                    // Trocar de tipo desmonta e remonta o RubricField com o pad
                    // limpo; sem zerar aqui, `image` guardaria o PNG anterior e a
                    // pessoa assinaria com o que não está mais na tela.
                    setSigType(tp)
                    rubricRef.current?.clear()
                    setImage(null)
                  }}
                  className="app-btn"
                  style={{
                    flex: 1, minWidth: 0, cursor: 'pointer', padding: '12px 12px', borderRadius: 12,
                    border: `1.5px solid ${sigType === tp ? 'var(--accent)' : 'var(--border)'}`,
                    background: sigType === tp ? 'var(--accent-soft)' : 'var(--surface-2)',
                    color: sigType === tp ? 'var(--accent)' : 'var(--heading)', fontWeight: 700, fontSize: 13.5,
                    display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                  }}
                >
                  <Icon name={tp === 'rubric' ? 'signature' : 'shield'} size={16} />
                  <span style={{ whiteSpace: 'nowrap' }}>{tp === 'rubric' ? t.sig.typeRubric : t.sig.typeSeal}</span>
                </button>
              ))}
            </div>
          </Field>

          {/* Rubrica (só p/ type=rubric) */}
          {sigType === 'rubric' ? (
            <RubricField ref={rubricRef} defaultName={fullName} onChange={setImage} />
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
              <span style={{ width: 34, height: 34, minWidth: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <Icon name="shield" size={17} />
              </span>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{t.sig.sealHint}</p>
            </div>
          )}

          {/* CPF obrigatório: o backend recusa o ato sem ele (422) */}
          <Field label={t.sig.cpfRequiredLabel}>
            <Input
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              autoComplete="off"
            />
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>{t.sig.cpfHint}</p>
          </Field>

          {/* Localização (consentimento explícito) */}
          <div>
            <Field label={t.sig.geoTitle}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: 'var(--surface-2)', border: `1px solid ${geo.consent && geo.lat != null ? 'var(--accent-border)' : 'var(--border)'}`,
                  borderRadius: 12,
                }}
              >
                <span style={{ width: 34, height: 34, minWidth: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: geo.consent && geo.lat != null ? 'var(--accent-soft)' : 'rgba(120,140,160,.14)', color: geo.consent && geo.lat != null ? 'var(--accent)' : 'var(--text-muted)' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--heading)', fontSize: 13.5, fontWeight: 700 }}>{geoLabel}</div>
                  {geo.consent && geo.lat != null && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{geo.lat.toFixed(5)}, {geo.lng?.toFixed(5)}</div>
                  )}
                  {!geo.consent && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.sig.geoHint}</div>}
                </div>
                <button type="button" onClick={() => setGeoOpen(true)} className="app-btn" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--heading)', borderRadius: 100, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                  <Icon name={geo.consent && geo.lat != null ? 'check' : 'plus'} size={14} />
                  {geo.consent && geo.lat != null ? t.sig.geoOn : t.sig.geoTitle}
                </button>
              </div>
            </Field>
          </div>

          {/* Salvar dados p/ a próxima vez (exceto localização). */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <span>{t.sig.remember}</span>
          </label>

          {err && (
            <div style={{ background: 'rgba(217,83,79,.12)', border: '1px solid rgba(217,83,79,.4)', color: '#e08585', borderRadius: 12, padding: '11px 14px', fontSize: 13.5 }}>{err}</div>
          )}

          <Button
            onClick={() => void submit()}
            loading={busy}
            disabled={sigType === 'rubric' && !image}
            leftIcon="signature"
            style={{ padding: '14px 24px', fontSize: 15.5 }}
          >
            {busy ? t.sig.signing : t.sig.confirmSign}
          </Button>
        </div>
      </Modal>

      <GeolocationConsentModal
        open={geoOpen}
        onClose={() => setGeoOpen(false)}
        onResolve={(g) => { setGeo(g); setGeoOpen(false) }}
      />
    </>
  )
}
