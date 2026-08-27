// Construtor de Fluxo: monta a CADEIA que um relato segue depois de enviado.
// As etapas 1/2/4/5 são trilhos fixos de compliance (Recebido → Triagem →
// … → Resposta → Encerrado). A etapa 3 (Investigação) é configurável: uma
// sequência de sub-etapas, cada uma com operador (papel), observadores, SLA e
// uma condição opcional (ex.: só entra se a gravidade for ≥ Alta).
// Salva em PUT /channels/{id}/flow. Textos triplo idioma via t.flow (+ t.flowSac
// quando o canal escolhido é de SAC).
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../lib/api'
import { localizeRole } from '../../lib/systemNames'
import type { ApiError, ChannelOut, FlowOut, FlowStageIn, MemberRow, RoleOut } from '../../lib/types'
import { useCaps } from '../capabilities'
import { useT } from '../strings'
import { Button, Card, EmptyState, Field, Input, PageHeader, SectionLabel, Select, Skeleton } from '../ui'
import { Icon } from '../icons'

type Draft = FlowStageIn & { key: string; group_index: number }
const SEVS = ['low', 'medium', 'high', 'critical'] as const
const uid = () => Math.random().toString(36).slice(2, 9)

/**
 * Deixa os grupos contíguos (0,1,2…) e joga fora os que ficaram vazios.
 *
 * Roda depois de TODA movimentação. Sem isso, arrastar a última etapa de um
 * grupo deixaria um grupo fantasma no meio do fluxo — e o motor entenderia
 * como "espere um grupo que não tem ninguém", travando a apuração.
 */
export function normalizar(lista: Draft[]): Draft[] {
  const usados = [...new Set(lista.map((s) => s.group_index))].sort((a, b) => a - b)
  const mapa = new Map(usados.map((g, i) => [g, i]))
  return lista
    .map((s) => ({ ...s, group_index: mapa.get(s.group_index) ?? 0 }))
    .sort((a, b) => a.group_index - b.group_index)
}

/** Etapas agrupadas, na ordem de execução. */
export function porGrupo(lista: Draft[]): Draft[][] {
  const total = lista.length ? Math.max(...lista.map((s) => s.group_index)) + 1 : 0
  return Array.from({ length: total }, (_, g) => lista.filter((s) => s.group_index === g))
}

export default function FlowBuilder() {
  const { can } = useCaps()
  const t = useT()

  const [channels, setChannels] = useState<ChannelOut[] | null>(null)
  const [roles, setRoles] = useState<RoleOut[]>([])
  const [members, setMembers] = useState<MemberRow[]>([])
  const [channelId, setChannelId] = useState<string>('')
  // Placeholder até o canal carregar; o efeito de baixo troca pelo nome real.
  const [flowName, setFlowName] = useState('')
  const [mode, setMode] = useState<'sequential' | 'parallel'>('sequential')
  const [closerMembershipId, setCloserMembershipId] = useState<string | null>(null)
  const [closerRoleId, setCloserRoleId] = useState<string | null>(null)
  const [closerRequireSignature, setCloserRequireSignature] = useState(false)
  const [stages, setStages] = useState<Draft[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600) }

  // Canal de denúncia E canal de SAC têm apuração: os dois entram aqui. Isto
  // filtrava `module === 'etica'` e escondia todo canal de SAC — não havia como
  // montar o fluxo de um atendimento.
  //
  // A lista mostra só o que ESTA pessoa configura. Sem o filtro de permissão, o
  // atendente de SAC abria a tela num canal de denúncias que ele não pode
  // editar — ficava tudo cinza sem explicação, e o nome do canal de denúncias
  // vazava para quem não é da ouvidoria. Quem confere de verdade é o backend,
  // por canal (PUT /channels/{id}/flow resolve `{módulo}.build_flow`).
  const flowChannels = useMemo(
    () => (channels ?? []).filter(
      (c) => (c.module === 'etica' || c.module === 'sac') && can(`${c.module}.build_flow`),
    ),
    [channels, can],
  )
  const channel = useMemo(() => flowChannels.find((c) => c.id === channelId) ?? null, [flowChannels, channelId])
  const isSac = channel?.module === 'sac'
  // Textos do módulo do canal ESCOLHIDO: no SAC a cadeia é de uma demanda de
  // consumidor, não de um relato de denúncia. `t.flowSac` só traz o que muda.
  // (Cuidado: o merge é raso — não declarar `sev` lá, senão o objeto inteiro
  // seria substituído e a gravidade voltaria a aparecer como "low"/"high".)
  const tf = isSac ? { ...t.flow, ...t.flowSac } : t.flow
  // Sem canal escolhido não há permissão a checar — e o Skeleton (channels ===
  // null) cobre o carregamento, então isto nunca pisca em read-only.
  const canEdit = !!channel && can(`${channel.module}.build_flow`)
  const roleName = (id: string | null) => roles.find((r) => r.id === id)?.name ?? '—'
  const sevLabel = (s: string) => (t.flow.sev as Record<string, string>)[s] ?? s

  useEffect(() => {
    void api.get<ChannelOut[]>('/channels').then(setChannels).catch(() => setChannels([]))
    void api.get<RoleOut[]>('/roles').then(setRoles).catch(() => {})
    void api.get<MemberRow[]>('/memberships').then((ms) => setMembers(ms.filter((m) => m.status === 'active'))).catch(() => {})
  }, [])

  // Escolhe o primeiro canal — e RE-escolhe se o que estava selecionado sumiu da
  // lista. Só olhar `!channelId` deixava uma seleção fantasma: o <Select> exibia
  // o primeiro canal (o DOM cai nele quando o `value` não casa com opção
  // nenhuma) enquanto a tela inteira continuava carregada com o canal antigo.
  useEffect(() => {
    if (!flowChannels.length) return
    if (!flowChannels.some((c) => c.id === channelId)) setChannelId(flowChannels[0].id)
  }, [flowChannels, channelId])

  // Carrega o fluxo do canal (404 = ainda não configurado → vazio).
  useEffect(() => {
    if (!channelId) return
    setStages(null)
    api.get<FlowOut>(`/channels/${channelId}/flow`)
      .then((f) => {
        setFlowName(f.name || tf.egName)
        setMode(f.mode === 'parallel' ? 'parallel' : 'sequential')
        setCloserMembershipId(f.closer_membership_id ?? null)
        setCloserRoleId(f.closer_role_id ?? null)
        setCloserRequireSignature(!!f.closer_require_signature)
        setStages(normalizar(f.stages.map((s, i) => ({
          key: uid(), name: s.name, operator_role_id: s.operator_role_id,
          operator_membership_id: s.operator_membership_id ?? null,
          // Fluxo salvo antes dos grupos não traz `group_index`. O padrão
          // seguro é UM GRUPO POR ETAPA (sequencial): juntar tudo num grupo só
          // faria o fluxo antigo passar a acionar todo mundo de uma vez.
          group_index: s.group_index ?? (f.mode === 'parallel' ? 0 : i),
          parecer_config: s.parecer_config ?? {},
          require_signature: !!s.require_signature,
          watcher_role_ids: s.watcher_role_ids ?? [], sla_days: s.sla_days,
          is_conditional: s.is_conditional, condition: s.condition,
        }))))
      })
      .catch(() => { setFlowName(tf.egName); setMode('sequential'); setCloserMembershipId(null); setCloserRoleId(null); setCloserRequireSignature(false); setStages([]) })
    // `tf` de propósito fora das dependências: ele só muda junto com o canal, e
    // relistar aqui refaria o GET a cada troca de idioma, jogando fora o que a
    // pessoa tivesse acabado de editar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId])

  const patch = (key: string, p: Partial<Draft>) =>
    setStages((s) => (s ?? []).map((x) => (x.key === key ? { ...x, ...p } : x)))
  /** Etapa nova nasce num grupo SÓ DELA, no fim — o caso mais comum é "mais um
   *  passo depois", não "mais um em paralelo". Juntar é um arrasto. */
  const addStage = (grupo?: number) => setStages((s) => {
    const atual = s ?? []
    const destino = grupo ?? (atual.length ? Math.max(...atual.map((x) => x.group_index)) + 1 : 0)
    return normalizar([...atual, {
      key: uid(), name: '', operator_role_id: null, operator_membership_id: null, parecer_config: {},
      require_signature: false, watcher_role_ids: [], sla_days: 5, is_conditional: false,
      condition: null, group_index: destino,
    }])
  })

  // ── Movimentação entre grupos ──────────────────────────────────
  // `arrastando` é a etapa presa no cursor; `alvo` é o grupo sob ela. O alvo
  // existe só para o realce — sem ele a pessoa solta no escuro.
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [arrastavel, setArrastavel] = useState<string | null>(null)
  // Alvo como CHAVE ("bloco:2", "novo:1") e não como número: as zonas de "novo
  // bloco" aparecem uma abaixo de cada bloco, e com um valor único elas
  // acendiam TODAS ao mesmo tempo — a pessoa não sabia onde ia soltar.
  const [alvo, setAlvo] = useState<string | null>(null)

  /** `dragleave` dispara ao passar por cima de um FILHO da zona, não só ao
   *  sair dela. Sem esta checagem o realce pisca a cada cartão que o cursor
   *  cruza, e a área parece estar recusando o arrasto. */
  const saiuDeVerdade = (e: React.DragEvent) =>
    !e.currentTarget.contains(e.relatedTarget as Node | null)

  const moverPara = (key: string, grupo: number) =>
    setStages((s) => normalizar((s ?? []).map((x) => (x.key === key ? { ...x, group_index: grupo } : x))))

  /** Solta num grupo NOVO, inserido depois de `depoisDe`. Abre espaço somando
   *  1 em todo mundo dali para frente, e a normalização fecha as lacunas. */
  const soltarEmNovoGrupo = (key: string, depoisDe: number) =>
    setStages((s) => normalizar((s ?? []).map((x) => {
      if (x.key === key) return { ...x, group_index: depoisDe + 1 }
      return x.group_index > depoisDe ? { ...x, group_index: x.group_index + 2 } : x
    })))

  /** Alternativa de teclado ao arrasto: sem isto a tela seria inoperável para
   *  quem não usa mouse, e arrastar não tem equivalente acessível nativo. */
  const moverGrupo = (key: string, dir: -1 | 1) => setStages((s) => {
    const atual = s ?? []
    const eu = atual.find((x) => x.key === key)
    if (!eu) return atual
    const destino = eu.group_index + dir
    if (destino < 0) {
      // Subindo do primeiro: cria um grupo ANTES de todos.
      return normalizar(atual.map((x) => (x.key === key ? { ...x, group_index: -1 } : x)))
    }
    return normalizar(atual.map((x) => (x.key === key ? { ...x, group_index: destino } : x)))
  })
  const toggleCfg = (key: string, field: 'decision' | 'rating' | 'urgency') => setStages((s) => (s ?? []).map((x) => {
    if (x.key !== key) return x
    const cfg = { ...(x.parecer_config ?? {}) }
    cfg[field] = !cfg[field]
    return { ...x, parecer_config: cfg }
  }))
  const remove = (key: string) => setStages((s) => (s ?? []).filter((x) => x.key !== key))
  const move = (i: number, dir: -1 | 1) => setStages((s) => {
    const a = [...(s ?? [])]; const j = i + dir
    if (j < 0 || j >= a.length) return a
    ;[a[i], a[j]] = [a[j], a[i]]; return a
  })
  const toggleWatcher = (key: string, rid: string) => setStages((s) => (s ?? []).map((x) => {
    if (x.key !== key) return x
    const has = x.watcher_role_ids.includes(rid)
    return { ...x, watcher_role_ids: has ? x.watcher_role_ids.filter((r) => r !== rid) : [...x.watcher_role_ids, rid] }
  }))

  async function save() {
    if (!channelId || !stages) return
    setBusy(true)
    try {
      const payload = {
        name: flowName.trim() || tf.egName,
        closer_membership_id: closerMembershipId,
        closer_role_id: closerRoleId,
        closer_require_signature: closerRequireSignature,
        // Já vai ordenado por grupo (a normalização ordena), e o servidor grava
        // `order` na sequência recebida — assim a ordem visual e a de execução
        // não podem divergir.
        stages: stages.map((s) => ({
          name: s.name.trim() || t.flow.untitled,
          group_index: s.group_index,
          operator_role_id: s.operator_role_id,
          operator_membership_id: s.operator_membership_id ?? null,
          parecer_config: s.parecer_config ?? {},
          require_signature: !!s.require_signature,
          watcher_role_ids: s.watcher_role_ids,
          sla_days: Number(s.sla_days) || 0,
          is_conditional: s.is_conditional,
          condition: s.is_conditional ? (s.condition ?? { field: 'severity', op: 'gte', value: 'high' }) : null,
        })),
      }
      await api.put(`/channels/${channelId}/flow`, payload)
      flash(t.flow.saved)
    } catch (e) {
      flash((e as ApiError).detail ?? t.flow.saveFail)
    } finally { setBusy(false) }
  }

  const Toast = toast && createPortal(
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--heading)', color: 'var(--surface)', padding: '12px 22px', borderRadius: 100, fontWeight: 700, fontSize: 14, boxShadow: '0 12px 30px rgba(0,0,0,.3)', zIndex: 10002 }}>{toast}</div>,
    document.body,
  )

  if (channels === null) return <div className="app-screen"><Skeleton h={280} r={20} /></div>

  return (
    <div className="app-screen">
      <PageHeader
        title={t.flow.title}
        subtitle={tf.subtitle}
        action={canEdit && channelId && <Button leftIcon="check" onClick={() => void save()} loading={busy}>{t.flow.save}</Button>}
      />

      {flowChannels.length === 0 ? (
        <Card><EmptyState icon="flow" title={t.flow.noChannel} body={t.flow.noChannelBody} /></Card>
      ) : (
        <>
          <Card style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <Field label={t.flow.channel}>
                  <Select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                    {flowChannels.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} · {c.module === 'sac' ? t.fb.kindSac : t.fb.kindEtica}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <Field label={t.flow.flowName}>
                  <Input value={flowName} onChange={(e) => setFlowName(e.target.value)} disabled={!canEdit} placeholder={tf.egName} />
                </Field>
              </div>
            </div>
          </Card>

          {/* Encerrador.
              O seletor "sequencial / paralelo" saiu daqui: quem diz o que roda
              junto e o que roda depois agora é o AGRUPAMENTO das etapas lá
              embaixo. Manter os dois seria ter duas fontes para a mesma
              resposta — e a pessoa nunca saberia qual vence. */}
          <Card style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 240, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Field label={t.flow.closerRole}>
                  <Select value={closerRoleId ?? ''} onChange={(e) => setCloserRoleId(e.target.value || null)} disabled={!canEdit}>
                    <option value="">{t.flow.noRole}</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{localizeRole(r.name)}</option>)}
                  </Select>
                </Field>
                <Field label={t.flow.closerPerson}>
                  <PersonPicker members={members} value={closerMembershipId} onChange={setCloserMembershipId} roleId={closerRoleId} disabled={!canEdit} anyLabel={t.flow.anyOfRole} searchPh={t.flow.searchPerson} noResults={t.flow.noPerson} />
                </Field>
                <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 9, color: 'var(--text)', fontSize: 13.5, cursor: canEdit ? 'pointer' : 'default' }}>
                  <input type="checkbox" checked={closerRequireSignature} disabled={!canEdit} onChange={(e) => setCloserRequireSignature(e.target.checked)} />
                  <Icon name="signature" size={15} />
                  <span style={{ fontWeight: 700 }}>{t.flow.closerRequireSig}</span>
                </label>
              </div>
            </div>
          </Card>

          {/* O trilho "cadeia inteira" (Recebido → Triagem → …) saiu daqui de
              propósito: quatro das cinco caixas eram etapas FIXAS que esta
              tela não controla, e num construtor tudo que aparece parece
              editável — a pessoa procurava onde mexer em "Triagem" e concluía
              que a tela estava quebrada. O construtor mostra só o que ele de
              fato constrói: as sub-etapas da investigação. */}

          {/* Sub-etapas configuráveis da investigação */}
          <SectionLabel>{tf.stages}</SectionLabel>
          {stages === null ? (
            <Skeleton h={160} r={16} />
          ) : stages.length === 0 ? (
            <Card><EmptyState icon="flow" title={t.flow.emptyStages} body={tf.emptyStagesBody}
              action={canEdit && <Button leftIcon="plus" onClick={() => addStage()}>{t.flow.addStage}</Button>} /></Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 14, lineHeight: 1.5 }}>
                {t.flow.groupsHint}
              </p>

              {porGrupo(stages).map((doGrupo, g) => (
                <div key={`g${g}`}>
                  {/* Conector: diz em palavras a regra que o desenho sugere. */}
                  {g > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 10px 6px' }}>
                      <Icon name="chevron" size={16} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{t.flow.waitsAll}</span>
                    </div>
                  )}

                  <div
                    onDragOver={(e) => { if (arrastando) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setAlvo(`bloco:${g}`) } }}
                    onDragLeave={(e) => { if (saiuDeVerdade(e)) setAlvo((a) => (a === `bloco:${g}` ? null : a)) }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (arrastando) moverPara(arrastando, g)
                      setArrastando(null); setAlvo(null)
                    }}
                    style={{
                      border: `2px dashed ${alvo === `bloco:${g}` ? 'var(--accent)' : 'transparent'}`,
                      background: alvo === `bloco:${g}` ? 'var(--accent-soft)' : 'transparent',
                      borderRadius: 18, padding: 8, transition: 'background .15s, border-color .15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingLeft: 4 }}>
                      <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
                        {t.flow.groupLabel(g + 1)}
                      </span>
                      {doGrupo.length > 1 && (
                        <span style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 100, padding: '3px 10px', fontSize: 11.5, fontWeight: 700 }}>
                          {t.flow.together}
                        </span>
                      )}
                    </div>

                    {/* Lado a lado quando há mais de um: é o desenho que faz
                        "ao mesmo tempo" ser lido antes de ser explicado. */}
                    <div style={{ display: 'grid', gridTemplateColumns: doGrupo.length > 1 ? 'repeat(auto-fit, minmax(330px, 1fr))' : '1fr', gap: 14, alignItems: 'start' }}>
                      {doGrupo.map((s) => (
                <Card key={s.key}>
                  <div
                    draggable={canEdit && arrastavel === s.key}
                    onDragStart={(e) => { setArrastando(s.key); e.dataTransfer.effectAllowed = 'move' }}
                    onDragEnd={() => { setArrastando(null); setArrastavel(null); setAlvo(null) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, opacity: arrastando === s.key ? 0.4 : 1 }}
                  >
                    {/* O `draggable` só liga ao segurar a alça. Se o cartão
                        inteiro fosse arrastável, os campos de texto lá dentro
                        parariam de aceitar seleção com o mouse — o navegador
                        entende a seleção como início de arrasto. */}
                    {canEdit && (
                      <span
                        onMouseDown={() => setArrastavel(s.key)}
                        onMouseUp={() => setArrastavel(null)}
                        title={t.flow.dragHandle}
                        aria-hidden="true"
                        style={{ cursor: 'grab', color: 'var(--text-muted)', fontSize: 17, lineHeight: 1, padding: '0 2px', userSelect: 'none' }}
                      >
                        ⠿
                      </span>
                    )}
                    <Input value={s.name} onChange={(e) => patch(s.key, { name: e.target.value })} disabled={!canEdit} placeholder={tf.stageNamePh} style={{ flex: 1 }} />
                    {canEdit && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <IconBtn icon="chevron" title={t.flow.moveGroupUp} flip onClick={() => moverGrupo(s.key, -1)} />
                        <IconBtn icon="chevron" title={t.flow.moveGroupDown} onClick={() => moverGrupo(s.key, 1)} />
                        <IconBtn icon="trash" title={t.common.remove} danger onClick={() => remove(s.key)} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
                    <Field label={t.flow.operator}>
                      <Select value={s.operator_role_id ?? ''} onChange={(e) => patch(s.key, { operator_role_id: e.target.value || null })} disabled={!canEdit}>
                        <option value="">{t.flow.noRole}</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{localizeRole(r.name)}</option>)}
                      </Select>
                    </Field>
                    <Field label={t.flow.operatorPerson}>
                      <PersonPicker members={members} value={s.operator_membership_id ?? null} onChange={(id) => patch(s.key, { operator_membership_id: id })} roleId={s.operator_role_id} disabled={!canEdit} anyLabel={t.flow.anyOfRole} searchPh={t.flow.searchPerson} noResults={t.flow.noPerson} />
                    </Field>
                    <Field label={t.flow.sla}>
                      <Input type="number" min={0} max={365} value={String(s.sla_days)} onChange={(e) => patch(s.key, { sla_days: Number(e.target.value) })} disabled={!canEdit} />
                    </Field>
                  </div>

                  {/* O que essa pessoa faz nesta etapa (além do texto do parecer) */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.flow.doesWhat}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {([['decision', t.flow.cfgDecision], ['rating', t.flow.cfgRating], ['urgency', t.flow.cfgUrgency]] as const).map(([f, label]) => {
                        const on = !!(s.parecer_config ?? {})[f]
                        return (
                          <button key={f} type="button" disabled={!canEdit} onClick={() => toggleCfg(s.key, f)} className="app-btn"
                            style={{ cursor: canEdit ? 'pointer' : 'default', border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-2)', color: on ? 'var(--accent)' : 'var(--text-muted)', borderRadius: 100, padding: '6px 12px', fontSize: 12.5, fontWeight: 700 }}>
                            {on ? '✓ ' : ''}{label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Exigir assinatura digital do avaliador ao concluir esta etapa */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14, color: 'var(--text)', fontSize: 13.5, cursor: canEdit ? 'pointer' : 'default' }}>
                    <input type="checkbox" checked={!!s.require_signature} disabled={!canEdit} onChange={(e) => patch(s.key, { require_signature: e.target.checked })} />
                    <Icon name="signature" size={15} />
                    <span style={{ fontWeight: 700 }}>{t.flow.requireSig}</span>
                  </label>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0 27px', lineHeight: 1.5 }}>{t.flow.requireSigHint}</p>

                  <div style={{ marginTop: 14 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.flow.watchers}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {roles.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>}
                      {roles.map((r) => {
                        const on = s.watcher_role_ids.includes(r.id)
                        return (
                          <button key={r.id} type="button" disabled={!canEdit} onClick={() => toggleWatcher(s.key, r.id)} className="app-btn"
                            style={{ cursor: canEdit ? 'pointer' : 'default', border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`, background: on ? 'var(--accent-soft)' : 'var(--surface-2)', color: on ? 'var(--accent)' : 'var(--text-muted)', borderRadius: 100, padding: '6px 12px', fontSize: 12.5, fontWeight: 700 }}>
                            {on ? '✓ ' : ''}{localizeRole(r.name)}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Condição opcional */}
                  <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: canEdit ? 'pointer' : 'default', color: 'var(--heading)', fontSize: 13.5, fontWeight: 700 }}>
                      <input type="checkbox" checked={s.is_conditional} disabled={!canEdit}
                        onChange={(e) => patch(s.key, { is_conditional: e.target.checked, condition: e.target.checked ? (s.condition ?? { field: 'severity', op: 'gte', value: 'high' }) : null })}
                        style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                      {t.flow.conditional}
                    </label>
                    {s.is_conditional && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t.flow.condPrefix}</span>
                        <Select value={s.condition?.op ?? 'gte'} onChange={(e) => patch(s.key, { condition: { field: 'severity', op: e.target.value, value: s.condition?.value ?? 'high' } })} disabled={!canEdit} style={{ maxWidth: 120 }}>
                          <option value="gte">≥</option>
                          <option value="eq">=</option>
                        </Select>
                        <Select value={s.condition?.value ?? 'high'} onChange={(e) => patch(s.key, { condition: { field: 'severity', op: s.condition?.op ?? 'gte', value: e.target.value } })} disabled={!canEdit} style={{ maxWidth: 160 }}>
                          {SEVS.map((sv) => <option key={sv} value={sv}>{sevLabel(sv)}</option>)}
                        </Select>
                      </div>
                    )}
                  </div>
                </Card>
                      ))}
                    </div>

                    {canEdit && (
                      <button type="button" onClick={() => addStage(g)} className="app-btn"
                        style={{ marginTop: 10, background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-muted)', borderRadius: 12, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
                        + {t.flow.addToGroup}
                      </button>
                    )}
                  </div>

                  {/* Soltar AQUI cria um grupo entre este e o próximo. É o
                      gesto que separa "junto" de "depois" sem abrir menu. */}
                  {canEdit && arrastando && (
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setAlvo(`novo:${g}`) }}
                      onDragLeave={(e) => { if (saiuDeVerdade(e)) setAlvo((a) => (a === `novo:${g}` ? null : a)) }}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (arrastando) soltarEmNovoGrupo(arrastando, g)
                        setArrastando(null); setAlvo(null)
                      }}
                      style={{
                        marginTop: 10, borderRadius: 12, padding: alvo === `novo:${g}` ? '18px 14px' : '10px 14px',
                        textAlign: 'center',
                        border: `2px dashed ${alvo === `novo:${g}` ? 'var(--accent)' : 'var(--border)'}`,
                        background: alvo === `novo:${g}` ? 'var(--accent-soft)' : 'transparent',
                        color: alvo === `novo:${g}` ? 'var(--accent)' : 'var(--text-muted)',
                        fontSize: 12.5, fontWeight: 700,
                        transition: 'padding .12s, background .15s, border-color .15s',
                      }}
                    >
                      {t.flow.dropNewGroup}
                    </div>
                  )}
                </div>
              ))}

              {canEdit && (
                <div style={{ marginTop: 18 }}>
                  <Button variant="ghost" leftIcon="plus" onClick={() => addStage()}>{t.flow.addStage}</Button>
                </div>
              )}
            </div>
          )}

          {/* Salvar também no rodapé (além do topo) */}
          {canEdit && channelId && stages !== null && (
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <Button leftIcon="check" onClick={() => void save()} loading={busy}>{t.flow.save}</Button>
            </div>
          )}
        </>
      )}
      {Toast}
    </div>
  )
}

// Seletor de pessoa com BUSCA (nome/e-mail) e filtro pelo papel escolhido.
function PersonPicker({ members, value, onChange, roleId, disabled, anyLabel, searchPh, noResults }: {
  members: MemberRow[]
  value: string | null
  onChange: (id: string | null) => void
  roleId?: string | null
  disabled?: boolean
  anyLabel: string
  searchPh: string
  noResults: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ('') } }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const label = (m: MemberRow) => m.full_name || m.email || m.invited_email
  const selected = members.find((m) => m.id === value) ?? null
  const term = q.trim().toLowerCase()
  const list = members.filter((m) => {
    if (roleId && !m.roles.some((r) => r.role_id === roleId)) return false
    if (!term) return true
    return `${m.full_name ?? ''} ${m.email ?? ''} ${m.invited_email ?? ''}`.toLowerCase().includes(term)
  })
  const opt: CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 14px', color: selected ? 'var(--heading)' : 'var(--text-muted)', fontSize: 15, fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer', textAlign: 'left' }}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected ? label(selected) : anyLabel}</span>
        <Icon name="chevron" size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: 'rotate(90deg)' }} />
      </button>
      {open && !disabled && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 14px 40px rgba(0,0,0,.22)', overflow: 'hidden' }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPh}
              style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 11px', color: 'var(--heading)', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div className="app-scroll" style={{ maxHeight: 240, overflowY: 'auto' }}>
            <button type="button" className="picker-opt" style={{ ...opt, background: 'none', color: 'var(--text-muted)', fontSize: 13.5 }} onClick={() => { onChange(null); setOpen(false); setQ('') }}>{anyLabel}</button>
            {list.length === 0 && <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>{noResults}</div>}
            {list.map((m) => (
              <button key={m.id} type="button" className="picker-opt" onClick={() => { onChange(m.id); setOpen(false); setQ('') }}
                style={{ ...opt, background: m.id === value ? 'var(--accent-soft)' : 'none' }}>
                <div style={{ color: 'var(--heading)', fontWeight: 600, fontSize: 14 }}>{label(m)}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.email || m.invited_email}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function IconBtn({ icon, danger, flip, disabled, onClick }: { icon: 'chevron' | 'trash'; title: string; danger?: boolean; flip?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="app-btn"
      style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface-2)', color: danger ? '#d9534f' : 'var(--text-muted)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={15} style={flip ? { transform: 'rotate(90deg)' } : (icon === 'chevron' ? { transform: 'rotate(-90deg)' } : undefined)} />
    </button>
  )
}
