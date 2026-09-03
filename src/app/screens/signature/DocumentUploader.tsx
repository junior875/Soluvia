// Uploader de documentos (.pdf / .docx) com dropzone. Valida tipo/tamanho no
// cliente e envia multipart (campo `file`) via api.upload. Devolve o SigDocument
// criado para o pai inserir no topo da lista.
import { useRef, useState, type DragEvent } from 'react'
import { api } from '../../../lib/api'
import type { ApiError, SigDocument } from '../../../lib/types'
import { Icon } from '../../icons'
import { useT } from '../../strings'
import { DOCX_MIME, PDF_MIME } from './shared'

interface Props {
  onUploaded: (doc: SigDocument) => void
  onToast: (msg: string) => void
}

const MAX_BYTES = 20 * 1024 * 1024

export default function DocumentUploader({ onUploaded, onToast }: Props) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)

  // A extensão decide AQUI (o servidor confere os bytes depois): os mesmos
  // formatos do assinador gov.br e os de escritório mais comuns.
  const EXTS = ['.pdf', '.doc', '.docx', '.odt', '.rtf', '.txt', '.csv', '.xlsx', '.xls',
    '.ods', '.pptx', '.ppt', '.odp', '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp', '.gif', '.webp']
  const accepts = (file: File) => {
    const name = file.name.toLowerCase()
    return EXTS.some((e) => name.endsWith(e))
  }

  async function handle(file: File | undefined) {
    if (!file) return
    if (!accepts(file)) { onToast(t.sig.invalidType); return }
    if (file.size > MAX_BYTES) { onToast(t.sig.tooBig); return }
    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const doc = await api.upload<SigDocument>('/signature/documents', form)
      onUploaded(doc)
    } catch (e) {
      onToast((e as ApiError).detail ?? t.sig.uploadFail)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setOver(false)
    if (busy) return
    void handle(e.dataTransfer.files?.[0])
  }

  return (
    <button
      type="button"
      onClick={() => !busy && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className="app-btn"
      style={{
        width: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '30px 20px',
        borderRadius: 18,
        border: `1.5px dashed ${over ? 'var(--accent)' : 'var(--border)'}`,
        background: over ? 'var(--accent-soft)' : 'var(--surface-2)',
        color: 'var(--text-muted)',
        cursor: busy ? 'wait' : 'pointer',
        textAlign: 'center',
        transition: 'background .2s, border-color .2s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.csv,.xlsx,.xls,.ods,.pptx,.ppt,.odp,.jpg,.jpeg,.png,.tif,.tiff,.bmp,.gif,.webp"
        onChange={(e) => void handle(e.target.files?.[0])}
        style={{ display: 'none' }}
      />
      <span style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={busy ? 'signature' : 'download'} size={24} style={busy ? { animation: 'spin 1s linear infinite' } : { transform: 'rotate(180deg)' }} />
      </span>
      <span style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 15, whiteSpace: 'normal', maxWidth: '100%', lineHeight: 1.35 }}>{busy ? t.sig.uploading : t.sig.dropHint}</span>
      <span style={{ fontSize: 12.5, whiteSpace: 'normal', maxWidth: '100%' }}>{t.sig.dropTypes}</span>
    </button>
  )
}
