/**
 * Área de trabalho do fluxo: bloquinhos ligados por linhas.
 *
 * A COLUNA é a ordem de execução. Tudo que está na mesma coluna roda AO MESMO
 * TEMPO; a coluna seguinte só começa quando todos os da anterior responderem.
 * Arrastar um bloco para outra coluna muda quando ele acontece.
 *
 * Por que a posição é DERIVADA (e não guardada como x/y livre):
 *
 * · o motor executa "blocos em sequência", então um grafo livre deixaria a
 *   pessoa desenhar um fluxo que o sistema não sabe rodar — a tela prometeria
 *   o que o produto não entrega;
 * · sem x/y no banco, não existe estado que possa divergir do que a tela
 *   mostra, e o desenho nunca fica bagunçado ou com blocos sobrepostos.
 *
 * O arrasto é livre (o bloco segue o dedo/cursor) e ENCAIXA na coluna ao
 * soltar. É o comportamento que dá a sensação de canvas sem abrir mão da
 * arrumação automática.
 *
 * Usa Pointer Events, não o drag-and-drop do HTML5: o DnD nativo não funciona
 * em toque, arrasta uma "foto" fantasma que não dá para estilizar, e dispara
 * `dragleave` ao passar por cima de qualquer filho.
 */
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../icons'

export type BlocoNo = {
  key: string
  name: string
  group_index: number
  /** Só para o rótulo do bloco: quem responde. */
  quem: string
}

const LARGURA = 208
const ALTURA = 84
const GAP_X = 92          // espaço entre colunas — onde a linha aparece
const GAP_Y = 22
const PAD = 26

type Arrasto = { key: string; dx: number; dy: number; x: number; y: number }

/** Colunas a partir do group_index, na ordem de execução. */
function colunas(nos: BlocoNo[]): BlocoNo[][] {
  const total = nos.length ? Math.max(...nos.map((n) => n.group_index)) + 1 : 0
  return Array.from({ length: total }, (_, g) => nos.filter((n) => n.group_index === g))
}

export default function FlowCanvas({
  nos,
  selecionado,
  canEdit,
  textos,
  onSelecionar,
  onMoverParaColuna,
  onNovaColunaDepois,
  onAdicionar,
  onRemover,
}: {
  nos: BlocoNo[]
  selecionado: string | null
  canEdit: boolean
  textos: {
    together: string
    waitsAll: string
    emptyName: string
    noOne: string
    addHere: string
    newColumn: string
    dragHint: string
    remove: string
  }
  onSelecionar: (key: string) => void
  onMoverParaColuna: (key: string, coluna: number) => void
  onNovaColunaDepois: (key: string, depoisDe: number) => void
  onAdicionar: (coluna: number) => void
  onRemover: (key: string) => void
}) {
  const areaRef = useRef<HTMLDivElement>(null)
  const [arrasto, setArrasto] = useState<Arrasto | null>(null)
  // Coluna sob o cursor: número = coluna existente, "N.5" = entre duas.
  const [alvo, setAlvo] = useState<number | null>(null)
  const [novaEntre, setNovaEntre] = useState<number | null>(null)

  const cols = colunas(nos)
  const alturaMaxima = Math.max(1, ...cols.map((c) => c.length))
  const alturaArea = PAD * 2 + alturaMaxima * ALTURA + (alturaMaxima - 1) * GAP_Y
  const larguraArea = PAD * 2 + cols.length * LARGURA + Math.max(0, cols.length - 1) * GAP_X

  const posX = (col: number) => PAD + col * (LARGURA + GAP_X)
  const posY = (i: number) => PAD + i * (ALTURA + GAP_Y)

  // Enquanto arrasta, os ouvintes ficam na JANELA: se ficassem no bloco, soltar
  // o botão fora dele deixaria o bloco grudado no cursor para sempre.
  useEffect(() => {
    if (!arrasto) return
    const mover = (e: PointerEvent) => {
      const area = areaRef.current
      if (!area) return
      const r = area.getBoundingClientRect()
      const x = e.clientX - r.left - arrasto.dx
      const y = e.clientY - r.top - arrasto.dy
      setArrasto((a) => (a ? { ...a, x, y } : a))

      // Onde isso cairia? O centro do bloco decide, não a borda.
      const centro = x + LARGURA / 2
      const passo = LARGURA + GAP_X
      const bruto = (centro - PAD) / passo
      const col = Math.round(bruto)
      const distancia = Math.abs(bruto - col)
      // Perto do meio entre duas colunas → oferece criar uma coluna nova ali.
      if (distancia > 0.32) {
        setNovaEntre(Math.floor(bruto))
        setAlvo(null)
      } else {
        setAlvo(Math.max(0, Math.min(cols.length - 1, col)))
        setNovaEntre(null)
      }
    }
    const soltar = () => {
      if (novaEntre !== null) onNovaColunaDepois(arrasto.key, novaEntre)
      else if (alvo !== null) onMoverParaColuna(arrasto.key, alvo)
      setArrasto(null); setAlvo(null); setNovaEntre(null)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
  }, [arrasto, alvo, novaEntre, cols.length, onMoverParaColuna, onNovaColunaDepois])

  function pegar(e: React.PointerEvent, no: BlocoNo, col: number, i: number) {
    if (!canEdit) return
    const area = areaRef.current
    if (!area) return
    const r = area.getBoundingClientRect()
    const x = posX(col)
    const y = posY(i)
    setArrasto({ key: no.key, dx: e.clientX - r.left - x, dy: e.clientY - r.top - y, x, y })
    onSelecionar(no.key)
  }

  /** Curva de ligação. Bézier horizontal — a mesma forma que todo editor de
   *  nós usa, e que faz a linha "sair" e "entrar" pelas laterais. */
  function caminho(x1: number, y1: number, x2: number, y2: number) {
    const meio = Math.abs(x2 - x1) * 0.5
    return `M ${x1} ${y1} C ${x1 + meio} ${y1}, ${x2 - meio} ${y2}, ${x2} ${y2}`
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={areaRef}
        style={{
          position: 'relative',
          minHeight: alturaArea,
          width: Math.max(larguraArea, 100),
          minWidth: '100%',
          // O quadriculado é o que faz a área ler como "mesa de trabalho" e não
          // como mais um cartão do formulário.
          backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          borderRadius: 18,
          border: '1px solid var(--border)',
          overflow: 'hidden',
          touchAction: arrasto ? 'none' : 'auto',
        }}
      >
        {/* Linhas primeiro, para passarem POR BAIXO dos blocos. */}
        <svg
          width={Math.max(larguraArea, 100)} height={alturaArea}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
        >
          {cols.slice(0, -1).map((desta, c) =>
            desta.map((a, ia) =>
              cols[c + 1].map((b, ib) => {
                const x1 = posX(c) + LARGURA
                const y1 = posY(ia) + ALTURA / 2
                const x2 = posX(c + 1)
                const y2 = posY(ib) + ALTURA / 2
                return (
                  <path
                    key={`${a.key}-${b.key}`}
                    d={caminho(x1, y1, x2, y2)}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth={2}
                  />
                )
              }),
            ),
          )}
        </svg>

        {/* Faixa da coluna alvo — o realce de onde vai cair. */}
        {arrasto && alvo !== null && (
          <div style={{
            position: 'absolute', left: posX(alvo) - 10, top: 8,
            width: LARGURA + 20, height: alturaArea - 16, borderRadius: 16,
            background: 'var(--accent-soft)', border: '2px dashed var(--accent)',
            pointerEvents: 'none',
          }} />
        )}

        {/* Faixa fina entre colunas: soltar aqui cria uma etapa nova no meio. */}
        {arrasto && novaEntre !== null && (
          <div style={{
            position: 'absolute', left: posX(novaEntre) + LARGURA + GAP_X / 2 - 22, top: 8,
            width: 44, height: alturaArea - 16, borderRadius: 12,
            background: 'var(--accent-soft)', border: '2px dashed var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', fontSize: 11, fontWeight: 800, textAlign: 'center',
            pointerEvents: 'none', lineHeight: 1.2, padding: 4,
          }}>
            {textos.newColumn}
          </div>
        )}

        {/* Cabeçalho de cada coluna. */}
        {cols.map((desta, c) => (
          <div key={`h${c}`} style={{ position: 'absolute', left: posX(c), top: 4, width: LARGURA, textAlign: 'center' }}>
            {desta.length > 1 && (
              <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 100, padding: '2px 10px', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {textos.together}
              </span>
            )}
          </div>
        ))}

        {/* Os blocos. */}
        {cols.map((desta, c) =>
          desta.map((no, i) => {
            const arrastandoEste = arrasto?.key === no.key
            const x = arrastandoEste ? arrasto.x : posX(c)
            const y = arrastandoEste ? arrasto.y : posY(i)
            const ativo = selecionado === no.key
            return (
              <div
                key={no.key}
                onPointerDown={(e) => pegar(e, no, c, i)}
                onClick={() => onSelecionar(no.key)}
                style={{
                  position: 'absolute', left: x, top: y, width: LARGURA, height: ALTURA,
                  background: 'var(--surface)',
                  border: `2px solid ${ativo ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 14, padding: '10px 12px', boxSizing: 'border-box',
                  boxShadow: arrastandoEste ? '0 16px 34px rgba(0,0,0,.28)' : 'var(--card-shadow)',
                  cursor: canEdit ? (arrastandoEste ? 'grabbing' : 'grab') : 'pointer',
                  // Sem transição enquanto arrasta: o bloco tem que colar no
                  // cursor. Com ela, ele fica "nadando" atrás do dedo.
                  transition: arrastandoEste ? 'none' : 'left .16s ease, top .16s ease',
                  zIndex: arrastandoEste ? 20 : 2,
                  userSelect: 'none',
                }}
              >
                {/* Portas: o detalhe que faz o bloco parecer ligável. */}
                {c > 0 && <Porta lado="esq" />}
                {c < cols.length - 1 && <Porta lado="dir" />}

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon name="flow" size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {no.name.trim() || textos.emptyName}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {no.quem || textos.noOne}
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onRemover(no.key) }}
                    title={textos.remove}
                    style={{
                      position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 7,
                      border: 'none', background: 'transparent', color: 'var(--text-muted)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name="close" size={13} />
                  </button>
                )}
              </div>
            )
          }),
        )}

        {/* Adicionar um bloco NESTA coluna (roda junto com os que já estão). */}
        {canEdit && cols.map((desta, c) => (
          <button
            key={`add${c}`}
            type="button"
            onClick={() => onAdicionar(c)}
            title={textos.addHere}
            style={{
              position: 'absolute', left: posX(c), top: posY(desta.length), width: LARGURA, height: 34,
              border: '1.5px dashed var(--border)', background: 'transparent', borderRadius: 12,
              color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            + {textos.addHere}
          </button>
        ))}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 10, lineHeight: 1.5 }}>
        {textos.dragHint} · {textos.waitsAll}
      </p>
    </div>
  )
}

/** Bolinha de conexão. Não é interativa: quem liga os blocos é a COLUNA, e uma
 *  porta clicável prometeria uma ligação livre que o motor não executa. */
function Porta({ lado }: { lado: 'esq' | 'dir' }) {
  return (
    <span style={{
      position: 'absolute', top: '50%', transform: 'translateY(-50%)',
      [lado === 'esq' ? 'left' : 'right']: -7,
      width: 11, height: 11, borderRadius: '50%',
      background: 'var(--surface)', border: '2px solid var(--accent)',
    } as React.CSSProperties} />
  )
}
