// Registro declarativo de telas. O Shell filtra por capacidade → sidebar e rotas
// se montam sozinhas. Adicionar uma tela = uma linha aqui (+ o require no back).
import type { ComponentType } from 'react'
import type { IconName } from './icons'
import type { AppStrings } from './strings'
import EvidenceVault from './screens/EvidenceVault'
import MyCases from './screens/MyCases'
import MyWatching from './screens/MyWatching'
import Overview from './screens/Overview'
import Cases from './screens/Cases'
import Signature from './screens/Signature'
import People from './screens/People'
import Roles from './screens/Roles'
import Channels from './screens/Channels'
import FormBuilder from './screens/FormBuilder'
import FlowBuilder from './screens/FlowBuilder'
import Billing from './screens/Billing'
import Audit from './screens/Audit'
import Announcements from './screens/Announcements'
import Settings from './screens/Settings'
import Manual from './screens/Manual'

export interface Requirement {
  anyOf?: string[]
  allOf?: string[]
  module?: string
}

export interface ScreenDef {
  id: string
  navKey: keyof AppStrings['nav']
  icon: IconName
  // Logotipo do módulo (opcional): quando presente, a nav mostra a marca do
  // módulo no lugar do ícone genérico. Cada módulo pode ter o seu.
  logo?: string
  group: 'main' | 'modules' | 'config' | 'admin'
  requires?: Requirement
  Component: ComponentType
}

/** O registro monta telas sem props; o SAC é a tela de Casos em outro modo. */
const SACScreen = () => <Cases module="sac" />

export const SCREENS: ScreenDef[] = [
  { id: 'overview', navKey: 'overview', icon: 'overview', group: 'main', Component: Overview },
  {
    // Logo abaixo da visão geral: é a primeira pergunta de quem entra no
    // sistema para trabalhar — "o que está esperando por mim?". Sem `requires`
    // porque a tela é auto-escopada: mostra as fichas DESTA pessoa, e quem não
    // tem nenhuma vê o estado vazio.
    id: 'mine', navKey: 'mine', icon: 'check', group: 'main', Component: MyCases,
  },
  {
    // Ao lado de "Meus atendimentos" e pela mesma razão de existir: uma
    // responde "o que espera por mim?", a outra "o que andou no que eu
    // acompanho?". Também auto-escopada — quem não observa nada vê o vazio.
    id: 'watching', navKey: 'watching', icon: 'eye', group: 'main', Component: MyWatching,
  },
  {
    // O cofre: todas as provas visíveis num lugar só, com busca. A permissão
    // é a mesma da tela do caso — o cofre não abre nada novo.
    id: 'evidence', navKey: 'evidence', icon: 'vault', group: 'main', Component: EvidenceVault,
    requires: { anyOf: ['etica.view_evidence', 'sac.view_evidence'] },
  },
  {
    id: 'cases', navKey: 'cases', icon: 'cases', logo: '/canal-denuncias-icon.png', group: 'modules', Component: Cases,
    requires: { anyOf: ['etica.view_cases', 'privacidade.view_requests', 'incidentes.view'] },
  },
  {
    // Mesma tela de Casos, em modo SAC: vocabulário de consumidor e o selo do
    // prazo de 7 dias corridos do Decreto 11.034/2022.
    id: 'sac', navKey: 'sac', icon: 'cases', logo: '/sac-icon.svg', group: 'modules',
    Component: SACScreen,
    requires: { module: 'sac', anyOf: ['sac.view_demands'] },
  },
  // NR-1 fora da navegação por enquanto: o módulo não existe como produto hoje.
  // A tela e o backend continuam de pé — para reativar, basta devolver esta
  // entrada (o filtro por plano/permissão já cuida do resto).
  {
    id: 'signature', navKey: 'signature', icon: 'signature', logo: '/assinatura-icon.svg', group: 'modules', Component: Signature,
    requires: { module: 'assinatura', anyOf: ['assinatura.view'] },
  },
  {
    id: 'people', navKey: 'people', icon: 'people', group: 'admin', Component: People,
    requires: { allOf: ['admin.manage_users'] },
  },
  {
    id: 'roles', navKey: 'roles', icon: 'roles', group: 'admin', Component: Roles,
    requires: { allOf: ['admin.manage_roles'] },
  },
  {
    id: 'channels', navKey: 'channels', icon: 'channels', group: 'config', Component: Channels,
    requires: { allOf: ['admin.manage_roles'] },
  },
  {
    id: 'formbuilder', navKey: 'formbuilder', icon: 'audit', group: 'config', Component: FormBuilder,
    requires: { anyOf: ['etica.build_form', 'sac.build_form'] },
  },
  {
    id: 'flowbuilder', navKey: 'flow', icon: 'flow', group: 'config', Component: FlowBuilder,
    requires: { anyOf: ['etica.build_flow', 'sac.build_flow'] },
  },
  {
    id: 'billing', navKey: 'billing', icon: 'billing', group: 'admin', Component: Billing,
    requires: { allOf: ['admin.billing'] },
  },
  {
    id: 'audit', navKey: 'audit', icon: 'audit', group: 'admin', Component: Audit,
    requires: { allOf: ['admin.view_audit'] },
  },
  // Configurações: pessoal, disponível a qualquer membro (sem 'requires').
  {
    // Fica em 'config' junto de canais e formulário: divulgar é o último passo
    // de colocar um canal no ar, não uma tarefa administrativa avulsa.
    id: 'announcements', navKey: 'announcements', icon: 'megaphone', group: 'config',
    Component: Announcements,
    requires: { anyOf: ['admin.notify'] },
  },
  { id: 'settings', navKey: 'settings', icon: 'settings', group: 'admin', Component: Settings },
  // O manual: SEM `requires`, de propósito. Quem tem pouco acesso é justamente
  // quem mais precisa saber o que consegue fazer — e o filtro por permissão
  // acontece dentro da tela, capítulo a capítulo.
  { id: 'manual', navKey: 'manual', icon: 'book', group: 'admin', Component: Manual },
]

export type ScreenState = 'ok' | 'locked' | 'hidden'

interface CapsLike {
  can: (code: string) => boolean
  hasModule: (m: string) => boolean
  isContractable: (m: string) => boolean
}

/** ok = navegável · locked = aparece com cadeado (upsell) · hidden = some. */
export function evaluate(req: Requirement | undefined, caps: CapsLike): ScreenState {
  if (!req) return 'ok'
  if (req.module && !caps.hasModule(req.module)) {
    return caps.isContractable(req.module) ? 'locked' : 'hidden'
  }
  const anyOk = !req.anyOf || req.anyOf.some((c) => caps.can(c))
  const allOk = !req.allOf || req.allOf.every((c) => caps.can(c))
  return anyOk && allOk ? 'ok' : 'hidden'
}
