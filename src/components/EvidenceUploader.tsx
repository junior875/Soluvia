/**
 * Área de provas do formulário público.
 *
 * O arquivo NÃO passa pelo nosso backend: o navegador pede uma autorização,
 * envia direto ao storage e volta para confirmar. Três consequências que moldam
 * este componente:
 *
 * 1. O envio começa quando a pessoa ESCOLHE o arquivo, não quando aperta
 *    enviar. Um vídeo de 200 MB leva minutos; deixar para o fim faria o botão
 *    "Enviar relato" ficar travado sem explicação enquanto tudo sobe.
 * 2. O progresso vem de XMLHttpRequest, e não de `fetch` — `fetch` não expõe
 *    progresso de UPLOAD. Sem a barra, o vídeo grande parece uma tela congelada.
 * 3. Cada arquivo falha sozinho. Um `.mov` recusado não pode levar junto as
 *    outras quatro fotos que já subiram.
 */
import { useCallback, useRef, useState, type CSSProperties, type DragEvent } from 'react'

export type ProvaEnviada = {
  id: string
  filename: string
  kind: 'image' | 'video' | 'document'
  size: number
}

type Item = {
  localId: string
  file: File
  /** Prévia local da imagem — o arquivo já está aqui, não faz sentido baixá-lo de volta. */
  preview?: string
  progresso: number
  estado: 'enviando' | 'pronto' | 'erro'
  erro?: string
  enviada?: ProvaEnviada
}

export type UploaderTextos = {
  titulo: string
  ajuda: string
  escolher: string
  solte: string
  remover: string
  enviando: string
  falhou: string
  limite: string
}

function humano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** Envia com XHR para ter progresso. `fetch` não reporta upload. */
function enviarComProgresso(
  autorizacao: { url: string; fields: Record<string, string>; method: string },
  file: File,
  onProgresso: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(autorizacao.method, autorizacao.url)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgresso(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))))
    xhr.onerror = () => reject(new Error('rede'))

    if (autorizacao.method === 'POST') {
      // POST policy do S3/Spaces: os campos assinados vêm ANTES do arquivo. A
      // ordem não é estética — o S3 lê o formulário em sequência e ignora
      // qualquer campo que apareça depois do `file`.
      const fd = new FormData()
      Object.entries(autorizacao.fields).forEach(([k, v]) => fd.append(k, v))
      fd.append('file', file)
      xhr.send(fd)
    } else {
      // Espelho local (dev): PUT com o arquivo cru.
      xhr.send(file)
    }
  })
}

export function EvidenceUploader({
  baseUrl,
  slug,
  token,
  maxArquivos,
  textos,
  onChange,
}: {
  baseUrl: string
  slug: string
  token: string
  maxArquivos: number
  textos: UploaderTextos
  onChange: (ids: string[]) => void
}) {
  const [itens, setItens] = useState<Item[]>([])
  const [arrastando, setArrastando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const publicar = useCallback(
    (lista: Item[]) => {
      setItens(lista)
      onChange(lista.filter((i) => i.enviada).map((i) => i.enviada!.id))
    },
    [onChange],
  )

  const atualizar = useCallback(
    (localId: string, patch: Partial<Item>) => {
      setItens((atual) => {
        const proximo = atual.map((i) => (i.localId === localId ? { ...i, ...patch } : i))
        onChange(proximo.filter((i) => i.enviada).map((i) => i.enviada!.id))
        return proximo
      })
    },
    [onChange],
  )

  async function subir(item: Item) {
    try {
      const presign = await fetch(`${baseUrl}/public/${slug}/uploads/presign?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: item.file.name, content_type: item.file.type }),
      })
      if (!presign.ok) {
        const corpo = await presign.json().catch(() => null)
        throw new Error(corpo?.detail ?? textos.falhou)
      }
      const dados = await presign.json()

      await enviarComProgresso(dados.upload, item.file, (pct) =>
        atualizar(item.localId, { progresso: pct }),
      )

      const confirm = await fetch(
        `${baseUrl}/public/${slug}/uploads/${dados.attachment_id}/confirm?token=${token}`,
        { method: 'POST' },
      )
      if (!confirm.ok) throw new Error(textos.falhou)
      const pronto = await confirm.json()

      atualizar(item.localId, {
        estado: 'pronto',
        progresso: 100,
        enviada: {
          id: pronto.attachment_id,
          filename: pronto.filename,
          kind: pronto.kind,
          size: pronto.size_bytes,
        },
      })
    } catch (e) {
      atualizar(item.localId, { estado: 'erro', erro: (e as Error).message || textos.falhou })
    }
  }

  function receber(files: FileList | null) {
    if (!files?.length) return
    const espaco = maxArquivos - itens.length
    const novos: Item[] = Array.from(files)
      .slice(0, Math.max(0, espaco))
      .map((file) => ({
        localId: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        progresso: 0,
        estado: 'enviando' as const,
      }))
    publicar([...itens, ...novos])
    // Sobe já: esperar o botão "enviar" faria o relato travar por minutos.
    novos.forEach((i) => void subir(i))
  }

  function remover(localId: string) {
    const alvo = itens.find((i) => i.localId === localId)
    if (alvo?.preview) URL.revokeObjectURL(alvo.preview)
    publicar(itens.filter((i) => i.localId !== localId))
  }

  function aoSoltar(e: DragEvent) {
    e.preventDefault()
    setArrastando(false)
    receber(e.dataTransfer.files)
  }

  const cheio = itens.length >= maxArquivos

  const zona: CSSProperties = {
    border: `1.5px dashed ${arrastando ? 'var(--accent)' : 'var(--border)'}`,
    background: arrastando ? 'var(--accent-soft)' : 'var(--surface-2)',
    borderRadius: 14,
    padding: '22px 16px',
    textAlign: 'center',
    cursor: cheio ? 'default' : 'pointer',
    transition: 'border-color .15s, background .15s',
    opacity: cheio ? 0.6 : 1,
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
      <label style={{ display: 'block', color: 'var(--heading)', fontWeight: 600, fontSize: 14.5, marginBottom: 6 }}>
        {textos.titulo}
      </label>
      <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: -3, marginBottom: 10, lineHeight: 1.5 }}>
        {textos.ajuda}
      </p>

      <div
        style={zona}
        onClick={() => !cheio && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!cheio) setArrastando(true) }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
      >
        <div style={{ fontSize: 26, marginBottom: 6 }} aria-hidden>📎</div>
        <div style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 14 }}>
          {cheio ? textos.limite : textos.escolher}
        </div>
        {!cheio && <div style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 3 }}>{textos.solte}</div>}
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => { receber(e.target.files); e.target.value = '' }}
        />
      </div>

      {itens.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {itens.map((i) => (
            <div
              key={i.localId}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '9px 11px',
              }}
            >
              {i.preview ? (
                <img src={i.preview} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17 }} aria-hidden>
                  {i.file.type.startsWith('video/') ? '🎬' : i.file.type.startsWith('audio/') ? '🎙️' : '📄'}
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--heading)', fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {i.file.name}
                </div>
                {i.estado === 'erro' ? (
                  <div style={{ color: '#e08585', fontSize: 12 }}>{i.erro}</div>
                ) : i.estado === 'enviando' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ width: `${i.progresso}%`, height: '100%', background: 'var(--accent)', transition: 'width .2s' }} />
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{i.progresso}%</span>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>✓ {humano(i.file.size)}</div>
                )}
              </div>

              <button
                type="button"
                onClick={() => remover(i.localId)}
                title={textos.remover}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 4 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
