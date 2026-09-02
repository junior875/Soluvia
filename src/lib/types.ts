// Tipos espelhando os schemas do back-end (FastAPI). Mantêm o front tipado.

export interface TokenResponse {
  access_token: string
  token_type: string
  tenant_id: string | null
  membership_id: string | null
  permissions: string[]
  scope: Record<string, unknown>
  is_platform_admin?: boolean
  refresh_token?: string | null
}

// ── Console de plataforma (superadmin Soluqtion) ───────────────
export interface PlatformOverview {
  tenants: number
  users: number
  channels: number
  cases: number
  open_cases: number
  ai_tokens_used: number
}

export interface PlatformTenantRow {
  id: string
  name: string
  slug: string
  plan_name: string | null
  subscription_status: string | null
  users: number
  channels: number
  cases: number
  ai_token_limit: number
  ai_tokens_used: number
  storage_limit_bytes: number
  storage_used_bytes: number
  /** Teto de usuários EFETIVO (plano ou manual), o padrão do plano e o
   *  manual quando existe — a tela mostra de onde o número veio. */
  max_users: number
  plan_max_users: number
  max_users_override: number | null
  created_at: string
}

export interface PlatformMember {
  id: string
  name: string | null
  email: string | null
  status: string
  roles: string[]
}

export interface PlatformChannelRow {
  id: string
  module: string
  name: string
  slug: string
  is_active: boolean
}

export interface PlatformTenantDetail extends PlatformTenantRow {
  ai_renews_at?: string | null
  corporate_domain: string | null
  timezone: string | null
  billing_cycle: string | null
  members: PlatformMember[]
  channels_list: PlatformChannelRow[]
  roles: { id: string; name: string }[]
}

export interface MembershipSummary {
  id: string
  tenant_id: string
  tenant_name: string
  tenant_slug: string
  status: string
  roles: string[]
}

export interface MeResponse {
  id: string
  email: string
  full_name: string
  is_platform_admin: boolean
  memberships: MembershipSummary[]
  avatar_url?: string | null
  avatar_original_url?: string | null
}

export interface PermissionOut {
  id: string
  code: string
  module: string
  label: string
  description: string
}

export interface ModulePermissions {
  module: string
  permissions: PermissionOut[]
}

export interface PermissionCatalog {
  modules: ModulePermissions[]
}

export interface RoleModuleSummary {
  module: string
  granted: number
  total: number
}

export interface RoleOut {
  id: string
  tenant_id: string | null
  name: string
  color: string
  icon: string
  base_template: string | null
  is_system: boolean
  permissions: string[]
  module_summary: RoleModuleSummary[]
}

export interface ChannelOut {
  id: string
  tenant_id: string
  module: string
  name: string
  slug: string
  is_active: boolean
  config: Record<string, unknown>
}

export interface AuditRow {
  id: string
  actor_membership_id: string | null
  actor_name: string | null
  action: string
  resource_type: string
  resource_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface FlowCondition {
  field: string
  op: string
  value: string
}

/** LEGADO: os interruptores que o `kind` substituiu. Fluxo antigo ainda tem. */
export interface ParecerConfig {
  decision?: boolean
  rating?: boolean
  urgency?: boolean
}

/**
 * O TIPO do bloco — é ele que decide o formulário que a pessoa designada vê.
 *
 * - `decisao`      só o texto da decisão
 * - `urgencia`     normal | média | alta
 * - `avaliacao`    texto livre + qualquer arquivo
 * - `investigacao` as provas já carregadas + poder carregar mais
 */
export type StageKind = 'decisao' | 'urgencia' | 'avaliacao' | 'investigacao'

export const STAGE_KINDS: StageKind[] = ['decisao', 'urgencia', 'avaliacao', 'investigacao']

/** Blocos em que o parecer aceita anexo. */
export const KINDS_COM_ANEXO: StageKind[] = ['avaliacao', 'investigacao']

export interface FlowStageIn {
  name: string
  /** Opcional na leitura: fluxo salvo antes dos tipos não tem o campo. */
  kind?: StageKind
  /** Bloco de execução: etapas do mesmo bloco são acionadas juntas, e o bloco
   *  seguinte só começa quando todas responderem. Opcional na leitura porque
   *  fluxo salvo antes dos blocos não tem o campo. */
  group_index?: number
  operator_role_id: string | null
  operator_membership_id?: string | null
  parecer_config?: ParecerConfig
  require_signature?: boolean
  /** Observadores: a empresa inteira, papéis e/ou pessoas nominais. */
  watcher_all?: boolean
  watcher_role_ids: string[]
  watcher_membership_ids?: string[]
  sla_days: number
  /** Prazo em HORAS — manda quando presente (o SAC tem 168h legais no total). */
  sla_hours?: number | null
  is_conditional: boolean
  condition: FlowCondition | null
}

export interface FlowStageOut extends FlowStageIn {
  id: string
  order: number
}

export interface FlowOut {
  id: string
  channel_id: string
  name: string
  mode: string
  closer_membership_id: string | null
  closer_role_id: string | null
  closer_require_signature?: boolean
  stages: FlowStageOut[]
}

export interface CaseOut {
  id: string
  tenant_id: string
  channel_id: string
  protocol: string
  status: string
  severity: string
  title: string
  is_anonymous: boolean
  current_stage_id: string | null
  /** Prazo de resposta ao consumidor (SAC). Nulo em ouvidoria/ética. */
  response_due_at?: string | null
  /** Módulo do canal de origem: 'etica' | 'sac'. Ausente em casos antigos. */
  module?: string | null
  created_at: string
  updated_at: string
}

export interface CaseEventItem {
  id: string
  type: string
  actor_membership_id: string | null
  visible_to_reporter: boolean
  content: string
  created_at: string
}

export interface FormFieldSnap {
  key: string
  type: string
  label: string
  options?: string[]
}

export interface CaseAssignment {
  id: string
  stage_id: string | null
  stage_name: string
  order: number
  /** Grupo de execução — a trilha do caso desenha o paralelo com ele. */
  group_index: number
  is_closer: boolean
  assignee_membership_id: string | null
  assignee_role_id: string | null
  assignee_name: string | null
  role_name: string | null
  kind: StageKind
  parecer_config: ParecerConfig
  require_signature: boolean
  signature_token: string | null
  status: string            // pending | active | submitted | skipped
  decision: string | null   // agree | more_info | dismiss
  rating: number | null
  urgency: string | null    // low | medium | high
  parecer: string
  submitted_by_name: string | null
  submitted_at: string | null
}

export interface MyAssignment {
  case_id: string
  protocol: string
  title: string
  status: string
  stage_name: string
  is_closer: boolean
  kind: StageKind
  parecer_config: ParecerConfig
  require_signature: boolean
}

export interface CaseDetail extends CaseOut {
  events: CaseEventItem[]
  assignments: CaseAssignment[]
  can_release: boolean
  my_pending_assignment_id: string | null
  answers: Record<string, unknown>
  form_snapshot: FormFieldSnap[]
  reporter_signature: ReporterSignature | null
}

export interface ReporterSignature {
  image: string
  cpf_masked: string | null
  geo: SigGeo
  signed_at: string
  ip?: string | null
  user_agent?: string | null
  hash: string
  method?: string
}

export interface PublicCaseReceipt {
  protocol: string
  access_hash: string
  message: string
}

export interface PublicCaseEvent {
  type: string
  content: string
  created_at: string
  from_reporter: boolean
}

export interface PublicCaseView {
  protocol: string
  status: string
  title: string
  created_at: string
  events: PublicCaseEvent[]
}

export interface PlanOut {
  id: string
  name: string
  max_users: number
  enabled_modules: string[]
  price_monthly: number | null
  price_yearly: number | null
}

// ── Billing: troca de plano (proporcional) e estado da assinatura ──
export interface PlanChangePreview {
  change_type: 'upgrade' | 'downgrade' | 'cycle' | 'same'
  current_plan: string
  current_price: number
  current_cycle: string
  new_plan: string
  new_price: number
  billing_cycle: string
  days_remaining: number
  cycle_days: number
  amount_due_now: number
  credit_next_cycle: number
  next_renewal: string | null
  seat_block: boolean
  new_max_users: number
  active_users: number
}

export interface SubscriptionState {
  plan_name: string
  subscription_status: string
  billing_cycle: string | null
  current_period_end: string | null
  subscription_canceled_at: string | null
}

// ── Signup self-service ────────────────────────────────────────
export interface SignupCard {
  cardholder_name: string
  card_number: string
  exp_month: number
  exp_year: number
  cvc: string
}

export interface SignupRequest {
  company: { name: string; corporate_domain?: string; timezone?: string; slug?: string }
  plan_id: string
  billing_cycle: 'monthly' | 'yearly'
  admin: { full_name: string; email: string; password: string }
  payment: SignupCard
}

export interface SubscriptionSummary {
  plan_name: string
  billing_cycle: string
  status: string
  amount: number | null
  currency: string
  card_brand: string | null
  card_last4: string | null
  enabled_modules: string[]
  max_users: number
}

export interface SignupResponse {
  access_token: string
  token_type: string
  tenant: {
    id: string
    name: string
    slug: string
    subscription_status: string | null
    billing_cycle: string | null
    card_brand: string | null
    card_last4: string | null
  }
  membership_id: string
  permissions: string[]
  subscription: SubscriptionSummary
}

export interface SlugCheckResponse {
  slug: string
  available: boolean
}

export interface CheckoutStartRequest {
  company: { name: string; corporate_domain?: string; timezone?: string; slug?: string }
  plan_id: string
  billing_cycle: 'monthly' | 'yearly'
  admin: { full_name: string; email: string; password: string }
}

export interface CheckoutStartResponse {
  checkout_url: string
  session_id: string
}

// ── Painel ─────────────────────────────────────────────────────
export interface UsageOut {
  plan_name: string
  max_users: number
  active_users: number
  seats_available: number
  enabled_modules: string[]
}

export interface MemberRole {
  id: string
  role_id: string
  role_name: string
  scope: Record<string, unknown>
}

export interface MemberRow {
  id: string
  status: string
  invited_email: string
  full_name: string | null
  email: string | null
  roles: MemberRole[]
  avatar_url?: string | null
  avatar_original_url?: string | null
}

export interface RoleBadge {
  name: string
  color: string
  icon: string
}

export interface PanelContext {
  user: {
    id: string
    email: string
    full_name: string
    is_platform_admin: boolean
    avatar_url?: string | null
    avatar_original_url?: string | null
    theme: string
    language: string
    font_scale: number
    onboarded: boolean
    marketing_consent: boolean
  }
  tenant_id: string
  tenant_name: string
  tenant_slug: string
  membership_id: string
  permissions: string[]
  scope: Record<string, unknown>
  roles: RoleBadge[]
  enabled_modules: string[]
  contractable_modules: string[]
  /** Permissões recebidas desde a última vez que a pessoa abriu o manual. */
  manual_new_permissions?: string[]
  usage: { plan_name: string; max_users: number; active_users: number; seats_available: number }
}

export interface ApiError {
  status: number
  detail: string
}

export interface AiUsage {
  limit: number
  used: number
  remaining: number | null
  unlimited: boolean
  mine: number
  my_limit: number
  my_used: number
  my_remaining: number | null
  my_unlimited: boolean
}

export interface AiMemberRow {
  membership_id: string
  name: string | null
  email: string | null
  status: string
  limit: number
  used: number
  remaining: number | null
}

// ── Assinatura Digital ─────────────────────────────────────────
export interface SigField {
  id: string
  signer_user_id?: string | null
  page: number
  x: number
  y: number
  w: number
  h: number
  order_index: number
  placeholder?: string | null
}

/** Um campo antes de persistir (sem id — o back gera). */
export interface SigFieldInput {
  signer_user_id?: string | null
  page: number
  x: number
  y: number
  w: number
  h: number
  order_index: number
  placeholder?: string | null
}

export type SigStatus = 'uploaded' | 'partial' | 'signed'

export interface SigDocument {
  id: string
  case_id?: string | null
  filename: string
  mime: string
  original_sha256: string
  status: SigStatus | string
  signed_storage_ref?: string | null
  created_at: string
  fields: SigField[]
}

export interface SigGeo {
  consent: boolean
  lat?: number | null
  lng?: number | null
  accuracy?: number | null
}

export interface SignRequest {
  field_id?: string | null
  level: 'simple' | 'advanced' | 'qualified'
  signature_type: 'rubric' | 'seal'
  cpf?: string | null
  geo: SigGeo
  signature_image?: string | null
}

export interface Signature {
  id: string
  document_id: string
  signer_user_id?: string | null
  algo: string
  level: string
  signed_sha256: string
  geo_consent: boolean
  geo_lat?: number | null
  geo_lng?: number | null
  cpf_masked?: string | null
  cpf_status: string
  prev_evidence_hash?: string | null
  evidence_hash: string
  verify_token: string
  signed_at: string
}

export interface EvidenceSigner {
  name?: string | null
  algo: string
  level: string
  public_key?: string | null
  signed_at: string
  geo_consent: boolean
  geo_lat?: number | null
  geo_lng?: number | null
  geo_accuracy?: number | null
  ip?: string | null
  user_agent?: string | null
  cpf_masked?: string | null
  cpf_status: string
  tsa_time?: string | null
  prev_evidence_hash?: string | null
  evidence_hash: string
  verify_token: string
}

export interface Evidence {
  document_id: string
  filename: string
  mime: string
  original_sha256: string
  status: SigStatus | string
  chain_intact: boolean
  signers: EvidenceSigner[]
}

export interface VerifyResult {
  valid: boolean
  reason?: string | null
  level?: string | null
  algo?: string | null
  signed_at?: string | null
  tsa_time?: string | null
  document_sha256?: string | null
  chain_intact?: boolean | null
  tenant_name?: string | null
}
