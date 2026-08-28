/**
 * Área de trabalho do fluxo — o editor de nós.
 *
 * Segue os gestos que n8n/Make consagraram, porque são os que o usuário já
 * conhece de outras ferramentas:
 *
 *  · arrastar um BLOCO muda quando ele acontece (coluna = ordem de execução;
 *    mesma coluna = ao mesmo tempo);
 *  · puxar da PORTA direita e soltar em outro bloco LIGA os dois (o alvo passa
 *    a vir depois da origem);
 *  · puxar da porta e soltar no VAZIO cria um passo novo ali, já ligado;
 *  · clicar num bloco abre a configuração num painel lateral (no FlowBuilder).
 *
 * FLUIDEZ: durante o arrasto nada passa pelo React. A posição vai direto no
 * `style.transform` do elemento e a linha-fantasma no atributo `d` do path.
 * O estado só muda no soltar — um re-render por gesto, não sessenta por
 * segundo. Era daqui que vinha a sensação de página pesada.
 *
 * A posição dos blocos é DERIVADA da coluna (não guardamos x/y): o motor
 * executa colunas em sequência, então um grafo livre deixaria a pessoa
 * desenhar algo que o sistema não sabe rodar. Ligar A→B aqui significa
 * exatamente "B vem depois de A" — e é isso que o desenho mostra.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { KIND_VISUAL } from '../../lib/flowKinds'
import type { StageKind } from '../../lib/types'
import { Icon } from '../icons'

export type BlocoNo = {
  key: string
  name: string
  group_index: number
  /** Rótulo de quem responde, só para exibição. */
  quem: string
  /** O TIPO do bloco: dá o ícone, a cor e o rótulo. Ler o fluxo inteiro sem
   *  abrir bloco nenhum é o ponto de um canvas — todos iguais não informam. */
  kind: StageKind
  /** Nome traduzido do tipo (o canvas não fala com o dicionário). */
  kindLabel: string
}

const LARGURA = 200
const ALTURA = 80
const GAP_X = 96
const GAP_Y = 20
const PAD = 30
const CLIQUE_MAX = 6 // px: menos que isso é clique, mais é arrasto

type Drag =
  | { tipo: 'bloco'; key: string; col: number; baseX: number; baseY: number; startX: number; startY: number; moveu: boolean; alvoCol: number | null; alvoEntre: number | null }
  | { tipo: 'liga'; key: string; col: number; x1: number; y1: number; alvoKey: string | null; fora: boolean }
  // Arrastar o FUNDO move o canvas — o gesto do n8n no celular, onde não há
  // barra de rolagem para pegar nem trackpad para deslizar.
  | { tipo: 'pan'; startX: number; startY: number; scrollLeft: number; winY: number }

function colunas(nos: BlocoNo[]): BlocoNo[][] {
  const total = nos.length ? Math.max(...nos.map((n) => n.group_index)) + 1 : 0
  return Array.from({ length: total }, (_, g) => nos.filter((n) => n.group_index === g))
}

/** Chave do bloco de encerramento — ele não é uma etapa, é o fim da linha. */
export const KEY_ENCERRAMENTO = '__closer__'

export default function FlowCanvas({
  nos,
  selecionado,
  canEdit,
  encerrador,
  textos,
  onSelecionar,
  onMoverParaColuna,
  onNovaColunaDepois,
  onLigar,
  onCriarApos,
  onAdicionar,
  onRemover,
}: {
  nos: BlocoNo[]
  selecionado: string | null
  canEdit: boolean
  /** Quem fecha o caso. Aparece como o último bloco, fixo no fim. */
  encerrador: { quem: string }
  textos: {
    together: string
    emptyName: string
    noOne: string
    addHere: string
    newColumn: string
    remove: string
    closer: string
    closerHint: string
  }
  onSelecionar: (key: string | null) => void
  onMoverParaColuna: (key: string, coluna: number) => void
  onNovaColunaDepois: (key: string, depoisDe: number) => void
  /** Ligou a porta da origem em outro bloco: o alvo passa a vir depois dela. */
  onLigar: (deKey: string, paraKey: string) => void
  /** Soltou a ligação no vazio: cria um passo novo depois da origem. */
  onCriarApos: (deKey: string) => void
  onAdicionar: (coluna: number) => void
  onRemover: (key: string) => void
}) {
  const areaRef = useRef<HTMLDivElement>(null)
  const nosRef = useRef(new Map<string, HTMLDivElement>())
  const ghostRef = useRef<SVGPathElement>(null)
  const colunaHLRef = useRef<HTMLDivElement>(null)
  const entreHLRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)

  // Zoom por `zoom` CSS (afeta layout — o scroll acompanha). Os handlers
  // dividem as coordenadas do ponteiro por ele: sem isso, com zoom 0.5 o bloco
  // andaria o dobro do dedo.
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1)
  zoomRef.current = zoom
  const NIVEIS_ZOOM = [0.5, 0.65, 0.8, 1]

  // Dedo é alvo grande: em ponteiro grosso a porta de ligação cresce.
  const grosso = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches,
    [],
  )

  const cols = useMemo(() => colunas(nos), [nos])
  const alturaMax = Math.max(1, ...cols.map((c) => c.length))
  const alturaArea = PAD * 2 + alturaMax * ALTURA + (alturaMax - 1) * GAP_Y + 44
  // Cabe a fileira de etapas + o "+" + o bloco de encerramento no fim.
  const larguraArea =
    PAD * 2 + Math.max(1, cols.length) * LARGURA + Math.max(0, cols.length - 1) * GAP_X
    + GAP_X + 56 + LARGURA

  const posX = (col: number) => PAD + col * (LARGURA + GAP_X)
  const posY = (i: number) => PAD + i * (ALTURA + GAP_Y)

  /** Bloco sob o ponto (para o alvo da ligação). */
  function blocoEm(x: number, y: number, ignorar: string): string | null {
    for (let c = 0; c < cols.length; c++) {
      if (x < posX(c) || x > posX(c) + LARGURA) continue
      for (let i = 0; i < cols[c].length; i++) {
        if (y >= posY(i) && y <= posY(i) + ALTURA && cols[c][i].key !== ignorar) return cols[c][i].key
      }
    }
    return null
  }

  useEffect(() => {
    const area = areaRef.current
    if (!area) return

    const mover = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const z = zoomRef.current
      const r = area.getBoundingClientRect()
      // Coordenadas em px de LAYOUT: com zoom, o rect vem escalado.
      const px = (e.clientX - r.left) / z
      const py = (e.clientY - r.top) / z

      if (d.tipo === 'pan') {
        const sc = scrollRef.current
        if (sc) sc.scrollLeft = d.scrollLeft - (e.clientX - d.startX)
        window.scrollTo({ top: d.winY - (e.clientY - d.startY) })
        return
      }

      if (d.tipo === 'bloco') {
        const dx = (e.clientX - d.startX) / z
        const dy = (e.clientY - d.startY) / z
        if (!d.moveu && Math.hypot(dx, dy) < CLIQUE_MAX) return
        d.moveu = true
        const el = nosRef.current.get(d.key)
        if (el) {
          el.style.transform = `translate(${dx}px, ${dy}px)`
          el.style.zIndex = '30'
          el.style.boxShadow = '0 18px 40px rgba(0,0,0,.3)'
          el.style.cursor = 'grabbing'
        }
        // Onde cairia: centro do bloco decide.
        const centro = d.baseX + dx + LARGURA / 2
        const passo = LARGURA + GAP_X
        const bruto = (centro - PAD) / passo
        const col = Math.round(bruto)
        const entre = Math.abs(bruto - col) > 0.34
        d.alvoEntre = entre ? Math.floor(bruto) : null
        d.alvoCol = entre ? null : Math.max(0, Math.min(cols.length - 1, col))
        // Realce direto no DOM — nada de estado por frame.
        const chl = colunaHLRef.current
        const ehl = entreHLRef.current
        if (chl) {
          chl.style.display = d.alvoCol !== null ? 'block' : 'none'
          if (d.alvoCol !== null) chl.style.left = `${posX(d.alvoCol) - 10}px`
        }
        if (ehl) {
          ehl.style.display = d.alvoEntre !== null ? 'flex' : 'none'
          if (d.alvoEntre !== null) ehl.style.left = `${posX(d.alvoEntre) + LARGURA + GAP_X / 2 - 24}px`
        }
      } else {
        // Linha-fantasma da ligação, direto no atributo do path.
        const meio = Math.max(40, Math.abs(px - d.x1) * 0.5)
        ghostRef.current?.setAttribute('d', `M ${d.x1} ${d.y1} C ${d.x1 + meio} ${d.y1}, ${px - meio} ${py}, ${px} ${py}`)
        const alvo = blocoEm(px, py, d.key)
        if (alvo !== d.alvoKey) {
          if (d.alvoKey) { const p = nosRef.current.get(d.alvoKey); if (p) p.style.outline = '' }
          if (alvo) { const p = nosRef.current.get(alvo); if (p) p.style.outline = '3px solid var(--accent)' }
          d.alvoKey = alvo
        }
        d.fora = alvo === null && px > posX(d.col) + LARGURA + 24
      }
    }

    const soltar = () => {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null
      if (d.tipo === 'pan') return
      if (d.tipo === 'bloco') {
        const el = nosRef.current.get(d.key)
        if (el) { el.style.transform = ''; el.style.zIndex = ''; el.style.boxShadow = ''; el.style.cursor = '' }
        if (colunaHLRef.current) colunaHLRef.current.style.display = 'none'
        if (entreHLRef.current) entreHLRef.current.style.display = 'none'
        if (!d.moveu) onSelecionar(d.key)                      // foi um clique
        else if (d.alvoEntre !== null) onNovaColunaDepois(d.key, d.alvoEntre)
        else if (d.alvoCol !== null && d.alvoCol !== d.col) onMoverParaColuna(d.key, d.alvoCol)
      } else {
        ghostRef.current?.setAttribute('d', '')
        if (d.alvoKey) {
          const p = nosRef.current.get(d.alvoKey)
          if (p) p.style.outline = ''
          onLigar(d.key, d.alvoKey)
        } else if (d.fora) {
          onCriarApos(d.key)
        }
      }
    }

    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
  }, [cols, onLigar, onCriarApos, onMoverParaColuna, onNovaColunaDepois, onSelecionar])

  function pegarBloco(e: React.PointerEvent, key: string, col: number, i: number) {
    if (e.button !== 0) return
    e.preventDefault()
    dragRef.current = {
      tipo: 'bloco', key, col, baseX: posX(col), baseY: posY(i),
      startX: e.clientX, startY: e.clientY, moveu: false, alvoCol: null, alvoEntre: null,
    }
  }

  function pegarPorta(e: React.PointerEvent, key: string, col: number, i: number) {
    if (!canEdit || e.button !== 0) return
    e.preventDefault()
    e.stopPropagation() // senão o bloco inteiro começa a andar junto
    dragRef.current = {
      tipo: 'liga', key, col,
      x1: posX(col) + LARGURA, y1: posY(i) + ALTURA / 2,
      alvoKey: null, fora: false,
    }
  }

  function curva(x1: number, y1: number, x2: number, y2: number) {
    const meio = Math.max(36, Math.abs(x2 - x1) * 0.5)
    return `M ${x1} ${y1} C ${x1 + meio} ${y1}, ${x2 - meio} ${y2}, ${x2} ${y2}`
  }

  const mudaZoom = (passo: 1 | -1) => {
    const i = NIVEIS_ZOOM.indexOf(zoom)
    const alvo = NIVEIS_ZOOM[Math.max(0, Math.min(NIVEIS_ZOOM.length - 1, i + passo))]
    setZoom(alvo)
  }

  return (
    <div style={{ position: 'relative' }}>
    <div ref={scrollRef} className="app-scroll" style={{ overflowX: 'auto', paddingBottom: 4 }}>
    <div
      ref={areaRef}
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) return
        // Fundo vazio: desmarca E começa o pan — o gesto de "andar pelo
        // desenho" quando ele é maior que a tela (a única forma no celular).
        onSelecionar(null)
        dragRef.current = {
          tipo: 'pan', startX: e.clientX, startY: e.clientY,
          scrollLeft: scrollRef.current?.scrollLeft ?? 0, winY: window.scrollY,
        }
      }}
      style={{
        position: 'relative',
        minHeight: alturaArea,
        width: Math.max(larguraArea, 100),
        minWidth: '100%',
        backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        borderRadius: 18,
        border: '1px solid var(--border)',
        touchAction: 'none',
        contain: 'layout paint',
        cursor: 'grab',
        // `zoom` (e não transform): afeta o layout, então a rolagem acompanha.
        zoom,
      }}
    >
      {/* Ligações (por baixo dos blocos). */}
      <svg width="100%" height={alturaArea} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
        {cols.slice(0, -1).map((desta, c) =>
          desta.map((a, ia) =>
            cols[c + 1].map((b, ib) => (
              <path
                key={`${a.key}-${b.key}`}
                d={curva(posX(c) + LARGURA, posY(ia) + ALTURA / 2, posX(c + 1), posY(ib) + ALTURA / 2)}
                fill="none" stroke="var(--accent)" strokeWidth={2} opacity={0.45}
              />
            )),
          ),
        )}
        {/* Linha-fantasma enquanto liga. */}
        <path ref={ghostRef} d="" fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeDasharray="7 5" />
      </svg>

      {/* Realces de alvo (controlados direto no DOM durante o arrasto). */}
      <div ref={colunaHLRef} style={{ display: 'none', position: 'absolute', top: 8, width: LARGURA + 20, height: alturaArea - 16, borderRadius: 16, background: 'var(--accent-soft)', border: '2px dashed var(--accent)', pointerEvents: 'none' }} />
      <div ref={entreHLRef} style={{ display: 'none', position: 'absolute', top: 8, width: 48, height: alturaArea - 16, borderRadius: 12, background: 'var(--accent-soft)', border: '2px dashed var(--accent)', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 11, fontWeight: 800, textAlign: 'center', lineHeight: 1.25, padding: 4, pointerEvents: 'none' }}>
        {textos.newColumn}
      </div>

      {/* Rótulo "ao mesmo tempo" nas colunas com mais de um bloco. */}
      {cols.map((desta, c) => desta.length > 1 && (
        <div key={`h${c}`} style={{ position: 'absolute', left: posX(c), top: 6, width: LARGURA, textAlign: 'center', pointerEvents: 'none' }}>
          <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 100, padding: '2px 10px', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {textos.together}
          </span>
        </div>
      ))}

      {/* Blocos. */}
      {cols.map((desta, c) =>
        desta.map((no, i) => {
          const ativo = selecionado === no.key
          return (
            <div
              key={no.key}
              ref={(el) => { if (el) nosRef.current.set(no.key, el); else nosRef.current.delete(no.key) }}
              onPointerDown={(e) => pegarBloco(e, no.key, c, i)}
              style={{
                position: 'absolute', left: posX(c), top: posY(i), width: LARGURA, height: ALTURA,
                background: 'var(--surface)',
                border: `2px solid ${ativo ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 14, padding: '10px 12px', boxSizing: 'border-box',
                boxShadow: 'var(--card-shadow)',
                cursor: canEdit ? 'grab' : 'pointer',
                userSelect: 'none',
                zIndex: 2,
              }}
            >
              {c > 0 && (
                <span style={{ position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: 'var(--surface)', border: '2.5px solid var(--accent)', pointerEvents: 'none' }} />
              )}
              {/* Porta de SAÍDA: puxar daqui liga no próximo passo. Área de
                  toque maior que a bolinha — 12px é alvo demais pequeno. */}
              {canEdit && (
                <span
                  onPointerDown={(e) => pegarPorta(e, no.key, c, i)}
                  title={textos.newColumn}
                  style={{ position: 'absolute', right: grosso ? -22 : -16, top: '50%', transform: 'translateY(-50%)', width: grosso ? 44 : 32, height: grosso ? 56 : 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'crosshair', zIndex: 3 }}
                >
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--accent)', border: '3px solid var(--surface)', boxShadow: '0 0 0 2px var(--accent)' }} />
                </span>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {/* Ícone e cor vêm do TIPO: é o que deixa ler o fluxo inteiro
                    de longe — onde se decide, onde se prioriza, onde se apura. */}
                <Icon name={KIND_VISUAL[no.kind].icon} size={14} style={{ color: KIND_VISUAL[no.kind].cor, flexShrink: 0 }} />
                <span style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {no.name.trim() || textos.emptyName}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {no.quem || textos.noOne}
              </div>
              {/* O tipo por extenso no rodapé do bloco: a cor sozinha não serve
                  para quem não distingue as quatro, e o nome cabe. */}
              <div style={{ position: 'absolute', left: 12, bottom: 8, display: 'flex', alignItems: 'center', gap: 5, maxWidth: LARGURA - 24 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: KIND_VISUAL[no.kind].cor, flexShrink: 0 }} />
                <span style={{ color: KIND_VISUAL[no.kind].cor, fontSize: 10.5, fontWeight: 800, letterSpacing: '.03em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {no.kindLabel}
                </span>
              </div>

              {canEdit && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onRemover(no.key) }}
                  title={textos.remove}
                  style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>
          )
        }),
      )}

      {/* Adicionar em paralelo, embaixo de cada coluna. */}
      {canEdit && cols.map((desta, c) => (
        <button
          key={`add${c}`}
          type="button"
          onClick={() => onAdicionar(c)}
          style={{ position: 'absolute', left: posX(c), top: posY(desta.length) + 2, width: LARGURA, height: 30, border: '1.5px dashed var(--border)', background: 'transparent', borderRadius: 10, color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          + {textos.addHere}
        </button>
      ))}

      {/* "+" no FIM da cadeia: continua o fluxo sem sair do desenho. É o gesto
          que todo editor de nós tem depois do último passo. */}
      {canEdit && cols.length > 0 && (
        <>
          <svg width="100%" height={alturaArea} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <path
              d={`M ${posX(cols.length - 1) + LARGURA} ${posY(0) + ALTURA / 2} H ${posX(cols.length - 1) + LARGURA + GAP_X / 2 + 4}`}
              fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 5" opacity={0.6}
            />
          </svg>
          <button
            type="button"
            onClick={() => onAdicionar(cols.length)}
            title={textos.newColumn}
            style={{
              position: 'absolute',
              left: posX(cols.length - 1) + LARGURA + GAP_X / 2 + 4,
              top: posY(0) + ALTURA / 2 - 19,
              width: 38, height: 38, borderRadius: '50%',
              border: '2px dashed var(--accent)', background: 'var(--accent-soft)',
              color: 'var(--accent)', fontSize: 20, fontWeight: 800, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 2,
            }}
          >
            +
          </button>
        </>
      )}

      {/* ENCERRAMENTO — o fim da linha, sempre no extremo direito.
          Não é arrastável nem removível de propósito: ele não é uma etapa que
          se reordena, é o ponto em que o caso fecha. Deixá-lo arrastável
          sugeriria que dá para encerrar no meio da apuração. */}
      {(() => {
        const cx = posX(cols.length) + (canEdit && cols.length > 0 ? 56 : 0)
        const cy = posY(0)
        const ativo = selecionado === KEY_ENCERRAMENTO
        return (
          <>
            <svg width="100%" height={alturaArea} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
              {(cols[cols.length - 1] ?? []).map((a, ia) => (
                <path
                  key={`fim-${a.key}`}
                  d={curva(posX(cols.length - 1) + LARGURA, posY(ia) + ALTURA / 2, cx, cy + ALTURA / 2)}
                  fill="none" stroke="var(--green,#2bb673)" strokeWidth={2} opacity={0.5}
                />
              ))}
            </svg>
            <div
              onPointerDown={(e) => { e.stopPropagation(); onSelecionar(KEY_ENCERRAMENTO) }}
              title={textos.closerHint}
              style={{
                position: 'absolute', left: cx, top: cy, width: LARGURA, height: ALTURA,
                background: 'var(--surface)',
                border: `2px solid ${ativo ? 'var(--accent)' : 'var(--green,#2bb673)'}`,
                borderRadius: 14, padding: '10px 12px', boxSizing: 'border-box',
                boxShadow: 'var(--card-shadow)', cursor: 'pointer', userSelect: 'none', zIndex: 2,
              }}
            >
              <span style={{ position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: 'var(--surface)', border: '2.5px solid var(--green,#2bb673)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon name="check" size={14} style={{ color: 'var(--green,#2bb673)', flexShrink: 0 }} />
                <span style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 13.5 }}>{textos.closer}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {encerrador.quem || textos.noOne}
              </div>
            </div>
          </>
        )
      })()}
    </div>
    </div>

    {/* Controles de ZOOM — sempre visíveis, embaixo e no centro, como o n8n
        posiciona os dele: navegar um desenho grande não pode depender de
        achar a barra de rolagem (no celular ela nem existe). */}
    <div style={{ position: 'absolute', left: '50%', bottom: 12, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 100, padding: 3, boxShadow: 'var(--card-shadow)', zIndex: 5 }}>
      <button type="button" aria-label="−" onClick={() => mudaZoom(-1)} disabled={zoom === NIVEIS_ZOOM[0]} className="app-btn"
        style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--heading)', cursor: 'pointer', fontSize: 16, fontWeight: 800, opacity: zoom === NIVEIS_ZOOM[0] ? 0.35 : 1 }}>−</button>
      <button type="button" onClick={() => setZoom(1)} className="app-btn"
        style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11.5, fontWeight: 800, minWidth: 42 }}>
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" aria-label="+" onClick={() => mudaZoom(1)} disabled={zoom === 1} className="app-btn"
        style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--heading)', cursor: 'pointer', fontSize: 16, fontWeight: 800, opacity: zoom === 1 ? 0.35 : 1 }}>+</button>
    </div>
    </div>
  )
}
