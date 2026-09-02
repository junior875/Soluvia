/**
 * Editor da foto de perfil — a moldura circular com zoom e arrasto.
 *
 * O recorte acontece TODO no cliente: a imagem é desenhada num canvas com a
 * escala do slider e o deslocamento do arrasto, e o que se envia ao servidor
 * é só o quadrado final de 256px — pequeno, já pronto, sem depender de
 * processamento de imagem no backend. O servidor confere os bytes (magic
 * number) e guarda; trocar a foto sobrescreve a anterior.
 */
import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import type { ApiError } from '../lib/types'
import { Button, Modal } from '../app/ui'

const QUADRO = 288          // lado do palco visível (px CSS)
const SAIDA = 256           // lado do arquivo final

export default function AvatarEditor({ open, onClose, onSaved, textos, atualUrl }: {
  open: boolean
  onClose: () => void
  /** Recebe a URL nova para a tela atualizar sem re-buscar tudo. */
  onSaved: (url: string) => void
  textos: { title: string; pick: string; zoom: string; save: string; saving: string; hint: string; fail: string; novaFoto?: string }
  /** A foto ATUAL: o editor abre com ela carregada, para quem só quer
   *  reenquadrar — trocar é o botão de nova foto. */
  atualUrl?: string | null
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const palcoRef = useRef<HTMLDivElement>(null)
  /** Ponteiros ativos no palco — 1 arrasta, 2 fazem a pinça do celular. */
  const ponteiros = useRef<Map<number, { x: number; y: number }>>(new Map())
  const arrasto = useRef<{ x: number; y: number } | null>(null)
  const pincaDist = useRef<number | null>(null)

  /** Zoom mínimo por imagem: 1 = cobre o círculo; abaixo disso, até a imagem
   *  INTEIRA caber (o caso do logo largo que não tinha como enquadrar). */
  const zoomMin = img ? Math.min(1, Math.min(img.width, img.height) / Math.max(img.width, img.height)) : 1
  const ZOOM_MAX = 4

  function escolher(file: File | null) {
    if (!file) return
    const url = URL.createObjectURL(file)
    const el = new Image()
    el.onload = () => { setImg(el); setZoom(1); setOff({ x: 0, y: 0 }); URL.revokeObjectURL(url) }
    el.src = url
  }

  // Abriu com foto existente? Ela entra no palco para reenquadrar. O
  // crossOrigin é o que impede o canvas de "sujar" (o CORS do bucket já
  // permite GET do site); se a busca falhar, cai no seletor vazio — pior
  // seria um editor que não abre.
  useEffect(() => {
    if (!open) { setImg(null); setZoom(1); setOff({ x: 0, y: 0 }); setErro(null); return }
    if (!atualUrl || img) return
    const el = new Image()
    el.crossOrigin = 'anonymous'
    el.onload = () => { setImg(el); setZoom(1); setOff({ x: 0, y: 0 }) }
    el.src = atualUrl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, atualUrl])

  /** A escala-base cobre o quadro (cover); o zoom multiplica em cima. */
  const escalaDe = (el: HTMLImageElement, lado: number, z: number) =>
    (lado / Math.min(el.width, el.height)) * z

  /** Deslocamento limitado à borda da imagem (ou zero quando ela é menor que
   *  o quadro naquele eixo — aí ela fica centrada e o vazio sai transparente). */
  function limitar(el: HTMLImageElement, lado: number, z: number, x: number, y: number) {
    const esc = escalaDe(el, lado, z)
    const maxX = Math.max(0, (el.width * esc - lado) / 2)
    const maxY = Math.max(0, (el.height * esc - lado) / 2)
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) }
  }

  function aplicarZoom(z: number) {
    const novo = Math.max(zoomMin, Math.min(ZOOM_MAX, z))
    setZoom(novo)
    if (img) setOff((o) => limitar(img, QUADRO, novo, o.x, o.y))
  }

  // Roda do mouse: zoom onde a pessoa espera que ele esteja. Registrado à mão
  // (não via onWheel) porque o listener precisa ser NÃO-passivo para o
  // preventDefault segurar o scroll da página atrás do modal.
  useEffect(() => {
    const palco = palcoRef.current
    if (!palco || !img) return
    const aoRolar = (e: WheelEvent) => {
      e.preventDefault()
      aplicarZoom(zoom * (e.deltaY < 0 ? 1.08 : 0.92))
    }
    palco.addEventListener('wheel', aoRolar, { passive: false })
    return () => palco.removeEventListener('wheel', aoRolar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, zoom, zoomMin])

  function desenhar(ctx: CanvasRenderingContext2D, lado: number) {
    if (!img) return
    const esc = escalaDe(img, lado, zoom)
    ctx.clearRect(0, 0, lado, lado)
    ctx.drawImage(
      img,
      lado / 2 - (img.width * esc) / 2 + off.x,
      lado / 2 - (img.height * esc) / 2 + off.y,
      img.width * esc,
      img.height * esc,
    )
  }

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (ctx) desenhar(ctx, QUADRO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, zoom, off, open])

  async function salvar() {
    if (!img) return
    setSalvando(true); setErro(null)
    try {
      const saida = document.createElement('canvas')
      saida.width = SAIDA; saida.height = SAIDA
      const ctx = saida.getContext('2d')!
      // Mesma geometria do palco, reescalada para o lado de saída.
      const fator = SAIDA / QUADRO
      const esc = escalaDe(img, QUADRO, zoom) * fator
      ctx.drawImage(
        img,
        SAIDA / 2 - (img.width * esc) / 2 + off.x * fator,
        SAIDA / 2 - (img.height * esc) / 2 + off.y * fator,
        img.width * esc,
        img.height * esc,
      )
      const b64 = saida.toDataURL('image/png')
      const r = await api.post<{ avatar_url: string }>('/me/avatar', { image_base64: b64 })
      onSaved(r.avatar_url)
      onClose()
    } catch (e) {
      setErro((e as ApiError).detail ?? textos.fail)
    } finally { setSalvando(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={textos.title} maxWidth={380}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        {!img ? (
          <label style={{ width: QUADRO, height: QUADRO, borderRadius: '50%', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13.5, textAlign: 'center', padding: 20, boxSizing: 'border-box' }}>
            {textos.pick}
            <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
              onChange={(e) => escolher(e.target.files?.[0] ?? null)} />
          </label>
        ) : (
          <>
            {/* O palco: canvas quadrado + máscara circular por cima. */}
            <div
              ref={palcoRef}
              style={{ position: 'relative', width: QUADRO, height: QUADRO, borderRadius: '50%', overflow: 'hidden', cursor: 'grab', touchAction: 'none', border: '2px solid var(--border)' }}
              onPointerDown={(e) => {
                ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
                ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                if (ponteiros.current.size === 1) {
                  arrasto.current = { x: e.clientX - off.x, y: e.clientY - off.y }
                } else {
                  // Segundo dedo: vira pinça — o arrasto para para não brigar.
                  arrasto.current = null
                  const [a, b] = [...ponteiros.current.values()]
                  pincaDist.current = Math.hypot(a.x - b.x, a.y - b.y)
                }
              }}
              onPointerMove={(e) => {
                if (!img || !ponteiros.current.has(e.pointerId)) return
                ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
                if (ponteiros.current.size >= 2 && pincaDist.current) {
                  const [a, b] = [...ponteiros.current.values()]
                  const dist = Math.hypot(a.x - b.x, a.y - b.y)
                  aplicarZoom(zoom * (dist / pincaDist.current))
                  pincaDist.current = dist
                } else if (arrasto.current) {
                  setOff(limitar(img, QUADRO, zoom, e.clientX - arrasto.current.x, e.clientY - arrasto.current.y))
                }
              }}
              onPointerUp={(e) => {
                ponteiros.current.delete(e.pointerId)
                pincaDist.current = null
                arrasto.current = null
              }}
              onPointerCancel={(e) => {
                ponteiros.current.delete(e.pointerId)
                pincaDist.current = null
                arrasto.current = null
              }}
            >
              <canvas ref={canvasRef} width={QUADRO} height={QUADRO} style={{ display: 'block' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700 }}>{textos.zoom}</span>
              <input
                type="range" min={zoomMin} max={ZOOM_MAX} step={0.01} value={zoom}
                onChange={(e) => aplicarZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)' }}
              />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: 0, textAlign: 'center' }}>{textos.hint}</p>
          </>
        )}
        {erro && <p style={{ color: '#d9534f', fontSize: 13, margin: 0 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          {img && (
            <label style={{ display: 'inline-flex' }}>
              <Button variant="ghost" onClick={() => { /* o label captura o clique */ }}>{textos.novaFoto ?? textos.pick}</Button>
              <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
                onChange={(e) => escolher(e.target.files?.[0] ?? null)} />
            </label>
          )}
          <Button onClick={() => void salvar()} loading={salvando} disabled={!img}>
            {salvando ? textos.saving : textos.save}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
