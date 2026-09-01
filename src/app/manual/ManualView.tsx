/**
 * O desenho do manual — usado por DUAS telas.
 *
 * A do painel filtra por permissão; a do console da plataforma passa
 * `gate = null` e mostra o documento inteiro, porque lá o acesso é um só e não
 * há o que recortar. Duas telas desenhando o mesmo documento de dois jeitos
 * seria a forma garantida de uma envelhecer sem ninguém perceber.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Card, EmptyState } from '../ui'
import { Icon } from '../icons'
import { evaluate } from '../registry'
import { goScreen } from '../nav'
import { useTranslation } from '../../i18n/LanguageProvider'
import type { Lang } from '../../i18n/translations'
import type { ManualCapitulo, ManualSecao, T3 } from './tipos'

/** `dangerouslySetInnerHTML` com conteúdo NOSSO, estático, do próprio bundle —
 *  nada aqui vem do servidor nem de quem usa o sistema. */
const html = (s: string) => ({ __html: s })

/** Texto no idioma da tela. Sem fallback: o tipo `T3` já garante os três. */
const diz = (texto: T3, lang: Lang) => texto[lang]

const CAIXA = {
  nota: { borda: 'var(--accent)', fundo: 'var(--accent-soft)' },
  aviso: { borda: '#d64545', fundo: 'rgba(214,69,69,.10)' },
  ok: { borda: '#1f9d6b', fundo: 'rgba(31,157,107,.10)' },
} as const

interface Gate {
  can: (code: string) => boolean
  hasModule: (m: string) => boolean
  isContractable: (m: string) => boolean
}

export interface RotulosManual {
  toc: string
  hideToc: string
  showToc: string
  openScreen: string
  locked: string
  required: string
  optional: string
  emptyTitle: string
  emptyBody: string
}

export function ManualView({ capitulos, gate, rotulos, aberto, onAberto, topo }: {
  capitulos: ManualCapitulo[]
  /** `null` = sem filtro: mostra o documento inteiro. */
  gate: Gate | null
  rotulos: RotulosManual
  aberto: boolean
  onAberto: (v: boolean) => void
  /** Faixa opcional acima do texto (o aviso de capítulo novo). */
  topo?: ReactNode
}) {
  const { lang } = useTranslation()
  const [estreito, setEstreito] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1100)
  const [ativo, setAtivo] = useState<string>('')

  useEffect(() => {
    const medir = () => {
      const pequeno = window.innerWidth < 1100
      setEstreito(pequeno)
      // Em tela pequena o sumário vira gaveta: começa fechado, senão cobre o
      // texto que a pessoa veio ler.
      if (pequeno) onAberto(false)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
    // `onAberto` fora das deps: reassinar o listener a cada renderização do pai
    // não muda nada e só gera trabalho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // `locked` (módulo não contratado) continua na lista, com cadeado: é
  // informação de venda, não ruído.
  const visiveis = useMemo(
    () => capitulos
      .map((c) => ({ cap: c, estado: gate ? evaluate(c.requires, gate) : ('ok' as const) }))
      .filter((x) => x.estado !== 'hidden'),
    [capitulos, gate],
  )

  // Destaca no sumário o capítulo que está na tela. Sem isso, um documento
  // longo deixa a pessoa sem saber onde está.
  useEffect(() => {
    if (!visiveis.length) return
    const alvos = visiveis
      .map((x) => document.getElementById(`cap-${x.cap.id}`))
      .filter((e): e is HTMLElement => !!e)
    if (!alvos.length) return
    const obs = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visivel) setAtivo(visivel.target.id.replace('cap-', ''))
      },
      // A faixa alta evita o pisca-pisca: o capítulo "ativo" é o que está no
      // terço superior, não o que encostou na borda de baixo.
      { rootMargin: '-80px 0px -65% 0px', threshold: 0 },
    )
    alvos.forEach((a) => obs.observe(a))
    return () => obs.disconnect()
  }, [visiveis])

  const irPara = useCallback((id: string) => {
    const el = document.getElementById(`cap-${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setAtivo(id)
    if (estreito) onAberto(false)
  }, [estreito, onAberto])

  return (
    <>
      {topo}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {visiveis.length === 0 ? (
            <Card><EmptyState icon="book" title={rotulos.emptyTitle} body={rotulos.emptyBody} /></Card>
          ) : (
            visiveis.map(({ cap, estado }, i) => (
              <Capitulo
                key={cap.id}
                numero={i + 1}
                cap={cap}
                bloqueado={estado === 'locked'}
                gate={gate}
                rotulos={rotulos}
                lang={lang}
              />
            ))
          )}
        </div>

        {aberto && (
          <nav
            aria-label={rotulos.toc}
            className="app-scroll"
            style={{
              ...(estreito
                ? {
                    position: 'fixed', top: 64, right: 12, bottom: 12, width: 'min(300px, 88vw)',
                    zIndex: 9500, boxShadow: '-14px 0 40px rgba(0,0,0,.28)',
                  }
                : { position: 'sticky', top: 12, width: 262, flexShrink: 0, maxHeight: 'calc(100vh - 90px)' }),
              overflowY: 'auto',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {rotulos.toc}
              </span>
              <button
                type="button" onClick={() => onAberto(false)} aria-label={rotulos.hideToc}
                className="app-btn"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
            {visiveis.map(({ cap, estado }, i) => (
              <button
                key={cap.id} type="button" onClick={() => irPara(cap.id)}
                className="app-btn"
                style={{
                  display: 'flex', alignItems: 'baseline', gap: 9, width: '100%',
                  textAlign: 'left', whiteSpace: 'normal', border: 'none', cursor: 'pointer',
                  background: ativo === cap.id ? 'var(--accent-soft)' : 'transparent',
                  color: ativo === cap.id ? 'var(--accent)' : 'var(--text)',
                  borderRadius: 9, padding: '7px 9px', fontSize: 12.6,
                  fontWeight: ativo === cap.id ? 800 : 600,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, opacity: .55, minWidth: 14, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>{diz(cap.titulo, lang)}</span>
                {estado === 'locked' && (
                  <span style={{ display: 'flex', flexShrink: 0, opacity: .6 }}><Icon name="lock" size={11} /></span>
                )}
              </button>
            ))}
          </nav>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────

function Capitulo({ numero, cap, bloqueado, gate, rotulos, lang }: {
  numero: number
  cap: ManualCapitulo
  bloqueado: boolean
  gate: Gate | null
  rotulos: RotulosManual
  lang: Lang
}) {
  const secoes = gate
    ? cap.secoes.filter((s) => evaluate(s.requires, gate) !== 'hidden')
    : cap.secoes

  return (
    <section id={`cap-${cap.id}`} style={{ scrollMarginTop: 76, marginBottom: 26 }}>
      <Card>
        <header style={{ borderBottom: '2px solid var(--accent)', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: -1,
              color: 'var(--surface-2)', flexShrink: 0, marginTop: 2,
            }}>
              {String(numero).padStart(2, '0')}
            </span>
            <div style={{ flex: 1, minWidth: 180 }}>
              <h2 style={{ color: 'var(--heading)', fontSize: 19, fontWeight: 800, letterSpacing: -0.3, margin: 0 }}>
                {diz(cap.titulo, lang)}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '5px 0 0' }}>{diz(cap.resumo, lang)}</p>
            </div>
            {cap.tela && !bloqueado && (
              <Button variant="ghost" leftIcon="chevron" onClick={() => goScreen(cap.tela!)}>
                {rotulos.openScreen}
              </Button>
            )}
            {bloqueado && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                background: 'var(--surface-2)', color: 'var(--text-muted)',
                borderRadius: 100, padding: '5px 12px', fontSize: 11.5, fontWeight: 800,
              }}>
                <Icon name="lock" size={12} /> {rotulos.locked}
              </span>
            )}
          </div>
        </header>

        {secoes.map((s) => (
          <Secao key={s.id} secao={s} obrig={rotulos.required} opc={rotulos.optional} lang={lang} />
        ))}
      </Card>
    </section>
  )
}

function Secao({ secao, obrig, opc, lang }: {
  secao: ManualSecao; obrig: string; opc: string; lang: Lang
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3 style={{
        color: 'var(--heading)', fontSize: 14, fontWeight: 800, margin: '0 0 8px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
        {diz(secao.titulo, lang)}
      </h3>

      {secao.corpo?.map((p, i) => (
        <p key={i} style={{ margin: '0 0 9px', fontSize: 13.4, lineHeight: 1.65 }} dangerouslySetInnerHTML={html(diz(p, lang))} />
      ))}

      {secao.passos && (
        <ol style={{
          margin: '10px 0', padding: '14px 16px 14px 34px', borderRadius: 12,
          background: 'var(--surface-2)', fontSize: 13.2, lineHeight: 1.6,
        }}>
          {secao.passos.map((p, i) => (
            <li key={i} style={{ margin: '5px 0' }} dangerouslySetInnerHTML={html(diz(p, lang))} />
          ))}
        </ol>
      )}

      {secao.campos && (
        <div style={{ margin: '12px 0', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            background: 'var(--heading)', color: 'var(--surface)', padding: '8px 13px',
            fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase',
          }}>
            {diz(secao.campos.titulo, lang)}
          </div>
          {secao.campos.itens.map((c, i) => (
            <div key={c.nome.pt} style={{
              display: 'flex', gap: 12, padding: '10px 13px', flexWrap: 'wrap',
              borderTop: i ? '1px solid var(--border)' : 'none',
              background: i % 2 ? 'var(--surface-2)' : 'transparent',
            }}>
              <div style={{ minWidth: 130, flexShrink: 0, color: 'var(--heading)', fontWeight: 800, fontSize: 12.6 }}>
                {diz(c.nome, lang)}
                <span style={{
                  display: 'inline-block', marginLeft: 6, padding: '1px 7px', borderRadius: 100,
                  fontSize: 8.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
                  background: c.obrigatorio ? 'rgba(214,69,69,.14)' : 'var(--surface-2)',
                  color: c.obrigatorio ? '#c04a4a' : 'var(--text-muted)',
                }}>
                  {c.obrigatorio ? obrig : opc}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 180, fontSize: 12.8, lineHeight: 1.55 }} dangerouslySetInnerHTML={html(diz(c.desc, lang))} />
            </div>
          ))}
        </div>
      )}

      {secao.tabela && (
        // A tabela rola DENTRO da própria caixa: sem isso, uma coluna larga
        // empurra a página inteira para o lado no celular.
        <div className="app-scroll" style={{ overflowX: 'auto', margin: '12px 0' }}>
          <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse', fontSize: 12.8 }}>
            <thead>
              <tr>
                {secao.tabela.colunas.map((c) => (
                  <th key={c.pt} style={{
                    background: 'var(--heading)', color: 'var(--surface)', textAlign: 'left',
                    padding: '8px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em',
                  }}>{diz(c, lang)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {secao.tabela.linhas.map((linha, i) => (
                <tr key={i}>
                  {linha.map((cel, j) => (
                    <td key={j}
                      style={{
                        padding: '8px 12px', borderTop: '1px solid var(--border)', verticalAlign: 'top',
                        lineHeight: 1.55, background: i % 2 ? 'var(--surface-2)' : 'transparent',
                      }}
                      dangerouslySetInnerHTML={html(diz(cel, lang))}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {secao.figuras?.map((f) => (
        <figure key={f.src} style={{ margin: '14px 0' }}>
          <img
            src={`/manual/${f.src}.webp`}
            alt=""
            loading="lazy"
            style={{
              display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto',
              border: '1px solid var(--border)', borderRadius: 12,
              boxShadow: '0 3px 14px rgba(0,0,0,.10)',
            }}
          />
          <figcaption
            style={{
              marginTop: 8, fontSize: 12.2, color: 'var(--text-muted)', lineHeight: 1.55,
              borderLeft: '3px solid var(--accent)', paddingLeft: 11,
            }}
            dangerouslySetInnerHTML={html(diz(f.legenda, lang))}
          />
        </figure>
      ))}

      {secao.notas?.map((n, i) => (
        <div key={i} style={{
          borderLeft: `4px solid ${CAIXA[n.tipo].borda}`, background: CAIXA[n.tipo].fundo,
          padding: '11px 14px', margin: '12px 0', borderRadius: '0 10px 10px 0',
          fontSize: 12.8, lineHeight: 1.6,
        }} dangerouslySetInnerHTML={html(diz(n.texto, lang))} />
      ))}
    </div>
  )
}
