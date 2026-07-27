// Tela "Assinatura Digital". Duas vistas:
//  • Lista + uploader (DocumentUploader) — envia .pdf/.docx e lista os documentos.
//  • Detalhe do documento — abas Preparar (PdfViewer p/ posicionar campos) · Assinar
//    (SignModal: rubrica + CPF + geo com consentimento) · Comprovante (EvidenceReceipt).
// DOCX não abre o viewer (posicionar campos é recurso do PDF) — mostra a nota e
// permite assinar direto.
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../lib/api'
import type { SigDocument, Signature as SignatureType } from '../../lib/types'
import { useCaps } from '../capabilities'
import { useT } from '../strings'
import { useTranslation } from '../../i18n/LanguageProvider'
import { Button, Card, EmptyState, PageHeader, SectionLabel, Skeleton } from '../ui'
import { Icon } from '../icons'
import DocumentUploader from './signature/DocumentUploader'
import SignModal from './signature/SignModal'
import EvidenceReceipt from './signature/EvidenceReceipt'
import { StatusBadge, fmtDate, isPdf } from './signature/shared'

// pdf.js é pesado (~600 kB): só carrega quando o usuário abre o viewer de um PDF.
const PdfViewer = lazy(() => import('./signature/PdfViewer'))

type Tab = 'prepare' | 'sign' | 'evidence'

export default function Signature() {
  const t = useT()
  const { lang } = useTranslation()
  const caps = useCaps()
  const canManage = caps.can('assinatura.manage')
  const canSign = caps.can('assinatura.sign')

  const [docs, setDocs] = useState<SigDocument[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<SigDocument | null>(null)
  const [tab, setTab] = useState<Tab>('prepare')
  const [signOpen, setSignOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [evKey, setEvKey] = useState(0)

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600) }

  useEffect(() => {
    api.get<SigDocument[]>('/signature/documents').then(setDocs).catch(() => setDocs([]))
  }, [])

  // Carrega o detalhe (inclui fields) ao abrir um documento.
  useEffect(() => {
    if (!openId) { setDetail(null); return }
    setDetail(null)
    api.get<SigDocument>(`/signature/documents/${openId}`)
      .then((d) => { setDetail(d); setTab(isPdf(d.mime) && canManage ? 'prepare' : 'sign') })
      .catch(() => flash(t.sig.evLoadFail))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  const openDoc = (id: string) => setOpenId(id)
  const closeDoc = () => { setOpenId(null); setDetail(null) }

  const onUploaded = (doc: SigDocument) => {
    setDocs((d) => [doc, ...(d ?? [])])
    flash(t.sig.status.uploaded)
    setOpenId(doc.id)
  }

  const patchDoc = (doc: SigDocument) => {
    setDetail(doc)
    setDocs((d) => (d ?? []).map((x) => (x.id === doc.id ? { ...x, ...doc } : x)))
  }

  const onSigned = (_sig: SignatureType) => {
    setSignOpen(false)
    flash(t.sig.signed)
    setEvKey((k) => k + 1)
    setTab('evidence')
    // Recarrega o documento (status pode ter mudado p/ partial/signed) e a lista.
    if (openId) {
      api.get<SigDocument>(`/signature/documents/${openId}`).then(patchDoc).catch(() => {})
      api.get<SigDocument[]>('/signature/documents').then(setDocs).catch(() => {})
    }
  }

  const Toast = toast && createPortal(
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--heading)', color: 'var(--surface)', padding: '12px 22px', borderRadius: 100, fontWeight: 700, fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,.3)', zIndex: 10002 }}>{toast}</div>,
    document.body,
  )

  // ══════════════ DETALHE ══════════════
  if (openId) {
    return (
      <div className="app-screen">
        <button onClick={closeDoc} className="app-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', marginBottom: 14, padding: 0 }}>
          <Icon name="chevron" size={16} style={{ transform: 'rotate(180deg)' }} /> {t.sig.back}
        </button>

        {!detail ? (
          <Skeleton h={360} r={20} />
        ) : (
          <DocumentDetail
            doc={detail} tab={tab} setTab={setTab}
            canManage={canManage} canSign={canSign} evKey={evKey}
            onOpenSign={() => setSignOpen(true)}
            onFieldsSaved={patchDoc} onToast={flash}
          />
        )}

        {detail && canSign && (
          <SignModal
            open={signOpen}
            documentId={detail.id}
            onClose={() => setSignOpen(false)}
            onSigned={onSigned}
          />
        )}
        {Toast}
      </div>
    )
  }

  // ══════════════ LISTA ══════════════
  return (
    <div className="app-screen">
      {/* Marca do módulo, no idioma da tela — mesma família do Canal de
          Denúncias e do SAC. */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
        <img
          src={lang === 'en' ? '/assinatura-en.svg' : lang === 'es' ? '/assinatura-es.svg' : '/assinatura.svg'}
          alt={t.sig.title}
          className="module-logo"
          style={{ height: 'clamp(150px, 26vw, 260px)', width: 'auto', maxWidth: '92%', objectFit: 'contain' }}
        />
      </div>
      <PageHeader title={t.sig.title} subtitle={t.sig.subtitle} />

      {canManage && (
        <div style={{ marginBottom: 22 }}>
          <DocumentUploader onUploaded={onUploaded} onToast={flash} />
        </div>
      )}

      <SectionLabel>{t.sig.docs}</SectionLabel>
      {docs === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton h={72} r={16} /><Skeleton h={72} r={16} /><Skeleton h={72} r={16} />
        </div>
      ) : docs.length === 0 ? (
        <Card><EmptyState icon="signature" title={t.sig.emptyDocs} body={t.sig.emptyDocsBody} /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {docs.map((d) => (
            <Card key={d.id} hover onClick={() => openDoc(d.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ width: 44, height: 44, minWidth: 44, borderRadius: 12, background: isPdf(d.mime) ? 'var(--accent-soft)' : 'var(--blue-soft)', color: isPdf(d.mime) ? 'var(--accent)' : 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="audit" size={21} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.filename}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{isPdf(d.mime) ? 'PDF' : 'DOCX'} · {t.sig.created} {fmtDate(d.created_at)}</div>
                </div>
                <StatusBadge status={d.status} />
                <Icon name="chevron" size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            </Card>
          ))}
        </div>
      )}
      {Toast}
    </div>
  )
}

function DocumentDetail({ doc, tab, setTab, canManage, canSign, evKey, onOpenSign, onFieldsSaved, onToast }: {
  doc: SigDocument
  tab: Tab
  setTab: (t: Tab) => void
  canManage: boolean
  canSign: boolean
  evKey: number
  onOpenSign: () => void
  onFieldsSaved: (doc: SigDocument) => void
  onToast: (m: string) => void
}) {
  const t = useT()
  const pdf = isPdf(doc.mime)
  // Campos posicionados mas ainda não persistidos. Assinar nesse estado faz o
  // backend ver a lista vazia e carimbar no pé da ÚLTIMA página.
  const [fieldsPending, setFieldsPending] = useState(false)
  useEffect(() => { setFieldsPending(false) }, [doc.id])

  // Abas disponíveis conforme tipo/permissão. DOCX pula a de preparar.
  const tabs = useMemo(() => {
    const list: { id: Tab; label: string; icon: 'signature' | 'audit' }[] = []
    // A aba aparece para todo PDF. Quem não gerencia vê o documento e os campos em
    // modo leitura — antes a aba simplesmente sumia e dava a impressão de que a
    // plataforma não deixava posicionar a assinatura.
    if (pdf) list.push({ id: 'prepare', label: t.sig.prepare, icon: 'signature' })
    if (canSign) list.push({ id: 'sign', label: t.sig.sign, icon: 'signature' })
    list.push({ id: 'evidence', label: t.sig.evidence, icon: 'audit' })
    return list
  }, [pdf, canManage, canSign, t])

  // Garante que a aba ativa exista (ex.: DOCX sem "preparar").
  const activeTab = tabs.some((x) => x.id === tab) ? tab : tabs[0]?.id ?? 'evidence'

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <span style={{ width: 46, height: 46, minWidth: 46, borderRadius: 13, background: pdf ? 'var(--accent-soft)' : 'var(--blue-soft)', color: pdf ? 'var(--accent)' : 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="audit" size={22} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ color: 'var(--heading)', fontSize: 'clamp(19px,3vw,26px)', fontWeight: 900, letterSpacing: '-0.5px', wordBreak: 'break-word', lineHeight: 1.15 }}>{doc.filename}</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 3 }}>{pdf ? 'PDF' : 'DOCX'} · {t.sig.created} {fmtDate(doc.created_at)}</div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      {/* Abas */}
      <div style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 100, padding: 4, marginBottom: 18, flexWrap: 'wrap' }}>
        {tabs.map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)} className="app-btn" style={{ border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 100, fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, background: activeTab === x.id ? 'var(--accent)' : 'transparent', color: activeTab === x.id ? '#fff' : 'var(--text-muted)' }}>
            <Icon name={x.icon} size={14} /> {x.label}
          </button>
        ))}
      </div>

      <div key={activeTab} style={{ animation: 'appFadeUp .35s var(--ease-out) both' }}>
        {activeTab === 'prepare' && pdf && (
          <Suspense fallback={<Card style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>{t.sig.loadingPdf}</Card>}>
            <PdfViewer
              documentId={doc.id}
              canManage={canManage}
              initialFields={doc.fields}
              onPendingChange={setFieldsPending}
              onFieldsSaved={(d) => { setFieldsPending(false); onFieldsSaved(d) }}
              onToast={onToast}
            />
          </Suspense>
        )}

        {activeTab === 'sign' && (
          pdf ? (
            <Card>
              <SectionLabel>{t.sig.sign}</SectionLabel>
              {doc.fields.length > 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14.5, lineHeight: 1.65, marginBottom: 18 }}>
                  {doc.fields.length} {t.sig.fieldsCount}.
                </p>
              ) : (
                // Sem campo salvo o backend carimba no rodapé da última página.
                // Antes isso acontecia calado e parecia que a assinatura "fugia" do lugar.
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: '13px 15px', marginBottom: 18 }}>
                  <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}><Icon name="signature" size={17} /></span>
                  <p style={{ color: 'var(--heading)', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{t.sig.noFieldsWarn}</p>
                </div>
              )}
              {fieldsPending && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(217,83,79,.12)', border: '1px solid rgba(217,83,79,.4)', borderRadius: 12, padding: '13px 15px', marginBottom: 18 }}>
                  <span style={{ color: '#d9534f', flexShrink: 0, marginTop: 1 }}><Icon name="signature" size={17} /></span>
                  <p style={{ color: 'var(--heading)', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{t.sig.unsavedFields}</p>
                </div>
              )}
              <SignCta canSign={canSign && !fieldsPending} onOpenSign={onOpenSign} label={t.sig.confirmSign} />
            </Card>
          ) : (
            // DOCX: sem viewer, explica o bloco de assinatura anexado.
            <Card>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 18 }}>
                <span style={{ width: 44, height: 44, minWidth: 44, borderRadius: 13, background: 'var(--blue-soft)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="audit" size={21} />
                </span>
                <div>
                  <h3 style={{ color: 'var(--heading)', fontSize: 16.5, fontWeight: 800 }}>{t.sig.docxTitle}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.65, marginTop: 6 }}>{t.sig.docxBody}</p>
                </div>
              </div>
              <SignCta canSign={canSign} onOpenSign={onOpenSign} label={t.sig.confirmSign} />
            </Card>
          )
        )}

        {activeTab === 'evidence' && (
          <EvidenceReceipt documentId={doc.id} onToast={onToast} refreshKey={evKey} />
        )}
      </div>
    </>
  )
}

function SignCta({ canSign, onOpenSign, label }: { canSign: boolean; onOpenSign: () => void; label: string }) {
  if (!canSign) return null
  return <Button leftIcon="signature" onClick={onOpenSign} style={{ padding: '14px 26px', fontSize: 15.5 }}>{label}</Button>
}
