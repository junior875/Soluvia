// Construtor de Fluxo: monta a CADEIA que um relato segue depois de enviado.
// As etapas 1/2/4/5 são trilhos fixos de compliance (Recebido → Triagem →
// … → Resposta → Encerrado). A etapa 3 (Investigação) é configurável: uma
// sequência de sub-etapas, cada uma com operador (papel), observadores, SLA e
// uma condição opcional (ex.: só entra se a gravidade for ≥ Alta).
// Salva em PUT /channels/{id}/flow. Textos triplo idioma via t.flow (+ t.flowSac
// quando o canal escolhido é de SAC).
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../lib/api'
import { KIND_VISUAL, kindDoConfig } from '../../lib/flowKinds'
import { templatesDoModulo, type FlowTemplate } from '../../lib/flowTemplates'
import { localizeRole } from '../../lib/systemNames'
import { STAGE_KINDS } from '../../lib/types'
import type { ApiError, ChannelOut, FlowOut, FlowStageIn, MemberRow, RoleOut, StageKind } from '../../lib/types'
import { useCaps } from '../capabilities'
import { useT } from '../strings'
import { useTranslation } from '../../i18n/LanguageProvider'
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, SectionLabel, Select, Skeleton } from '../ui'
import { Icon } from '../icons'
import FlowCanvas, { KEY_ENCERRAMENTO } from './FlowCanvas'
import FlowAgentChat, { type ChatMsg, type ChatSummary } from './FlowAgentChat'

/** O bloco na forma que a API do agente fala (ids). */
type FlowAIStageState = {
  name: string
  kind: StageKind
  group_index: number
  operator_role_id: string | null
  operator_membership_id: string | null
  watcher_all: boolean
  watcher_role_ids: string[]
  watcher_membership_ids: string[]
  sla_hours: number
  require_signature: boolean
}

type FlowAIState = {
  name: string
  closer_role_id: string | null
  closer_membership_id: string | null
  stages: FlowAIStageState[]
}

type FlowAIReply = {
  chat_id: string
  message: string
  missing: string[]
  warnings: string[]
  rejected: string[]
  applied_ops: number
  flow: FlowAIState
  usage: { input_tokens: number; output_tokens: number }
}

// `kind` obrigatório no rascunho (e opcional no contrato): dentro da tela todo
// bloco TEM um tipo, e deixá-lo opcional aqui espalharia `?? 'decisao'` por
// cada lugar que desenha ou salva. `sla_hours` é a ÚNICA fonte do prazo no
// rascunho (dias viram horas no carregamento) — duas fontes divergem.
type Draft = FlowStageIn & {
  key: string
  group_index: number
  kind: StageKind
  watcher_all: boolean
  watcher_membership_ids: string[]
  sla_hours: number
}

/** Prazo legível: 48h vira "2 d", 36h fica "36 h". */
export function prazoLegivel(horas: number): { valor: number; unidade: 'h' | 'd' } {
  if (horas >= 24 && horas % 24 === 0) return { valor: horas / 24, unidade: 'd' }
  return { valor: horas, unidade: 'h' }
}
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

/**
 * Ligação porta→bloco: o alvo passa a vir DEPOIS da origem.
 * Se já vem depois, nada muda — a ligação desenhada já existe.
 */
export function aplicarLigacao(lista: Draft[], deKey: string, paraKey: string): Draft[] {
  const de = lista.find((x) => x.key === deKey)
  const para = lista.find((x) => x.key === paraKey)
  if (!de || !para || para.group_index > de.group_index) return lista
  return normalizar(lista.map((x) => (x.key === paraKey ? { ...x, group_index: de.group_index + 1 } : x)))
}

/** Porta solta no vazio: nasce um passo novo logo depois da origem. */
export function inserirApos(lista: Draft[], deKey: string, novo: Draft): Draft[] {
  const de = lista.find((x) => x.key === deKey)
  if (!de) return lista
  const g = de.group_index
  const empurrados = lista.map((x) => (x.group_index > g ? { ...x, group_index: x.group_index + 2 } : x))
  return normalizar([...empurrados, { ...novo, group_index: g + 1 }])
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
  // O agente responde no idioma da tela — quem monta em espanhol não pode
  // receber os blocos nomeados em português.
  const { lang } = useTranslation()
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
          // Fluxo salvo antes dos tipos vem sem `kind`: deduz do que a etapa
          // pedia, para o painel não abrir mostrando um tipo que ninguém
          // escolheu (e que seria salvo por cima no próximo salvar).
          kind: s.kind ?? kindDoConfig(s.parecer_config),
          parecer_config: s.parecer_config ?? {},
          require_signature: !!s.require_signature,
          watcher_all: !!s.watcher_all,
          watcher_role_ids: s.watcher_role_ids ?? [],
          watcher_membership_ids: s.watcher_membership_ids ?? [],
          sla_days: s.sla_days,
          // Fluxo antigo só tem dias: vira horas aqui, uma vez, e o rascunho
          // inteiro fala uma língua só.
          sla_hours: s.sla_hours ?? (s.sla_days || 0) * 24,
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
   *  passo depois", não "mais um em paralelo". Juntar é um arrasto.
   *
   *  Já nasce SELECIONADA: o painel abre na hora, porque a primeira coisa a
   *  fazer num bloco novo é dizer quem responde — sem isso ele não faz nada. */
  const addStage = (grupo?: number) => {
    const key = uid()
    setStages((s) => {
      const atual = s ?? []
      const destino = grupo ?? (atual.length ? Math.max(...atual.map((x) => x.group_index)) + 1 : 0)
      return normalizar([...atual, {
        key, name: '', kind: 'decisao', operator_role_id: null, operator_membership_id: null, parecer_config: {},
        require_signature: false, watcher_all: false, watcher_role_ids: [], watcher_membership_ids: [],
        sla_days: 5, sla_hours: 120, is_conditional: false,
        condition: null, group_index: destino,
      }])
    })
    setSelecionado(key)
  }

  // ── Seleção e movimentação ─────────────────────────────────────
  // Bloco aberto para configuração (painel lateral). O arrasto vive no canvas.
  const [selecionado, setSelecionado] = useState<string | null>(null)

  // Se o bloco aberto foi apagado, fecha o painel — sem auto-abrir nada: o
  // painel só aparece quando a pessoa clica, senão ele cobre o desenho logo
  // na chegada.
  useEffect(() => {
    // O ENCERRAMENTO não é uma etapa, então nunca está em `stages` — sem esta
    // exceção o painel dele fechava no mesmo instante em que abria.
    if (selecionado === KEY_ENCERRAMENTO) return
    if (selecionado && !stages?.some((s) => s.key === selecionado)) setSelecionado(null)
  }, [stages, selecionado])

  // ESC fecha o painel de configuração — o gesto universal de "sai daqui".
  useEffect(() => {
    if (!selecionado) return
    const fechar = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelecionado(null) }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [selecionado])

  const moverPara = (key: string, grupo: number) =>
    setStages((s) => normalizar((s ?? []).map((x) => (x.key === key ? { ...x, group_index: grupo } : x))))

  /** Solta num grupo NOVO, inserido depois de `depoisDe`. Abre espaço somando
   *  1 em todo mundo dali para frente, e a normalização fecha as lacunas. */
  const soltarEmNovoGrupo = (key: string, depoisDe: number) =>
    setStages((s) => normalizar((s ?? []).map((x) => {
      if (x.key === key) return { ...x, group_index: depoisDe + 1 }
      return x.group_index > depoisDe ? { ...x, group_index: x.group_index + 2 } : x
    })))

  const ligar = (deKey: string, paraKey: string) =>
    setStages((s) => aplicarLigacao(s ?? [], deKey, paraKey))

  /** Porta solta no vazio: cria um passo novo logo depois da origem, já
   *  ligado — o gesto do n8n de "puxa e nasce o próximo". Abre o painel do
   *  recém-criado, porque a primeira coisa a fazer nele é dizer quem responde. */
  const criarApos = (deKey: string) => {
    const key = uid()
    setStages((s) => inserirApos(s ?? [], deKey, {
      key, name: '', kind: 'decisao', operator_role_id: null, operator_membership_id: null, parecer_config: {},
      require_signature: false, watcher_all: false, watcher_role_ids: [], watcher_membership_ids: [],
      sla_days: 5, sla_hours: 120, is_conditional: false,
      condition: null, group_index: 0,
    }))
    setSelecionado(key)
  }

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
  // ── Modelos prontos ────────────────────────────────────────────
  const [tplAberto, setTplAberto] = useState(false)

  // Unidade do prazo POR BLOCO (h/d) — só apresentação; o rascunho guarda horas.
  const [slaUnit, setSlaUnit] = useState<Record<string, 'h' | 'd'>>({})

  // ── Modo IA ────────────────────────────────────────────────────
  // Mesma ideia do Form Builder: "montar na mão" e "montar com IA" são duas
  // portas para o MESMO desenho. O que o agente propõe cai no canvas, e dali
  // em diante é edição manual como qualquer outra — nada é salvo por ele.
  const [builderMode, setBuilderMode] = useState<'manual' | 'ai'>('manual')
  const [aiMsgs, setAiMsgs] = useState<ChatMsg[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiChats, setAiChats] = useState<ChatSummary[]>([])
  const [aiChatId, setAiChatId] = useState<string | null>(null)
  const [aiMissing, setAiMissing] = useState<string[]>([])
  const [aiWarnings, setAiWarnings] = useState<string[]>([])
  const [aiRejected, setAiRejected] = useState<string[]>([])
  /** O desenho de ANTES do último turno com ops — é o que "Desfazer" restaura.
   *  Auto-aplicar sem desfazer seria trocar um defeito ("nada muda") por outro
   *  ("mudou e eu não queria"). */
  const [aiUndo, setAiUndo] = useState<{
    stages: Draft[]; name: string; closerRole: string | null; closerMembership: string | null
  } | null>(null)

  const recarregarChats = useCallback(async (cid: string) => {
    try {
      const r = await api.get<{ chats: ChatSummary[] }>(`/channels/${cid}/flow/ai/chats`)
      setAiChats(r.chats)
    } catch { setAiChats([]) }
  }, [])

  // Ao entrar no modo IA (ou trocar de canal), reabre a conversa onde parou.
  // Só então: o histórico é uma chamada a mais, e quem monta na mão nunca a usa.
  useEffect(() => {
    if (builderMode !== 'ai' || !channelId) return
    let vivo = true
    api.get<{ chat_id: string | null; messages: { role: string; content: string }[] }>(
      `/channels/${channelId}/flow/ai/history`,
    ).then((h) => {
      if (!vivo) return
      setAiChatId(h.chat_id)
      setAiMsgs(h.messages.map((m) => ({
        role: m.role === 'user' ? 'you' : 'ai', content: m.content,
      })))
    }).catch(() => { if (vivo) { setAiChatId(null); setAiMsgs([]) } })
    void recarregarChats(channelId)
    return () => { vivo = false }
  }, [builderMode, channelId, recarregarChats])

  /** O canvas como está, na língua da API do agente. É o que faz o agente
   *  responder sobre a TELA — a memória dele deixa de ser a fonte. */
  const estadoAtual = useCallback((): FlowAIState => ({
    name: flowName.trim() || tf.egName,
    closer_role_id: closerRoleId,
    closer_membership_id: closerMembershipId,
    stages: (stages ?? []).map((s) => ({
      name: s.name,
      kind: s.kind,
      group_index: s.group_index,
      operator_role_id: s.operator_role_id,
      operator_membership_id: s.operator_membership_id ?? null,
      watcher_all: s.watcher_all,
      watcher_role_ids: s.watcher_role_ids,
      watcher_membership_ids: s.watcher_membership_ids,
      sla_hours: s.sla_hours,
      require_signature: !!s.require_signature,
    })),
  }), [stages, flowName, closerRoleId, closerMembershipId, tf.egName])

  async function enviarIA(texto?: string) {
    const message = (texto ?? aiInput).trim()
    if (!message || !channelId || aiBusy) return
    setAiInput('')
    setAiMsgs((m) => [...m, { role: 'you', content: message }])
    setAiBusy(true)
    try {
      const r = await api.post<FlowAIReply>(`/channels/${channelId}/flow/ai`, {
        message, lang, chat_id: aiChatId, flow: estadoAtual(),
      })
      setAiChatId(r.chat_id)
      setAiMsgs((m) => [...m, { role: 'ai', content: r.message }])
      setAiMissing(r.missing)
      setAiWarnings(r.warnings)
      setAiRejected(r.rejected)
      // AUTO-APLICA quando houve operação: a resposta É o novo desenho. O
      // estado anterior vai para o Desfazer — mudar sem rede é tão ruim
      // quanto não mudar.
      if (r.applied_ops > 0 && stages !== null) {
        setAiUndo({
          stages, name: flowName, closerRole: closerRoleId, closerMembership: closerMembershipId,
        })
        setFlowName(r.flow.name || tf.egName)
        setCloserRoleId(r.flow.closer_role_id)
        setCloserMembershipId(r.flow.closer_membership_id)
        setStages(normalizar(r.flow.stages.map((s) => ({
          key: uid(),
          name: s.name,
          kind: s.kind,
          group_index: s.group_index,
          operator_role_id: s.operator_role_id,
          operator_membership_id: s.operator_membership_id,
          parecer_config: {},
          require_signature: s.require_signature,
          watcher_all: s.watcher_all,
          watcher_role_ids: s.watcher_role_ids,
          watcher_membership_ids: s.watcher_membership_ids,
          sla_days: Math.max(0, Math.round(s.sla_hours / 24)),
          sla_hours: s.sla_hours,
          is_conditional: false,
          condition: null,
        }))))
        setSelecionado(null)
      }
      void recarregarChats(channelId)
    } catch (e) {
      setAiMsgs((m) => [...m, { role: 'ai', content: (e as ApiError).detail ?? t.flow.ai.fail }])
    } finally { setAiBusy(false) }
  }

  /** Volta o canvas para antes do último turno com operações. */
  function desfazerIA() {
    if (!aiUndo) return
    setStages(aiUndo.stages)
    setFlowName(aiUndo.name)
    setCloserRoleId(aiUndo.closerRole)
    setCloserMembershipId(aiUndo.closerMembership)
    setAiUndo(null)
    flash(t.flow.ai.undone)
  }

  function abrirChat(id: string) {
    if (!channelId || id === aiChatId) return
    setAiMsgs([]); setAiChatId(id); setAiMissing([]); setAiWarnings([]); setAiRejected([])
    api.get<{ messages: { role: string; content: string }[] }>(
      `/channels/${channelId}/flow/ai/history?chat_id=${id}`,
    ).then((h) => setAiMsgs(h.messages.map((m) => ({
      role: m.role === 'user' ? 'you' : 'ai', content: m.content,
    })))).catch(() => setAiMsgs([]))
  }

  function novoChat() {
    setAiChatId(null); setAiMsgs([]); setAiMissing([]); setAiWarnings([]); setAiRejected([])
  }

  async function apagarChat(id: string) {
    if (!channelId) return
    try { await api.delete(`/channels/${channelId}/flow/ai/chats/${id}`) } catch { /* já sumiu */ }
    if (id === aiChatId) novoChat()
    void recarregarChats(channelId)
  }

  // ── Pendências SEMPRE visíveis (manual e IA) ───────────────────
  // "esses atributos você não preencheu, quer preencher?" — clicável: cada
  // pendência abre o painel do bloco a que se refere.
  const pendentes = useMemo(() => {
    const lista: { key: string | null; texto: string }[] = []
    for (const s of stages ?? []) {
      if (!s.operator_role_id && !s.operator_membership_id) {
        lista.push({ key: s.key, texto: t.flow.pendingOwner(s.name.trim() || t.flow.untitled) })
      }
    }
    if (!closerRoleId && !closerMembershipId) {
      lista.push({ key: KEY_ENCERRAMENTO, texto: t.flow.pendingCloser })
    }
    return lista
  }, [stages, closerRoleId, closerMembershipId, t.flow])

  /** Aplica um modelo: substitui o DESENHO e deixa os responsáveis em branco.
   *
   *  Preencher responsável seria adivinhar — e um fluxo com a pessoa errada
   *  designada é pior do que um fluxo sem ninguém, porque ninguém percebe.
   *  Não salva: a pessoa vê o resultado, ajusta e decide. */
  const aplicarTemplate = (tpl: FlowTemplate) => {
    const nomes = t.flow.templates[tpl.id as keyof typeof t.flow.templates]
    setStages(normalizar(tpl.stages.map((s) => ({
      key: uid(),
      name: (nomes.stages as Record<string, string>)[s.key] ?? s.key,
      kind: s.kind,
      group_index: s.group_index,
      operator_role_id: null,
      operator_membership_id: null,
      parecer_config: {},
      require_signature: false,
      watcher_all: false,
      watcher_role_ids: [],
      watcher_membership_ids: [],
      sla_days: s.sla_days,
      sla_hours: s.sla_days * 24,
      is_conditional: false,
      condition: null,
    }))))
    setSelecionado(null)
    setTplAberto(false)
    flash(t.flow.tplApplied)
  }

  /** Troca o tipo do bloco. É EXCLUSIVO: um bloco faz uma coisa, e é o tipo
   *  que decide o formulário que o designado vai ver. Os interruptores antigos
   *  deixavam somar tudo, e o resultado era um formulário genérico que servia
   *  mal para os dois lados. */
  const setKind = (key: string, kind: StageKind) =>
    setStages((s) => (s ?? []).map((x) => (x.key === key ? { ...x, kind } : x)))
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
          kind: s.kind,
          operator_role_id: s.operator_role_id,
          operator_membership_id: s.operator_membership_id ?? null,
          parecer_config: s.parecer_config ?? {},
          require_signature: !!s.require_signature,
          watcher_all: !!s.watcher_all,
          watcher_role_ids: s.watcher_role_ids,
          watcher_membership_ids: s.watcher_membership_ids,
          // Horas mandam; dias vão junto arredondados por compatibilidade.
          sla_hours: Math.max(0, Math.round(Number(s.sla_hours) || 0)) || null,
          sla_days: Math.max(0, Math.round((Number(s.sla_hours) || 0) / 24)),
          // A etapa condicional saiu do produto: sempre desligada.
          is_conditional: false,
          condition: null,
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
        action={canEdit && channelId && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="ghost" leftIcon="spark" onClick={() => setTplAberto(true)}>{t.flow.tplButton}</Button>
            <Button leftIcon="check" onClick={() => void save()} loading={busy}>{t.flow.save}</Button>
          </div>
        )}
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

          {/* O card do encerrador saiu daqui: ele virou o último BLOCO do
              desenho, e sua configuração abre no mesmo painel lateral das
              etapas. Um só lugar para dizer "quem faz o quê, e quando".
              O seletor "sequencial / paralelo" também saiu — quem responde
              isso agora é a posição dos blocos no canvas. */}

          {/* O trilho "cadeia inteira" (Recebido → Triagem → …) saiu daqui de
              propósito: quatro das cinco caixas eram etapas FIXAS que esta
              tela não controla, e num construtor tudo que aparece parece
              editável — a pessoa procurava onde mexer em "Triagem" e concluía
              que a tela estava quebrada. O construtor mostra só o que ele de
              fato constrói: as sub-etapas da investigação. */}

          {/* Montar na mão OU conversando com o agente. São duas portas para o
              MESMO desenho: o que a IA propõe cai no canvas e vira edição
              manual como qualquer outra. */}
          {canEdit && (
            <div style={{ display: 'inline-flex', background: 'var(--surface-2)', borderRadius: 100, padding: 4, marginBottom: 16 }}>
              {(['manual', 'ai'] as const).map((m) => (
                <button
                  key={m} onClick={() => setBuilderMode(m)} className="app-btn"
                  style={{ border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 100, fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, background: builderMode === m ? 'var(--accent)' : 'transparent', color: builderMode === m ? '#fff' : 'var(--text-muted)' }}
                >
                  {m === 'ai' && <Icon name="spark" size={14} />}{t.flow.buildMode[m]}
                </button>
              ))}
            </div>
          )}

          {builderMode === 'ai' && canEdit && (
            <div style={{ marginBottom: 18 }}>
              <FlowAgentChat
                msgs={aiMsgs} busy={aiBusy} input={aiInput} setInput={setAiInput}
                onSend={(txt) => void enviarIA(txt)}
                agentModule={channel?.module ?? 'etica'}
                chats={aiChats} chatId={aiChatId}
                onOpenChat={abrirChat} onNewChat={novoChat} onDeleteChat={(id) => void apagarChat(id)}
                missing={aiMissing}
                warnings={aiWarnings}
                rejected={aiRejected}
                canUndo={aiUndo !== null}
                onUndo={desfazerIA}
              />
            </div>
          )}

          {/* PENDÊNCIAS — sempre visíveis, no manual e na IA. Cada uma abre o
              painel do bloco a que se refere: apontar sem levar até lá é
              transferir o trabalho de procurar para quem leu o aviso. */}
          {pendentes.length > 0 && (stages?.length ?? 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14, border: '1px solid #d97706', background: 'rgba(217,119,6,.07)', borderRadius: 14, padding: '10px 14px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#d97706', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                <Icon name="bell" size={13} /> {t.flow.pendingTitle}
              </span>
              {pendentes.map((p, i) => (
                <button
                  key={i} type="button" className="app-btn"
                  onClick={() => setSelecionado(p.key)}
                  style={{ cursor: 'pointer', border: '1px solid #d97706', background: 'var(--surface)', color: 'var(--text)', borderRadius: 100, padding: '5px 12px', fontSize: 12.5, fontWeight: 600 }}
                >
                  {p.texto}
                </button>
              ))}
            </div>
          )}

          {/* Sub-etapas configuráveis da investigação */}
          <SectionLabel>{tf.stages}</SectionLabel>
          {stages === null ? (
            <Skeleton h={160} r={16} />
          ) : stages.length === 0 ? (
            <Card><EmptyState icon="flow" title={t.flow.emptyStages} body={tf.emptyStagesBody}
              action={canEdit && <Button leftIcon="plus" onClick={() => addStage()}>{t.flow.addStage}</Button>} /></Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* ÁREA DE TRABALHO. A configuração NÃO fica embaixo: clicar num
                  bloco abre o painel lateral — o desenho continua visível
                  enquanto se configura, como nos editores de nós. */}
              <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>
                {t.flow.canvasHint}
              </p>
              {/* O scroll agora vive DENTRO do FlowCanvas (o pan precisa dele). */}
              <div>
                <FlowCanvas
                  nos={stages.map((s) => ({
                    key: s.key,
                    name: s.name,
                    group_index: s.group_index,
                    quem: s.operator_membership_id
                      ? (members.find((m) => m.id === s.operator_membership_id)?.full_name
                         ?? members.find((m) => m.id === s.operator_membership_id)?.email ?? '')
                      : (s.operator_role_id ? localizeRole(roleName(s.operator_role_id)) : ''),
                    kind: s.kind,
                    kindLabel: t.flow.kinds[s.kind],
                  }))}
                  selecionado={selecionado}
                  canEdit={canEdit}
                  encerrador={{
                    quem: closerMembershipId
                      ? (members.find((m) => m.id === closerMembershipId)?.full_name
                         ?? members.find((m) => m.id === closerMembershipId)?.email ?? '')
                      : (closerRoleId ? localizeRole(roleName(closerRoleId)) : ''),
                  }}
                  textos={{
                    together: t.flow.together,
                    emptyName: t.flow.untitled,
                    noOne: t.flow.noRole,
                    addHere: t.flow.addToGroup,
                    newColumn: t.flow.newColumn,
                    remove: t.common.remove,
                    closer: t.flow.closer,
                    closerHint: t.flow.closerPanelHint,
                  }}
                  onSelecionar={setSelecionado}
                  onMoverParaColuna={moverPara}
                  onNovaColunaDepois={soltarEmNovoGrupo}
                  onLigar={ligar}
                  onCriarApos={criarApos}
                  onAdicionar={(c) => addStage(c)}
                  onRemover={remove}
                />
              </div>

              {/* PAINEL do ENCERRAMENTO — mesmo painel, outro conteúdo. */}
              {selecionado === KEY_ENCERRAMENTO && (
                <Painel titulo={t.flow.closer} etiqueta={t.flow.closerTag} onFechar={() => setSelecionado(null)}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 14, lineHeight: 1.5 }}>
                    {t.flow.closerPanelHint}
                  </p>
                  <div style={{ display: 'grid', gap: 14 }}>
                    <Field label={t.flow.closerRole}>
                      <Select value={closerRoleId ?? ''} onChange={(e) => setCloserRoleId(e.target.value || null)} disabled={!canEdit}>
                        <option value="">{t.flow.noRole}</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{localizeRole(r.name)}</option>)}
                      </Select>
                    </Field>
                    <Field label={t.flow.closerPerson}>
                      <PersonPicker members={members} value={closerMembershipId} onChange={setCloserMembershipId} roleId={closerRoleId} disabled={!canEdit} anyLabel={t.flow.anyOfRole} searchPh={t.flow.searchPerson} noResults={t.flow.noPerson} />
                    </Field>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--text)', fontSize: 13.5, cursor: canEdit ? 'pointer' : 'default' }}>
                      <input type="checkbox" checked={closerRequireSignature} disabled={!canEdit} onChange={(e) => setCloserRequireSignature(e.target.checked)} />
                      <Icon name="signature" size={15} />
                      <span style={{ fontWeight: 700 }}>{t.flow.closerRequireSig}</span>
                    </label>
                  </div>
                </Painel>
              )}

              {/* PAINEL LATERAL de configuração — abre ao clicar num bloco. */}
              {/* PAINEL DO BLOCO — redesenhado no padrão dos editores de nós
                  (n8n abre a configuração deslizando da direita; no celular
                  vira sheet de tela cheia). Ordem das seções = ordem das
                  decisões: primeiro O QUE o bloco faz, depois QUEM, depois
                  QUANDO, depois quem OLHA. A etapa condicional saiu do
                  produto. */}
              {stages.filter((s) => s.key === selecionado).map((s) => {
                const vis = KIND_VISUAL[s.kind]
                const prazo = prazoLegivel(s.sla_hours)
                const unidade = slaUnit[s.key] ?? prazo.unidade
                const valorPrazo = unidade === 'd' ? Math.max(1, Math.round(s.sla_hours / 24)) : s.sla_hours
                const setPrazo = (valor: number, un: 'h' | 'd') =>
                  patch(s.key, { sla_hours: Math.max(1, Math.min(un === 'd' ? valor * 24 : valor, 24 * 365)) })
                const modoObs: 'ninguem' | 'todos' | 'escolher' =
                  s.watcher_all ? 'todos'
                    : (s.watcher_role_ids.length || s.watcher_membership_ids.length) ? 'escolher' : 'ninguem'
                return (
                <Painel
                  key={s.key}
                  icone={<span style={{ display: 'flex', width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: `1.5px solid ${vis.cor}`, color: vis.cor }}><Icon name={vis.icon} size={16} /></span>}
                  titulo={s.name.trim() || t.flow.untitled}
                  etiqueta={`${t.flow.kinds[s.kind]} · ${t.flow.groupLabel(s.group_index + 1)}`}
                  onFechar={() => setSelecionado(null)}
                  rodape={<Button leftIcon="check" onClick={() => setSelecionado(null)} style={{ width: '100%' }}>{t.flow.panelDone}</Button>}
                >
                  {/* Nome + ações do bloco */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                    <Input value={s.name} onChange={(e) => patch(s.key, { name: e.target.value })} disabled={!canEdit} placeholder={tf.stageNamePh} style={{ flex: 1, fontWeight: 700 }} autoFocus={!s.name} />
                    {canEdit && (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <IconBtn icon="chevron" title={t.flow.moveGroupUp} flip onClick={() => moverGrupo(s.key, -1)} />
                        <IconBtn icon="chevron" title={t.flow.moveGroupDown} onClick={() => moverGrupo(s.key, 1)} />
                        <IconBtn icon="trash" title={t.common.remove} danger onClick={() => remove(s.key)} />
                      </div>
                    )}
                  </div>

                  {/* 1 · O QUE essa pessoa faz — primeiro, porque define o bloco. */}
                  <Sec num="1" titulo={t.flow.doesWhat}>
                    <div role="radiogroup" aria-label={t.flow.doesWhat} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                      {STAGE_KINDS.map((k) => {
                        const on = s.kind === k
                        const kv = KIND_VISUAL[k]
                        return (
                          <button
                            key={k} type="button" role="radio" aria-checked={on} disabled={!canEdit}
                            onClick={() => setKind(s.key, k)} className="app-btn"
                            style={{
                              cursor: canEdit ? 'pointer' : 'default', textAlign: 'left',
                              display: 'flex', flexDirection: 'column', gap: 6, minHeight: 84,
                              border: `1.5px solid ${on ? kv.cor : 'var(--border)'}`,
                              background: on ? 'var(--surface)' : 'var(--surface-2)',
                              boxShadow: on ? `inset 0 0 0 1px ${kv.cor}` : 'none',
                              borderRadius: 12, padding: '10px 12px', position: 'relative',
                            }}
                          >
                            {on && <span style={{ position: 'absolute', top: 8, right: 8, color: kv.cor, display: 'flex' }}><Icon name="check" size={13} /></span>}
                            <span style={{ color: on ? kv.cor : 'var(--text-muted)', display: 'flex' }}><Icon name={kv.icon} size={17} /></span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: on ? 'var(--heading)' : 'var(--text)' }}>{t.flow.kinds[k]}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{t.flow.kindHints[k]}</span>
                          </button>
                        )
                      })}
                    </div>
                  </Sec>

                  {/* 2 · QUEM responde */}
                  <Sec num="2" titulo={t.flow.whoAnswers}>
                    <div style={{ display: 'grid', gap: 10 }}>
                      <Field label={t.flow.operator}>
                        <Select value={s.operator_role_id ?? ''} onChange={(e) => patch(s.key, { operator_role_id: e.target.value || null })} disabled={!canEdit}>
                          <option value="">{t.flow.noRole}</option>
                          {roles.map((r) => <option key={r.id} value={r.id}>{localizeRole(r.name)}</option>)}
                        </Select>
                      </Field>
                      <Field label={t.flow.operatorPerson}>
                        <PersonPicker members={members} value={s.operator_membership_id ?? null} onChange={(id) => patch(s.key, { operator_membership_id: id })} roleId={s.operator_role_id} disabled={!canEdit} anyLabel={t.flow.anyOfRole} searchPh={t.flow.searchPerson} noResults={t.flow.noPerson} />
                      </Field>
                    </div>
                    {!s.operator_role_id && !s.operator_membership_id && (
                      <p style={{ color: '#d97706', fontSize: 12, fontWeight: 700, margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="bell" size={12} /> {t.flow.ownerMissing}
                      </p>
                    )}
                  </Sec>

                  {/* 3 · PRAZO — valor + unidade (horas para o SAC caber). */}
                  <Sec num="3" titulo={t.flow.sla}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Input
                        type="number" min={1} max={unidade === 'd' ? 365 : 24 * 365}
                        value={String(valorPrazo)} disabled={!canEdit}
                        onChange={(e) => setPrazo(Math.max(1, Number(e.target.value) || 1), unidade)}
                        style={{ maxWidth: 110 }}
                      />
                      <div style={{ display: 'inline-flex', background: 'var(--surface-2)', borderRadius: 100, padding: 3 }}>
                        {(['h', 'd'] as const).map((u) => (
                          <button
                            key={u} type="button" disabled={!canEdit} className="app-btn"
                            onClick={() => { setSlaUnit((m) => ({ ...m, [s.key]: u })); setPrazo(u === 'd' ? Math.max(1, Math.round(s.sla_hours / 24)) : s.sla_hours, u) }}
                            style={{ border: 'none', cursor: canEdit ? 'pointer' : 'default', padding: '7px 14px', borderRadius: 100, fontWeight: 800, fontSize: 12.5, background: unidade === u ? 'var(--accent)' : 'transparent', color: unidade === u ? '#fff' : 'var(--text-muted)' }}
                          >
                            {u === 'h' ? t.flow.unitHours : t.flow.unitDays}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '8px 0 0', lineHeight: 1.5 }}>
                      {t.flow.slaHint(s.sla_hours)}
                      {isSac && s.sla_hours > 168 && (
                        <b style={{ color: '#d97706' }}> {t.flow.slaSacWarn}</b>
                      )}
                    </p>
                  </Sec>

                  {/* 4 · Quem ACOMPANHA — ninguém, todos, ou escolhidos. */}
                  <Sec num="4" titulo={t.flow.watchers}>
                    <div style={{ display: 'inline-flex', background: 'var(--surface-2)', borderRadius: 100, padding: 3, marginBottom: 10 }}>
                      {([['ninguem', t.flow.obsNone], ['todos', t.flow.obsAll], ['escolher', t.flow.obsPick]] as const).map(([m, label]) => (
                        <button
                          key={m} type="button" disabled={!canEdit} className="app-btn"
                          onClick={() => {
                            if (m === 'todos') patch(s.key, { watcher_all: true, watcher_role_ids: [], watcher_membership_ids: [] })
                            else if (m === 'ninguem') patch(s.key, { watcher_all: false, watcher_role_ids: [], watcher_membership_ids: [] })
                            else patch(s.key, { watcher_all: false })
                          }}
                          style={{ border: 'none', cursor: canEdit ? 'pointer' : 'default', padding: '7px 13px', borderRadius: 100, fontWeight: 800, fontSize: 12.5, background: modoObs === m ? 'var(--accent)' : 'transparent', color: modoObs === m ? '#fff' : 'var(--text-muted)' }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {modoObs === 'todos' && (
                      <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>{t.flow.obsAllHint}</p>
                    )}
                    {modoObs !== 'todos' && (
                      <>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 700, margin: '4px 0 6px', textTransform: 'uppercase', letterSpacing: '.03em' }}>{t.flow.obsRoles}</div>
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
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
                        <div style={{ color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 700, margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: '.03em' }}>{t.flow.obsPeople}</div>
                        <PeoplePicker
                          members={members}
                          selecionados={s.watcher_membership_ids}
                          onChange={(ids) => patch(s.key, { watcher_membership_ids: ids })}
                          disabled={!canEdit}
                          searchPh={t.flow.searchPerson}
                          noResults={t.flow.noPerson}
                        />
                      </>
                    )}
                  </Sec>

                  {/* 5 · Assinatura — interruptor, não checkbox perdido. */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', background: 'var(--surface-2)' }}>
                    <span style={{ color: 'var(--accent)', display: 'flex', marginTop: 2 }}><Icon name="signature" size={17} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 13.5 }}>{t.flow.requireSig}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5, marginTop: 2 }}>{t.flow.requireSigHint}</div>
                    </div>
                    <Switch on={!!s.require_signature} disabled={!canEdit} onToggle={(v) => patch(s.key, { require_signature: v })} />
                  </div>
                </Painel>
                )
              })}

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

      {/* MODELOS PRONTOS. Quem abre o construtor pela primeira vez não sabe o
          que uma apuração precisa ter; o modelo entrega o desenho e deixa a
          parte que só a empresa responde — quem faz cada bloco. */}
      <Modal open={tplAberto} onClose={() => setTplAberto(false)} title={t.flow.tplTitle} kicker={t.flow.flowName} maxWidth={620}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.55, margin: '0 0 6px' }}>{t.flow.tplHint}</p>
        {/* O aviso só aparece quando há de fato o que perder. */}
        {(stages?.length ?? 0) > 0 && (
          <p style={{ color: '#e11d48', fontSize: 12.5, fontWeight: 700, margin: '0 0 14px' }}>{t.flow.tplReplaceWarn}</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templatesDoModulo(channel?.module ?? 'etica').map((tpl) => {
            const txt = t.flow.templates[tpl.id as keyof typeof t.flow.templates]
            return (
              <div key={tpl.id} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 14.5, flex: '1 1 auto' }}>{txt.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.flow.tplBlocks(tpl.stages.length)}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.5, margin: '0 0 10px' }}>{txt.hint}</p>
                {/* Prévia com as cores dos tipos: dá para ver o que o modelo
                    monta antes de aplicar, sem perder o desenho atual. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {tpl.stages.map((s, i) => {
                    const anterior = i > 0 ? tpl.stages[i - 1] : null
                    const juntos = anterior !== null && anterior.group_index === s.group_index
                    const vis = KIND_VISUAL[s.kind]
                    return (
                      <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {i > 0 && (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>
                            {juntos ? '+' : '→'}
                          </span>
                        )}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${vis.cor}`, color: vis.cor, borderRadius: 100, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                          <Icon name={vis.icon} size={12} />
                          {(txt.stages as Record<string, string>)[s.key] ?? s.key}
                        </span>
                      </span>
                    )
                  })}
                </div>
                <Button variant="outline" leftIcon="flow" onClick={() => aplicarTemplate(tpl)} disabled={!canEdit}>
                  {t.flow.tplApply}
                </Button>
              </div>
            )
          })}
        </div>
      </Modal>

      {Toast}
    </div>
  )
}

/**
 * Painel lateral de configuração.
 *
 * Vai num PORTAL para `body`: dentro da árvore da tela ele herdava
 * `overflow`/`transform` dos contêineres e ficava cortado ou preso no scroll —
 * era o "parece bug" da tela anterior.
 *
 * Em tela estreita vira folha de baixo para cima, ocupando a altura toda menos
 * uma faixa: 430px fixos num celular cobririam a tela inteira sem a pessoa
 * saber que há algo atrás.
 */
/** Seção numerada do painel: a ordem 1-2-3-4 é o roteiro de preencher um bloco. */
function Sec({ num, titulo, children }: { num: string; titulo: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{num}</span>
        <span style={{ color: 'var(--heading)', fontSize: 13, fontWeight: 800 }}>{titulo}</span>
      </div>
      {children}
    </div>
  )
}

/** Interruptor — o gesto de "ligar uma exigência", não um checkbox de formulário. */
function Switch({ on, disabled, onToggle }: { on: boolean; disabled?: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} disabled={disabled}
      onClick={() => onToggle(!on)} className="app-btn"
      style={{
        width: 42, height: 24, borderRadius: 100, border: 'none', flexShrink: 0,
        cursor: disabled ? 'default' : 'pointer', position: 'relative',
        background: on ? 'var(--accent)' : 'var(--border)', transition: 'background .15s',
      }}
    >
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left .15s' }} />
    </button>
  )
}

/** Seleção MÚLTIPLA de pessoas, com busca — para observadores nominais. */
function PeoplePicker({ members, selecionados, onChange, disabled, searchPh, noResults }: {
  members: MemberRow[]
  selecionados: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
  searchPh: string
  noResults: string
}) {
  const [q, setQ] = useState('')
  const nome = (m: MemberRow) => m.full_name || m.email || '—'
  const emailDe = (m: MemberRow) => m.email || ''
  const escolhidos = members.filter((m) => selecionados.includes(m.id))
  const termo = q.trim().toLowerCase()
  const achados = termo
    ? members.filter((m) => !selecionados.includes(m.id)
        && (nome(m).toLowerCase().includes(termo) || emailDe(m).toLowerCase().includes(termo)))
    : []
  const alterna = (id: string) =>
    onChange(selecionados.includes(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id])
  return (
    <div>
      {escolhidos.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {escolhidos.map((m) => (
            <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent-soft)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: 100, padding: '4px 6px 4px 11px', fontSize: 12.5, fontWeight: 700 }}>
              {nome(m)}
              {!disabled && (
                <button type="button" onClick={() => alterna(m.id)} aria-label="×" style={{ border: 'none', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', display: 'flex', padding: 2 }}>
                  <Icon name="close" size={11} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && (
        <>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPh} />
          {termo && (
            <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', maxHeight: 180, overflowY: 'auto' }} className="app-scroll">
              {achados.length === 0 && <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 13 }}>{noResults}</div>}
              {achados.slice(0, 30).map((m) => (
                <button key={m.id} type="button" className="app-btn picker-opt"
                  onClick={() => { alterna(m.id); setQ('') }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', padding: '9px 12px' }}>
                  <span style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 13.5 }}>{nome(m)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>{m.email}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Painel({ icone, titulo, etiqueta, onFechar, rodape, children }: {
  icone?: ReactNode
  titulo: string
  etiqueta: string
  onFechar: () => void
  rodape?: ReactNode
  children: ReactNode
}) {
  const estreito = typeof window !== 'undefined' && window.innerWidth < 720
  return createPortal(
    <>
      {/* SEM véu, de propósito — duas razões:
          · o véu engolia o `click` que dispara logo depois do `pointerup` que
            abriu o painel, fechando-o no mesmo gesto ("clico e não abre");
          · sem ele o canvas continua vivo: clicar em OUTRO bloco troca o
            painel direto, como nos editores de nós. Fechar é ESC, o X, ou
            clicar no fundo vazio do canvas.

          zIndex 9601: o shell do painel do app é `position: fixed` com
          zIndex 9000 — qualquer overlay abaixo disso abre ATRÁS da tela,
          invisível. Era o bug do "clico no bloquinho e nada aparece": o
          painel abria, mas coberto pelo app inteiro. */}
      <div
        role="dialog"
        aria-label={titulo}
        style={{
          position: 'fixed', zIndex: 9601,
          background: 'var(--surface)',
          display: 'flex', flexDirection: 'column',
          ...(estreito
            ? { left: 0, right: 0, bottom: 0, top: 56, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTop: '1px solid var(--border)' }
            : { top: 0, right: 0, bottom: 0, width: 'min(440px, 92vw)', borderLeft: '1px solid var(--border)' }),
          boxShadow: '-18px 0 44px rgba(0,0,0,.28)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '15px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {icone}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {titulo}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', marginTop: 1 }}>
              {etiqueta}
            </div>
          </div>
          <IconBtn icon="close" title="×" onClick={onFechar} />
        </div>
        {/* `minHeight: 0` é o que faz o filho rolar dentro do flex — sem isso o
            conteúdo estoura o painel e o rodapé some da tela. */}
        <div className="app-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
          {children}
        </div>
        {rodape && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
            {rodape}
          </div>
        )}
      </div>
    </>,
    document.body,
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

function IconBtn({ icon, danger, flip, disabled, onClick }: { icon: 'chevron' | 'trash' | 'close'; title: string; danger?: boolean; flip?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="app-btn"
      style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface-2)', color: danger ? '#d9534f' : 'var(--text-muted)', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={15} style={flip ? { transform: 'rotate(90deg)' } : (icon === 'chevron' ? { transform: 'rotate(-90deg)' } : undefined)} />
    </button>
  )
}
