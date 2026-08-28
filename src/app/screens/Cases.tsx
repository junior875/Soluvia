// Casos: lista + detalhe/operação. Quem tem permissão tria (gravidade),
// responde ao denunciante, faz anotações internas, avança a etapa e encerra.
// Textos 100% traduzidos (PT/EN/ES) via t.cases.
import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { api, downloadAuthedFile } from '../../lib/api'
import type { ApiError, CaseDetail, CaseOut, SigGeo } from '../../lib/types'
import { useCaps } from '../capabilities'
import { modPerm } from '../modulePerms'
import { goScreen } from '../nav'
import EvidencePanel from './EvidencePanel'
import ParecerForm, { type ParecerPayload } from './ParecerForm'
import { EvidenceUploader } from '../../components/EvidenceUploader'
import { carregarTiposAceitos, megabytes, paraAccept, type TiposAceitos } from '../../lib/uploads'
import { useT } from '../strings'
import { useTranslation } from '../../i18n/LanguageProvider'
import { Button, Card, Chip, EmptyState, Input, Modal, PageHeader, SectionLabel, Select, Skeleton } from '../ui'
import { Icon } from '../icons'
import ParecerSignModal from './signature/ParecerSignModal'

const SEV_TONE = { low: 'muted', medium: 'blue', high: 'accent', critical: 'accent' } as const
const STATUS_TONE = { received: 'muted', triage: 'blue', investigation: 'accent', responded: 'blue', closed: 'green' } as const
const SEVS = ['low', 'medium', 'high', 'critical'] as const

const ta: CSSProperties = { width: '100%', minHeight: 72, resize: 'vertical', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', color: 'var(--heading)', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box' }

/** A mesma tela serve Canal de Denúncias e SAC: muda o vocabulário (relato de
 *  denúncia x demanda de consumidor), o logotipo e o prazo do decreto. */
export interface CasesProps { module?: 'etica' | 'sac' }

export default function Cases({ module = 'etica' }: CasesProps) {
  const { can, ctx } = useCaps()
  const t = useT()
  const isSac = module === 'sac'
  // Textos do módulo: no SAC quem escreve é CONSUMIDOR, não denunciante. `t.sac`
  // traz só as chaves que mudam; o resto continua vindo de `t.cases`.
  const tx = isSac ? { ...t.cases, ...t.sac } : t.cases
  const { lang } = useTranslation()
  // Logotipo do módulo, no idioma da tela. O de denúncias só tem PT e EN; o do
  // SAC tem os três. Sem isso o SAC exibia a marca do Canal de Denúncias.
  const moduleLogo = isSac
    ? (lang === 'en' ? '/sac-en.svg' : lang === 'es' ? '/sac-es.svg' : '/sac.svg')
    : (lang === 'en' ? '/canal-denuncias-en.png' : '/canal-denuncias.png')
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
  // Parecer da etapa. O rascunho mora no formulário (que muda de forma conforme
  // o TIPO do bloco); aqui fica só o que já foi preenchido e está esperando a
  // assinatura — sem isto, abrir o modal de assinar perderia o que a pessoa
  // acabou de escrever.
  const [parecerPronto, setParecerPronto] = useState<ParecerPayload | null>(null)
  // Sobe a cada envio: remonta o formulário limpo para a próxima etapa.
  const [parecerNonce, setParecerNonce] = useState(0)
  // Muda a cada anexo novo da equipe: remonta a galeria para ele aparecer.
  const [evidenceNonce, setEvidenceNonce] = useState(0)
  // Quantas provas o caso tem — o bloco de investigação abre citando o número.
  const [provasCount, setProvasCount] = useState(0)
  const [tiposAceitos, setTiposAceitos] = useState<TiposAceitos | null>(null)
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

  // As permissões seguem o MÓDULO da tela. Fixar `etica.*` aqui fazia o
  // atendente de SAC abrir a demanda dele e não ver botão nenhum — nem triagem,
  // nem resposta, nem encerramento —, porque ele não tem (nem deve ter) uma
  // única permissão de denúncia.
  const p = (action: string) => can(modPerm(module, action))
  const canView = p('view')
  const canManageChannels = can('admin.manage_roles')
  const canTriage = p('triage')
  const canRespond = p('respond')
  const canClose = p('close')
  const canAnnotate = p('annotate') || canRespond

  const load = () => api.get<CaseOut[]>('/cases').then(setCases).catch(() => setCases([]))
  useEffect(() => { void load() }, [])
  useEffect(() => { carregarTiposAceitos().then(setTiposAceitos).catch(() => setTiposAceitos(null)) }, [])

  // Abre direto o caso que o e-mail de cobrança aponta (#painel/<tela>?protocolo=…).
  // Sem isto o link entregaria a pessoa numa lista para ela procurar à mão o
  // protocolo que estava escrito no próprio e-mail que a trouxe até aqui.
  //
  // Roda só depois que a lista chega, porque o link traz o PROTOCOLO (o que a
  // pessoa lê) e a rota de detalhe pede o id. E limpa a query em seguida: sem
  // isso o caso reabriria sozinho a cada vez que a tela voltasse a montar.
  useEffect(() => {
    // `null` = ainda carregando. Lista VAZIA precisa passar: com o guarda
    // antigo (`!cases?.length`) o protocolo era engolido em silêncio e a query
    // ficava grudada no endereço — a pessoa via a lista vazia sem entender que
    // o caso do e-mail simplesmente não está nesta empresa.
    if (cases === null) return
    const query = window.location.hash.split('?')[1]
    const protocolo = query ? new URLSearchParams(query).get('protocolo') : null
    if (!protocolo) return
    const alvo = cases.find((c) => c.protocol === protocolo)
    window.history.replaceState(null, '', window.location.hash.split('?')[0])
    if (alvo) void openCase(alvo.id)
    else flash(tx.notFoundProtocol)
    // Só na chegada da lista: reagir a `openCase` reabriria o modal a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases])

  async function openCase(id: string) {
    setOpen(true); setDetail(null); setReply(''); setNote(''); setResolution('')
    try {
      const d = await api.get<CaseDetail>(`/cases/${id}`)
      setDetail(d); setSeverity(d.severity)
    } catch (e) { flash((e as ApiError).detail ?? tx.failOpen); setOpen(false) }
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
  // `releaseFlow` saiu: o fluxo arranca sozinho quando o relato chega. A ROTA
  // continua no backend de propósito — é o resgate para o caso que entrou antes
  // de o fluxo do canal existir, e para relançar uma apuração configurada
  // depois. Só não é mais um passo obrigatório na tela.
  // Envia o parecer. Se a etapa exigir assinatura, `sig` traz rubrica + geo + CPF.
  const doSubmitParecer = (p: ParecerPayload, sig?: { signature_image: string; geo: SigGeo; cpf: string | null }) => act(async () => {
    const d = await api.post<CaseDetail>(`/cases/${detail!.id}/parecer`, {
      decision: p.decision, urgency: p.urgency, parecer: p.parecer,
      attachment_ids: p.attachment_ids,
      signature_image: sig?.signature_image ?? null, geo: sig?.geo ?? null, cpf: sig?.cpf ?? null,
    })
    setDetail(d)
    setParecerPronto(null)
    setParecerNonce((n) => n + 1)
    setSignOpen(false)
    flash(t.cases.inv.sent)
  })
  const myPending = detail?.assignments.find((a) => a.id === detail.my_pending_assignment_id) ?? null
  /** O formulário terminou. Se a etapa exigir assinatura, guarda o que foi
   *  preenchido e abre a rubrica; senão vai direto. */
  const onEnviarParecer = (p: ParecerPayload) => {
    if (myPending?.require_signature) { setParecerPronto(p); setSignOpen(true) }
    else void doSubmitParecer(p)
  }

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
  // Cada tela mostra só o que é do seu módulo. Casos antigos, criados antes do
  // SAC existir, não trazem `module` — valem como ética.
  const ofModule = (cases ?? []).filter((c) => (c.module ?? 'etica') === module)
  const filtered = ofModule.filter(matches)
  const activeCases = filtered.filter((c) => c.status !== 'closed')
  const finishedCases = filtered.filter((c) => c.status === 'closed')

  /** Selo do prazo do Decreto 11.034/2022 (7 dias corridos). Só no SAC e só
   *  enquanto a demanda está aberta — depois de encerrada não faz sentido. */
  /** Data do backend pode vir SEM fuso (driver que devolve datetime naive). O JS
   *  leria como hora LOCAL e, em UTC-3, o prazo aparecia um dia MAIOR do que é. */
  const parseUtc = (s: string) => new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(s) ? s : `${s}Z`)

  const dueChip = (c: CaseOut) => {
    if (!isSac || !c.response_due_at || c.status === 'closed') return null
    const ms = parseUtc(c.response_due_at).getTime() - Date.now()
    const dias = Math.ceil(ms / 86_400_000)
    // A paleta de Chip não tem vermelho; 'accent' (laranja) é o tom de alerta do
    // app — o mesmo usado em gravidade alta/crítica. Atrasado ganha ênfase extra.
    if (dias < 0) return <Chip tone="accent"><strong>{t.sac.due.late}</strong></Chip>
    if (dias === 0) return <Chip tone="accent">{t.sac.due.today}</Chip>
    return <Chip tone={dias <= 2 ? 'accent' : 'green'}>{t.sac.due.inDays.replace('{n}', String(dias))}</Chip>
  }

  const caseCard = (c: CaseOut) => (
    <Card key={c.id} hover onClick={() => void openCase(c.id)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 15.5 }}>{c.title}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontFamily: 'monospace' }}>{c.protocol}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {dueChip(c)}
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
      {canView && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <img src={moduleLogo} alt={tx.title} className="module-logo" style={{ height: 'clamp(150px, 26vw, 260px)', width: 'auto', maxWidth: '92%', objectFit: 'contain' }} />
        </div>
      )}
      <PageHeader
        title={tx.title}
        subtitle={tx.subtitle}
        action={canManageChannels && <Button leftIcon="channels" onClick={() => goScreen('channels')}>{tx.createChannel}</Button>}
      />
      {cases === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={72} r={16} />)}</div>
      ) : ofModule.length === 0 ? (
        <Card><EmptyState icon="cases" title={tx.empty} /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx.searchPh} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groupHeader(tx.active, activeCases.length, 'accent')}
            {activeCases.length === 0
              ? <Card><EmptyState icon="cases" title={q.trim() ? t.cases.noMatch : tx.noActive} /></Card>
              : activeCases.map(caseCard)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {groupHeader(tx.finished, finishedCases.length, 'green')}
            {finishedCases.length === 0
              ? <Card><EmptyState icon="cases" title={q.trim() ? t.cases.noMatch : tx.noFinished} /></Card>
              : finishedCases.map(caseCard)}
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} kicker={tx.title} title={detail ? detail.protocol : t.cases.loading} maxWidth={720}>
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
              <SectionLabel>{tx.relato}</SectionLabel>
              <div style={{ display: 'grid', gap: 10, background: 'var(--surface-2)', borderRadius: 14, padding: 14 }}>
                {answersView ?? <p style={{ color: 'var(--heading)', fontSize: 14.5, whiteSpace: 'pre-wrap' }}>{detail.events.find((e) => e.type === 'created')?.content ?? '—'}</p>}
              </div>
            </div>

            {/* Provas anexadas pelo denunciante */}
            <div>
              <SectionLabel>{tx.evidenceTitle}</SectionLabel>
              <EvidencePanel
                key={evidenceNonce}
                caseId={detail.id}
                canView={p('view_evidence')}
                canDownload={p('download_evidence')}
                canAudit={can('admin.view_audit')}
                onError={flash}
                onContagem={setProvasCount}
                textos={{
                  title: tx.evidenceTitle,
                  empty: tx.evidenceEmpty,
                  // Vocabulário do módulo: no SAC quem envia é o consumidor.
                  fromReporter: tx.evidenceFromReporter,
                  view: tx.evidenceView,
                  download: tx.evidenceDownload,
                  close: t.common.close ?? 'Fechar',
                  failed: t.cases.fail,
                  noPreview: tx.evidenceNoPreview,
                  loading: t.cases.loading,
                  noCodecTitle: tx.noCodecTitle,
                  noCodecBody: tx.noCodecBody,
                  noCodecNoPerm: tx.noCodecNoPerm,
                  accessLog: tx.accessLog,
                  accessLogEmpty: tx.accessLogEmpty,
                  accessView: tx.accessView,
                  accessDownload: tx.accessDownload,
                }}
              />
              {!p('view_evidence') && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{tx.evidenceNoPerm}</p>
              )}

              {/* Quem apura também junta prova: documento que ele recebeu por
                  fora, foto do local, gravação. Exige `annotate` — acrescentar
                  material ao dossiê não é a mesma permissão que ler o que já
                  está lá. */}
              {p('annotate') && (
                <EvidenceUploader
                  maxArquivos={tiposAceitos?.max_files ?? 20}
                  accept={paraAccept(tiposAceitos)}
                  formatos={tiposAceitos?.groups}
                  verFormatos={tx.evidenceAccepted}
                  rotulosFormato={{ image: tx.fmtImage, video: tx.fmtVideo, audio: tx.fmtAudio, document: tx.fmtDocument }}
                  pedirAutorizacao={(file) =>
                    api.post(`/cases/${detail.id}/attachments/presign`, {
                      filename: file.name,
                      content_type: file.type,
                    })
                  }
                  confirmar={async (id) => {
                    const d = await api.post<{ attachment_id: string; filename: string; kind: 'image' | 'video' | 'document'; size_bytes: number }>(
                      `/cases/${detail.id}/attachments/${id}/confirm`, {},
                    )
                    return { id: d.attachment_id, filename: d.filename, kind: d.kind, size: d.size_bytes }
                  }}
                  onChange={() => {}}
                  onConcluido={() => setEvidenceNonce((n) => n + 1)}
                  textos={{
                    titulo: tx.evidenceAddTitle,
                    ajuda: tiposAceitos
                      ? `${tx.evidenceAddHelp} ${tx.evidenceLimits.replace('{n}', String(tiposAceitos.max_files)).replace('{mb}', String(megabytes(tiposAceitos.max_bytes)))}`
                      : tx.evidenceAddHelp,
                    escolher: tx.evidenceChoose,
                    solte: tx.evidenceDrop,
                    remover: t.common.remove ?? 'Remover',
                    enviando: t.cases.loading,
                    falhou: t.cases.fail,
                    limite: tx.evidenceLimitReached,
                  }}
                />
              )}
            </div>

            {/* Assinatura digital do denunciante identificado */}
            {detail.reporter_signature && (
              <div>
                <SectionLabel>{tx.rsigTitle}</SectionLabel>
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
                  const label = e.type === 'note' ? tx.ev.note
                    : e.type === 'created' ? tx.ev.opening
                    : e.type === 'closed' ? tx.ev.closing
                    : e.type === 'stage_change' || e.type === 'status_change' ? tx.ev.stage
                    : fromReporter ? tx.ev.fromReporter
                    : e.visible_to_reporter ? tx.ev.toReporter
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

            {/* Investigação — fluxo de pareceres.
                O botão "liberar fluxo" saiu daqui: responder o formulário JÁ é
                o início da apuração, e o fluxo arranca sozinho na chegada do
                relato. O passo manual não decidia nada e só atrasava — no SAC,
                com o prazo legal de 7 dias já correndo. */}
            {detail.assignments.length > 0 && (
              <div>
                <SectionLabel>{t.cases.inv.title}</SectionLabel>

                {/* EM QUE ETAPA ESTÁ — a pergunta que se faz ao abrir o caso.
                    A lista de fichas mostra tudo, do que já passou ao que
                    ainda vem; ela sozinha não diz onde a apuração parou. */}
                {(() => {
                  const ativas = detail.assignments.filter((a) => a.status === 'active')
                  const feitas = detail.assignments.filter((a) => a.status === 'submitted').length
                  const total = detail.assignments.length
                  if (ativas.length === 0) return null
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 12, padding: '10px 13px', marginBottom: 12 }}>
                      <span style={{ color: 'var(--accent)', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                        {t.cases.inv.nowAt}
                      </span>
                      <span style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 14 }}>
                        {ativas.map((a) => (a.is_closer ? t.cases.inv.closer : a.stage_name)).join(' · ')}
                      </span>
                      {/* Duas ao mesmo tempo = bloco paralelo: dizer isso evita
                          a leitura de que uma delas está atrasada. */}
                      {ativas.length > 1 && <Chip tone="accent">{t.flow.together}</Chip>}
                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12.5 }}>
                        {t.cases.inv.progress(feitas, total)}
                      </span>
                    </div>
                  )
                })()}

                {/* A TRILHA — o mesmo desenho do construtor, em miniatura e
                    somente leitura: blocos com seta, paralelo com "+", e a
                    etapa ATUAL acesa. É o mapa que deixa a lista de baixo
                    legível — a pessoa entende ONDE está antes de ler O QUÊ. */}
                <FluxoTrilha assignments={detail.assignments} t={t} />

                {detail.assignments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {detail.assignments.map((a) => {
                      const who = a.assignee_name || (a.role_name ? `${t.cases.inv.anyOf} ${a.role_name}` : '—')
                      const stTone = a.status === 'submitted' ? 'green' : a.status === 'active' ? 'accent' : 'muted'
                      return (
                        <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', background: a.id === detail.my_pending_assignment_id ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, color: 'var(--heading)', fontSize: 14 }}>{a.is_closer ? t.cases.inv.closer : a.stage_name}</span>
                            {/* "Sua vez" SÓ para quem vai responder. Para quem
                                apenas olha o caso, a etapa ativa está
                                "aguardando parecer" — mostrar "sua vez" a
                                todo mundo fazia o Admin procurar um formulário
                                que nunca existiu para ele. */}
                            <Chip tone={stTone as 'green' | 'accent' | 'muted'}>
                              {a.status === 'active' && a.id !== detail.my_pending_assignment_id
                                ? t.cases.inv.waitingOther
                                : (t.cases.inv.status as Record<string, string>)[a.status] ?? a.status}
                            </Chip>
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
                  // `key` com o nonce: depois de enviar, o formulário volta
                  // limpo. Ele guarda o próprio rascunho, e remontar é mais
                  // honesto do que limpar campo a campo de fora.
                  <ParecerForm
                    key={`${myPending.id}:${parecerNonce}`}
                    ficha={myPending}
                    caseId={detail.id}
                    tiposAceitos={tiposAceitos}
                    busy={busy}
                    provasExistentes={provasCount}
                    onEnviar={onEnviarParecer}
                    onAnexoConcluido={() => setEvidenceNonce((n) => n + 1)}
                  />
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
                  {/* A TRIAGEM (gravidade + avançar etapa) saiu daqui.
                      Quem decide o andamento é o FLUXO: a gravidade vem do
                      relato e, quando o fluxo pede, do campo "urgência" do
                      parecer. Ter os dois caminhos deixava a mesma decisão em
                      dois lugares — e o manual furava a apuração configurada,
                      avançando etapa sem ninguém ter dado parecer. */}
                  {canRespond && (
                    <div>
                      <SectionLabel>{tx.respondL}</SectionLabel>
                      <textarea style={ta} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={tx.replyPh} />
                      <Button loading={busy} disabled={!reply.trim()} onClick={sendReply} style={{ marginTop: 8 }}>{t.cases.sendReply}</Button>
                    </div>
                  )}
                  {!flowActive && canAnnotate && (
                    <div>
                      <SectionLabel>{t.cases.noteL}</SectionLabel>
                      <textarea style={ta} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tx.notePh} />
                      <Button variant="ghost" loading={busy} disabled={!note.trim()} onClick={addNote} style={{ marginTop: 8 }}>{t.cases.addNote}</Button>
                    </div>
                  )}
                  {!flowActive && canClose && (
                    <div>
                      <SectionLabel>{tx.closeL}</SectionLabel>
                      <textarea style={ta} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder={tx.closePh} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                        <input type="checkbox" checked={resVisible} onChange={(e) => setResVisible(e.target.checked)} /> {tx.showOutcome}
                      </label>
                      <button className="app-btn" disabled={busy || !resolution.trim()} onClick={closeCase} style={{ cursor: 'pointer', borderRadius: 100, padding: '11px 20px', fontWeight: 700, fontFamily: 'inherit', background: '#d9534f', color: '#fff', border: 'none', opacity: busy || !resolution.trim() ? 0.6 : 1 }}>{tx.closeL}</button>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </Modal>

      <ParecerSignModal
        open={signOpen} busy={busy}
        onClose={() => setSignOpen(false)}
        // Só assina o que já foi preenchido: sem `parecerPronto` não há parecer
        // para selar, e assinar o vazio geraria uma prova de nada.
        onConfirm={(sig) => { if (parecerPronto) void doSubmitParecer(parecerPronto, sig) }}
        defaultName={ctx.user.full_name}
      />

      {toast && createPortal(
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--heading)', color: 'var(--surface)', padding: '12px 22px', borderRadius: 100, fontWeight: 700, fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,.3)', zIndex: 10002, maxWidth: '90vw', textAlign: 'center' }}>{toast}</div>,
        document.body,
      )}
    </div>
  )
}

/**
 * A trilha do fluxo dentro do caso — o desenho do construtor em miniatura.
 *
 * Grupos viram passos com seta (→); blocos do mesmo grupo aparecem empilhados
 * com "+" (rodam AO MESMO TEMPO). O passo atual fica aceso na cor da marca,
 * o que já passou ganha o verde de concluído, o que ainda vem fica apagado.
 * Somente leitura: quem quer mexer no desenho vai ao construtor.
 */
function FluxoTrilha({ assignments, t }: { assignments: CaseDetail['assignments']; t: ReturnType<typeof useT> }) {
  if (assignments.length === 0) return null
  // Agrupa pelo group_index (o encerrador, sem grupo próprio, vai ao fim).
  const etapas = assignments.filter((a) => !a.is_closer)
  const closer = assignments.find((a) => a.is_closer)
  const grupos = new Map<number, typeof etapas>()
  for (const a of etapas) {
    const g = a.group_index ?? 0
    grupos.set(g, [...(grupos.get(g) ?? []), a])
  }
  const ordenados = [...grupos.entries()].sort(([a], [b]) => a - b).map(([, v]) => v)
  if (closer) ordenados.push([closer])

  const corDo = (grupo: typeof etapas) => {
    if (grupo.some((a) => a.status === 'active')) return 'ativa'
    if (grupo.every((a) => a.status === 'submitted')) return 'feita'
    return 'espera'
  }

  return (
    <div className="app-scroll" style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', padding: '4px 2px 10px', marginBottom: 14 }}>
      {ordenados.map((grupo, gi) => {
        const estado = corDo(grupo)
        const borda = estado === 'ativa' ? 'var(--accent)' : estado === 'feita' ? '#16a34a' : 'var(--border)'
        const texto = estado === 'espera' ? 'var(--text-muted)' : 'var(--heading)'
        return (
          <span key={gi} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {gi > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: 14 }}>→</span>}
            <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
              {grupo.map((a, i) => (
                <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {i > 0 && <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 11, marginRight: -2 }}>+</span>}
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      border: `1.5px solid ${borda}`, borderRadius: 100, padding: '4px 11px',
                      background: estado === 'ativa' ? 'var(--accent-soft)' : 'var(--surface)',
                      color: texto, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                    }}
                  >
                    {estado === 'feita' && <Icon name="check" size={11} style={{ color: '#16a34a' }} />}
                    {estado === 'ativa' && <span className="dot-live" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />}
                    {a.is_closer ? t.cases.inv.closer : a.stage_name}
                  </span>
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </div>
  )
}
