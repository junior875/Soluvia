import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { localizeRole } from '../../lib/systemNames'
import type { ModulePermissions, PermissionCatalog } from '../../lib/types'
import { useTranslation } from '../../i18n/LanguageProvider'
import type { Lang } from '../../i18n/translations'
import { Button, Card, Chip, Field, PageHeader, Select, Skeleton } from '../ui'

/** Relatório de acesso efetivo (item 20).
 *
 *  Existe porque o acesso efetivo só era visível UMA pessoa por vez, num modal:
 *  responder "quem, hoje, pode ler os casos do canal X?" exigia abrir vinte
 *  modais e anotar à mão. E a conta é composta — papéis + overrides individuais
 *  + queda em cascata por dependência —, então ela não é legível a partir do
 *  papel: duas pessoas com o MESMO papel podem ter acessos diferentes.
 *
 *  Duas abas (decisão do Eduardo): "por pessoa" e "por canal".
 */

interface CanalDoRelatorio { id: string; name: string; module: string }
interface PapelDoRelatorio {
  role_id: string
  role_name: string
  unrestricted: boolean
  channels: string[]
}
interface LinhaDeAcesso {
  membership_id: string
  nome: string | null
  email: string | null
  status: string
  papeis: PapelDoRelatorio[]
  unrestricted: boolean
  canais: string[]
  permissions: string[]
  overrides: { code: string; grant: boolean }[]
  derrubadas: Record<string, string[]>
}
interface Relatorio { canais: CanalDoRelatorio[]; linhas: LinhaDeAcesso[] }

const I18N: Record<Lang, {
  title: string; subtitle: string
  byPerson: string; byChannel: string
  person: string; roles: string; reach: string; perms: string; tweaks: string
  dropped: string; droppedHint: string
  all: string; none: string
  filterChannel: string; filterModule: string; filterPerm: string
  anyChannel: string; anyModule: string; anyPerm: string
  export: string; empty: string; emptyChannel: string; loadErr: string
  grant: string; revoke: string; status: string; whoReaches: string
  nobody: string; unrestrictedNote: string
}> = {
  pt: {
    title: 'Relatório de acesso',
    subtitle: 'Quem, hoje, alcança o quê — papéis, canais e ajustes individuais numa tela.',
    byPerson: 'Por pessoa', byChannel: 'Por canal',
    person: 'Pessoa', roles: 'Funções', reach: 'Canais alcançados',
    perms: 'Permissões efetivas', tweaks: 'Ajuste individual',
    dropped: 'Caiu por dependência',
    droppedHint: 'Permissão de ação sem a leitura correspondente não vale — e o relatório diz qual leitura faltou.',
    all: 'todos os canais', none: 'nenhum canal',
    filterChannel: 'Canal', filterModule: 'Módulo', filterPerm: 'Permissão',
    anyChannel: 'Todos', anyModule: 'Todos', anyPerm: 'Qualquer',
    export: 'Exportar CSV',
    empty: 'Ninguém com acesso nesta combinação de filtros.',
    emptyChannel: 'Esta empresa ainda não tem canais.',
    loadErr: 'Falha ao carregar o relatório.',
    grant: 'ligada além da função', revoke: 'desligada da função',
    status: 'Situação', whoReaches: 'Quem alcança este canal',
    nobody: 'Ninguém alcança este canal.',
    unrestrictedNote: 'acesso irrestrito (alcança também os canais futuros)',
  },
  en: {
    title: 'Access report',
    subtitle: 'Who reaches what today — roles, channels and individual tweaks on one screen.',
    byPerson: 'By person', byChannel: 'By channel',
    person: 'Person', roles: 'Roles', reach: 'Channels reached',
    perms: 'Effective permissions', tweaks: 'Individual tweak',
    dropped: 'Dropped by dependency',
    droppedHint: 'An action permission without the matching read does not apply — and the report says which read was missing.',
    all: 'all channels', none: 'no channel',
    filterChannel: 'Channel', filterModule: 'Module', filterPerm: 'Permission',
    anyChannel: 'All', anyModule: 'All', anyPerm: 'Any',
    export: 'Export CSV',
    empty: 'Nobody matches these filters.',
    emptyChannel: 'This company has no channels yet.',
    loadErr: 'Failed to load the report.',
    grant: 'switched on beyond the role', revoke: 'switched off from the role',
    status: 'Status', whoReaches: 'Who reaches this channel',
    nobody: 'Nobody reaches this channel.',
    unrestrictedNote: 'unrestricted access (reaches future channels too)',
  },
  es: {
    title: 'Informe de acceso',
    subtitle: 'Quién alcanza qué hoy — roles, canales y ajustes individuales en una pantalla.',
    byPerson: 'Por persona', byChannel: 'Por canal',
    person: 'Persona', roles: 'Roles', reach: 'Canales alcanzados',
    perms: 'Permisos efectivos', tweaks: 'Ajuste individual',
    dropped: 'Cayó por dependencia',
    droppedHint: 'Un permiso de acción sin la lectura correspondiente no vale — y el informe dice qué lectura faltó.',
    all: 'todos los canales', none: 'ningún canal',
    filterChannel: 'Canal', filterModule: 'Módulo', filterPerm: 'Permiso',
    anyChannel: 'Todos', anyModule: 'Todos', anyPerm: 'Cualquiera',
    export: 'Exportar CSV',
    empty: 'Nadie coincide con estos filtros.',
    emptyChannel: 'Esta empresa aún no tiene canales.',
    loadErr: 'Error al cargar el informe.',
    grant: 'activado más allá del rol', revoke: 'quitado del rol',
    status: 'Situación', whoReaches: 'Quién alcanza este canal',
    nobody: 'Nadie alcanza este canal.',
    unrestrictedNote: 'acceso irrestricto (alcanza también los canales futuros)',
  },
}

const NOME = (l: LinhaDeAcesso) => l.nome ?? l.email ?? l.membership_id

/** A pessoa alcança este canal? `unrestricted` alcança qualquer um. */
const alcanca = (l: LinhaDeAcesso, canalId: string) =>
  l.unrestricted || l.canais.includes(canalId)

function baixarCSV(nome: string, linhas: string[][]) {
  // `﻿` (BOM) porque o Excel em português abre CSV sem BOM em Latin-1 e
  // estraga os acentos — o auditor abriria o arquivo e veria "Ã§".
  const csv = '﻿' + linhas
    .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

export default function AccessReport() {
  const { lang } = useTranslation()
  const L = I18N[lang] ?? I18N.pt
  const [dados, setDados] = useState<Relatorio | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aba, setAba] = useState<'pessoa' | 'canal'>('pessoa')
  const [canalFiltro, setCanalFiltro] = useState('')
  const [moduloFiltro, setModuloFiltro] = useState('')
  const [permFiltro, setPermFiltro] = useState('')
  const [catalogo, setCatalogo] = useState<ModulePermissions[]>([])

  useEffect(() => {
    api.get<Relatorio>('/memberships/effective-access')
      .then(setDados)
      .catch(() => setErro(L.loadErr))
    api.get<PermissionCatalog>('/permissions').then((c) => setCatalogo(c.modules)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canais = dados?.canais ?? []
  const modulos = useMemo(() => [...new Set(canais.map((c) => c.module))], [canais])
  const rotuloDaPerm = useMemo(() => {
    const m = new Map<string, string>()
    catalogo.forEach((mod) => mod.permissions.forEach((p) => m.set(p.code, p.label)))
    return m
  }, [catalogo])

  const canaisVisiveis = canais.filter(
    (c) => (!canalFiltro || c.id === canalFiltro) && (!moduloFiltro || c.module === moduloFiltro),
  )

  /** Linhas que sobrevivem aos filtros (os mesmos nas duas abas). */
  const linhas = (dados?.linhas ?? []).filter((l) => {
    if (permFiltro && !l.permissions.includes(permFiltro)) return false
    if (canalFiltro && !alcanca(l, canalFiltro)) return false
    if (moduloFiltro) {
      const doModulo = canais.filter((c) => c.module === moduloFiltro)
      if (!l.unrestricted && !doModulo.some((c) => l.canais.includes(c.id))) return false
    }
    return true
  })

  const nomeDoCanal = (id: string) => canais.find((c) => c.id === id)?.name ?? id

  function exportar() {
    if (aba === 'pessoa') {
      baixarCSV('acesso-por-pessoa.csv', [
        [L.person, 'E-mail', L.status, L.roles, L.reach, L.tweaks, L.perms, L.dropped],
        ...linhas.map((l) => [
          NOME(l), l.email ?? '', l.status,
          l.papeis.map((p) => localizeRole(p.role_name)).join(' | '),
          l.unrestricted ? L.all : (l.canais.map(nomeDoCanal).join(' | ') || L.none),
          l.overrides.map((o) => `${o.code} (${o.grant ? '+' : '-'})`).join(' | '),
          l.permissions.join(' | '),
          Object.entries(l.derrubadas).map(([c, deps]) => `${c} <- ${deps.join(',')}`).join(' | '),
        ]),
      ])
      return
    }
    baixarCSV('acesso-por-canal.csv', [
      [L.filterChannel, L.filterModule, L.person, 'E-mail', L.roles, L.perms],
      ...canaisVisiveis.flatMap((c) =>
        linhas.filter((l) => alcanca(l, c.id)).map((l) => [
          c.name, c.module, NOME(l), l.email ?? '',
          l.papeis.map((p) => localizeRole(p.role_name)).join(' | '),
          l.permissions.join(' | '),
        ]),
      ),
    ])
  }

  const tab = (ativa: boolean) => ({
    padding: '8px 16px', borderRadius: 100, fontSize: 13.5, fontWeight: 700,
    cursor: 'pointer', border: `1px solid ${ativa ? 'var(--accent-border)' : 'var(--border)'}`,
    background: ativa ? 'var(--accent-soft)' : 'var(--surface-2)',
    color: ativa ? 'var(--accent)' : 'var(--text)',
  })

  return (
    <div className="app-screen">
      <PageHeader
        title={L.title}
        subtitle={L.subtitle}
        action={<Button leftIcon="download" variant="ghost" onClick={exportar}>{L.export}</Button>}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <button style={tab(aba === 'pessoa')} className="app-btn" onClick={() => setAba('pessoa')}>{L.byPerson}</button>
        <button style={tab(aba === 'canal')} className="app-btn" onClick={() => setAba('canal')}>{L.byChannel}</button>
      </div>

      <Card padding={14}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 190 }}>
            <Field label={L.filterChannel}>
              <Select value={canalFiltro} onChange={(e) => setCanalFiltro(e.target.value)}>
                <option value="">{L.anyChannel}</option>
                {canais.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <div style={{ minWidth: 150 }}>
            <Field label={L.filterModule}>
              <Select value={moduloFiltro} onChange={(e) => setModuloFiltro(e.target.value)}>
                <option value="">{L.anyModule}</option>
                {modulos.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
          </div>
          <div style={{ minWidth: 230, flex: 1 }}>
            <Field label={L.filterPerm}>
              <Select value={permFiltro} onChange={(e) => setPermFiltro(e.target.value)}>
                <option value="">{L.anyPerm}</option>
                {catalogo.map((mod) => (
                  <optgroup key={mod.module} label={mod.module}>
                    {mod.permissions.map((p) => (
                      <option key={p.code} value={p.code}>{p.label}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      {erro && (
        <div style={{ marginTop: 14, background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.4)', color: '#fca5a5', borderRadius: 12, padding: '10px 14px', fontSize: 13.5 }}>{erro}</div>
      )}

      {dados === null && !erro && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} h={64} r={14} />)}
        </div>
      )}

      {dados !== null && aba === 'pessoa' && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {linhas.length === 0 && <Card padding={18}><span style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{L.empty}</span></Card>}
          {linhas.map((l) => (
            <Card key={l.membership_id} padding={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <strong style={{ color: 'var(--heading)', fontSize: 14.5 }}>{NOME(l)}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{l.email}</span>
                <Chip tone="muted">{l.status}</Chip>
                {l.papeis.map((p) => <Chip key={p.role_id} tone="blue">{localizeRole(p.role_name)}</Chip>)}
                {l.overrides.length > 0 && <Chip tone="accent">{L.tweaks}</Chip>}
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{L.reach}: </span>
                {l.unrestricted ? (
                  <span title={L.unrestrictedNote}><Chip tone="navy">{L.all}</Chip></span>
                ) : l.canais.length === 0 ? (
                  <Chip tone="muted">{L.none}</Chip>
                ) : (
                  <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                    {l.canais.map((c) => <Chip key={c} tone="green">{nomeDoCanal(c)}</Chip>)}
                  </span>
                )}
              </div>

              {l.overrides.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{L.tweaks}: </span>
                  {l.overrides.map((o) => (
                    <span key={o.code} style={{ marginRight: 10 }}>
                      {rotuloDaPerm.get(o.code) ?? o.code} — {o.grant ? L.grant : L.revoke}
                    </span>
                  ))}
                </div>
              )}

              {Object.keys(l.derrubadas).length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--text-muted)' }} title={L.droppedHint}>
                  {L.dropped}: {Object.entries(l.derrubadas).map(([code, deps]) => (
                    <span key={code} style={{ marginRight: 10 }}>
                      {rotuloDaPerm.get(code) ?? code} ← {deps.map((d) => rotuloDaPerm.get(d) ?? d).join(', ')}
                    </span>
                  ))}
                </div>
              )}

              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12.5 }}>
                  {L.perms} ({l.permissions.length})
                </summary>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {l.permissions.map((p) => (
                    <Chip key={p} tone="muted">{rotuloDaPerm.get(p) ?? p}</Chip>
                  ))}
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}

      {dados !== null && aba === 'canal' && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {canaisVisiveis.length === 0 && <Card padding={18}><span style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>{L.emptyChannel}</span></Card>}
          {canaisVisiveis.map((c) => {
            const quem = linhas.filter((l) => alcanca(l, c.id))
            return (
              <Card key={c.id} padding={16}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--heading)', fontSize: 14.5 }}>{c.name}</strong>
                  <Chip tone="muted">{c.module}</Chip>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{L.whoReaches}: {quem.length}</span>
                </div>
                {quem.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '10px 0 0' }}>{L.nobody}</p>
                ) : (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {quem.map((l) => (
                      <div key={l.membership_id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}>{NOME(l)}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{l.email}</span>
                        {l.papeis.map((p) => <Chip key={p.role_id} tone="blue">{localizeRole(p.role_name)}</Chip>)}
                        {l.unrestricted && <span title={L.unrestrictedNote}><Chip tone="navy">{L.all}</Chip></span>}
                        {l.overrides.length > 0 && <Chip tone="accent">{L.tweaks}</Chip>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
