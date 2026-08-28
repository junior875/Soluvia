/**
 * Sininho da topbar — os avisos DENTRO do sistema.
 *
 * Existe ao lado do e-mail, não no lugar dele: e-mail alcança quem está longe
 * do site, mas some no meio de trinta outros e não sabe o que já foi visto.
 * O sininho sabe, e leva ao caso com um clique.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { DuoIcon, type IconName } from './icons'
import { useT } from './strings'

/** Cada TIPO de aviso tem o seu ícone duotone — a lista se lê de relance:
 *  relógio é atraso, bandeja é caso novo, balão é resposta do autor. */
const ICONE_DO_TIPO: Record<string, IconName> = {
  parecer_pendente: 'check',
  parecer_atrasado: 'clock',
  caso_novo: 'inbox',
  caso_respondido: 'channels',
}

type Aviso = {
  id: string
  kind: string
  title: string
  body: string
  link: string
  read_at: string | null
  created_at: string
}

/** De quanto em quanto tempo perguntar por avisos novos.
 *  45s é o ponto em que o aviso ainda chega "na hora" para quem está com a tela
 *  aberta, sem transformar o painel numa consulta por segundo. */
const INTERVALO_MS = 45_000

export default function NotificationBell() {
  const t = useT()
  const [aberto, setAberto] = useState(false)
  const [itens, setItens] = useState<Aviso[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const caixaRef = useRef<HTMLDivElement>(null)

  const carregar = useCallback(async () => {
    try {
      const r = await api.get<{ unread: number; items: Aviso[] }>('/notifications')
      setItens(r.items)
      setNaoLidas(r.unread)
    } catch {
      /* silencioso de propósito: o sininho não pode encher a tela de erro por
         uma consulta de fundo que falhou. */
    }
  }, [])

  useEffect(() => {
    void carregar()
    // Pausa quando a aba está oculta: sem isto, dez abas esquecidas ficariam
    // consultando para sempre.
    const tick = () => { if (!document.hidden) void carregar() }
    const id = window.setInterval(tick, INTERVALO_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [carregar])

  // Fecha ao clicar fora e no ESC.
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (caixaRef.current && !caixaRef.current.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora)
    window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); window.removeEventListener('keydown', esc) }
  }, [aberto])

  async function abrirAviso(a: Aviso) {
    setAberto(false)
    // Navega ANTES de marcar: o valor está em chegar ao caso. Se a marcação
    // falhar, a pessoa chegou onde queria e o aviso continua lá.
    if (a.link) window.location.hash = a.link
    if (!a.read_at) {
      setNaoLidas((n) => Math.max(0, n - 1))
      setItens((l) => l.map((x) => (x.id === a.id ? { ...x, read_at: new Date().toISOString() } : x)))
      try { await api.post(`/notifications/${a.id}/read`, {}) } catch { void carregar() }
    }
  }

  async function lerTodas() {
    setNaoLidas(0)
    setItens((l) => l.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })))
    try { await api.post('/notifications/read-all', {}) } catch { void carregar() }
  }

  const quando = (iso: string) => {
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (min < 1) return t.notif.now
    if (min < 60) return t.notif.minutes(min)
    const h = Math.round(min / 60)
    if (h < 24) return t.notif.hours(h)
    return t.notif.days(Math.round(h / 24))
  }

  return (
    <div ref={caixaRef} style={{ position: 'relative' }}>
      <button
        className="app-btn"
        aria-label={t.notif.title}
        title={t.notif.title}
        onClick={() => { setAberto((v) => !v); if (!aberto) void carregar() }}
        style={{ position: 'relative', width: 38, height: 38, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', color: naoLidas ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer' }}
      >
        <DuoIcon name="bell" size={18} />
        {naoLidas > 0 && (
          // Vermelho, não accent: o vermelhinho é a língua universal de "tem
          // coisa não lida" — o mesmo da nav.
          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 100, background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)', boxShadow: '0 2px 6px rgba(239,68,68,.45)' }}>
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label={t.notif.title}
          style={{
            position: 'absolute', top: 46, right: 0, width: 'min(340px, 92vw)',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
            boxShadow: '0 20px 48px rgba(0,0,0,.28)', zIndex: 9500, overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 14, flex: 1 }}>{t.notif.title}</span>
            {naoLidas > 0 && (
              <button onClick={() => void lerTodas()} className="app-btn" style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                {t.notif.readAll}
              </button>
            )}
          </div>

          <div className="app-scroll" style={{ maxHeight: 380, overflowY: 'auto' }}>
            {itens.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '26px 16px' }}>
                {t.notif.empty}
              </p>
            ) : (
              itens.map((a) => (
                <button
                  key={a.id}
                  onClick={() => void abrirAviso(a)}
                  className="app-btn"
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                    border: 'none', borderBottom: '1px solid var(--border)',
                    // Não lida ganha fundo: a diferença precisa ser visível de
                    // relance, não só na cor do texto.
                    background: a.read_at ? 'transparent' : 'var(--accent-soft)',
                    padding: '11px 14px',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10 }}>
                    {/* O ícone do TIPO — atraso, caso novo, resposta — para a
                        lista se ler sem abrir nada. */}
                    <span style={{ width: 32, height: 32, minWidth: 32, borderRadius: 10, background: a.read_at ? 'var(--surface-2)' : 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.kind === 'parecer_atrasado' ? '#ef4444' : 'var(--accent)' }}>
                      <DuoIcon name={ICONE_DO_TIPO[a.kind] ?? 'bell'} size={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                        {!a.read_at && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />}
                        <span style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.title}
                        </span>
                      </div>
                      {a.body && (
                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.body}
                        </div>
                      )}
                      <div style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{quando(a.created_at)}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
