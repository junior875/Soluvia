/**
 * Visão geral — o COCKPIT do sistema.
 *
 * A régua de cada elemento: responde "o que precisa de mim agora?" ou sai.
 * A versão anterior abria com plano/vagas/nº de módulos — números de cadastro,
 * não de operação; ninguém age sobre "6 módulos".
 *
 * A ordem é a ordem do trabalho real:
 *   1. A SUA FILA — pareceres esperando você, acompanhamentos que andaram,
 *      avisos não lidos (as mesmas fontes dos badges da nav e dos e-mails).
 *   2. O PULSO da operação — casos abertos por módulo, o que está em apuração
 *      e, no SAC, o que VENCE em 48h (o prazo é lei; estourar é multa).
 *   3. Os MÓDULOS como portas de entrada.
 *   4. A atividade recente e as ações rápidas.
 *
 * Sem saudação de formulário ("você está autenticado como…"): a tela abre com
 * o nome da pessoa e o dia, como um lugar de trabalho, não um comprovante de
 * login.
 */
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { localizeRole } from '../../lib/systemNames'
import { useCaps } from '../capabilities'
import { useTranslation } from '../../i18n/LanguageProvider'
import { goScreen } from '../nav'
import { useT } from '../strings'
import { Card, Chip, SectionLabel } from '../ui'
import { DuoIcon, Icon, type IconName } from '../icons'

// Módulos → tela de acesso direto + permissão que libera o card.
const MODULE_CARDS: { module: string; screen: string; icon: IconName; perm: string; logo?: string }[] = [
  { module: 'etica', screen: 'cases', icon: 'cases', perm: 'etica.view_cases', logo: '/canal-denuncias-icon.png' },
  { module: 'sac', screen: 'sac', icon: 'cases', perm: 'sac.view_demands', logo: '/sac-icon.svg' },
  { module: 'assinatura', screen: 'signature', icon: 'signature', perm: 'assinatura.view', logo: '/assinatura-icon.svg' },
  { module: 'privacidade', screen: 'cases', icon: 'lock', perm: 'privacidade.view_requests' },
  { module: 'incidentes', screen: 'cases', icon: 'shield', perm: 'incidentes.view' },
]

interface AuditRow {
  id: string
  action: string
  actor_name: string | null
  resource_type: string
  created_at: string
}

type Ficha = { case_id: string; activated_at: string | null; sla_hours: number | null }
type CaseRow = { id: string; status: string; module?: string; response_due_at?: string | null; created_at: string }

const normAct = (a: string) =>
  a.startsWith('lgpd.request') ? 'lgpd.request' : a.startsWith('billing.webhook') ? 'billing.webhook' : a

export default function Overview() {
  const { ctx, can } = useCaps()
  const t = useT()
  const tx = t.overview
  const { lang } = useTranslation()

  const [recent, setRecent] = useState<AuditRow[] | null>(null)
  const [fichas, setFichas] = useState<Ficha[] | null>(null)
  const [watching, setWatching] = useState(0)
  const [bell, setBell] = useState(0)
  const [cases, setCases] = useState<CaseRow[] | null>(null)

  const podeVerCasos = can('etica.view_cases') || can('sac.view_demands')

  useEffect(() => {
    if (can('admin.view_audit')) {
      api.get<AuditRow[]>('/audit?limit=6').then(setRecent).catch(() => setRecent([]))
    }
    api.get<Ficha[]>('/cases/mine/assignments').then(setFichas).catch(() => setFichas([]))
    api.get<{ watching: number; bell: number }>('/notifications/badges')
      .then((b) => { setWatching(b.watching); setBell(b.bell) })
      .catch(() => { /* fundo */ })
    if (podeVerCasos) {
      api.get<CaseRow[]>('/cases').then(setCases).catch(() => setCases([]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Saudação pela hora, com o primeiro nome ────────────────────
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? tx.greetMorning : hora < 18 ? tx.greetAfternoon : tx.greetEvening
  const primeiroNome = (ctx.user.full_name || '').trim().split(/\s+/)[0] || ctx.user.full_name
  const dataLonga = new Date().toLocaleDateString(
    lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR',
    { weekday: 'long', day: 'numeric', month: 'long' },
  )

  // ── A fila ─────────────────────────────────────────────────────
  const minhas = fichas?.length ?? 0
  const horasMaisAntiga = useMemo(() => {
    if (!fichas?.length) return null
    const mais = Math.min(...fichas.map((f) => f.activated_at ? new Date(f.activated_at).getTime() : Date.now()))
    return Math.floor((Date.now() - mais) / 3600000)
  }, [fichas])
  const temAtrasada = useMemo(() =>
    (fichas ?? []).some((f) => f.activated_at && f.sla_hours != null
      && Date.now() - new Date(f.activated_at).getTime() > f.sla_hours * 3600000),
    [fichas])

  // ── O pulso ────────────────────────────────────────────────────
  const pulso = useMemo(() => {
    const lista = cases ?? []
    const doModulo = (m: string) => lista.filter((c) => (c.module ?? 'etica') === m)
    const abertos = (l: CaseRow[]) => l.filter((c) => c.status !== 'closed')
    const etica = doModulo('etica')
    const sac = doModulo('sac')
    const em48h = Date.now() + 48 * 3600000
    return {
      eticaAbertas: abertos(etica).length,
      eticaApuracao: etica.filter((c) => c.status === 'investigation').length,
      sacAbertas: abertos(sac).length,
      // O número que evita a multa: demandas de SAC cujo prazo legal vence nas
      // próximas 48h (ou já venceu) e ainda estão abertas.
      sacVencendo: abertos(sac).filter((c) =>
        c.response_due_at && new Date(c.response_due_at).getTime() < em48h).length,
      fechados30: lista.filter((c) => c.status === 'closed'
        && Date.now() - new Date(c.created_at).getTime() < 30 * 86400000).length,
    }
  }, [cases])

  const modules = ctx.enabled_modules.filter((m) => m !== 'admin')
  const isAdmin = can('admin.manage_users')
  const myModules = MODULE_CARDS.filter((m) => ctx.enabled_modules.includes(m.module) && can(m.perm))

  return (
    <div className="app-screen">
      {/* Saudação — a tela é um lugar de trabalho, não um comprovante de login. */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ color: 'var(--heading)', fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>
          {saudacao}, {primeiroNome}.
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: '5px 0 0', textTransform: 'capitalize' }}>
          {dataLonga} · <span style={{ textTransform: 'none' }}>{ctx.tenant_name}</span>
        </p>
      </div>

      {/* 1 · A SUA FILA — os três números que os badges da nav anunciam. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginBottom: 26 }}>
        <FilaCard
          icon="inbox"
          n={minhas}
          titulo={tx.qMine}
          detalhe={minhas === 0 ? tx.qMineClear : temAtrasada ? tx.qMineLate : (horasMaisAntiga !== null ? tx.qMineOldest(horasMaisAntiga) : '')}
          alerta={temAtrasada}
          zerada={minhas === 0}
          onClick={() => goScreen('mine')}
        />
        <FilaCard
          icon="eye"
          n={watching}
          titulo={tx.qWatch}
          detalhe={watching === 0 ? tx.qWatchClear : tx.qWatchMoved}
          zerada={watching === 0}
          onClick={() => goScreen('watching')}
        />
        <FilaCard
          icon="bell"
          n={bell}
          titulo={tx.qBell}
          detalhe={bell === 0 ? tx.qBellClear : tx.qBellUnread}
          zerada={bell === 0}
        />
      </div>

      {/* 2 · O PULSO — o estado da operação para quem enxerga os casos. */}
      {podeVerCasos && cases !== null && (pulso.eticaAbertas + pulso.sacAbertas + pulso.fechados30 > 0) && (
        <div style={{ marginBottom: 26 }}>
          <SectionLabel>{tx.pulseTitle}</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            {can('etica.view_cases') && (
              <PulsoCard
                logo="/canal-denuncias-icon.png"
                titulo={tx.pulseEtica}
                linhas={[
                  { n: pulso.eticaAbertas, rotulo: tx.pulseOpen },
                  { n: pulso.eticaApuracao, rotulo: tx.pulseInvest },
                ]}
                onClick={() => goScreen('cases')}
              />
            )}
            {can('sac.view_demands') && (
              <PulsoCard
                logo="/sac-icon.svg"
                titulo={tx.pulseSac}
                linhas={[
                  { n: pulso.sacAbertas, rotulo: tx.pulseOpen },
                  { n: pulso.sacVencendo, rotulo: tx.pulseDue48, alerta: pulso.sacVencendo > 0 },
                ]}
                onClick={() => goScreen('sac')}
              />
            )}
            <PulsoCard
              iconDuo="chart"
              titulo={tx.pulseMonth}
              linhas={[{ n: pulso.fechados30, rotulo: tx.pulseClosed30 }]}
            />
          </div>
        </div>
      )}

      {/* 3 · MÓDULOS — as portas de entrada. */}
      {myModules.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <SectionLabel>{tx.modulesTitle}</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
            {myModules.map((m) => {
              const info = (tx.mod as Record<string, { name: string; desc: string }>)[m.module]
              return (
                <button
                  key={m.module}
                  onClick={() => goScreen(m.screen)}
                  className="app-card--hover"
                  style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, fontFamily: 'inherit', width: '100%' }}
                >
                  <span style={{ width: 46, height: 46, minWidth: 46, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {m.logo ? (
                      <img src={m.logo} alt="" className="module-logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                    ) : (
                      <DuoIcon name={m.icon} size={23} />
                    )}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 15.5 }}>{info?.name ?? m.module}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.45 }}>{info?.desc ?? ''}</div>
                  </div>
                  <Icon name="chevron" size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16, alignItems: 'start' }} className="ov-grid">
        {/* 4 · Atividade recente */}
        <Card>
          <SectionLabel>{tx.recent}</SectionLabel>
          {!can('admin.view_audit') ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{tx.welcomeMember}</p>
          ) : recent === null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="app-skeleton" style={{ height: 18, borderRadius: 8 }} />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t.common.empty}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recent.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  {/* Inicial de quem agiu — atividade tem rosto, não bolinha. */}
                  <span style={{ width: 28, height: 28, minWidth: 28, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(r.actor_name || '·').trim().charAt(0).toUpperCase()}
                  </span>
                  <span style={{ color: 'var(--heading)', fontSize: 13.5, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <b style={{ fontWeight: 800 }}>{r.actor_name || t.audit.system}</b>{' '}
                    <span style={{ color: 'var(--text)' }}>{(t.audit.act as Record<string, string>)[normAct(r.action)] || r.action}</span>
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 'auto', flexShrink: 0 }}>
                    {new Date(r.created_at).toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Lateral: papéis + ações rápidas + plano (só admin, discreto) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionLabel>{tx.yourRoles}</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ctx.roles.map((r) => (
                <Chip key={r.name} dot={r.color}>{localizeRole(r.name)}</Chip>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {modules.map((m) => (
                <Chip key={m} tone="blue">{t.modules[m as keyof typeof t.modules] ?? m}</Chip>
              ))}
            </div>
          </Card>

          <Card>
            <SectionLabel>{tx.quick}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {can('admin.manage_users') && (
                <QuickAction icon="people" label={tx.quickInvite} onClick={() => goScreen('people')} />
              )}
              {can('admin.manage_roles') && (
                <>
                  <QuickAction icon="channels" label={tx.quickChannel} onClick={() => goScreen('channels')} />
                  <QuickAction icon="flow" label={tx.quickFlow} onClick={() => goScreen('flowbuilder')} />
                  <QuickAction icon="megaphone" label={tx.quickAnnounce} onClick={() => goScreen('announcements')} />
                </>
              )}
              {!can('admin.manage_users') && !can('admin.manage_roles') && (
                <QuickAction icon="cases" label={t.nav.cases} onClick={() => goScreen('cases')} />
              )}
            </div>
          </Card>

          {/* Plano/vagas: informação de administração, não de operação — vive
              pequena, no canto, só para quem administra. */}
          {isAdmin && (
            <Card style={{ padding: '13px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <DuoIcon name="billing" size={17} style={{ color: 'var(--accent)' }} />
                <span style={{ color: 'var(--text)', fontSize: 12.5, flex: 1 }}>
                  <b style={{ color: 'var(--heading)' }}>{ctx.usage.plan_name}</b>
                  {' · '}{ctx.usage.active_users}/{ctx.usage.max_users} {tx.usersShort}
                </span>
                <button type="button" onClick={() => goScreen('billing')} className="app-btn" style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', padding: 0 }}>
                  {tx.planManage}
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

/** Card da fila: o número grande + para onde ele leva. Zerada = mesa limpa. */
function FilaCard({ icon, n, titulo, detalhe, alerta, zerada, onClick }: {
  icon: IconName
  n: number
  titulo: string
  detalhe: string
  alerta?: boolean
  zerada?: boolean
  onClick?: () => void
}) {
  const cor = alerta ? '#ef4444' : 'var(--accent)'
  return (
    <button
      type="button"
      onClick={onClick}
      className={onClick ? 'app-card--hover' : undefined}
      style={{
        textAlign: 'left', cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 14, padding: '18px 18px',
        background: 'var(--surface)', borderRadius: 18, width: '100%',
        border: `1px solid ${alerta ? 'rgba(239,68,68,.5)' : 'var(--border)'}`,
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <span style={{ width: 48, height: 48, minWidth: 48, borderRadius: 15, background: alerta ? 'rgba(239,68,68,.1)' : 'var(--accent-soft)', color: cor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <DuoIcon name={icon} size={23} />
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ color: zerada ? 'var(--text-muted)' : 'var(--heading)', fontWeight: 800, fontSize: 28, lineHeight: 1, letterSpacing: '-.02em' }}>{n}</span>
          <span style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 13.5 }}>{titulo}</span>
        </span>
        <span style={{ display: 'block', color: alerta ? '#ef4444' : 'var(--text-muted)', fontSize: 12, marginTop: 4, fontWeight: alerta ? 700 : 500 }}>
          {detalhe}
        </span>
      </span>
      {onClick && <Icon name="chevron" size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
    </button>
  )
}

/** Card do pulso: um módulo, seus números vivos. */
function PulsoCard({ logo, iconDuo, titulo, linhas, onClick }: {
  logo?: string
  iconDuo?: IconName
  titulo: string
  linhas: { n: number; rotulo: string; alerta?: boolean }[]
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={onClick ? 'app-card--hover' : undefined}
      style={{
        textAlign: 'left', cursor: onClick ? 'pointer' : 'default', fontFamily: 'inherit',
        padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, width: '100%', boxShadow: 'var(--card-shadow)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {logo
          ? <img src={logo} alt="" className="module-logo" style={{ width: 20, height: 20, objectFit: 'contain' }} />
          : iconDuo && <DuoIcon name={iconDuo} size={18} style={{ color: 'var(--accent)' }} />}
        <span style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 13 }}>{titulo}</span>
      </span>
      <span style={{ display: 'flex', gap: 18 }}>
        {linhas.map((l, i) => (
          <span key={i}>
            <span style={{ display: 'block', color: l.alerta ? '#ef4444' : 'var(--heading)', fontWeight: 800, fontSize: 22, lineHeight: 1.05, letterSpacing: '-.02em' }}>{l.n}</span>
            <span style={{ display: 'block', color: l.alerta ? '#ef4444' : 'var(--text-muted)', fontSize: 11.5, marginTop: 3, fontWeight: l.alerta ? 700 : 500 }}>{l.rotulo}</span>
          </span>
        ))}
      </span>
    </button>
  )
}

function QuickAction({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="app-nav-item" style={{ justifyContent: 'space-between' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <DuoIcon name={icon} size={18} />
        {label}
      </span>
      <Icon name="chevron" size={16} />
    </button>
  )
}
