// Console de plataforma (superadmin Soluqtion). Área 100% do sistema: todas as
// empresas, usuários, canais, casos e consumo de IA — com manutenção (cota de IA,
// reset, suspender). Standalone (#plataforma): não depende do painel de tenant.
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { api, listPlans, logout } from '../lib/api'
import type { ApiError, PlanOut, PlatformOverview, PlatformTenantDetail, PlatformTenantRow } from '../lib/types'
import { useTranslation } from '../i18n/LanguageProvider'
import PrefSwitcher from './PrefSwitcher'
import { Icon, type IconName } from '../app/icons'
import { Button, Card, EmptyState } from '../app/ui'
import PlatformHealth from './platform/PlatformHealth'
import PlatformUsers from './platform/PlatformUsers'
import PlatformConsumo from './platform/PlatformConsumo'

const L = {
  pt: {
    kicker: 'Console Soluqtion', subtitle: 'Visão total da plataforma', logout: 'Sair',
    tenants: 'Empresas', users: 'Usuários', channels: 'Canais', cases: 'Casos', openCases: 'Casos abertos',
    aiUsed: 'Tokens de IA usados', search: 'Buscar empresa…', plan: 'Plano', usersCol: 'Usuários',
    aiCol: 'IA (uso/limite)', status: 'Status', none: 'Nenhuma empresa encontrada.',
    members: 'Membros', channelsList: 'Canais', aiQuota: 'Cota de IA (tokens)', save: 'Salvar',
    reset: 'Zerar uso', suspend: 'Suspender', reactivate: 'Reativar', close: 'Fechar',
    active: 'ativa', suspended: 'suspensa', domain: 'Domínio', created: 'Criada em', saved: 'Atualizado.',
    newCompany: 'Nova empresa', cName: 'Nome da empresa', cSlug: 'Endereço (slug, opcional)', cPlan: 'Plano',
    cAdmin: 'Admin da empresa', cAdminName: 'Nome do admin', cEmail: 'E-mail', cPassword: 'Senha (mín. 8)',
    create: 'Criar empresa', companyCreated: 'Empresa criada.', addUser: 'Adicionar usuário', uName: 'Nome',
    uRole: 'Papel', add: 'Adicionar', userAdded: 'Usuário adicionado.', autoSlug: '(gerado do nome)',
    resend: 'Reenviar convite', resending: 'Enviando…', resendOk: 'Convite reenviado por e-mail.',
    gateAnonTitle: 'Entre para acessar o console', gateAnonBody: 'Esta área exige uma conta de plataforma Soluqtion.', gateSignIn: 'Entrar',
    gateForbiddenTitle: 'Esta conta não é de plataforma', gateForbiddenBody: 'Você está numa conta de empresa. Saia e entre com a conta Soluqtion.',
    storageQuota: 'Armazenamento de provas', storageWarn: 'Ao atingir o teto, os canais de denúncia e SAC param de aceitar ANEXOS — o relato continua entrando, mas sem foto, vídeo ou documento.',
    uNoneBody: 'Ajuste a busca ou crie uma pessoa nova.',
    uNewUser: 'Nova pessoa', uCompany: 'Empresa', uName2: 'Nome', create2: 'Criar', uCancel: 'Cancelar',
    navSection: 'Console', tab_empresas: 'Empresas', tab_pessoas: 'Pessoas', tab_sistema: 'Sistema',
    tab_armazenamento: 'Armazenamento', tab_tokens: 'Tokens de IA',
    stTitle: 'Armazenamento', stSub: 'Quanto cada empresa ocupa e do que esse espaço é feito.',
    stTotal: 'Total da plataforma', stTotalSub: 'Soma de todas as empresas — é o que fecha com a fatura do provedor.',
    stEvidence: 'Provas', stSignatures: 'Assinaturas', stOver: 'no teto', stOverAll: 'empresas no teto', stNoLimit: 'sem limite',
    stHint: 'MB', stSaved: 'Teto atualizado', stEmpty: 'Nenhuma empresa cadastrada.',
    aiTitle: 'Tokens de IA', aiSub: 'Quanto cada empresa já gastou do que foi liberado para ela.',
    aiTotal: 'Consumo da plataforma', aiTotalSub: 'Soma de todas as empresas desde o último zeramento.',
    aiHint: 'tokens', aiSaved: 'Cota atualizada', aiEmpty: 'Nenhuma empresa cadastrada.',
    uSearchPh: 'Buscar pessoa por e-mail ou nome…', uHint: 'Mínimo de 2 caracteres. A busca cobre todas as empresas.',
    uNone: 'Ninguém encontrado.', uSearching: 'Buscando…', uNoCompany: 'Sem vínculo com empresa.',
    uVerifyEmail: 'Verificar e-mail', uVerified: 'e-mail verificado', uResetPassword: 'Definir senha',
    uNewPassword: 'Nova senha (mín. 8)', uDeactivate: 'Desativar conta', uActivate: 'Reativar conta',
    uInactive: 'conta inativa', uSuspendLink: 'Suspender', uReactivateLink: 'Reativar',
    uRemoveLink: 'Remover', uConfirm: 'Confirmar?', uPlatformAdmin: 'plataforma',
    uPendingInvite: 'convite pendente', uInviteExpired: 'convite vencido',
    uResendInvite: 'Reenviar convite',
    uPendingHint: 'Convidado — ainda não aceitou, então a conta não existe.',
    hEmail: 'E-mail', hStorage: 'Armazenamento', hReminders: 'Lembretes', hAi: 'Inteligência artificial',
    hOk: 'configurado', hOff: 'não configurado', hSender: 'Remetente', hBucket: 'Bucket',
    hEphemeral: 'Sem bucket configurado, os arquivos vão para o disco do container — que é apagado a cada deploy.',
    hEvery: 'Varredura a cada', hAwaiting: 'Casos aguardando triagem', hEnvironment: 'Ambiente',
  },
  en: {
    kicker: 'Soluqtion Console', subtitle: 'Full platform view', logout: 'Sign out',
    tenants: 'Companies', users: 'Users', channels: 'Channels', cases: 'Cases', openCases: 'Open cases',
    aiUsed: 'AI tokens used', search: 'Search company…', plan: 'Plan', usersCol: 'Users',
    aiCol: 'AI (used/limit)', status: 'Status', none: 'No companies found.',
    members: 'Members', channelsList: 'Channels', aiQuota: 'AI quota (tokens)', save: 'Save',
    reset: 'Reset usage', suspend: 'Suspend', reactivate: 'Reactivate', close: 'Close',
    active: 'active', suspended: 'suspended', domain: 'Domain', created: 'Created', saved: 'Updated.',
    newCompany: 'New company', cName: 'Company name', cSlug: 'Address (slug, optional)', cPlan: 'Plan',
    cAdmin: 'Company admin', cAdminName: 'Admin name', cEmail: 'Email', cPassword: 'Password (min. 8)',
    create: 'Create company', companyCreated: 'Company created.', addUser: 'Add user', uName: 'Name',
    uRole: 'Role', add: 'Add', userAdded: 'User added.', autoSlug: '(from the name)',
    resend: 'Resend invite', resending: 'Sending…', resendOk: 'Invitation re-sent by email.',
    gateAnonTitle: 'Sign in to access the console', gateAnonBody: 'This area requires a Soluqtion platform account.', gateSignIn: 'Sign in',
    gateForbiddenTitle: 'This account is not a platform account', gateForbiddenBody: 'You are on a company account. Sign out and use the Soluqtion account.',
    storageQuota: 'Evidence storage', storageWarn: 'Once the cap is reached, the whistleblowing and SAC channels stop accepting ATTACHMENTS — reports still come in, but with no photo, video or document.',
    uNoneBody: 'Adjust the search or create a new person.',
    uNewUser: 'New person', uCompany: 'Company', uName2: 'Name', create2: 'Create', uCancel: 'Cancel',
    navSection: 'Console', tab_empresas: 'Companies', tab_pessoas: 'People', tab_sistema: 'System',
    tab_armazenamento: 'Storage', tab_tokens: 'AI tokens',
    stTitle: 'Storage', stSub: 'How much each company takes up, and what that space is made of.',
    stTotal: 'Platform total', stTotalSub: 'Sum of every company — this is what matches the provider invoice.',
    stEvidence: 'Evidence', stSignatures: 'Signatures', stOver: 'at cap', stOverAll: 'companies at cap', stNoLimit: 'no limit',
    stHint: 'MB', stSaved: 'Cap updated', stEmpty: 'No companies yet.',
    aiTitle: 'AI tokens', aiSub: 'How much each company has spent of what was granted to it.',
    aiTotal: 'Platform usage', aiTotalSub: 'Sum of every company since the last reset.',
    aiHint: 'tokens', aiSaved: 'Quota updated', aiEmpty: 'No companies yet.',
    uSearchPh: 'Search a person by email or name…', uHint: 'At least 2 characters. Covers every company.',
    uNone: 'Nobody found.', uSearching: 'Searching…', uNoCompany: 'No company link.',
    uVerifyEmail: 'Verify email', uVerified: 'email verified', uResetPassword: 'Set password',
    uNewPassword: 'New password (min. 8)', uDeactivate: 'Deactivate account', uActivate: 'Reactivate account',
    uInactive: 'inactive account', uSuspendLink: 'Suspend', uReactivateLink: 'Reactivate',
    uRemoveLink: 'Remove', uConfirm: 'Confirm?', uPlatformAdmin: 'platform',
    uPendingInvite: 'invite pending', uInviteExpired: 'invite expired',
    uResendInvite: 'Resend invite',
    uPendingHint: 'Invited — has not accepted yet, so no account exists.',
    hEmail: 'Email', hStorage: 'Storage', hReminders: 'Reminders', hAi: 'Artificial intelligence',
    hOk: 'configured', hOff: 'not configured', hSender: 'Sender', hBucket: 'Bucket',
    hEphemeral: 'With no bucket configured, files go to the container disk — which is wiped on every deploy.',
    hEvery: 'Scan every', hAwaiting: 'Cases awaiting triage', hEnvironment: 'Environment',
  },
  es: {
    kicker: 'Consola Soluqtion', subtitle: 'Vista total de la plataforma', logout: 'Salir',
    tenants: 'Empresas', users: 'Usuarios', channels: 'Canales', cases: 'Casos', openCases: 'Casos abiertos',
    aiUsed: 'Tokens de IA usados', search: 'Buscar empresa…', plan: 'Plan', usersCol: 'Usuarios',
    aiCol: 'IA (uso/límite)', status: 'Estado', none: 'No se encontraron empresas.',
    members: 'Miembros', channelsList: 'Canales', aiQuota: 'Cuota de IA (tokens)', save: 'Guardar',
    reset: 'Reiniciar uso', suspend: 'Suspender', reactivate: 'Reactivar', close: 'Cerrar',
    active: 'activa', suspended: 'suspendida', domain: 'Dominio', created: 'Creada', saved: 'Actualizado.',
    newCompany: 'Nueva empresa', cName: 'Nombre de la empresa', cSlug: 'Dirección (slug, opcional)', cPlan: 'Plan',
    cAdmin: 'Admin de la empresa', cAdminName: 'Nombre del admin', cEmail: 'Correo', cPassword: 'Contraseña (mín. 8)',
    create: 'Crear empresa', companyCreated: 'Empresa creada.', addUser: 'Agregar usuario', uName: 'Nombre',
    uRole: 'Rol', add: 'Agregar', userAdded: 'Usuario agregado.', autoSlug: '(generado del nombre)',
    resend: 'Reenviar invitación', resending: 'Enviando…', resendOk: 'Invitación reenviada por correo.',
    gateAnonTitle: 'Inicia sesión para acceder a la consola', gateAnonBody: 'Esta área exige una cuenta de plataforma Soluqtion.', gateSignIn: 'Entrar',
    gateForbiddenTitle: 'Esta cuenta no es de plataforma', gateForbiddenBody: 'Estás en una cuenta de empresa. Sal y entra con la cuenta Soluqtion.',
    storageQuota: 'Almacenamiento de pruebas', storageWarn: 'Al alcanzar el tope, los canales de denuncias y SAC dejan de aceptar ADJUNTOS — los relatos siguen entrando, pero sin foto, video ni documento.',
    uNoneBody: 'Ajusta la búsqueda o crea una persona nueva.',
    uNewUser: 'Nueva persona', uCompany: 'Empresa', uName2: 'Nombre', create2: 'Crear', uCancel: 'Cancelar',
    navSection: 'Consola', tab_empresas: 'Empresas', tab_pessoas: 'Personas', tab_sistema: 'Sistema',
    tab_armazenamento: 'Almacenamiento', tab_tokens: 'Tokens de IA',
    stTitle: 'Almacenamiento', stSub: 'Cuánto ocupa cada empresa y de qué está hecho ese espacio.',
    stTotal: 'Total de la plataforma', stTotalSub: 'Suma de todas las empresas — es lo que cuadra con la factura del proveedor.',
    stEvidence: 'Pruebas', stSignatures: 'Firmas', stOver: 'en el tope', stOverAll: 'empresas en el tope', stNoLimit: 'sin límite',
    stHint: 'MB', stSaved: 'Tope actualizado', stEmpty: 'Ninguna empresa registrada.',
    aiTitle: 'Tokens de IA', aiSub: 'Cuánto ha gastado cada empresa de lo que se le concedió.',
    aiTotal: 'Consumo de la plataforma', aiTotalSub: 'Suma de todas las empresas desde el último reinicio.',
    aiHint: 'tokens', aiSaved: 'Cuota actualizada', aiEmpty: 'Ninguna empresa registrada.',
    uSearchPh: 'Buscar persona por correo o nombre…', uHint: 'Mínimo 2 caracteres. Cubre todas las empresas.',
    uNone: 'No se encontró a nadie.', uSearching: 'Buscando…', uNoCompany: 'Sin vínculo con empresa.',
    uVerifyEmail: 'Verificar correo', uVerified: 'correo verificado', uResetPassword: 'Definir contraseña',
    uNewPassword: 'Nueva contraseña (mín. 8)', uDeactivate: 'Desactivar cuenta', uActivate: 'Reactivar cuenta',
    uInactive: 'cuenta inactiva', uSuspendLink: 'Suspender', uReactivateLink: 'Reactivar',
    uRemoveLink: 'Quitar', uConfirm: '¿Confirmar?', uPlatformAdmin: 'plataforma',
    uPendingInvite: 'invitación pendiente', uInviteExpired: 'invitación vencida',
    uResendInvite: 'Reenviar invitación',
    uPendingHint: 'Invitado — aún no aceptó, así que la cuenta no existe.',
    hEmail: 'Correo', hStorage: 'Almacenamiento', hReminders: 'Recordatorios', hAi: 'Inteligencia artificial',
    hOk: 'configurado', hOff: 'no configurado', hSender: 'Remitente', hBucket: 'Bucket',
    hEphemeral: 'Sin bucket configurado, los archivos van al disco del contenedor — que se borra en cada despliegue.',
    hEvery: 'Escaneo cada', hAwaiting: 'Casos esperando triaje', hEnvironment: 'Entorno',
  },
}

type AbaId = 'empresas' | 'pessoas' | 'armazenamento' | 'tokens' | 'sistema'

/** As seções do console. Ícones do mesmo conjunto que a nav do painel usa. */
const ABAS: { id: AbaId; icon: IconName }[] = [
  { id: 'empresas', icon: 'overview' },
  { id: 'pessoas', icon: 'people' },
  // Armazenamento e IA saíram de dentro da gaveta da empresa e viraram tela
  // própria: as duas perguntas do dono são "quanto no total" e "quem está fora
  // da curva", e nenhuma das duas se responde abrindo empresa por empresa.
  { id: 'armazenamento', icon: 'download' },
  { id: 'tokens', icon: 'spark' },
  { id: 'sistema', icon: 'settings' },
]

export function isPlatformPath(): boolean {
  return window.location.hash.toLowerCase().startsWith('#plataforma')
}

const card: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 20 }
const fld: CSSProperties = { width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--heading)', fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' }
const btnAccent: CSSProperties = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 100, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
const mb = (bytes: number) => (bytes >= 1024 * 1024 * 1024 ? `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB` : `${Math.round(bytes / 1024 / 1024)} MB`)
const num = (n: number, lang: string) => n.toLocaleString(lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US')

export default function PlatformConsole() {
  const { lang } = useTranslation()
  const tr = L[lang] ?? L.pt
  const [open, setOpen] = useState(isPlatformPath())
  const [ov, setOv] = useState<PlatformOverview | null>(null)
  const [rows, setRows] = useState<PlatformTenantRow[] | null>(null)
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<PlatformTenantDetail | null>(null)
  const [limitEdit, setLimitEdit] = useState('')
  const [storageEdit, setStorageEdit] = useState('')
  const [busy, setBusy] = useState(false)
  // Qual convite está sendo reenviado. Por linha, e não um booleano global:
  // travar a lista inteira faria os outros botões piscarem sem motivo.
  const [resendId, setResendId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [aba, setAba] = useState<AbaId>('empresas')
  // null = ainda conferindo | 'anon' = sem sessão | 'forbidden' = sessão sem
  // poder de plataforma | 'ok' = pode operar. O e-mail acompanha o 'forbidden'
  // porque a correção é trocar de conta — a pessoa precisa saber qual está.
  const [acesso, setAcesso] = useState<{ estado: 'checando' | 'anon' | 'forbidden' | 'ok'; email?: string }>({ estado: 'checando' })
  const [drawer, setDrawer] = useState(false)
  const [plans, setPlans] = useState<PlanOut[]>([])
  const [showNew, setShowNew] = useState(false)
  const emptyNew = { name: '', slug: '', plan_id: '', admin_name: '', admin_email: '', admin_password: '' }
  const [nf, setNf] = useState(emptyNew)
  const emptyMember = { full_name: '', email: '', password: '', role_id: '' }
  const [mf, setMf] = useState(emptyMember)
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600) }

  useEffect(() => {
    const sync = () => setOpen(isPlatformPath())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    if (!open) return
    api
      .get<{ email: string; is_platform_admin: boolean }>('/auth/me')
      .then((r) =>
        setAcesso(r.is_platform_admin ? { estado: 'ok' } : { estado: 'forbidden', email: r.email }),
      )
      .catch(() => setAcesso({ estado: 'anon' }))
  }, [open])

  const load = useCallback(() => {
    void api.get<PlatformOverview>('/platform/overview').then(setOv).catch(() => setOv(null))
    void api.get<PlatformTenantRow[]>('/platform/tenants').then(setRows).catch(() => setRows([]))
    void listPlans().then(setPlans).catch(() => setPlans([]))
  }, [])
  useEffect(() => { if (open && acesso.estado === 'ok') load() }, [open, acesso.estado, load])

  async function createCompany() {
    setBusy(true)
    try {
      const d = await api.post<PlatformTenantDetail>('/platform/tenants', {
        name: nf.name.trim(), slug: nf.slug.trim() || null, plan_id: nf.plan_id || null,
        admin_name: nf.admin_name.trim(), admin_email: nf.admin_email.trim(), admin_password: nf.admin_password,
      })
      setShowNew(false); setNf(emptyNew); load(); setDetail(d); setLimitEdit(String(d.ai_token_limit)); setStorageEdit(String(Math.round((d.storage_limit_bytes || 0) / 1024 / 1024))); flash(tr.companyCreated)
    } catch (e) { flash((e as ApiError).detail ?? 'Erro') } finally { setBusy(false) }
  }
  async function addMember() {
    if (!detail) return
    setBusy(true)
    try {
      const d = await api.post<PlatformTenantDetail>(`/platform/tenants/${detail.id}/members`, {
        full_name: mf.full_name.trim(), email: mf.email.trim(), password: mf.password, role_id: mf.role_id || null,
      })
      setDetail(d); setMf(emptyMember); load(); flash(tr.userAdded)
    } catch (e) { flash((e as ApiError).detail ?? 'Erro') } finally { setBusy(false) }
  }

  // Reenvio do convite a partir do console: o e-mail do cliente não chegou (caiu
  // em spam, veio com uma letra errada, o servidor dele segurou) e o superadmin
  // precisa resolver sem entrar na empresa com uma conta de lá.
  async function resendInvite(membershipId: string) {
    if (!detail) return
    setResendId(membershipId)
    try {
      const d = await api.post<PlatformTenantDetail>(
        `/platform/tenants/${detail.id}/members/${membershipId}/resend-invite`, {},
      )
      setDetail(d); flash(tr.resendOk)
    } catch (e) { flash((e as ApiError).detail ?? 'Erro') } finally { setResendId(null) }
  }

  /** Troca o plano. Reduzir para um plano com menos vagas é permitido de
   *  propósito — recusar deixaria o comercial sem saída num downgrade legítimo,
   *  e o limite volta a valer no próximo convite, que é onde ele importa. */
  async function salvarStorage() {
    if (!detail) return
    setBusy(true)
    try {
      // A tela fala em MB porque ninguém raciocina em bytes; o servidor guarda
      // em bytes porque é o que o storage devolve ao somar.
      const d = await api.post<PlatformTenantDetail>(`/platform/tenants/${detail.id}/storage-limit`, {
        limit_bytes: Math.max(0, Math.round(Number(storageEdit || 0) * 1024 * 1024)),
      })
      setDetail(d); load(); flash(tr.saved)
    } catch (e) { flash((e as ApiError).detail ?? 'Erro') } finally { setBusy(false) }
  }

  async function trocarPlano(planId: string) {
    if (!detail || !planId) return
    setBusy(true)
    try {
      const d = await api.patch<PlatformTenantDetail>(`/platform/tenants/${detail.id}`, { plan_id: planId })
      setDetail(d); load(); flash(tr.saved)
    } catch (e) { flash((e as ApiError).detail ?? 'Erro') } finally { setBusy(false) }
  }

  async function openDetail(id: string) {
    setDetail(null)
    try {
      const d = await api.get<PlatformTenantDetail>(`/platform/tenants/${id}`)
      setDetail(d); setLimitEdit(String(d.ai_token_limit)); setStorageEdit(String(Math.round((d.storage_limit_bytes || 0) / 1024 / 1024)))
    } catch (e) { flash((e as ApiError).detail ?? 'Erro') }
  }
  async function act(fn: () => Promise<PlatformTenantDetail>) {
    setBusy(true)
    try { const d = await fn(); setDetail(d); setLimitEdit(String(d.ai_token_limit)); setStorageEdit(String(Math.round((d.storage_limit_bytes || 0) / 1024 / 1024))); load(); flash(tr.saved) }
    catch (e) { flash((e as ApiError).detail ?? 'Erro') } finally { setBusy(false) }
  }
  const saveLimit = () => act(() => api.post<PlatformTenantDetail>(`/platform/tenants/${detail!.id}/ai-limit`, { limit: Number(limitEdit) || 0 }))
  const resetAi = () => act(() => api.post<PlatformTenantDetail>(`/platform/tenants/${detail!.id}/ai-reset`, {}))
  const toggleSuspend = () => {
    const s = detail!.subscription_status !== 'suspended'
    return act(() => api.post<PlatformTenantDetail>(`/platform/tenants/${detail!.id}/suspend?suspended=${s}`, {}))
  }

  async function doLogout() { try { await logout() } catch { /* ignore */ } window.location.hash = '' ; window.location.reload() }

  if (!open) return null

  const filtered = (rows ?? []).filter((r) => {
    const t = q.trim().toLowerCase()
    return !t || r.name.toLowerCase().includes(t) || r.slug.toLowerCase().includes(t)
  })
  const stat = (label: string, value: number) => (
    <div style={card}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ color: 'var(--heading)', fontSize: 30, fontWeight: 900, marginTop: 6 }}>{num(value, lang)}</div>
    </div>
  )

  return (
    <div className="app-bg" style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', color: 'var(--text)' }}>
      <div className={`app-sidebar-backdrop ${drawer ? 'open' : ''}`} onClick={() => setDrawer(false)} />

      {/* Navegação lateral — a mesma do painel, para o console deixar de ser a
          única tela do produto com as seções no topo. */}
      <aside className={`app-sidebar ${drawer ? 'open' : ''}`} style={{ width: 260, minWidth: 260, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '16px 14px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 38, height: 38, minWidth: 38, borderRadius: 11, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18 }}>S</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 14.5, whiteSpace: 'nowrap' }}>{tr.kicker}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{tr.subtitle}</div>
          </div>
        </div>

        <nav className="app-scroll" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', padding: '8px 13px 6px' }}>{tr.navSection}</p>
          {ABAS.map(({ id, icon }) => (
            <button
              key={id}
              className={`app-nav-item ${aba === id ? 'active' : ''}`}
              onClick={() => { setAba(id); setDrawer(false) }}
            >
              <Icon name={icon} size={18} />
              <span style={{ flex: 1 }}>{tr[`tab_${id}` as keyof typeof tr] as string}</span>
            </button>
          ))}
        </nav>

        <div style={{ padding: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setShowNew(true)} className="app-nav-item" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            <Icon name="plus" size={18} />
            <span style={{ flex: 1 }}>{tr.newCompany}</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PrefSwitcher compact />
            <button onClick={() => void doLogout()} className="app-btn" style={{ marginLeft: 'auto', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 100, padding: '8px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>{tr.logout}</button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        <header style={{ height: 64, minHeight: 64, borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 clamp(16px,3vw,28px)' }}>
          <button className="app-btn app-burger" aria-label="Menu" onClick={() => setDrawer(true)} style={{ display: 'none', width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <Icon name="menu" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--heading)', fontWeight: 800, minWidth: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tr[`tab_${aba}` as keyof typeof tr] as string}</span>
          </div>
        </header>

        <div className="app-scroll" style={{ flex: 1, overflowY: 'auto', padding: 'clamp(18px,3vw,28px)' }}>
        {acesso.estado !== 'ok' ? (
          <div style={{ maxWidth: 460, margin: '48px auto' }}>
            <Card>
              <EmptyState
                icon="lock"
                title={acesso.estado === 'anon' ? tr.gateAnonTitle : acesso.estado === 'forbidden' ? tr.gateForbiddenTitle : '…'}
                body={
                  acesso.estado === 'anon'
                    ? tr.gateAnonBody
                    : acesso.estado === 'forbidden'
                      ? `${tr.gateForbiddenBody} (${acesso.email})`
                      : undefined
                }
                action={
                  acesso.estado === 'anon' ? (
                    <Button onClick={() => { window.location.hash = 'entrar' }}>{tr.gateSignIn}</Button>
                  ) : acesso.estado === 'forbidden' ? (
                    <Button variant="ghost" onClick={() => void doLogout()}>{tr.logout}</Button>
                  ) : undefined
                }
              />
            </Card>
          </div>
        ) : (
        <>
        {aba === 'pessoas' && (
          <PlatformUsers
            onToast={flash}
            textos={{
              searchPh: tr.uSearchPh, hint: tr.uHint, none: tr.uNone,
              noCompany: tr.uNoCompany, verifyEmail: tr.uVerifyEmail, verified: tr.uVerified,
              resetPassword: tr.uResetPassword, newPassword: tr.uNewPassword,
              deactivate: tr.uDeactivate, activate: tr.uActivate, inactive: tr.uInactive,
              suspendLink: tr.uSuspendLink, reactivateLink: tr.uReactivateLink,
              removeLink: tr.uRemoveLink, confirm: tr.uConfirm, done: tr.saved,
              platformAdmin: tr.uPlatformAdmin,
              noneBody: tr.uNoneBody,
              newUser: tr.uNewUser, company: tr.uCompany, name: tr.uName2,
              email: tr.cEmail, create: tr.create2,
              cancel: tr.uCancel, created: tr.userAdded,
              pendingInvite: tr.uPendingInvite, inviteExpired: tr.uInviteExpired,
              resendInvite: tr.uResendInvite, pendingHint: tr.uPendingHint,
            }}
            empresas={(rows ?? []).map((r) => ({ id: String(r.id), name: r.name }))}
          />
        )}

        {aba === 'armazenamento' && (
          <PlatformConsumo
            endpoint="/platform/storage"
            discriminado
            onToast={flash}
            formatar={mb}
            // A pessoa digita MB porque é a unidade em que ela pensa o teto de um
            // cliente; o servidor guarda bytes. 0 continua significando "sem
            // limite" dos dois lados.
            paraEnvio={(v) => Math.round(Number(v.replace(',', '.')) * 1024 * 1024)}
            rotaLimite={(id) => `/platform/tenants/${id}/storage-limit`}
            campoLimite="limit_bytes"
            textos={{
              titulo: tr.stTitle, subtitulo: tr.stSub,
              totalLabel: tr.stTotal, totalSub: tr.stTotalSub,
              overLabel: tr.stOver, overGlobal: tr.stOverAll, noLimit: tr.stNoLimit,
              salvar: tr.save, salvo: tr.stSaved, dica: tr.stHint, vazio: tr.stEmpty,
              evidence: tr.stEvidence, signatures: tr.stSignatures,
            }}
          />
        )}

        {aba === 'tokens' && (
          <PlatformConsumo
            endpoint="/platform/ai-usage"
            onToast={flash}
            formatar={(n) => num(n, lang)}
            // Aqui a unidade digitada JÁ é a unidade guardada; o replace só tira
            // separador de milhar de quem cola "1.000.000".
            paraEnvio={(v) => Math.round(Number(v.replace(/[.,\s]/g, '')))}
            rotaLimite={(id) => `/platform/tenants/${id}/ai-limit`}
            campoLimite="limit"
            textos={{
              titulo: tr.aiTitle, subtitulo: tr.aiSub,
              totalLabel: tr.aiTotal, totalSub: tr.aiTotalSub,
              overLabel: tr.stOver, overGlobal: tr.stOverAll, noLimit: tr.stNoLimit,
              salvar: tr.save, salvo: tr.aiSaved, dica: tr.aiHint, vazio: tr.aiEmpty,
            }}
          />
        )}

        {aba === 'sistema' && (
          <PlatformHealth
            card={card}
            onToast={flash}
            textos={{
              title: tr.tab_sistema, email: tr.hEmail, storage: tr.hStorage,
              reminders: tr.hReminders, ai: tr.hAi, ok: tr.hOk, off: tr.hOff,
              sender: tr.hSender, bucket: tr.hBucket, ephemeral: tr.hEphemeral,
              every: tr.hEvery, awaitingTriage: tr.hAwaiting, environment: tr.hEnvironment,
              loading: tr.uSearching,
            }}
          />
        )}

        {aba === 'empresas' && <>
        {/* Stats globais */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 28 }}>
          {ov && stat(tr.tenants, ov.tenants)}
          {ov && stat(tr.users, ov.users)}
          {ov && stat(tr.channels, ov.channels)}
          {ov && stat(tr.openCases, ov.open_cases)}
          {ov && stat(tr.aiUsed, ov.ai_tokens_used)}
        </div>

        {/* Empresas */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr.search}
              style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--heading)', fontSize: 14.5, boxSizing: 'border-box' }} />
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>{tr.none}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    <th style={{ padding: '10px 16px' }}>{tr.tenants}</th>
                    <th style={{ padding: '10px 16px' }}>{tr.plan}</th>
                    <th style={{ padding: '10px 16px' }}>{tr.usersCol}</th>
                    <th style={{ padding: '10px 16px' }}>{tr.channels}</th>
                    <th style={{ padding: '10px 16px' }}>{tr.cases}</th>
                    <th style={{ padding: '10px 16px' }}>{tr.aiCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} onClick={() => void openDetail(r.id)} className="app-row-hover"
                      style={{ cursor: 'pointer', borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: 'var(--heading)', fontWeight: 700 }}>{r.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>/{r.slug}{r.subscription_status === 'suspended' ? ' · ⏸' : ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{r.plan_name ?? '—'}</td>
                      <td style={{ padding: '12px 16px' }}>{num(r.users, lang)}</td>
                      <td style={{ padding: '12px 16px' }}>{num(r.channels, lang)}</td>
                      <td style={{ padding: '12px 16px' }}>{num(r.cases, lang)}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {num(r.ai_tokens_used, lang)} / {r.ai_token_limit === 0 ? '∞' : num(r.ai_token_limit, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>}
        </>
        )}
        </div>
      </main>

      {/* Detalhe da empresa */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--scrim)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ color: 'var(--heading)', fontWeight: 900, fontSize: 22 }}>{detail.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'monospace' }}>/{detail.slug} · {detail.plan_name ?? '—'} · {detail.subscription_status === 'suspended' ? tr.suspended : tr.active}</div>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Cota de IA */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{tr.plan}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
                <select
                  value={plans.find((p) => p.name === detail.plan_name)?.id ?? ''}
                  onChange={(e) => void trocarPlano(e.target.value)}
                  disabled={busy}
                  style={{ ...fld, width: 'auto', minWidth: 190, background: 'var(--surface)' }}
                >
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                  {detail.users} {tr.usersCol.toLowerCase()}
                </span>
              </div>

              {/* Armazenamento — o ÚNICO controle de storage que cabe aqui.
                  O bucket é infraestrutura, um só para a plataforma; o que se
                  reparte por empresa é quanto dela cabe nele. */}
              <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{tr.storageQuota}</div>
              <div style={{ color: 'var(--heading)', fontSize: 14, marginBottom: 6 }}>
                {mb(detail.storage_used_bytes)} / {detail.storage_limit_bytes === 0 ? '∞' : mb(detail.storage_limit_bytes)}
              </div>
              {detail.storage_limit_bytes > 0 && (
                <div style={{ height: 6, borderRadius: 100, background: 'var(--surface-2)', overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ width: `${Math.min(100, (detail.storage_used_bytes / detail.storage_limit_bytes) * 100)}%`, height: '100%', background: detail.storage_used_bytes >= detail.storage_limit_bytes ? '#e11d48' : 'var(--accent)' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                <input
                  type="number" min={0} value={storageEdit}
                  onChange={(e) => setStorageEdit(e.target.value)}
                  placeholder="MB"
                  style={{ width: 160, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--heading)', fontSize: 14 }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>MB · 0 = ∞</span>
                <button disabled={busy} onClick={() => void salvarStorage()} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 100, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{tr.save}</button>
              </div>
              <p style={{ background: 'rgba(242,146,30,.12)', border: '1px solid rgba(242,146,30,.35)', color: 'var(--accent)', borderRadius: 10, padding: '9px 11px', fontSize: 12, lineHeight: 1.5, marginBottom: 18 }}>
                {tr.storageWarn}
              </p>

              <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{tr.aiQuota}</div>
              <div style={{ color: 'var(--heading)', fontSize: 14, marginBottom: 10 }}>{num(detail.ai_tokens_used, lang)} / {detail.ai_token_limit === 0 ? '∞' : num(detail.ai_token_limit, lang)}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="number" min={0} value={limitEdit} onChange={(e) => setLimitEdit(e.target.value)}
                  style={{ width: 160, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--heading)', fontSize: 14 }} />
                <button disabled={busy} onClick={() => void saveLimit()} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 100, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{tr.save}</button>
                <button disabled={busy} onClick={() => void resetAi()} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 100, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{tr.reset}</button>
                <button disabled={busy} onClick={() => void toggleSuspend()} style={{ background: detail.subscription_status === 'suspended' ? 'rgba(34,197,94,.14)' : 'rgba(225,29,72,.12)', color: detail.subscription_status === 'suspended' ? '#16a34a' : '#e11d48', border: `1px solid ${detail.subscription_status === 'suspended' ? 'rgba(34,197,94,.4)' : 'rgba(225,29,72,.4)'}`, borderRadius: 100, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
                  {detail.subscription_status === 'suspended' ? tr.reactivate : tr.suspend}
                </button>
              </div>
            </div>

            {/* Membros */}
            <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{tr.members} · {detail.members.length}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {detail.members.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, background: 'var(--surface-2)', borderRadius: 10, padding: '9px 12px', flexWrap: 'wrap' }}>
                  <div><span style={{ color: 'var(--heading)', fontWeight: 600 }}>{m.name || m.email}</span> <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{m.email}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{m.roles.join(', ') || '—'} · {m.status}</span>
                    {m.status === 'invited' && (
                      <button
                        onClick={() => void resendInvite(m.id)}
                        disabled={resendId === m.id}
                        style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 100, padding: '4px 11px', fontSize: 12, fontWeight: 700, cursor: resendId === m.id ? 'default' : 'pointer', opacity: resendId === m.id ? 0.6 : 1 }}
                      >
                        {resendId === m.id ? tr.resending : tr.resend}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Canais */}
            <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{tr.channelsList} · {detail.channels_list.length}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {detail.channels_list.map((c) => (
                <span key={c.id} style={{ background: 'var(--surface-2)', borderRadius: 100, padding: '5px 12px', fontSize: 12.5, color: 'var(--text)' }}>{c.name} <span style={{ color: 'var(--text-muted)' }}>· {c.module}{c.is_active ? '' : ' ⏸'}</span></span>
              ))}
              {detail.channels_list.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>}
            </div>

            {/* Adicionar usuário à empresa */}
            <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>{tr.addUser}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input style={fld} placeholder={tr.uName} value={mf.full_name} onChange={(e) => setMf({ ...mf, full_name: e.target.value })} />
                <input style={fld} type="email" placeholder={tr.cEmail} value={mf.email} onChange={(e) => setMf({ ...mf, email: e.target.value })} />
                <input style={fld} type="password" placeholder={tr.cPassword} value={mf.password} onChange={(e) => setMf({ ...mf, password: e.target.value })} />
                <select style={fld} value={mf.role_id} onChange={(e) => setMf({ ...mf, role_id: e.target.value })}>
                  <option value="">{tr.uRole}</option>
                  {detail.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <button disabled={busy || !mf.full_name.trim() || !mf.email.trim() || mf.password.length < 8} onClick={() => void addMember()} style={{ ...btnAccent, marginTop: 10, opacity: busy || !mf.full_name.trim() || !mf.email.trim() || mf.password.length < 8 ? 0.6 : 1 }}>{tr.add}</button>
            </div>
          </div>
        </div>
      )}

      {/* Nova empresa */}
      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--scrim)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ color: 'var(--heading)', fontWeight: 900, fontSize: 20 }}>{tr.newCompany}</div>
              <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={fld} placeholder={tr.cName} value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} />
              <input style={fld} placeholder={`${tr.cSlug} ${tr.autoSlug}`} value={nf.slug} onChange={(e) => setNf({ ...nf, slug: e.target.value })} />
              <select style={fld} value={nf.plan_id} onChange={(e) => setNf({ ...nf, plan_id: e.target.value })}>
                <option value="">{tr.cPlan}</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.enabled_modules.length} mód.</option>)}
              </select>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 6 }}>{tr.cAdmin}</div>
              <input style={fld} placeholder={tr.cAdminName} value={nf.admin_name} onChange={(e) => setNf({ ...nf, admin_name: e.target.value })} />
              <input style={fld} type="email" placeholder={tr.cEmail} value={nf.admin_email} onChange={(e) => setNf({ ...nf, admin_email: e.target.value })} />
              <input style={fld} type="password" placeholder={tr.cPassword} value={nf.admin_password} onChange={(e) => setNf({ ...nf, admin_password: e.target.value })} />
              <button disabled={busy || !nf.name.trim() || !nf.admin_name.trim() || !nf.admin_email.trim() || nf.admin_password.length < 8} onClick={() => void createCompany()} style={{ ...btnAccent, marginTop: 6, opacity: busy || !nf.name.trim() || !nf.admin_name.trim() || !nf.admin_email.trim() || nf.admin_password.length < 8 ? 0.6 : 1 }}>{tr.create}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--heading)', color: 'var(--surface)', padding: '12px 22px', borderRadius: 100, fontWeight: 700, fontSize: 14, zIndex: 10002 }}>{toast}</div>
      )}
    </div>
  )
}
