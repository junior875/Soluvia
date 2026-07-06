// Peças compartilhadas do módulo de Assinatura Digital.
import type { CSSProperties } from 'react'
import type { SigStatus } from '../../../lib/types'
import { Chip } from '../../ui'
import { useT } from '../../strings'

/** Badge de status do documento (uploaded / partial / signed). */
export function StatusBadge({ status }: { status: string }) {
  const t = useT()
  const map: Record<string, { tone: 'muted' | 'accent' | 'green'; dot: string; label: string }> = {
    uploaded: { tone: 'muted', dot: 'var(--text-muted)', label: t.sig.status.uploaded },
    partial: { tone: 'accent', dot: 'var(--accent)', label: t.sig.status.partial },
    signed: { tone: 'green', dot: '#16a34a', label: t.sig.status.signed },
  }
  const s = map[status as SigStatus] ?? map.uploaded
  return <Chip tone={s.tone} dot={s.dot}>{s.label}</Chip>
}

/** Linha rótulo → valor (usada no comprovante). Copiável e com quebra segura. */
export function KV({ label, value, mono, style }: { label: string; value: React.ReactNode; mono?: boolean; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, ...style }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</span>
      <span style={{ color: 'var(--heading)', fontSize: mono ? 12.5 : 14, fontWeight: mono ? 500 : 600, wordBreak: 'break-all', fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit', lineHeight: 1.5 }}>{value}</span>
    </div>
  )
}

/** Formata uma data ISO conforme o locale do idioma escolhido. */
export function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const PDF_MIME = 'application/pdf'
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const isPdf = (mime: string) => mime === PDF_MIME
