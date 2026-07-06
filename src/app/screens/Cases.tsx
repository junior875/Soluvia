// Casos: lista + detalhe/operação. Quem tem permissão tria (gravidade),
// responde ao denunciante, faz anotações internas, avança a etapa e encerra.
// Textos 100% traduzidos (PT/EN/ES) via t.cases.
import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { api, downloadAuthedFile } from '../../lib/api'
import type { ApiError, CaseDetail, CaseOut, SigGeo } from '../../lib/types'
import { useCaps } from '../capabilities'
import { goScreen } from '../nav'
import { useT } from '../strings'
import { useTranslation } from '../../i18n/LanguageProvider'
import { Button, Card, Chip, EmptyState, Input, Modal, PageHeader, SectionLabel, Select, Skeleton } from '../ui'
import ParecerSignModal from './signature/ParecerSignModal'

const SEV_TONE = { low: 'muted', medium: 'blue', high: 'accent', critical: 'accent' } as const
const STATUS_TONE = { received: 'muted', triage: 'blue', investigation: 'accent', responded: 'blue', closed: 'green' } as const
const SEVS = ['low', 'medium', 'high', 'critical'] as const

const ta: CSSProperties = { width: '100%', minHeight: 72, resize: 'vertical', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', color: 'var(--heading)', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }

export default function Cases() {
  const { can } = useCaps()
  const t = useT()
  const { lang } = useTranslation()
  const sevL = (s: string) => (t.cases.sev as Record<string, string>)[s] ?? s
  const statL = (s: string) => (t.cases.stat as Record<string, string>)[s] ?? s
  const [cases, setCases] = useState<CaseOut[] | null>(null)
  const [detail, setDetail] = useState<CaseDetail | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState('')
  const [note, setNote] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [resolution, setResolution] = useState('')
  const [resVisible, setResVisible] = useState(true)
  // Parecer (etapa de investigação)
  const [pDecision, setPDecision] = useState<string>('')
  const [pRating, setPRating] = useState<string>('')
  const [pUrgency, setPUrgency] = useState<string>('')
  const [pParecer, setPParecer] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [signOpen, setSignOpen] = useState(false)
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3200) }
  const downloadPdf = async () => {
    if (!detail) return
    setPdfBusy(true)
    try { await downloadAuthedFile(`/cases/${detail.id}/report.pdf`) }
    catch (e) { flash((e as ApiError).detail ?? t.cases.fail) }
    finally { setPdfBusy(false) }
  }

  const isEtica = can('etica.view_cases')
  const canManageChannels = can('admin.manage_roles')
  const canTriage = can('etica.triage')
  const canRespond = can('etica.respond')
  const canClose = can('etica.close')
  const canAnnotate = can('etica.annotate') || canRespond

  const load = () => api.get<CaseOut[]>('/cases').then(setCases).catch(() => setCases([]))
  useEffect(() => { void load() }, [])

  async function openCase(id: string) {
    setOpen(true); setDetail(null); setReply(''); setNote(''); setResolution('')
    try {
      const d = await api.get<CaseDetail>(`/cases/${id}`)
      setDetail(d); setSeverity(d.severity)
    } catch (e) { flash((e as ApiError).detail ?? t.cases.failOpen); setOpen(false) }
  }
  async function act(fn: () => Promise<unknown>) {
    setBusy(true)
    try {
      await fn()
      if (detail) { const d = await api.get<CaseDetail>(`/cases/${detail.id}`); setDetail(d) }
      void load()
    } catch (e) { flash((e as ApiError).detail ?? t.cases.fail) } finally { setBusy(false) }
  }
  const sendReply = () => act(async () => { await api.post(`/cases/${detail!.id}/events`, { type: 'message', content: reply, visible_to_reporter: true }); setReply('') })
  const addNote = () => act(async () => { await api.post(`/cases/${detail!.id}/events`, { type: 'note', content: note, visible_to_reporter: false }); setNote('') })
  const applySeverity = () => act(async () => { await api.post(`/cases/${detail!.id}/events`, { type: 'note', new_severity: severity }) })
  const advance = () => act(async () => { await api.post(`/cases/${detail!.id}/advance`, {}) })
  const closeCase = () => act(async () => { await api.post(`/cases/${detail!.id}/close`, { resolution, visible_to_reporter: resVisible }) })
  const releaseFlow = () => act(async () => { const d = await api.post<CaseDetail>(`/cases/${detail!.id}/release-flow`, {}); setDetail(d) })
  // Envia o parecer. Se a etapa exigir assinatura, `sig` traz rubrica + geo + CPF.
  const doSubmitParecer = (sig?: { signature_image: string; geo: SigGeo; cpf: string | null }) => act(async () => {
    const d = await api.post<CaseDetail>(`/cases/${detail!.id}/parecer`, {
      decision: pDecision || null, rating: pRating ? Number(pRating) : null, urgency: pUrgency || null, parecer: pParecer,
      signature_image: sig?.signature_image ?? null, geo: sig?.geo ?? null, cpf: sig?.cpf ?? null,
    })
    setDetail(d); setPDecision(''); setPRating(''); setPUrgency(''); setPParecer(''); setSignOpen(false)
    flash(t.cases.inv.sent)
  })
  const myPending = detail?.assignments.find((a) => a.id === detail.my_pending_assignment_id) ?? null
  // Botão do parecer: abre o modal de assinatura se a etapa exigir; senão envia direto.
  const onSubmitParecer = () => { if (myPending?.require_signature) setSignOpen(true); else void doSubmitParecer() }

  const answersView = detail && detail.form_snapshot.length > 0
    ? detail.form_snapshot.filter((f) => f.type !== 'section' && f.type !== 'info').map((f) => {
        const v = detail.answers[f.key]
        const val = Array.isArray(v) ? v.join(', ') : v
        return (
          <div key={f.key}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{f.label}</div>
            <div style={{ color: 'var(--heading)', fontWeight: 600, fontSize: 14.5, whiteSpace: 'pre-wrap' }}>{val != null && val !== '' ? String(val) : '—'}</div>
          </div>
        )
      })
    : null

  const matches = (c: CaseOut) => {
    const term = q.trim().toLowerCase()
    if (!term) return true
    return c.title.toLowerCase().includes(term) || c.protocol.toLowerCase().includes(term)
  }
  const filtered = (cases ?? []).filter(matches)
  const activeCases = filtered.filter((c) => c.status !== 'closed')
  const finishedCases = filtered.filter((c) => c.status === 'closed')

  const caseCard = (c: CaseOut) => (
    <Card key={c.id} hover onClick={() => void openCase(c.id)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 15.5 }}>{c.title}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontFamily: 'monospace' }}>{c.protocol}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Chip tone={SEV_TONE[c.severity as keyof typeof SEV_TONE] ?? 'muted'}>{sevL(c.severity)}</Chip>
          <Chip tone={STATUS_TONE[c.status as keyof typeof STATUS_TONE] ?? 'muted'}>{statL(c.status)}</Chip>
          <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{new Date(c.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </Card>
  )

  const groupHeader = (label: string, count: number, tone: 'accent' | 'green') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 2px' }}>
      <SectionLabel>{label}</SectionLabel>
      <Chip tone={tone}>{count}</Chip>
    </div>
  )

  return (
    <div className="app-screen">
      {isEtica && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <img src={lang === 'en' ? '/canal-denuncias-en.png' : '/canal-denuncias.png'} alt={lang === 'en' ? 'Whistleblowing Channel' : 'Canal de Denúncias'} className="module-logo" style={{ height: 'clamp(150px, 26vw, 260px)', width: 'auto', maxWidth: '92%', objectFit: 'contain' }} />
        </div>
      )}
      <PageHeader
        title={t.cases.title}
        subtitle={t.cases.subtitle}
        action={canManageChannels && <Button leftIcon="channels" onClick={() => goScreen('channels')}>{t.cases.createChannel}</Button>}
      />
      {cases === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={72} r={16} />)}</div>
      ) : cases.length === 0 ? (
        <Card><EmptyState icon="cases" title={t.cases.empty} /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.cases.searchPh} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groupHeader(t.cases.active, activeCases.length, 'accent')}
            {activeCases.length === 0
              ? <Card><EmptyState icon="cases" title={q.trim() ? t.cases.noMatch : t.cases.noActive} /></Card>
              : activeCases.map(caseCard)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groupHeader(t.cases.finished, finishedCases.length, 'green')}
            {finishedCases.length === 0
              ? <Card><EmptyState icon="cases" title={q.trim() ? t.cases.noMatch : t.cases.noFinished} /></Card>
              : finishedCases.map(caseCard)}
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} kicker={t.cases.title} title={detail ? detail.protocol : t.cases.loading} maxWidth={720}>
        {!detail ? <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><Skeleton h={20} /><Skeleton h={90} r={12} /><Skeleton h={60} r={12} /></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip tone={SEV_TONE[detail.severity as keyof typeof SEV_TONE] ?? 'muted'}>{sevL(detail.severity)}</Chip>
              <Chip tone={STATUS_TONE[detail.status as keyof typeof STATUS_TONE] ?? 'muted'}>{statL(detail.status)}</Chip>
              <Chip tone="muted">{detail.is_anonymous ? t.cases.anon : t.cases.identified}</Chip>
              <Button variant="ghost" loading={pdfBusy} onClick={downloadPdf} leftIcon="download" style={{ marginLeft: 'auto' }}>{t.cases.downloadPdf}</Button>
            </div>

            {/* Relato */}
            <div>
              <SectionLabel>{t.cases.relato}</SectionLabel>
              <div style={{ display: 'grid', gap: 10, background: 'var(--surface-2)', borderRadius: 14, padding: 14 }}>
                {answersView ?? <p style={{ color: 'var(--heading)', fontSize: 14.5, whiteSpace: 'pre-wrap' }}>{detail.events.find((e) => e.type === 'created')?.content ?? '—'}</p>}
              </div>
            </div>

            {/* Assinatura digital do denunciante identificado */}
            {detail.reporter_signature && (
              <div>
                <SectionLabel>{t.cases.rsigTitle}</SectionLabel>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--accent-border)', borderRadius: 14, padding: 14, flexWrap: 'wrap' }}>
                  <img src={detail.reporter_signature.image} alt="rubrica" style={{ height: 64, width: 'auto', maxWidth: 200, background: '#f6f8fc', border: '1px solid var(--border)', borderRadius: 10, padding: 4, objectFit: 'contain' }} />
                  <div style={{ display: 'grid', gap: 3, fontSize: 12.5, color: 'var(--text-muted)', minWidth: 0 }}>
                    <div><b style={{ color: 'var(--heading)' }}>{t.cases.rsigSignedAt}:</b> {new Date(detail.reporter_signature.signed_at).toLocaleString()}</div>
                    {detail.reporter_signature.cpf_masked && <div><b style={{ color: 'var(--heading)' }}>{t.cases.rsigCpf}:</b> {detail.reporter_signature.cpf_masked}</div>}
                    <div><b style={{ color: 'var(--heading)' }}>{t.cases.rsigGeo}:</b> {detail.reporter_signature.geo?.consent && detail.reporter_signature.geo.lat != null
                      ? `${detail.reporter_signature.geo.lat.toFixed(5)}, ${detail.reporter_signature.geo.lng?.toFixed(5)}`
                      : t.cases.rsigNoGeo}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>#{detail.reporter_signature.hash.slice(0, 24)}…</div>
                  </div>
                </div>
              </div>
            )}

            {/* Linha do tempo */}
            <div>
              <SectionLabel>{t.cases.timeline}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {detail.events.map((e) => {
                  const fromReporter = e.type === 'message' && e.actor_membership_id === null
                  const label = e.type === 'note' ? t.cases.ev.note
                    : e.type === 'created' ? t.cases.ev.opening
                    : e.type === 'closed' ? t.cases.ev.closing
                    : e.type === 'stage_change' || e.type === 'status_change' ? t.cases.ev.stage
                    : fromReporter ? t.cases.ev.fromReporter
                    : e.visible_to_reporter ? t.cases.ev.toReporter
                    : e.type
                  const tone = e.type === 'note' ? 'muted'
                    : fromReporter ? 'accent'
                    : e.visible_to_reporter ? 'green'
                    : 'blue'
                  return (
                    <div key={e.id} style={{ borderLeft: '2px solid var(--border)', paddingLeft: 12 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip tone={tone}>{label}</Chip>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(e.created_at).toLocaleString()}</span>
                      </div>
                      <div style={{ color: 'var(--text)', fontSize: 14, marginTop: 4, whiteSpace: 'pre-wrap' }}>{e.content}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Investigação — fluxo de pareceres */}
            {(detail.assignments.length > 0 || (detail.can_release && canTriage)) && (
              <div>
                <SectionLabel>{t.cases.inv.title}</SectionLabel>
                {detail.can_release && canTriage && (
                  <div style={{ marginBottom: 12 }}>
                    <Button loading={busy} onClick={releaseFlow} leftIcon="flow">{t.cases.inv.release}</Button>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 6 }}>{t.cases.inv.releaseHint}</p>
                  </div>
                )}
                {detail.assignments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {detail.assignments.map((a) => {
                      const who = a.assignee_name || (a.role_name ? `${t.cases.inv.anyOf} ${a.role_name}` : '—')
                      const stTone = a.status === 'submitted' ? 'green' : a.status === 'active' ? 'accent' : 'muted'
                      return (
                        <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', background: a.id === detail.my_pending_assignment_id ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, color: 'var(--heading)', fontSize: 14 }}>{a.is_closer ? t.cases.inv.closer : a.stage_name}</span>
                            <Chip tone={stTone as 'green' | 'accent' | 'muted'}>{(t.cases.inv.status as Record<string, string>)[a.status] ?? a.status}</Chip>
                            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12.5 }}>{who}</span>
                          </div>
                          {a.status === 'submitted' && (
                            <div style={{ marginTop: 8, fontSize: 14 }}>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center' }}>
                                {a.decision && <Chip tone="blue">{(t.cases.inv.dec as Record<string, string>)[a.decision] ?? a.decision}</Chip>}
                                {a.rating != null && <Chip tone="muted">{t.cases.inv.rating}: {a.rating}/5</Chip>}
                                {a.urgency && <Chip tone="muted">{t.cases.inv.urgency}: {(t.cases.inv.urg as Record<string, string>)[a.urgency] ?? a.urgency}</Chip>}
                                {a.signature_token && (
                                  <a href={`/verificar/${a.signature_token}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 100, padding: '3px 10px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                                    🔏 {t.cases.inv.signed} · {t.cases.inv.verifyLink}
                                  </a>
                                )}
                              </div>
                              <div style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{a.parecer}</div>
                              {a.submitted_by_name && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>— {a.submitted_by_name}</div>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                {myPending && (
                  <div style={{ marginTop: 14, border: '1.5px solid var(--accent)', borderRadius: 14, padding: 14, background: 'var(--surface-2)' }}>
                    <div style={{ fontWeight: 800, color: 'var(--heading)', marginBottom: 10 }}>{t.cases.inv.give} — {myPending.is_closer ? t.cases.inv.closer : myPending.stage_name}</div>
                    {myPending.parecer_config?.decision && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{t.cases.inv.decision}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(['agree', 'more_info', 'dismiss'] as const).map((d) => (
                            <button key={d} type="button" onClick={() => setPDecision(d)} className="app-btn" style={{ cursor: 'pointer', border: `1.5px solid ${pDecision === d ? 'var(--accent)' : 'var(--border)'}`, background: pDecision === d ? 'var(--accent-soft)' : 'var(--surface)', color: pDecision === d ? 'var(--accent)' : 'var(--text)', borderRadius: 100, padding: '7px 14px', fontSize: 13, fontWeight: 700 }}>{(t.cases.inv.dec as Record<string, string>)[d]}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                      {myPending.parecer_config?.rating && (
                        <div><div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{t.cases.inv.rating}</div>
                          <Select value={pRating} onChange={(e) => setPRating(e.target.value)} style={{ maxWidth: 120 }}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</Select></div>
                      )}
                      {myPending.parecer_config?.urgency && (
                        <div><div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{t.cases.inv.urgency}</div>
                          <Select value={pUrgency} onChange={(e) => setPUrgency(e.target.value)} style={{ maxWidth: 160 }}><option value="">—</option>{(['low', 'medium', 'high'] as const).map((u) => <option key={u} value={u}>{(t.cases.inv.urg as Record<string, string>)[u]}</option>)}</Select></div>
                      )}
                    </div>
                    <textarea style={ta} value={pParecer} onChange={(e) => setPParecer(e.target.value)} placeholder={t.cases.inv.pareceerPh} />
                    {myPending.require_signature && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 10, padding: '9px 12px', color: 'var(--accent)', fontSize: 12.5, lineHeight: 1.5 }}>
                        <span>🔏</span><span>{t.cases.inv.sigRequired}</span>
                      </div>
                    )}
                    <Button loading={busy} disabled={!pParecer.trim()} onClick={onSubmitParecer} leftIcon={myPending.require_signature ? 'signature' : undefined} style={{ marginTop: 8 }}>{myPending.require_signature ? t.cases.inv.submitSign : t.cases.inv.submit}</Button>
                  </div>
                )}
              </div>
            )}

            {/* Ações por permissão — durante um fluxo ativo, só "responder ao
                denunciante"; o AVANÇO e o ENCERRAMENTO são controlados pelo fluxo
                de pareceres (evita encerrar por engano). */}
            {detail.status !== 'closed' && (() => {
              const flowActive = detail.assignments.length > 0
              const showManual = !flowActive && (canTriage || canAnnotate || canClose)
              if (!showManual && !canRespond) return null
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  {flowActive && <p style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>{t.cases.inv.flowManaged}</p>}
                  {!flowActive && canTriage && (
                    <div>
                      <SectionLabel>{t.cases.triageL}</SectionLabel>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ maxWidth: 200 }}>
                          {SEVS.map((s) => <option key={s} value={s}>{sevL(s)}</option>)}
                        </Select>
                        <Button variant="ghost" loading={busy} onClick={applySeverity}>{t.cases.applySev}</Button>
                        <Button loading={busy} onClick={advance}>{t.cases.advance}</Button>
                      </div>
                    </div>
                  )}
                  {canRespond && (
                    <div>
                      <SectionLabel>{t.cases.respondL}</SectionLabel>
                      <textarea style={ta} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t.cases.replyPh} />
                      <Button loading={busy} disabled={!reply.trim()} onClick={sendReply} style={{ marginTop: 8 }}>{t.cases.sendReply}</Button>
                    </div>
                  )}
                  {!flowActive && canAnnotate && (
                    <div>
                      <SectionLabel>{t.cases.noteL}</SectionLabel>
                      <textarea style={ta} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.cases.notePh} />
                      <Button variant="ghost" loading={busy} disabled={!note.trim()} onClick={addNote} style={{ marginTop: 8 }}>{t.cases.addNote}</Button>
                    </div>
                  )}
                  {!flowActive && canClose && (
                    <div>
                      <SectionLabel>{t.cases.closeL}</SectionLabel>
                      <textarea style={ta} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder={t.cases.closePh} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                        <input type="checkbox" checked={resVisible} onChange={(e) => setResVisible(e.target.checked)} /> {t.cases.showOutcome}
                      </label>
                      <button className="app-btn" disabled={busy || !resolution.trim()} onClick={closeCase} style={{ cursor: 'pointer', borderRadius: 100, padding: '11px 20px', fontWeight: 700, fontFamily: 'inherit', background: '#d9534f', color: '#fff', border: 'none', opacity: busy || !resolution.trim() ? 0.6 : 1 }}>{t.cases.closeL}</button>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </Modal>

      <ParecerSignModal open={signOpen} busy={busy} onClose={() => setSignOpen(false)} onConfirm={(sig) => doSubmitParecer(sig)} />

      {toast && createPortal(
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--heading)', color: 'var(--surface)', padding: '12px 22px', borderRadius: 100, fontWeight: 700, fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,.3)', zIndex: 10002, maxWidth: '90vw', textAlign: 'center' }}>{toast}</div>,
        document.body,
      )}
    </div>
  )
}
