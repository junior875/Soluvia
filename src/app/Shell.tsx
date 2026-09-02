// Shell do painel: sidebar montada por capacidade + topbar (tema/idioma/sair) +
// área de conteúdo que renderiza a tela ativa (navegação por hash #painel/<id>).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useTheme } from '../theme/ThemeProvider'
import { useTranslation } from '../i18n/LanguageProvider'
import { LANGS } from '../i18n/translations'
import { useCaps } from './capabilities'
import { useT } from './strings'
import { SCREENS, evaluate, type ScreenState } from './registry'
import { currentScreenId, goScreen } from './nav'
import { Avatar, IconButton } from './ui'
import { DuoIcon, Icon } from './icons'
import NotificationBell from './NotificationBell'
import AvatarEditor from '../components/AvatarEditor'

const GROUPS = ['main', 'modules', 'config', 'admin'] as const

type Badges = {
  mine: number; watching: number; bell: number
  // A cadeia de configuração: canal → formulário → fluxo → divulgação.
  // O servidor só manda número > 0 para quem PODE dar aquele passo.
  setup_channels?: number; setup_form?: number; setup_flow?: number; setup_announce?: number
  // O alarde do SAC: demandas abertas, para todo mundo que pode ve-las.
  sac_open?: number
}

/** De quanto em quanto tempo perguntar pelos números da nav (mesmo ritmo do
 *  sininho: chega "na hora" para quem está com a tela aberta, sem virar uma
 *  consulta por segundo). */
const BADGES_MS = 45_000

/**
 * Os números da nav — pareceres esperando, acompanhamentos que andaram e
 * avisos não lidos. UMA consulta para as três abas, da MESMA fonte que dispara
 * os e-mails: o vermelhinho da nav, o sininho e a caixa de entrada contam
 * sempre a mesma história.
 */
function useBadges(): Badges {
  const [badges, setBadges] = useState<Badges>({ mine: 0, watching: 0, bell: 0 })
  const carregar = useCallback(async () => {
    try { setBadges(await api.get<Badges>('/notifications/badges')) } catch { /* fundo */ }
  }, [])
  useEffect(() => {
    void carregar()
    const tick = () => { if (!document.hidden) void carregar() }
    const id = window.setInterval(tick, BADGES_MS)
    document.addEventListener('visibilitychange', tick)
    // Trocar de tela também atualiza: quem acabou de responder um parecer
    // espera ver o número cair AGORA, não em 45 segundos.
    window.addEventListener('hashchange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('hashchange', tick)
    }
  }, [carregar])
  return badges
}

/** Linha do menu de perfil: ícone + rótulo (+ ✓ na empresa atual). */
function MenuItem({ icone, rotulo, onClick, marcado }: { icone: string; rotulo: string; onClick: () => void; marcado?: boolean }) {
  return (
    <button
      type="button" onClick={onClick} className="app-btn app-card--hover"
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', background: 'none', padding: '9px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', color: 'var(--heading)', fontWeight: 600, fontSize: 13.5 }}
    >
      <DuoIcon name={icone as never} size={16} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rotulo}</span>
      {marcado && <Icon name="check" size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
    </button>
  )
}

/** A bolinha vermelha com número — o padrão que todo mundo já leu no WhatsApp. */
function BadgePill({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span
      style={{
        minWidth: 19, height: 19, padding: '0 5px', borderRadius: 100,
        background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 2px 6px rgba(239,68,68,.45)',
      }}
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}

export default function Shell() {
  const caps = useCaps()
  const { ctx } = caps
  const t = useT()
  const { theme, toggle } = useTheme()
  const { lang, setLang } = useTranslation()
  const [active, setActive] = useState(currentScreenId())
  const [drawer, setDrawer] = useState(false)
  // A foto da pessoa: nasce do contexto e atualiza na hora ao salvar no editor.
  const [fotoUrl, setFotoUrl] = useState<string | null>(ctx.user.avatar_url ?? null)
  // O editor parte do ORIGINAL: reenquadrar o recorte encolheria a foto.
  const [fotoOriginal, setFotoOriginal] = useState<string | null>(ctx.user.avatar_original_url ?? null)
  const [editorFoto, setEditorFoto] = useState(false)
  const [menuPerfil, setMenuPerfil] = useState(false)
  type UsoBarra = { rotulo: string; texto: string; pct: number | null }
  const [usoMenu, setUsoMenu] = useState<{ barras: UsoBarra[]; renova?: string } | null>(null)
  // O uso so e buscado quando o menu ABRE — dois GETs por clique, nao por boot.
  useEffect(() => {
    if (!menuPerfil) return
    void (async () => {
      const fmt = (n: number) => n.toLocaleString()
      const mb = (b: number) => b >= 1024 ** 3 ? (b / 1024 ** 3).toFixed(1) + ' GB' : Math.round(b / 1024 ** 2) + ' MB'
      const [ia, st] = await Promise.all([
        api.get<{ my_used: number; my_limit: number; renews_at?: string }>('/ai/usage').catch(() => null),
        api.get<{ used_bytes: number; limit_bytes: number; unlimited: boolean }>('/storage/usage').catch(() => null),
      ])
      const barras: UsoBarra[] = []
      if (ia) {
        barras.push({
          rotulo: 'IA',
          texto: fmt(ia.my_used) + (ia.my_limit > 0 ? ' / ' + fmt(ia.my_limit) : ''),
          pct: ia.my_limit > 0 ? Math.min(100, (ia.my_used / ia.my_limit) * 100) : null,
        })
      }
      if (st) {
        barras.push({
          rotulo: t.settings.storageTitle,
          texto: mb(st.used_bytes) + ' / ' + (st.unlimited ? '∞' : mb(st.limit_bytes)),
          pct: st.unlimited || st.limit_bytes <= 0 ? null : Math.min(100, (st.used_bytes / st.limit_bytes) * 100),
        })
      }
      setUsoMenu({
        barras,
        renova: ia?.renews_at ? new Date(ia.renews_at + 'T00:00:00').toLocaleDateString() : undefined,
      })
    })()
  }, [menuPerfil])
  const badges = useBadges()
  // Aba → número. As três abas "pessoais" têm badge; as demais são telas de
  // trabalho, não de aviso.
  // O manual entra na lista por um motivo diferente das outras: o número não
  // conta trabalho parado, conta CAPÍTULO NOVO — quem ganhou uma permissão
  // precisa saber que passou a poder fazer algo que antes nem via.
  const badgeDe: Record<string, number> = {
    mine: badges.mine,
    watching: badges.watching,
    manual: caps.manualNovas.length,
    // A trilha de migalhas da configuração: criou o canal, acende o
    // formulário; publicou, acende o fluxo; salvou, acende a divulgação.
    // Quem nunca configurou nada é GUIADO pela ordem certa sem ler manual.
    channels: badges.setup_channels ?? 0,
    formbuilder: badges.setup_form ?? 0,
    flowbuilder: badges.setup_flow ?? 0,
    announcements: badges.setup_announce ?? 0,
    // O prazo de 7 dias corre para a EQUIPE: a aba SAC carrega o numero de
    // demandas abertas para todo mundo com acesso ao modulo.
    sac: badges.sac_open ?? 0,
  }
  // Nav recolhida. Fica GUARDADA: quem trabalha no construtor de fluxo quer a
  // largura toda e não vai reclicar a cada visita. Só no desktop — no celular
  // a nav já é uma gaveta.
  const [navOculta, setNavOculta] = useState(() => {
    try { return localStorage.getItem('soluvia.navOculta') === '1' } catch { return false }
  })
  const alternarNav = () => setNavOculta((v) => {
    try { localStorage.setItem('soluvia.navOculta', v ? '0' : '1') } catch { /* modo privado */ }
    return !v
  })

  // Telas visíveis (ok|locked) com seu estado, na ordem do registro.
  const evaluated = useMemo(
    () => SCREENS.map((s) => ({ s, state: evaluate(s.requires, caps) as ScreenState })).filter((x) => x.state !== 'hidden'),
    [caps],
  )
  const okIds = useMemo(() => new Set(evaluated.filter((x) => x.state === 'ok').map((x) => x.s.id)), [evaluated])

  // Sincroniza tela ativa com o hash; cai p/ 1ª permitida se inválida.
  useEffect(() => {
    const sync = () => {
      const id = currentScreenId()
      // Chegar com um CASO na mão (`?caso=` / `?protocolo=`) abre a tela mesmo
      // sem a permissão do canal: quem tem ficha numa etapa está autorizado
      // naquele caso, e o servidor confere isso caso a caso. Sem esta exceção
      // o botão Abrir de "Meus atendimentos" devolvia a pessoa à visão geral.
      const comCaso = /[?&](caso|protocolo)=/.test(window.location.hash)
      const permitido = okIds.has(id) || (comCaso && (id === 'cases' || id === 'sac'))
      setActive(permitido ? id : 'overview')
      setDrawer(false)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [okIds])

  const ActiveScreen = SCREENS.find((s) => s.id === active)?.Component ?? SCREENS[0].Component

  return (
    <div className="app-bg" style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', color: 'var(--text)' }}>
      {/* Backdrop mobile */}
      <div className={`app-sidebar-backdrop ${drawer ? 'open' : ''}`} onClick={() => setDrawer(false)} />

      {/* Sidebar */}
      <aside
        className={`app-sidebar ${drawer ? 'open' : ''} ${navOculta ? 'recolhida' : ''}`}
        style={{ width: 260, minWidth: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        <div style={{ padding: '16px 14px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/soluvia.png" alt="Soluvia" className={theme === 'dark' ? 'brand-logo' : undefined} style={{ width: '78%', maxWidth: 196, height: 'auto', display: 'block' }} />
        </div>

        <nav className="app-scroll" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {GROUPS.map((g) => {
            const items = evaluated.filter((x) => x.s.group === g)
            if (!items.length) return null
            return (
              <div key={g} style={{ marginBottom: 8 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', padding: '8px 13px 6px' }}>{(t.nav as unknown as Record<string, string>)[g]}</p>
                {items.map(({ s, state }) => {
                  const isActive = state === 'ok' && active === s.id
                  // O badge da cadeia fala: pousa o mouse e o passo é dito
                  // por extenso ("agora monte o formulário").
                  const dica = (badgeDe[s.id] ?? 0) > 0
                    ? (t.nav.setupHint as Record<string, string>)[s.id]
                    : undefined
                  return (
                    <button
                      key={s.id}
                      title={dica}
                      className={`app-nav-item ${isActive ? 'active' : ''} ${state === 'locked' ? 'locked' : ''}`}
                      onClick={() => (state === 'locked' ? goScreen('billing') : goScreen(s.id))}
                    >
                      {s.logo ? (
                        <img src={s.logo} alt="" className="module-logo" style={{ width: 27, height: 27, minWidth: 27, objectFit: 'contain', margin: '-4px 0' }} />
                      ) : (
                        // Duotone: véu + traço, entintado pelo tema (index.css).
                        <DuoIcon name={s.icon} size={19} />
                      )}
                      <span style={{ flex: 1 }}>{(t.nav as unknown as Record<string, string>)[s.navKey]}</span>
                      {/* O vermelhinho: "tem coisa esperando você aqui". */}
                      <BadgePill n={badgeDe[s.id] ?? 0} />
                      {state === 'locked' && <Icon name="lock" size={15} />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid var(--border)', position: 'relative' }}>
          {/* O cartãozinho da pessoa abre o MENU DE PERFIL — foto, ajustes,
              empresas, uso e sair, tudo num lugar só (o padrão de toda
              plataforma grande). O logout genérico e o botão de trocar
              empresa do topo moram aqui agora. */}
          <button
            type="button"
            onClick={() => setMenuPerfil((v) => !v)}
            className="app-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', minWidth: 0, background: menuPerfil ? 'var(--surface-2)' : 'none', border: 'none', padding: 6, borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}
          >
            <Avatar name={ctx.user.full_name} src={fotoUrl} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ctx.user.full_name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ctx.user.email}</div>
            </div>
            <Icon name="chevron" size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: menuPerfil ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .15s' }} />
          </button>

          {menuPerfil && (
            <>
              {/* Clique fora fecha. */}
              <div onClick={() => setMenuPerfil(false)} style={{ position: 'fixed', inset: 0, zIndex: 9500 }} />
              <div style={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(100% + 6px)', zIndex: 9501, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 18px 50px rgba(0,0,0,.4)', padding: 8, maxHeight: '70vh', overflowY: 'auto' }} className="app-scroll">
                <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 12px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ctx.user.email}</div>

                <MenuItem icone="people" rotulo={t.settings.photoChange} onClick={() => { setMenuPerfil(false); setEditorFoto(true) }} />
                <MenuItem icone="settings" rotulo={(t.nav as unknown as Record<string, string>).settings} onClick={() => { setMenuPerfil(false); goScreen('settings') }} />

                {/* Uso: os dois números que a pessoa mais pergunta. */}
                {usoMenu && usoMenu.barras.length > 0 && (
                  <div style={{ margin: '6px 4px', padding: '11px 13px', background: 'var(--surface-2)', borderRadius: 12 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 9 }}>{t.settings.menuUsage}</div>
                    {usoMenu.barras.map((b, i) => {
                      // Semáforo: verde folgado, âmbar apertando (>=70), vermelho
                      // no fim (>=90). Sem limite, a barra some — não há o que medir.
                      const cor = b.pct === null ? 'var(--accent)' : b.pct >= 90 ? '#e11d48' : b.pct >= 70 ? '#f59e0b' : '#16a34a'
                      return (
                        <div key={b.rotulo} style={{ marginTop: i ? 10 : 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, marginBottom: 4 }}>
                            <span style={{ color: 'var(--heading)', fontWeight: 700 }}>{b.rotulo}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{b.texto}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 100, background: 'var(--surface)', overflow: 'hidden' }}>
                            <div style={{ width: `${b.pct ?? 100}%`, height: '100%', borderRadius: 100, background: cor, opacity: b.pct === null ? 0.35 : 1, transition: 'width .3s' }} />
                          </div>
                        </div>
                      )
                    })}
                    {usoMenu.renova && (
                      <div style={{ color: 'var(--text-muted)', fontSize: 11.5, marginTop: 9 }}>
                        {t.settings.menuRenews} <b style={{ color: 'var(--heading)' }}>{usoMenu.renova}</b>
                      </div>
                    )}
                  </div>
                )}

                {/* Empresas: a troca mora AQUI agora (saiu do topo). */}
                {caps.memberships.length > 1 && (
                  <>
                    <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', padding: '6px 12px 4px' }}>{t.settings.menuCompanies}</div>
                    {caps.memberships.map((m) => {
                      const atual = m.tenant_id === ctx.tenant_id
                      return (
                        <MenuItem
                          key={m.id}
                          icone="channels"
                          rotulo={m.tenant_name}
                          marcado={atual}
                          onClick={() => { if (!atual) { setMenuPerfil(false); void caps.switchTenant(m.tenant_id) } }}
                        />
                      )
                    })}
                  </>
                )}

                <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />
                <MenuItem icone="logout" rotulo={t.common.logout} onClick={() => void caps.logout()} />
              </div>
            </>
          )}
        </div>

        <AvatarEditor
          open={editorFoto}
          onClose={() => setEditorFoto(false)}
          onSaved={(url, orig) => { setFotoUrl(url); if (orig) setFotoOriginal(orig) }}
          atualUrl={fotoOriginal ?? fotoUrl}
          textos={{
            title: t.settings.photoTitle, pick: t.settings.photoPick, zoom: t.settings.photoZoom,
            save: t.settings.save, saving: t.settings.saving, hint: t.settings.photoDragHint,
            fail: t.settings.saveFail, novaFoto: t.settings.photoNew,
          }}
        />
      </aside>

      {/* Conteúdo */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {/* Topbar */}
        <header style={{ height: 64, minHeight: 64, borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 clamp(16px,3vw,28px)' }}>
          <button className="app-btn app-burger" aria-label="Menu" onClick={() => setDrawer(true)} style={{ display: 'none', width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <Icon name="menu" />
          </button>
          {/* Recolher a nav: telas largas (o construtor de fluxo) precisam da
              largura toda. Escondido no celular, onde a nav já é gaveta. */}
          <button
            className="app-btn pnl-nav-toggle"
            aria-label={navOculta ? t.nav.showNav : t.nav.hideNav}
            title={navOculta ? t.nav.showNav : t.nav.hideNav}
            aria-pressed={navOculta}
            onClick={alternarNav}
            style={{ width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', color: navOculta ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
          >
            <Icon name="menu" size={17} />
          </button>
          {/* O nome da empresa é a PORTA do hub quando a pessoa tem mais de um
              vínculo: clica, escolhe a outra empresa/papel, sem deslogar. Com
              um vínculo só, continua texto — não se oferece escolha que não
              existe. */}
          {/* Só informa a empresa atual; a TROCA mora no menu de perfil. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--heading)', fontWeight: 800, minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            <span className="pnl-topbar-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ctx.tenant_name}</span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <NotificationBell />
            {/* Idioma */}
            <div className="pnl-lang" style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 100, padding: 3 }}>
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)} className="app-btn" style={{ border: 'none', cursor: 'pointer', padding: '5px 11px', borderRadius: 100, fontSize: 12.5, fontWeight: 700, background: lang === l.code ? 'var(--accent)' : 'transparent', color: lang === l.code ? '#fff' : 'var(--text-muted)' }}>
                  {l.label}
                </button>
              ))}
            </div>
            {/* Tema */}
            <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={t.topbar.theme} onClick={toggle} />
          </div>
        </header>

        {/* Tela ativa */}
        <div className="app-scroll" style={{ flex: 1, overflowY: 'auto', padding: 'clamp(18px,3vw,34px)' }}>
          <div className="app-zoomable" style={{ maxWidth: 1080, margin: '0 auto' }}>
            <div key={active}>
              <ActiveScreen />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
