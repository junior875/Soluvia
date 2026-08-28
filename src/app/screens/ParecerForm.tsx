/**
 * O formulário do parecer — um por TIPO de bloco.
 *
 * O que a pessoa vê depende do que o bloco pede, e só disso. Antes era um
 * formulário único com campos aparecendo e sumindo conforme três interruptores,
 * e o resultado servia mal os dois lados: quem só precisava marcar a urgência
 * levava uma caixa de texto obrigatória pela frente, e quem precisava juntar um
 * documento não tinha onde.
 *
 *   decisão       → só o texto da decisão
 *   urgência      → normal | média | alta (o texto vira opcional)
 *   avaliação     → texto livre + qualquer arquivo
 *   investigação  → as provas que já existem + poder juntar mais
 *
 * O upload usa o MESMO caminho de sempre (presign → storage → confirm). O que
 * muda é que os ids sobem junto com o parecer, e o servidor amarra cada arquivo
 * à ficha — é o que separa depois "o que o denunciante mandou" de "o que a
 * apuração levantou".
 */
import { useState } from 'react'
import { EvidenceUploader } from '../../components/EvidenceUploader'
import { api } from '../../lib/api'
import { KIND_VISUAL, aceitaAnexo } from '../../lib/flowKinds'
import { megabytes, paraAccept, type TiposAceitos } from '../../lib/uploads'
import type { CaseAssignment, StageKind } from '../../lib/types'
import { Icon } from '../icons'
import { useT } from '../strings'
import { Button } from '../ui'

const ta: React.CSSProperties = {
  width: '100%', minHeight: 84, resize: 'vertical', background: 'var(--surface)',
  border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px',
  color: 'var(--heading)', fontFamily: 'inherit', fontSize: 14, boxSizing: 'border-box',
}

export type ParecerPayload = {
  decision: string | null
  urgency: string | null
  parecer: string
  attachment_ids: string[]
}

/** Urgência com os nomes que o cliente usa. O valor no banco continua
 *  low/medium/high — trocar o vocabulário da tela não é motivo para migrar
 *  dado e invalidar o histórico que já existe. */
const URGENCIAS = ['low', 'medium', 'high'] as const

export default function ParecerForm({
  ficha,
  caseId,
  tiposAceitos,
  busy,
  provasExistentes,
  onEnviar,
  onAnexoConcluido,
}: {
  ficha: CaseAssignment
  caseId: string
  tiposAceitos: TiposAceitos | null
  busy: boolean
  /** Quantas provas o caso já tem — a investigação começa olhando para elas. */
  provasExistentes: number
  onEnviar: (p: ParecerPayload) => void
  onAnexoConcluido: () => void
}) {
  const t = useT()
  const tx = t.cases.inv
  const kind: StageKind = ficha.kind ?? 'decisao'
  const vis = KIND_VISUAL[kind]

  const [texto, setTexto] = useState('')
  const [urgencia, setUrgencia] = useState('')
  const [decisao, setDecisao] = useState('')
  const [anexos, setAnexos] = useState<string[]>([])

  // O botão só libera quando o bloco tem o que pede. Mesma regra do servidor —
  // repetida aqui para a pessoa não descobrir o que falta só depois do 400.
  const podeEnviar =
    kind === 'urgencia' ? !!urgencia
      : kind === 'avaliacao' ? (!!texto.trim() || anexos.length > 0)
        : !!texto.trim()

  const enviar = () => onEnviar({
    decision: decisao || null,
    urgency: kind === 'urgencia' ? urgencia : null,
    parecer: texto,
    attachment_ids: anexos,
  })

  return (
    <div style={{ marginTop: 14, border: `1.5px solid ${vis.cor}`, borderRadius: 14, padding: 14, background: 'var(--surface-2)' }}>
      {/* Cabeçalho com o TIPO em destaque: a pessoa precisa saber o que estão
          pedindo dela antes de ler o formulário. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ color: vis.cor, display: 'flex' }}><Icon name={vis.icon} size={17} /></span>
        <span style={{ fontWeight: 800, color: 'var(--heading)', fontSize: 15 }}>
          {ficha.is_closer ? tx.closer : ficha.stage_name}
        </span>
        <span style={{ background: 'var(--surface)', border: `1px solid ${vis.cor}`, color: vis.cor, borderRadius: 100, padding: '2px 10px', fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em' }}>
          {t.flow.kinds[kind]}
        </span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: '0 0 12px', lineHeight: 1.5 }}>
        {tx.kindAsk[kind]}
      </p>

      {/* ── URGÊNCIA ─────────────────────────────────────────────── */}
      {kind === 'urgencia' && (
        <div role="radiogroup" aria-label={tx.urgency} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {URGENCIAS.map((u) => {
            const on = urgencia === u
            return (
              <button
                key={u} type="button" role="radio" aria-checked={on}
                onClick={() => setUrgencia(u)} className="app-btn"
                style={{
                  cursor: 'pointer', flex: '1 1 120px',
                  border: `1.5px solid ${on ? vis.cor : 'var(--border)'}`,
                  background: on ? 'var(--surface)' : 'var(--surface)',
                  boxShadow: on ? `inset 0 0 0 1px ${vis.cor}` : 'none',
                  color: on ? vis.cor : 'var(--text)',
                  borderRadius: 12, padding: '11px 14px', fontSize: 13.5, fontWeight: 800,
                }}
              >
                {(tx.urg as Record<string, string>)[u]}
              </button>
            )
          })}
        </div>
      )}

      {/* ── DECISÃO: os três encaminhamentos, quando o bloco é o do
             encerrador (que precisa dizer o destino, não só escrever). ── */}
      {kind === 'decisao' && ficha.is_closer && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{tx.decision}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['agree', 'more_info', 'dismiss'] as const).map((d) => {
              const on = decisao === d
              return (
                <button key={d} type="button" onClick={() => setDecisao(d)} className="app-btn"
                  style={{ cursor: 'pointer', border: `1.5px solid ${on ? vis.cor : 'var(--border)'}`, background: 'var(--surface)', color: on ? vis.cor : 'var(--text)', boxShadow: on ? `inset 0 0 0 1px ${vis.cor}` : 'none', borderRadius: 100, padding: '7px 14px', fontSize: 13, fontWeight: 700 }}>
                  {(tx.dec as Record<string, string>)[d]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── INVESTIGAÇÃO: lembra o que já está no dossiê ─────────── */}
      {kind === 'investigacao' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px' }}>
          <span style={{ color: vis.cor, display: 'flex' }}><Icon name="eye" size={16} /></span>
          <span style={{ color: 'var(--text)', fontSize: 13, lineHeight: 1.45 }}>
            {provasExistentes > 0 ? tx.evidenceCount(provasExistentes) : tx.evidenceNone}
          </span>
        </div>
      )}

      {/* ── TEXTO ────────────────────────────────────────────────── */}
      <textarea
        style={ta}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={kind === 'urgencia' ? tx.parecerOptionalPh : tx.pareceerPh}
      />

      {/* ── ANEXOS (avaliação e investigação) ────────────────────── */}
      {aceitaAnexo(kind) && (
        <div style={{ marginTop: 12 }}>
          <EvidenceUploader
            maxArquivos={tiposAceitos?.max_files ?? 20}
            accept={paraAccept(tiposAceitos)}
            formatos={tiposAceitos?.groups}
            verFormatos={t.cases.evidenceAccepted}
            rotulosFormato={{ image: t.cases.fmtImage, video: t.cases.fmtVideo, audio: t.cases.fmtAudio, document: t.cases.fmtDocument }}
            pedirAutorizacao={(file) =>
              api.post(`/cases/${caseId}/attachments/presign`, {
                filename: file.name,
                content_type: file.type,
              })
            }
            confirmar={async (id) => {
              const d = await api.post<{ attachment_id: string; filename: string; kind: 'image' | 'video' | 'document'; size_bytes: number }>(
                `/cases/${caseId}/attachments/${id}/confirm`, {},
              )
              return { id: d.attachment_id, filename: d.filename, kind: d.kind, size: d.size_bytes }
            }}
            onChange={setAnexos}
            onConcluido={onAnexoConcluido}
            textos={{
              titulo: kind === 'investigacao' ? tx.attachMore : tx.attachHere,
              ajuda: tiposAceitos
                ? `${t.cases.evidenceAddHelp} ${t.cases.evidenceLimits.replace('{n}', String(tiposAceitos.max_files)).replace('{mb}', String(megabytes(tiposAceitos.max_bytes)))}`
                : t.cases.evidenceAddHelp,
              escolher: t.cases.evidenceChoose,
              solte: t.cases.evidenceDrop,
              remover: t.common.remove,
              enviando: t.cases.loading,
              falhou: t.cases.fail,
              limite: t.cases.evidenceLimitReached,
            }}
          />
        </div>
      )}

      {ficha.require_signature && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 10, padding: '9px 12px', color: 'var(--accent)', fontSize: 12.5, lineHeight: 1.5 }}>
          <span>🔏</span><span>{tx.sigRequired}</span>
        </div>
      )}

      <Button
        loading={busy}
        disabled={!podeEnviar}
        onClick={enviar}
        leftIcon={ficha.require_signature ? 'signature' : undefined}
        style={{ marginTop: 10 }}
      >
        {ficha.require_signature ? tx.submitSign : tx.submit}
      </Button>
    </div>
  )
}
