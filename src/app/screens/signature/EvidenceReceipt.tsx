// Comprovante de assinatura: carrega GET /signature/documents/{id}/evidence e
// mostra tudo (hash original, integridade da cadeia, e cada signatário com sua
// evidência criptográfica). Botões: baixar o arquivo assinado e copiar o link de
// verificação pública ({origin}/verificar/{token}).
import { useEffect, useState } from 'react'
import { api, saveBlob } from '../../../lib/api'
import type { ApiError, Evidence } from '../../../lib/types'
import { Button, Card, SectionLabel, Skeleton } from '../../ui'
import { Icon } from '../../icons'
import { useT } from '../../strings'
import { KV, StatusBadge, fmtDate } from './shared'

interface Props {
  documentId: string
  onToast: (msg: string) => void
  /** Sobe quando o número de assinaturas muda (para o pai atualizar a lista). */
  refreshKey?: number
}

export default function EvidenceReceipt({ documentId, onToast, refreshKey = 0 }: Props) {
  const t = useT()
  const [ev, setEv] = useState<Evidence | null | 'error'>(null)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setEv(null)
    api.get<Evidence>(`/signature/documents/${documentId}/evidence`)
      .then(setEv)
      .catch(() => setEv('error'))
  }, [documentId, refreshKey])

  async function download() {
    setDownloading(true)
    try {
      const { blob, filename, mime } = await api.getBlob(`/signature/documents/${documentId}/download`)
      // Preserva o mime do documento (PDF/DOCX) e o nome sugerido pelo servidor.
      saveBlob(new Blob([blob], { type: mime }), filename)
    } catch (e) {
      onToast((e as ApiError).detail ?? t.sig.downloadFail)
    } finally {
      setDownloading(false)
    }
  }

  const copy = (val: string, key: string) => {
    void navigator.clipboard?.writeText(val)
    setCopied(key)
    onToast(t.common.copied)
    setTimeout(() => setCopied(null), 1600)
  }

  if (ev === null) return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><Skeleton h={120} r={18} /><Skeleton h={200} r={18} /></div>
  if (ev === 'error') return <Card style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>{t.sig.evLoadFail}</Card>

  const verifyLink = (token: string) => `${window.location.origin}/verificar/${token}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Cabeçalho do comprovante */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <SectionLabel>{t.sig.evTitle}</SectionLabel>
            <h3 style={{ color: 'var(--heading)', fontSize: 19, fontWeight: 800, wordBreak: 'break-word' }}>{ev.filename}</h3>
          </div>
          <StatusBadge status={ev.status} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 18 }}>
          <KV label={t.sig.evHash} value={ev.original_sha256} mono />
          <div>
            <span style={{ color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>{t.sig.evChain}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: ev.chain_intact ? '#16a34a' : '#d9534f', background: ev.chain_intact ? 'rgba(22,163,74,.12)' : 'rgba(217,83,79,.12)', border: `1px solid ${ev.chain_intact ? 'rgba(22,163,74,.4)' : 'rgba(217,83,79,.4)'}`, borderRadius: 100, padding: '5px 13px' }}>
              <Icon name={ev.chain_intact ? 'check' : 'close'} size={14} />
              {ev.chain_intact ? t.sig.chainOk : t.sig.chainBroken}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <Button leftIcon="download" onClick={() => void download()} loading={downloading}>{downloading ? t.sig.downloading : t.sig.downloadSigned}</Button>
        </div>
      </Card>

      {/* Signatários */}
      <div>
        <SectionLabel>{t.sig.signers}</SectionLabel>
        {ev.signers.length === 0 ? (
          <Card style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>{t.sig.noSigners}</Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ev.signers.map((s, i) => {
              const geoText = s.geo_consent && s.geo_lat != null
                ? `${s.geo_lat.toFixed(5)}, ${s.geo_lng?.toFixed(5)}${s.geo_accuracy != null ? ` (±${Math.round(s.geo_accuracy)}m)` : ''}`
                : t.sig.notConsented
              return (
                <Card key={s.evidence_hash || i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ width: 40, height: 40, minWidth: 40, borderRadius: 12, background: 'linear-gradient(135deg,var(--accent),var(--accent-2))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px var(--accent-shadow)' }}>
                      <Icon name="signature" size={20} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name || t.sig.signerName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{fmtDate(s.signed_at)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                    <KV label={t.sig.algo} value={s.algo} />
                    <KV label={t.sig.level} value={s.level} />
                    <KV label={t.sig.geo} value={geoText} />
                    <KV label={t.sig.ip} value={s.ip || '—'} />
                    <KV label={t.sig.cpfMasked} value={s.cpf_masked || '—'} />
                    <KV label={t.sig.cpfStatus} value={s.cpf_status || '—'} />
                    <KV label={t.sig.userAgent} value={s.user_agent || '—'} style={{ gridColumn: '1 / -1' }} />
                    <KV label={t.sig.evHashLabel} value={s.evidence_hash} mono style={{ gridColumn: '1 / -1' }} />
                    {s.prev_evidence_hash && <KV label={t.sig.prevHash} value={s.prev_evidence_hash} mono style={{ gridColumn: '1 / -1' }} />}
                  </div>

                  {/* Token + link de verificação */}
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>{t.sig.verifyLink}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <code style={{ flex: 1, minWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, color: 'var(--text)' }}>{verifyLink(s.verify_token)}</code>
                      <Button variant="ghost" leftIcon="copy" onClick={() => copy(verifyLink(s.verify_token), s.verify_token)}>{copied === s.verify_token ? t.common.copied : t.sig.copyVerify}</Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
