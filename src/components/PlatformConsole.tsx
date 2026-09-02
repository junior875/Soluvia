// Console de plataforma (superadmin Soluqtion). Área 100% do sistema: todas as
// empresas, usuários, canais, casos e consumo de IA — com manutenção (cota de IA,
// reset, suspender). Standalone (#plataforma): não depende do painel de tenant.
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { api, listPlans, logout } from '../lib/api'
import type { ApiError, PlanOut, PlatformOverview, PlatformTenantDetail, PlatformTenantRow } from '../lib/types'
import { useTranslation } from '../i18n/LanguageProvider'
import PrefSwitcher from './PrefSwitcher'
import { Icon, type IconName } from '../app/icons'
import { Avatar } from '../app/ui'
import AvatarEditor from './AvatarEditor'
import { ManualView } from '../app/manual/ManualView'
import { CAPITULOS_PLATAFORMA } from '../app/manual/conteudoPlataforma'
import { Button, Card, EmptyState } from '../app/ui'
import PlatformHealth from './platform/PlatformHealth'
import PlatformUsers from './platform/PlatformUsers'
import PlatformConsumo from './platform/PlatformConsumo'
import PlatformWallet from './platform/PlatformWallet'
import PlatformFinance from './platform/PlatformFinance'
import { PasswordInput } from '../app/ui'

const L = {
  pt: {
    kicker: 'Console Soluqtion', subtitle: 'Visão total da plataforma', logout: 'Sair',
    photoTitle: 'Sua foto de perfil', photoChange: 'Trocar sua foto', photoPick: 'Escolher imagem',
    photoHint: 'Arraste para posicionar; o zoom ajusta o enquadramento.', photoSaved: 'Foto salva.',
    tenants: 'Empresas', users: 'Usuários', channels: 'Canais', cases: 'Casos', openCases: 'Casos abertos',
    aiUsed: 'Tokens de IA usados', search: 'Buscar empresa…', plan: 'Plano', usersCol: 'Usuários',
    aiCol: 'IA (uso/limite)', status: 'Status', none: 'Nenhuma empresa encontrada.',
    members: 'Membros', channelsList: 'Canais', aiQuota: 'Cota de IA (tokens)', save: 'Salvar',
    seats: 'Usuários (assentos)', seatsUsePlan: 'Usar padrão do plano',
    seatsFromPlan: 'Valendo o padrão do plano: {p} usuários. Digite um número para dar um teto próprio a esta empresa.',
    seatsManual: 'Teto próprio desta empresa: {n} usuários (padrão do plano: {p}).',
    walletFree: 'Disponível na carteira da plataforma: {n} tokens.',
    reset: 'Zerar uso', suspend: 'Suspender', reactivate: 'Reativar', close: 'Fechar',
    secVisao: 'Visão geral', secPlano: 'Plano & vagas', secStorage: 'Armazenamento', secIa: 'IA',
    secPessoas: 'Pessoas', secCanais: 'Canais', secAcoes: 'Ações',
    dangerTitle: 'Zona de risco',
    dangerBody: 'Suspender tira TODA a empresa do ar na hora: ninguém entra e os links públicos param. Reativar devolve tudo como estava.',
    confirmSuspend: 'Suspender esta empresa agora? Ninguém dela conseguirá entrar.',
    confirmReset: 'Zerar o uso de IA desta empresa? O contador do mês volta a zero.',
    active: 'ativa', suspended: 'suspensa', domain: 'Domínio', created: 'Criada em', saved: 'Atualizado.',
    newCompany: 'Nova empresa', cName: 'Nome da empresa', cSlug: 'Endereço (slug, opcional)', cPlan: 'Plano',
    cAdmin: 'Admin da empresa', cAdminName: 'Nome do admin', cEmail: 'E-mail', cPassword: 'Senha (mín. 8)',
    create: 'Criar empresa', companyCreated: 'Empresa criada.', addUser: 'Adicionar usuário', uName: 'Nome',
    uRole: 'Papel', add: 'Adicionar', userAdded: 'Usuário adicionado.', autoSlug: '(gerado do nome)',
    existingNote: 'Este e-mail já tem conta na plataforma. Vai virar um segundo vínculo: a senha atual continua valendo e, no login, a pessoa escolhe a empresa.',
    attachedOk: 'Vínculo adicionado — o login da pessoa continua o mesmo.',
    resend: 'Reenviar convite', resending: 'Enviando…', resendOk: 'Convite reenviado por e-mail.',
    gateAnonTitle: 'Entre para acessar o console', gateAnonBody: 'Esta área exige uma conta de plataforma Soluqtion.', gateSignIn: 'Entrar',
    gateForbiddenTitle: 'Esta conta não é de plataforma', gateForbiddenBody: 'Você está numa conta de empresa. Saia e entre com a conta Soluqtion.',
    storageQuota: 'Armazenamento de provas', storageWarn: 'Ao atingir o teto, os canais de denúncia e SAC param de aceitar ANEXOS — o relato continua entrando, mas sem foto, vídeo ou documento.',
    uNoneBody: 'Ajuste a busca ou crie uma pessoa nova.',
    uNewUser: 'Nova pessoa', uCompany: 'Empresa', uName2: 'Nome', create2: 'Criar', uCancel: 'Cancelar',
    uCreatedInvited: 'Convite enviado — a pessoa recebe o código por e-mail e escolhe a própria senha.',
    uNoRole: 'Sem papel definido',
    uPasswordOptional: 'Senha (opcional)',
    uPasswordOptionalHint: 'Deixe em branco: a pessoa recebe um e-mail com o código, abre o link e escolhe a senha dela. Só preencha se precisar entregar o acesso pronto.',
    navSection: 'Console', tab_empresas: 'Empresas', tab_pessoas: 'Pessoas', tab_sistema: 'Sistema', tab_manual: 'Manual',
    mToc: 'Sumário', mHide: 'Esconder o sumário', mShow: 'Mostrar o sumário',
    mOpen: 'Abrir', mLocked: 'Não contratado', mReq: 'obrigatório', mOpt: 'opcional',
    mEmpty: 'Nada para mostrar', mEmptyBody: 'O manual do console está vazio.',
    stDeTeto: 'de', stLivre: 'livre:',
    tab_armazenamento: 'Armazenamento', tab_tokens: 'Tokens de IA',
    tab_financeiro: 'Custos e entradas',
    fTitulo: 'Custos e entradas', fSub: 'O que está contratado, o que entrou de verdade e o que custa manter.',
    fMrr: 'MRR contratado', fMrrSub: 'assinaturas ativas',
    fRecebido: 'Recebido no mês', fRecebidoSub: 'líquido, já sem as taxas',
    fCusto: 'Custo do mês', fCustoSub: 'IA + armazenamento + taxas + fixo',
    fLucro: 'Resultado do mês',
    fSemStripe: 'Stripe não configurado',
    fSemStripeCorpo: 'Sem a chave da Stripe não dá para saber o que entrou. Os números de receita acima usam o valor CONTRATADO, não o recebido.',
    fErroStripe: 'A Stripe não respondeu',
    fErroStripeCorpo: 'A credencial existe, mas a consulta falhou. O que entrou de fato está indisponível agora — o valor mostrado é o contratado.',
    fPorMes: 'Mês', fPorMesLegenda: 'Entradas em valor bruto; custos incluem IA, taxas da Stripe e o fixo. Armazenamento entra só no mês corrente, porque o banco guarda o tamanho de hoje e não o histórico.',
    fEntrou: 'Entrou', fSaiu: 'Custou',
    fBruto: 'Bruto', fTaxas: 'Taxas', fLiquido: 'Líquido', fEstornos: 'Estornos',
    fPorPlano: 'Receita por plano', fEmpresas: 'Empresa',
    fPlano: 'Plano', fMrrCol: 'MRR', fCustoCol: 'Custo', fMargemCol: 'Margem',
    fChurn: 'em cancelamento', fChurnSub: 'Já cancelaram e mantêm acesso até o fim do ciclo. É o MRR que cai no próximo.',
    fOrigens: 'De onde vem o custo', fOrigemIa: 'Inteligência artificial', fOrigemStorage: 'Armazenamento',
    fOrigemTaxas: 'Taxas da Stripe', fOrigemFixo: 'Infraestrutura fixa',
    fRateio: 'Rateio do consumo medido — nenhum fornecedor emite nota por empresa.',
    fTaxasUsadas: 'Taxas usadas', fTaxasOnde: 'Ajustáveis por variável de ambiente, junto com o resto da configuração de infraestrutura.',
    fVazio: 'Nada registrado ainda.',
    fCicloMensal: 'mensal', fCicloAnual: 'anual',
    fAtiva: 'ativa', fCancelada: 'cancelada', fSuspensa: 'suspensa',
    fBaseRecebido: 'sobre o recebido', fBaseContratado: 'sobre o contratado', fUnidadeMes: 'mês',
    stTitle: 'Armazenamento', stSub: 'Quanto cada empresa ocupa e do que esse espaço é feito.',
    stTotal: 'Total da plataforma', stTotalSub: 'Soma de todas as empresas — é o que fecha com a fatura do provedor.',
    stEvidence: 'Provas', stSignatures: 'Assinaturas', stOver: 'no teto', stOverAll: 'empresas no teto', stNoLimit: 'sem limite',
    stHint: 'MB', stSaved: 'Teto atualizado', stEmpty: 'Nenhuma empresa cadastrada.',
    aiTitle: 'Tokens de IA', aiSub: 'Quanto cada empresa já gastou do que foi liberado para ela.',
    aiTotal: 'Consumo da plataforma', aiTotalSub: 'Soma de todas as empresas desde o último zeramento.',
    aiHint: 'tokens', aiSaved: 'Cota atualizada', aiEmpty: 'Nenhuma empresa cadastrada.',
    uSearchPh: 'Buscar pessoa por e-mail ou nome…', uHint: 'Mínimo de 2 caracteres. A busca cobre todas as empresas.',
    uNone: 'Ninguém encontrado.', uSearching: 'Buscando…', uNoCompany: 'Sem vínculo com empresa.',
    uVerifyEmail: 'Verificar e-mail', uSendAccess: 'Reenviar acesso', uAccessSent: 'Enviamos um e-mail com o código para a pessoa redefinir a senha.', uSendVerification: 'Enviar verificação', uVerificationSent: 'Código de verificação enviado para o e-mail.', uMarkVerified: 'Marcar verificado', uVerified: 'e-mail verificado', uResetPassword: 'Definir senha',
    uNewPassword: 'Nova senha (mín. 8)', uDeactivate: 'Desativar conta', uActivate: 'Reativar conta',
    uInactive: 'conta inativa', uSuspendLink: 'Suspender', uReactivateLink: 'Reativar',
    uRemoveLink: 'Remover', uConfirm: 'Confirmar?', uPlatformAdmin: 'plataforma',
    uPendingInvite: 'convite pendente', uInviteExpired: 'convite vencido',
    uResendInvite: 'Reenviar convite',
    uPendingHint: 'Convidado — ainda não aceitou, então a conta não existe.',
    uDeleteUser: 'Excluir',
    uDeleteTitle: 'Excluir esta pessoa?',
    uDeleteHard: 'Esta pessoa não assinou nada no sistema, então a conta e os vínculos dela somem de verdade. É reversível apenas cadastrando tudo de novo.',
    uDeleteAnon: 'Esta pessoa JÁ ASSINOU documentos. Os registros de assinatura ficam (apagá-los faria as assinaturas dela aparecerem como adulteradas no verificador público), mas a conta é desativada e some das telas.',
    uDeleteFrees: (email: string) => `O e-mail ${email} fica livre para um cadastro novo, em qualquer empresa.`,
    uDeleteMemberships: (n: number) => n === 1 ? '1 vínculo com empresa será removido.' : `${n} vínculos com empresas serão removidos.`,
    uDeletePending: (n: number) => n === 1 ? 'Atenção: 1 parecer está aberto com esta pessoa — ele volta a valer pelo papel, sem travar a apuração.' : `Atenção: ${n} pareceres estão abertos com esta pessoa — eles voltam a valer pelo papel, sem travar as apurações.`,
    uDeleteConfirm: 'Excluir definitivamente',
    uDeleteDone: (email: string) => `Pronto — ${email} está livre para um cadastro novo.`,
    hEmail: 'E-mail', hStorage: 'Armazenamento', hReminders: 'Lembretes', hAi: 'Inteligência artificial',
    hOk: 'configurado', hOff: 'não configurado', hSender: 'Remetente', hBucket: 'Bucket',
    hEphemeral: 'Sem bucket configurado, os arquivos vão para o disco do container — que é apagado a cada deploy.',
    hEvery: 'Varredura a cada', hAwaiting: 'Casos aguardando triagem', hEnvironment: 'Ambiente', hSentTotal: 'Enviados (total)', hSent30d: 'Últimos 30 dias', hSentToday: 'Hoje',
  },
  en: {
    kicker: 'Soluqtion Console', subtitle: 'Full platform view', logout: 'Sign out',
    photoTitle: 'Your profile photo', photoChange: 'Change your photo', photoPick: 'Choose image',
    photoHint: 'Drag to position; zoom adjusts the framing.', photoSaved: 'Photo saved.',
    tenants: 'Companies', users: 'Users', channels: 'Channels', cases: 'Cases', openCases: 'Open cases',
    aiUsed: 'AI tokens used', search: 'Search company…', plan: 'Plan', usersCol: 'Users',
    aiCol: 'AI (used/limit)', status: 'Status', none: 'No companies found.',
    members: 'Members', channelsList: 'Channels', aiQuota: 'AI quota (tokens)', save: 'Save',
    seats: 'Users (seats)', seatsUsePlan: 'Use plan default',
    seatsFromPlan: 'Following the plan default: {p} users. Type a number to give this company its own cap.',
    seatsManual: 'Custom cap for this company: {n} users (plan default: {p}).',
    walletFree: 'Available in the platform wallet: {n} tokens.',
    reset: 'Reset usage', suspend: 'Suspend', reactivate: 'Reactivate', close: 'Close',
    secVisao: 'Overview', secPlano: 'Plan & seats', secStorage: 'Storage', secIa: 'AI',
    secPessoas: 'People', secCanais: 'Channels', secAcoes: 'Actions',
    dangerTitle: 'Danger zone',
    dangerBody: 'Suspending takes the WHOLE company offline immediately: nobody signs in and public links stop. Reactivating brings everything back.',
    confirmSuspend: 'Suspend this company now? Nobody in it will be able to sign in.',
    confirmReset: "Reset this company's AI usage? The monthly counter goes back to zero.",
    active: 'active', suspended: 'suspended', domain: 'Domain', created: 'Created', saved: 'Updated.',
    newCompany: 'New company', cName: 'Company name', cSlug: 'Address (slug, optional)', cPlan: 'Plan',
    cAdmin: 'Company admin', cAdminName: 'Admin name', cEmail: 'Email', cPassword: 'Password (min. 8)',
    create: 'Create company', companyCreated: 'Company created.', addUser: 'Add user', uName: 'Name',
    uRole: 'Role', add: 'Add', userAdded: 'User added.', autoSlug: '(from the name)',
    existingNote: 'This email already has an account. It becomes a second membership: the current password stays valid and the person picks the company at login.',
    attachedOk: 'Membership added — the person keeps the same login.',
    resend: 'Resend invite', resending: 'Sending…', resendOk: 'Invitation re-sent by email.',
    gateAnonTitle: 'Sign in to access the console', gateAnonBody: 'This area requires a Soluqtion platform account.', gateSignIn: 'Sign in',
    gateForbiddenTitle: 'This account is not a platform account', gateForbiddenBody: 'You are on a company account. Sign out and use the Soluqtion account.',
    storageQuota: 'Evidence storage', storageWarn: 'Once the cap is reached, the whistleblowing and SAC channels stop accepting ATTACHMENTS — reports still come in, but with no photo, video or document.',
    uNoneBody: 'Adjust the search or create a new person.',
    uNewUser: 'New person', uCompany: 'Company', uName2: 'Name', create2: 'Create', uCancel: 'Cancel',
    uCreatedInvited: 'Invite sent — the person gets the code by email and picks their own password.',
    uNoRole: 'No role set',
    uPasswordOptional: 'Password (optional)',
    uPasswordOptionalHint: 'Leave it blank: the person gets an email with the code, opens the link and picks their own password. Fill it in only if you must hand over ready-made access.',
    navSection: 'Console', tab_empresas: 'Companies', tab_pessoas: 'People', tab_sistema: 'System', tab_manual: 'Manual',
    mToc: 'Contents', mHide: 'Hide contents', mShow: 'Show contents',
    mOpen: 'Open', mLocked: 'Not included', mReq: 'required', mOpt: 'optional',
    mEmpty: 'Nothing to show', mEmptyBody: 'The console manual is empty.',
    stDeTeto: 'of', stLivre: 'free:',
    tab_armazenamento: 'Storage', tab_tokens: 'AI tokens',
    tab_financeiro: 'Costs & revenue',
    fTitulo: 'Costs & revenue', fSub: 'What is contracted, what actually came in, and what it costs to run.',
    fMrr: 'Contracted MRR', fMrrSub: 'active subscriptions',
    fRecebido: 'Received this month', fRecebidoSub: 'net, fees already deducted',
    fCusto: 'Cost this month', fCustoSub: 'AI + storage + fees + fixed',
    fLucro: 'Result this month',
    fSemStripe: 'Stripe not configured',
    fSemStripeCorpo: 'Without the Stripe key there is no way to know what came in. The revenue figures above use the CONTRACTED value, not what was received.',
    fErroStripe: 'Stripe did not respond',
    fErroStripeCorpo: 'The credential exists but the call failed. Actual income is unavailable right now — the figure shown is the contracted one.',
    fPorMes: 'Month', fPorMesLegenda: 'Income is gross; costs include AI, Stripe fees and the fixed line. Storage counts only in the current month, because the database stores the size as of today and not the history.',
    fEntrou: 'In', fSaiu: 'Out',
    fBruto: 'Gross', fTaxas: 'Fees', fLiquido: 'Net', fEstornos: 'Refunds',
    fPorPlano: 'Revenue by plan', fEmpresas: 'Company',
    fPlano: 'Plan', fMrrCol: 'MRR', fCustoCol: 'Cost', fMargemCol: 'Margin',
    fChurn: 'churning', fChurnSub: 'Already cancelled, access until the cycle ends. This is the MRR that drops next month.',
    fOrigens: 'Where the cost comes from', fOrigemIa: 'Artificial intelligence', fOrigemStorage: 'Storage',
    fOrigemTaxas: 'Stripe fees', fOrigemFixo: 'Fixed infrastructure',
    fRateio: 'Allocation of measured usage — no provider invoices per company.',
    fTaxasUsadas: 'Rates used', fTaxasOnde: 'Adjustable via environment variables, alongside the rest of the infrastructure config.',
    fVazio: 'Nothing recorded yet.',
    fCicloMensal: 'monthly', fCicloAnual: 'yearly',
    fAtiva: 'active', fCancelada: 'cancelled', fSuspensa: 'suspended',
    fBaseRecebido: 'on money received', fBaseContratado: 'on contracted value', fUnidadeMes: 'month',
    stTitle: 'Storage', stSub: 'How much each company takes up, and what that space is made of.',
    stTotal: 'Platform total', stTotalSub: 'Sum of every company — this is what matches the provider invoice.',
    stEvidence: 'Evidence', stSignatures: 'Signatures', stOver: 'at cap', stOverAll: 'companies at cap', stNoLimit: 'no limit',
    stHint: 'MB', stSaved: 'Cap updated', stEmpty: 'No companies yet.',
    aiTitle: 'AI tokens', aiSub: 'How much each company has spent of what was granted to it.',
    aiTotal: 'Platform usage', aiTotalSub: 'Sum of every company since the last reset.',
    aiHint: 'tokens', aiSaved: 'Quota updated', aiEmpty: 'No companies yet.',
    uSearchPh: 'Search a person by email or name…', uHint: 'At least 2 characters. Covers every company.',
    uNone: 'Nobody found.', uSearching: 'Searching…', uNoCompany: 'No company link.',
    uVerifyEmail: 'Verify email', uSendAccess: 'Resend access', uAccessSent: 'We sent an email with the code for the person to reset their password.', uSendVerification: 'Send verification', uVerificationSent: 'Verification code sent to the email.', uMarkVerified: 'Mark verified', uVerified: 'email verified', uResetPassword: 'Set password',
    uNewPassword: 'New password (min. 8)', uDeactivate: 'Deactivate account', uActivate: 'Reactivate account',
    uInactive: 'inactive account', uSuspendLink: 'Suspend', uReactivateLink: 'Reactivate',
    uRemoveLink: 'Remove', uConfirm: 'Confirm?', uPlatformAdmin: 'platform',
    uPendingInvite: 'invite pending', uInviteExpired: 'invite expired',
    uResendInvite: 'Resend invite',
    uPendingHint: 'Invited — has not accepted yet, so no account exists.',
    uDeleteUser: 'Delete',
    uDeleteTitle: 'Delete this person?',
    uDeleteHard: 'This person has not signed anything, so the account and their memberships are really deleted. Undoing means registering everything again.',
    uDeleteAnon: 'This person HAS SIGNED documents. The signature records stay (deleting them would make their signatures show as tampered in the public verifier), but the account is deactivated and disappears from the screens.',
    uDeleteFrees: (email: string) => `The address ${email} becomes free for a new registration, in any company.`,
    uDeleteMemberships: (n: number) => n === 1 ? '1 company membership will be removed.' : `${n} company memberships will be removed.`,
    uDeletePending: (n: number) => n === 1 ? 'Heads up: 1 review is open with this person — it goes back to the role, without stalling the investigation.' : `Heads up: ${n} reviews are open with this person — they go back to the role, without stalling the investigations.`,
    uDeleteConfirm: 'Delete permanently',
    uDeleteDone: (email: string) => `Done — ${email} is free for a new registration.`,
    hEmail: 'Email', hStorage: 'Storage', hReminders: 'Reminders', hAi: 'Artificial intelligence',
    hOk: 'configured', hOff: 'not configured', hSender: 'Sender', hBucket: 'Bucket',
    hEphemeral: 'With no bucket configured, files go to the container disk — which is wiped on every deploy.',
    hEvery: 'Scan every', hAwaiting: 'Cases awaiting triage', hEnvironment: 'Environment', hSentTotal: 'Sent (total)', hSent30d: 'Last 30 days', hSentToday: 'Today',
  },
  es: {
    kicker: 'Consola Soluqtion', subtitle: 'Vista total de la plataforma', logout: 'Salir',
    photoTitle: 'Tu foto de perfil', photoChange: 'Cambiar tu foto', photoPick: 'Elegir imagen',
    photoHint: 'Arrastra para posicionar; el zoom ajusta el encuadre.', photoSaved: 'Foto guardada.',
    tenants: 'Empresas', users: 'Usuarios', channels: 'Canales', cases: 'Casos', openCases: 'Casos abiertos',
    aiUsed: 'Tokens de IA usados', search: 'Buscar empresa…', plan: 'Plan', usersCol: 'Usuarios',
    aiCol: 'IA (uso/límite)', status: 'Estado', none: 'No se encontraron empresas.',
    members: 'Miembros', channelsList: 'Canales', aiQuota: 'Cuota de IA (tokens)', save: 'Guardar',
    seats: 'Usuarios (asientos)', seatsUsePlan: 'Usar el plan',
    seatsFromPlan: 'Rige el estándar del plan: {p} usuarios. Escribe un número para dar un tope propio a esta empresa.',
    seatsManual: 'Tope propio de esta empresa: {n} usuarios (estándar del plan: {p}).',
    walletFree: 'Disponible en la cartera de la plataforma: {n} tokens.',
    reset: 'Reiniciar uso', suspend: 'Suspender', reactivate: 'Reactivar', close: 'Cerrar',
    secVisao: 'Visión general', secPlano: 'Plan y cupos', secStorage: 'Almacenamiento', secIa: 'IA',
    secPessoas: 'Personas', secCanais: 'Canales', secAcoes: 'Acciones',
    dangerTitle: 'Zona de riesgo',
    dangerBody: 'Suspender saca a TODA la empresa del aire de inmediato: nadie entra y los enlaces públicos se detienen. Reactivar lo devuelve todo.',
    confirmSuspend: '¿Suspender esta empresa ahora? Nadie de ella podrá entrar.',
    confirmReset: '¿Reiniciar el uso de IA de esta empresa? El contador del mes vuelve a cero.',
    active: 'activa', suspended: 'suspendida', domain: 'Dominio', created: 'Creada', saved: 'Actualizado.',
    newCompany: 'Nueva empresa', cName: 'Nombre de la empresa', cSlug: 'Dirección (slug, opcional)', cPlan: 'Plan',
    cAdmin: 'Admin de la empresa', cAdminName: 'Nombre del admin', cEmail: 'Correo', cPassword: 'Contraseña (mín. 8)',
    create: 'Crear empresa', companyCreated: 'Empresa creada.', addUser: 'Agregar usuario', uName: 'Nombre',
    uRole: 'Rol', add: 'Agregar', userAdded: 'Usuario agregado.', autoSlug: '(generado del nombre)',
    existingNote: 'Este correo ya tiene cuenta. Será un segundo vínculo: la contraseña actual sigue valiendo y la persona elige la empresa al entrar.',
    attachedOk: 'Vínculo agregado — el acceso de la persona sigue igual.',
    resend: 'Reenviar invitación', resending: 'Enviando…', resendOk: 'Invitación reenviada por correo.',
    gateAnonTitle: 'Inicia sesión para acceder a la consola', gateAnonBody: 'Esta área exige una cuenta de plataforma Soluqtion.', gateSignIn: 'Entrar',
    gateForbiddenTitle: 'Esta cuenta no es de plataforma', gateForbiddenBody: 'Estás en una cuenta de empresa. Sal y entra con la cuenta Soluqtion.',
    storageQuota: 'Almacenamiento de pruebas', storageWarn: 'Al alcanzar el tope, los canales de denuncias y SAC dejan de aceptar ADJUNTOS — los relatos siguen entrando, pero sin foto, video ni documento.',
    uNoneBody: 'Ajusta la búsqueda o crea una persona nueva.',
    uNewUser: 'Nueva persona', uCompany: 'Empresa', uName2: 'Nombre', create2: 'Crear', uCancel: 'Cancelar',
    uCreatedInvited: 'Invitación enviada — la persona recibe el código por correo y elige su propia contraseña.',
    uNoRole: 'Sin rol definido',
    uPasswordOptional: 'Contraseña (opcional)',
    uPasswordOptionalHint: 'Déjala en blanco: la persona recibe un correo con el código, abre el enlace y elige su contraseña. Complétala solo si necesitas entregar el acceso listo.',
    navSection: 'Consola', tab_empresas: 'Empresas', tab_pessoas: 'Personas', tab_sistema: 'Sistema', tab_manual: 'Manual',
    mToc: 'Contenido', mHide: 'Ocultar el contenido', mShow: 'Mostrar el contenido',
    mOpen: 'Abrir', mLocked: 'No contratado', mReq: 'obligatorio', mOpt: 'opcional',
    mEmpty: 'Nada que mostrar', mEmptyBody: 'El manual de la consola está vacío.',
    stDeTeto: 'de', stLivre: 'libre:',
    tab_armazenamento: 'Almacenamiento', tab_tokens: 'Tokens de IA',
    tab_financeiro: 'Costos e ingresos',
    fTitulo: 'Costos e ingresos', fSub: 'Lo contratado, lo que entró de verdad y lo que cuesta mantener.',
    fMrr: 'MRR contratado', fMrrSub: 'suscripciones activas',
    fRecebido: 'Recibido en el mes', fRecebidoSub: 'neto, sin las comisiones',
    fCusto: 'Costo del mes', fCustoSub: 'IA + almacenamiento + comisiones + fijo',
    fLucro: 'Resultado del mes',
    fSemStripe: 'Stripe no configurado',
    fSemStripeCorpo: 'Sin la clave de Stripe no hay forma de saber qué entró. Las cifras de arriba usan el valor CONTRATADO, no lo recibido.',
    fErroStripe: 'Stripe no respondió',
    fErroStripeCorpo: 'La credencial existe pero la consulta falló. Lo recibido no está disponible ahora — la cifra mostrada es la contratada.',
    fPorMes: 'Mes', fPorMesLegenda: 'Los ingresos son brutos; los costos incluyen IA, comisiones de Stripe y el fijo. El almacenamiento entra solo en el mes actual, porque la base guarda el tamaño de hoy y no el histórico.',
    fEntrou: 'Entró', fSaiu: 'Costó',
    fBruto: 'Bruto', fTaxas: 'Comisiones', fLiquido: 'Neto', fEstornos: 'Reembolsos',
    fPorPlano: 'Ingresos por plan', fEmpresas: 'Empresa',
    fPlano: 'Plan', fMrrCol: 'MRR', fCustoCol: 'Costo', fMargemCol: 'Margen',
    fChurn: 'en cancelación', fChurnSub: 'Ya cancelaron y mantienen acceso hasta fin de ciclo. Es el MRR que cae el próximo mes.',
    fOrigens: 'De dónde viene el costo', fOrigemIa: 'Inteligencia artificial', fOrigemStorage: 'Almacenamiento',
    fOrigemTaxas: 'Comisiones de Stripe', fOrigemFixo: 'Infraestructura fija',
    fRateio: 'Prorrateo del consumo medido — ningún proveedor factura por empresa.',
    fTaxasUsadas: 'Tarifas usadas', fTaxasOnde: 'Ajustables por variable de entorno, junto al resto de la configuración de infraestructura.',
    fVazio: 'Nada registrado todavía.',
    fCicloMensal: 'mensual', fCicloAnual: 'anual',
    fAtiva: 'activa', fCancelada: 'cancelada', fSuspensa: 'suspendida',
    fBaseRecebido: 'sobre lo recibido', fBaseContratado: 'sobre lo contratado', fUnidadeMes: 'mes',
    stTitle: 'Almacenamiento', stSub: 'Cuánto ocupa cada empresa y de qué está hecho ese espacio.',
    stTotal: 'Total de la plataforma', stTotalSub: 'Suma de todas las empresas — es lo que cuadra con la factura del proveedor.',
    stEvidence: 'Pruebas', stSignatures: 'Firmas', stOver: 'en el tope', stOverAll: 'empresas en el tope', stNoLimit: 'sin límite',
    stHint: 'MB', stSaved: 'Tope actualizado', stEmpty: 'Ninguna empresa registrada.',
    aiTitle: 'Tokens de IA', aiSub: 'Cuánto ha gastado cada empresa de lo que se le concedió.',
    aiTotal: 'Consumo de la plataforma', aiTotalSub: 'Suma de todas las empresas desde el último reinicio.',
    aiHint: 'tokens', aiSaved: 'Cuota actualizada', aiEmpty: 'Ninguna empresa registrada.',
    uSearchPh: 'Buscar persona por correo o nombre…', uHint: 'Mínimo 2 caracteres. Cubre todas las empresas.',
    uNone: 'No se encontró a nadie.', uSearching: 'Buscando…', uNoCompany: 'Sin vínculo con empresa.',
    uVerifyEmail: 'Verificar correo', uSendAccess: 'Reenviar acceso', uAccessSent: 'Enviamos un correo con el código para que la persona restablezca su contraseña.', uSendVerification: 'Enviar verificación', uVerificationSent: 'Código de verificación enviado al correo.', uMarkVerified: 'Marcar verificado', uVerified: 'correo verificado', uResetPassword: 'Definir contraseña',
    uNewPassword: 'Nueva contraseña (mín. 8)', uDeactivate: 'Desactivar cuenta', uActivate: 'Reactivar cuenta',
    uInactive: 'cuenta inactiva', uSuspendLink: 'Suspender', uReactivateLink: 'Reactivar',
    uRemoveLink: 'Quitar', uConfirm: '¿Confirmar?', uPlatformAdmin: 'plataforma',
    uPendingInvite: 'invitación pendiente', uInviteExpired: 'invitación vencida',
    uResendInvite: 'Reenviar invitación',
    uPendingHint: 'Invitado — aún no aceptó, así que la cuenta no existe.',
    uDeleteUser: 'Eliminar',
    uDeleteTitle: '¿Eliminar a esta persona?',
    uDeleteHard: 'Esta persona no firmó nada, así que la cuenta y sus vínculos se eliminan de verdad. Deshacerlo significa registrar todo de nuevo.',
    uDeleteAnon: 'Esta persona YA FIRMÓ documentos. Los registros de firma se mantienen (borrarlos haría que sus firmas aparecieran como adulteradas en el verificador público), pero la cuenta se desactiva y desaparece de las pantallas.',
    uDeleteFrees: (email: string) => `El correo ${email} queda libre para un registro nuevo, en cualquier empresa.`,
    uDeleteMemberships: (n: number) => n === 1 ? 'Se quitará 1 vínculo con empresa.' : `Se quitarán ${n} vínculos con empresas.`,
    uDeletePending: (n: number) => n === 1 ? 'Atención: 1 dictamen está abierto con esta persona — vuelve a valer por el rol, sin trabar la investigación.' : `Atención: ${n} dictámenes están abiertos con esta persona — vuelven a valer por el rol, sin trabar las investigaciones.`,
    uDeleteConfirm: 'Eliminar definitivamente',
    uDeleteDone: (email: string) => `Listo — ${email} está libre para un registro nuevo.`,
    hEmail: 'Correo', hStorage: 'Almacenamiento', hReminders: 'Recordatorios', hAi: 'Inteligencia artificial',
    hOk: 'configurado', hOff: 'no configurado', hSender: 'Remitente', hBucket: 'Bucket',
    hEphemeral: 'Sin bucket configurado, los archivos van al disco del contenedor — que se borra en cada despliegue.',
    hEvery: 'Escaneo cada', hAwaiting: 'Casos esperando triaje', hEnvironment: 'Entorno', hSentTotal: 'Enviados (total)', hSent30d: 'Últimos 30 días', hSentToday: 'Hoy',
  },
}

type AbaId = 'empresas' | 'pessoas' | 'financeiro' | 'armazenamento' | 'tokens' | 'sistema' | 'manual'

/** As seções do console. Ícones do mesmo conjunto que a nav do painel usa. */
const ABAS: { id: AbaId; icon: IconName }[] = [
  { id: 'empresas', icon: 'overview' },
  { id: 'pessoas', icon: 'people' },
  // Armazenamento e IA saíram de dentro da gaveta da empresa e viraram tela
  // própria: as duas perguntas do dono são "quanto no total" e "quem está fora
  // da curva", e nenhuma das duas se responde abrindo empresa por empresa.
  { id: 'financeiro', icon: 'billing' },
  { id: 'armazenamento', icon: 'download' },
  { id: 'tokens', icon: 'spark' },
  { id: 'sistema', icon: 'settings' },
  // O manual do console. Sem filtro por permissão, ao contrário do manual da
  // empresa: aqui o acesso é um só — não existe o que recortar.
  { id: 'manual', icon: 'book' },
]

/** O manual do console: documento inteiro, sem recorte por permissão. */
function ManualPlataforma({ tr }: { tr: Record<string, string> }) {
  const [aberto, setAberto] = useState(true)
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          type="button" onClick={() => setAberto((v) => !v)} className="app-btn"
          style={{
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--heading)', borderRadius: 100, padding: '7px 15px',
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}
        >
          <Icon name="menu" size={15} />
          {aberto ? tr.mHide : tr.mShow}
        </button>
      </div>
      <ManualView
        capitulos={CAPITULOS_PLATAFORMA}
        gate={null}
        aberto={aberto}
        onAberto={setAberto}
        rotulos={{
          toc: tr.mToc,
          hideToc: tr.mHide,
          showToc: tr.mShow,
          openScreen: tr.mOpen,
          locked: tr.mLocked,
          required: tr.mReq,
          optional: tr.mOpt,
          emptyTitle: tr.mEmpty,
          emptyBody: tr.mEmptyBody,
        }}
      />
    </>
  )
}

export function isPlatformPath(): boolean {
  return window.location.hash.toLowerCase().startsWith('#plataforma')
}

/** O e-mail digitado já tem CONTA na plataforma?
 *
 *  Muda o formulário inteiro: conta existente não ganha senha nova (vira um
 *  SEGUNDO vínculo do mesmo login) e o aviso ao superadmin é outro. A resposta
 *  vem da própria busca de pessoas do console, com debounce para não fuzilar a
 *  API a cada tecla.
 *
 *  A busca também devolve CONVITES pendentes, que ainda não têm conta (a conta
 *  nasce no aceite) — por isso `id` e `pending` entram na conta: tratar um
 *  convite pendente como conta esconderia o campo de senha e o servidor
 *  responderia "defina uma senha" para um formulário que não a pede mais. */
function useEmailComConta(email: string): boolean {
  const [existe, setExiste] = useState(false)
  useEffect(() => {
    const limpo = email.trim().toLowerCase()
    if (!limpo.includes('@') || limpo.length < 5) { setExiste(false); return }
    const t = setTimeout(() => {
      api.get<{ email: string; id: string | null; pending?: boolean }[]>(
        `/platform/users?q=${encodeURIComponent(limpo)}`,
      )
        .then((rows) =>
          setExiste(
            rows.some(
              (r) => (r.email || '').toLowerCase() === limpo && !!r.id && r.pending !== true,
            ),
          ),
        )
        .catch(() => setExiste(false))
    }, 350)
    return () => clearTimeout(t)
  }, [email])
  return existe
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
  // A foto do PROPRIO admin da plataforma: o console e a casa dele — sem
  // isso, so quem tem vinculo em empresa achava onde carregar a foto.
  const [meuNome, setMeuNome] = useState('')
  const [minhaFoto, setMinhaFoto] = useState<string | null>(null)
  const [editorFoto, setEditorFoto] = useState(false)
  /** A seção aberta no painel da empresa. O modal antigo despejava tudo num
   *  bloco só — plano, storage, IA, membros e o botão de suspender no meio.
   *  Um assunto por vez, escolhido por chip, é o que faz o painel se LER. */
  type SecaoEmpresa = 'visao' | 'plano' | 'storage' | 'ia' | 'pessoas' | 'canais' | 'acoes'
  const [secao, setSecao] = useState<SecaoEmpresa>('visao')
  const [limitEdit, setLimitEdit] = useState('')
  const [storageEdit, setStorageEdit] = useState('')
  // Assentos manuais da empresa aberta no drawer.
  const [seatsEdit, setSeatsEdit] = useState('')
  // O "livre para alocar" da carteira — o drawer mostra ao lado da cota de IA,
  // para a alocação sair de um número real e não de um chute.
  const [livreNaCarteira, setLivreNaCarteira] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  // Qual convite está sendo reenviado. Por linha, e não um booleano global:
  // travar a lista inteira faria os outros botões piscarem sem motivo.
  const [resendId, setResendId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [aba, setAba] = useState<AbaId>('empresas')
  // A unidade é ESCOLHA da pessoa e vale para a página inteira do
  // Armazenamento — números E campos de edição. Padrão GB por decisão;
  // guardada para a próxima visita.
  const [unidade, setUnidade] = useState<'GB' | 'MB'>(() => {
    try { return (localStorage.getItem('soluvia.unidadeStorage') as 'GB' | 'MB') || 'GB' } catch { return 'GB' }
  })
  const trocarUnidade = (u: 'GB' | 'MB') => {
    setUnidade(u)
    try { localStorage.setItem('soluvia.unidadeStorage', u) } catch { /* modo privado */ }
  }
  const fmtUnidade = (bytes: number) =>
    unidade === 'GB' ? `${(bytes / 1024 ** 3).toFixed(bytes >= 1024 ** 3 * 10 ? 0 : 2)} GB`
                     : `${Math.round(bytes / 1024 ** 2).toLocaleString()} MB`
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
  // Conta existente → sem campo de senha, aviso de segundo vínculo.
  const memberJaTemConta = useEmailComConta(mf.email)
  const adminJaTemConta = useEmailComConta(nf.admin_email)
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600) }

  useEffect(() => {
    const sync = () => setOpen(isPlatformPath())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    if (!open) return
    api
      .get<{ email: string; is_platform_admin: boolean; full_name?: string; avatar_url?: string | null }>('/auth/me')
      .then((r) => {
        setAcesso(r.is_platform_admin ? { estado: 'ok' } : { estado: 'forbidden', email: r.email })
        setMeuNome(r.full_name || r.email)
        setMinhaFoto(r.avatar_url ?? null)
      })
      .catch(() => setAcesso({ estado: 'anon' }))
  }, [open])

  const load = useCallback(() => {
    void api.get<PlatformOverview>('/platform/overview').then(setOv).catch(() => setOv(null))
    void api.get<PlatformTenantRow[]>('/platform/tenants').then(setRows).catch(() => setRows([]))
    void listPlans().then(setPlans).catch(() => setPlans([]))
    // O "livre" da carteira acompanha o console inteiro: o drawer da empresa
    // mostra esse número ao lado da cota de IA.
    void api.get<{ free_to_allocate: number }>('/platform/wallet')
      .then((w) => setLivreNaCarteira(w.free_to_allocate)).catch(() => setLivreNaCarteira(null))
  }, [])
  useEffect(() => { if (open && acesso.estado === 'ok') load() }, [open, acesso.estado, load])

  async function createCompany() {
    setBusy(true)
    try {
      const d = await api.post<PlatformTenantDetail>('/platform/tenants', {
        name: nf.name.trim(), slug: nf.slug.trim() || null, plan_id: nf.plan_id || null,
        admin_name: nf.admin_name.trim(), admin_email: nf.admin_email.trim(),
        // Vazio vira null: é o que manda o convite por e-mail em vez de o
        // superadmin escolher a senha do admin do cliente.
        admin_password: adminJaTemConta || !nf.admin_password.trim() ? null : nf.admin_password,
      })
      setShowNew(false); setNf(emptyNew); load(); setDetail(d); setLimitEdit(String(d.ai_token_limit)); setStorageEdit(String(Math.round((d.storage_limit_bytes || 0) / 1024 / 1024))); setSeatsEdit(d.max_users_override != null ? String(d.max_users_override) : ''); flash(tr.companyCreated)
    } catch (e) { flash((e as ApiError).detail ?? 'Erro') } finally { setBusy(false) }
  }
  async function addMember() {
    if (!detail) return
    setBusy(true)
    try {
      const r = await api.post<{ mode: string; tenant: PlatformTenantDetail }>(
        `/platform/tenants/${detail.id}/members`,
        {
          full_name: mf.full_name.trim(), email: mf.email.trim(),
          // Vazio vira null de propósito: é o que faz o convite sair por
          // e-mail em vez de o superadmin inventar a senha de um cliente.
          password: memberJaTemConta || !mf.password.trim() ? null : mf.password,
          role_id: mf.role_id || null,
        },
      )
      setDetail(r.tenant); setMf(emptyMember); load()
      flash(
        r.mode === 'attached' ? tr.attachedOk
          : r.mode === 'invited' ? tr.uCreatedInvited
            : tr.userAdded,
      )
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
    setSecao('visao')   // o painel sempre abre pelo retrato, não pelo formulário
    try {
      const d = await api.get<PlatformTenantDetail>(`/platform/tenants/${id}`)
      setDetail(d); setLimitEdit(String(d.ai_token_limit)); setStorageEdit(String(Math.round((d.storage_limit_bytes || 0) / 1024 / 1024))); setSeatsEdit(d.max_users_override != null ? String(d.max_users_override) : '')
    } catch (e) { flash((e as ApiError).detail ?? 'Erro') }
  }
  async function act(fn: () => Promise<PlatformTenantDetail>) {
    setBusy(true)
    try { const d = await fn(); setDetail(d); setLimitEdit(String(d.ai_token_limit)); setStorageEdit(String(Math.round((d.storage_limit_bytes || 0) / 1024 / 1024))); setSeatsEdit(d.max_users_override != null ? String(d.max_users_override) : ''); load(); flash(tr.saved) }
    catch (e) { flash((e as ApiError).detail ?? 'Erro') } finally { setBusy(false) }
  }
  const saveLimit = () => act(async () => {
    const d = await api.post<PlatformTenantDetail>(`/platform/tenants/${detail!.id}/ai-limit`, { limit: Number(limitEdit) || 0 })
    // A alocação mudou → o "livre" da carteira também. Atualiza na hora, senão
    // o número ao lado do campo mente até a próxima visita à aba Tokens.
    void api.get<{ free_to_allocate: number }>('/platform/wallet')
      .then((w) => setLivreNaCarteira(w.free_to_allocate)).catch(() => {})
    return d
  })

  /** Assentos manuais: vazio = volta ao padrão do plano. */
  const saveSeats = () => act(() => api.post<PlatformTenantDetail>(
    `/platform/tenants/${detail!.id}/seats`,
    { max_users: seatsEdit.trim() === '' ? null : Math.max(1, Math.round(Number(seatsEdit) || 0)) },
  ))
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
          <button type="button" title={tr.photoChange} onClick={() => setEditorFoto(true)}
            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
            <Avatar name={meuNome || 'S'} src={minhaFoto} size={38} color="var(--accent)" />
          </button>
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
              noCompany: tr.uNoCompany, verifyEmail: tr.uVerifyEmail, sendAccess: tr.uSendAccess, accessSent: tr.uAccessSent, sendVerification: tr.uSendVerification, verificationSent: tr.uVerificationSent, markVerified: tr.uMarkVerified, verified: tr.uVerified,
              resetPassword: tr.uResetPassword, newPassword: tr.uNewPassword,
              deactivate: tr.uDeactivate, activate: tr.uActivate, inactive: tr.uInactive,
              suspendLink: tr.uSuspendLink, reactivateLink: tr.uReactivateLink,
              removeLink: tr.uRemoveLink, confirm: tr.uConfirm, done: tr.saved,
              platformAdmin: tr.uPlatformAdmin,
              noneBody: tr.uNoneBody,
              newUser: tr.uNewUser, company: tr.uCompany, name: tr.uName2,
              email: tr.cEmail, create: tr.create2,
              cancel: tr.uCancel, created: tr.userAdded,
              createdInvited: tr.uCreatedInvited, createdAttached: tr.attachedOk,
              passwordOptional: tr.uPasswordOptional,
              passwordOptionalHint: tr.uPasswordOptionalHint,
              role: tr.uRole, noRole: tr.uNoRole,
              pendingInvite: tr.uPendingInvite, inviteExpired: tr.uInviteExpired,
              resendInvite: tr.uResendInvite, pendingHint: tr.uPendingHint,
              deleteUser: tr.uDeleteUser, deleteTitle: tr.uDeleteTitle,
              deleteHard: tr.uDeleteHard, deleteAnon: tr.uDeleteAnon,
              deleteFrees: tr.uDeleteFrees, deleteMemberships: tr.uDeleteMemberships,
              deletePending: tr.uDeletePending, deleteConfirm: tr.uDeleteConfirm,
              deleteDone: tr.uDeleteDone,
            }}
            empresas={(rows ?? []).map((r) => ({ id: String(r.id), name: r.name }))}
          />
        )}

        {aba === 'financeiro' && (
          <PlatformFinance
            onToast={flash}
            lang={lang}
            textos={{
              titulo: tr.fTitulo, subtitulo: tr.fSub,
              mrr: tr.fMrr, mrrSub: tr.fMrrSub,
              recebido: tr.fRecebido, recebidoSub: tr.fRecebidoSub,
              custo: tr.fCusto, custoSub: tr.fCustoSub,
              lucro: tr.fLucro,
              lucroBase: { recebido_liquido: tr.fBaseRecebido, mrr_contratado: tr.fBaseContratado },
              semStripe: tr.fSemStripe, semStripeCorpo: tr.fSemStripeCorpo,
              erroStripe: tr.fErroStripe, erroStripeCorpo: tr.fErroStripeCorpo,
              porMes: tr.fPorMes, porMesLegenda: tr.fPorMesLegenda,
              entrou: tr.fEntrou, saiu: tr.fSaiu,
              bruto: tr.fBruto, taxas: tr.fTaxas, liquido: tr.fLiquido, estornos: tr.fEstornos,
              porPlano: tr.fPorPlano, empresas: tr.fEmpresas,
              companyPlan: tr.fPlano, companyMrr: tr.fMrrCol,
              companyCost: tr.fCustoCol, companyMargin: tr.fMargemCol,
              churn: tr.fChurn, churnSub: tr.fChurnSub,
              origens: tr.fOrigens, origemIa: tr.fOrigemIa, origemStorage: tr.fOrigemStorage,
              origemTaxas: tr.fOrigemTaxas, origemFixo: tr.fOrigemFixo,
              rateio: tr.fRateio, taxasUsadas: tr.fTaxasUsadas, taxasOnde: tr.fTaxasOnde,
              unidadeMes: tr.fUnidadeMes,
              vazio: tr.fVazio,
              ciclos: { monthly: tr.fCicloMensal, yearly: tr.fCicloAnual },
              estados: { active: tr.fAtiva, canceled: tr.fCancelada, suspended: tr.fSuspensa },
            }}
          />
        )}

        {aba === 'armazenamento' && (
          <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, gap: 4 }}>
            {(['GB', 'MB'] as const).map((u) => (
              <button key={u} type="button" onClick={() => trocarUnidade(u)} className="app-btn"
                style={{
                  border: '1px solid var(--border)', borderRadius: 100, padding: '4px 14px',
                  fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  background: unidade === u ? 'var(--accent)' : 'var(--surface-2)',
                  color: unidade === u ? '#fff' : 'var(--text)',
                }}>{u}</button>
            ))}
          </div>
          <PlatformConsumo
            key={unidade}
            endpoint="/platform/storage"
            discriminado
            onToast={flash}
            formatar={fmtUnidade}
            rotuloTeto={{ deTeto: tr.stDeTeto, livre: tr.stLivre }}
            // A pessoa digita NA UNIDADE ESCOLHIDA; o servidor guarda bytes.
            // 0 continua significando "sem limite" dos dois lados.
            paraEnvio={(v) => Math.round(Number(v.replace(',', '.')) * (unidade === 'GB' ? 1024 ** 3 : 1024 ** 2))}
            rotaLimite={(id) => `/platform/tenants/${id}/storage-limit`}
            campoLimite="limit_bytes"
            unidade={unidade}
            textos={{
              titulo: tr.stTitle, subtitulo: tr.stSub,
              totalLabel: tr.stTotal, totalSub: tr.stTotalSub,
              overLabel: tr.stOver, overGlobal: tr.stOverAll, noLimit: tr.stNoLimit,
              salvar: tr.save, salvo: tr.stSaved, dica: tr.stHint, vazio: tr.stEmpty,
              evidence: tr.stEvidence, signatures: tr.stSignatures,
            }}
          />
          </>
        )}

        {aba === 'tokens' && (
          <>
          {/* A carteirinha vem ANTES da lista por empresa: primeiro o estoque
              da plataforma, depois como ele está repartido. */}
          <PlatformWallet
            lang={lang}
            formatar={(n) => num(n, lang)}
            onToast={flash}
            onSaldo={setLivreNaCarteira}
          />
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
          </>
        )}

        {aba === 'manual' && (
          <ManualPlataforma tr={tr as unknown as Record<string, string>} />
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
              sentTotal: tr.hSentTotal, sent30d: tr.hSent30d, sentToday: tr.hSentToday,
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
              {/* minWidth: no celular a tabela ROLA para o lado em vez de
                  esmagar seis colunas até virar confete ilegível. */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 560 }}>
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

      {/* Detalhe da empresa — DRAWER lateral com um assunto por vez.
          O modal gigante no meio da tela despejava plano, storage, IA,
          membros e o botão de suspender num bloco só; aqui cada seção tem
          seu chip, salva sozinha, e o destrutivo mora numa zona própria. */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--scrim)', backdropFilter: 'blur(8px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(620px, 100vw)', background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', boxShadow: '-24px 0 60px rgba(0,0,0,.35)' }}>
            {/* Cabeçalho */}
            <div style={{ padding: '18px 22px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--heading)', fontWeight: 900, fontSize: 21, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    /{detail.slug}
                    <span style={{ fontFamily: 'inherit', borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 800, background: detail.subscription_status === 'suspended' ? 'rgba(225,29,72,.12)' : 'rgba(34,197,94,.14)', color: detail.subscription_status === 'suspended' ? '#e11d48' : '#16a34a' }}>
                      {detail.subscription_status === 'suspended' ? tr.suspended : tr.active}
                    </span>
                  </div>
                </div>
                <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 26, cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              {/* Os chips de seção: um assunto por vez. */}
              <div className="app-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '14px 0 12px', borderBottom: '1px solid var(--border)' }}>
                {([['visao', tr.secVisao], ['plano', tr.secPlano], ['storage', tr.secStorage], ['ia', tr.secIa], ['pessoas', tr.secPessoas], ['canais', tr.secCanais], ['acoes', tr.secAcoes]] as const).map(([id, rotulo]) => (
                  <button key={id} onClick={() => setSecao(id)}
                    style={{ border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: 100, padding: '7px 14px', fontWeight: 700, fontSize: 12.5, background: secao === id ? 'var(--accent)' : 'var(--surface-2)', color: secao === id ? '#fff' : 'var(--text-muted)' }}>
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>

            {/* Corpo da seção ativa */}
            <div className="app-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 26px' }}>
              {secao === 'visao' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
                  {([
                    [tr.usersCol, `${detail.users} / ${detail.max_users}`],
                    [tr.plan, detail.plan_name ?? '—'],
                    [tr.channelsList, String(detail.channels_list.length)],
                    [tr.members, String(detail.members.length)],
                    [tr.storageQuota, `${mb(detail.storage_used_bytes)} / ${detail.storage_limit_bytes === 0 ? '∞' : mb(detail.storage_limit_bytes)}`],
                    [tr.aiQuota, `${num(detail.ai_tokens_used, lang)} / ${detail.ai_token_limit === 0 ? '∞' : num(detail.ai_token_limit, lang)}`],
                  ] as const).map(([rotulo, valor]) => (
                    <div key={rotulo} style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '13px 15px' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>{rotulo}</div>
                      <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 16 }}>{valor}</div>
                    </div>
                  ))}
                </div>
              )}

              {secao === 'plano' && (<div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 16 }}>
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
                  {detail.users} / {detail.max_users} {tr.usersCol.toLowerCase()}
                </span>
              </div>

              {/* ASSENTOS — o número é escolha da plataforma, não refém do
                  plano. Vazio = vale o padrão do plano; preenchido = teto
                  próprio desta empresa ("Enterprise, mas eles são 12"). */}
              <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{tr.seats}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                <input
                  type="number" min={1} value={seatsEdit}
                  onChange={(e) => setSeatsEdit(e.target.value)}
                  placeholder={String(detail.plan_max_users)}
                  style={{ width: 120, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--heading)', fontSize: 14 }}
                />
                <button disabled={busy} onClick={() => void saveSeats()} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 100, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{tr.save}</button>
                {detail.max_users_override != null && (
                  <button disabled={busy} onClick={() => { setSeatsEdit(''); void act(() => api.post<PlatformTenantDetail>(`/platform/tenants/${detail.id}/seats`, { max_users: null })) }}
                    style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 100, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
                    {tr.seatsUsePlan}
                  </button>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5, marginBottom: 18 }}>
                {detail.max_users_override != null
                  ? tr.seatsManual.replace('{n}', String(detail.max_users_override)).replace('{p}', String(detail.plan_max_users))
                  : tr.seatsFromPlan.replace('{p}', String(detail.plan_max_users))}
              </p>
              </div>)}

              {secao === 'storage' && (<div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 16 }}>
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
              </div>)}

              {secao === 'ia' && (<div style={{ background: 'var(--surface-2)', borderRadius: 14, padding: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{tr.aiQuota}</div>
              <div style={{ color: 'var(--heading)', fontSize: 14, marginBottom: 4 }}>{num(detail.ai_tokens_used, lang)} / {detail.ai_token_limit === 0 ? '∞' : num(detail.ai_token_limit, lang)}</div>
              {/* De ONDE sai o que se aloca: o livre da carteira da plataforma.
                  Sem este número, definir a cota era prometer no escuro. */}
              {livreNaCarteira != null && (
                <div style={{ color: livreNaCarteira < 0 ? '#e11d48' : 'var(--text-muted)', fontSize: 12.5, marginBottom: 10 }}>
                  {tr.walletFree.replace('{n}', num(livreNaCarteira, lang))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="number" min={0} value={limitEdit} onChange={(e) => setLimitEdit(e.target.value)}
                  style={{ width: 160, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--heading)', fontSize: 14 }} />
                <button disabled={busy} onClick={() => void saveLimit()} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 100, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{tr.save}</button>
                <button disabled={busy} onClick={() => { if (window.confirm(tr.confirmReset)) void resetAi() }} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 100, padding: '9px 18px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{tr.reset}</button>
              </div>
              </div>)}

              {secao === 'pessoas' && (<div>
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
            {/* Adicionar usuário à empresa */}
            <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>{tr.addUser}</div>
              {/* auto-fit: no celular os campos empilham em vez de dividir 160px */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8 }}>
                <input style={fld} placeholder={tr.uName} value={mf.full_name} onChange={(e) => setMf({ ...mf, full_name: e.target.value })} />
                <input style={fld} type="email" placeholder={tr.cEmail} value={mf.email} onChange={(e) => setMf({ ...mf, email: e.target.value })} />
                {!memberJaTemConta && (
                  <PasswordInput style={fld} placeholder={tr.uPasswordOptional} value={mf.password} onChange={(e) => setMf({ ...mf, password: e.target.value })} />
                )}
                <select style={{ ...fld, gridColumn: memberJaTemConta ? 'span 2' : undefined }} value={mf.role_id} onChange={(e) => setMf({ ...mf, role_id: e.target.value })}>
                  <option value="">{tr.uRole}</option>
                  {detail.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div style={{ marginTop: 8, background: 'var(--accent-soft)', border: '1px solid var(--border)', color: 'var(--heading)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5 }}>
                {memberJaTemConta ? tr.existingNote : tr.uPasswordOptionalHint}
              </div>
              {(() => {
                // Senha só atrapalha quando vem pela metade: vazia manda o
                // convite, cheia entrega o acesso pronto, e 3 letras não fazem
                // nem uma coisa nem outra.
                const senhaIncompleta = !memberJaTemConta && mf.password.trim() !== '' && mf.password.length < 8
                const travado = busy || !mf.full_name.trim() || !mf.email.trim() || senhaIncompleta
                return (
                  <button disabled={travado} onClick={() => void addMember()} style={{ ...btnAccent, marginTop: 10, opacity: travado ? 0.6 : 1 }}>{tr.add}</button>
                )
              })()}
            </div>
              </div>)}

              {secao === 'canais' && (<div>
            {/* Canais */}
            <div style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{tr.channelsList} · {detail.channels_list.length}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {detail.channels_list.map((c) => (
                <span key={c.id} style={{ background: 'var(--surface-2)', borderRadius: 100, padding: '5px 12px', fontSize: 12.5, color: 'var(--text)' }}>{c.name} <span style={{ color: 'var(--text-muted)' }}>· {c.module}{c.is_active ? '' : ' ⏸'}</span></span>
              ))}
              {detail.channels_list.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>}
            </div>
              </div>)}

              {secao === 'acoes' && (
                <div style={{ border: '1px solid rgba(225,29,72,.4)', background: 'rgba(225,29,72,.06)', borderRadius: 14, padding: 16 }}>
                  <div style={{ color: '#e11d48', fontWeight: 800, fontSize: 13.5, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>{tr.dangerTitle}</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, margin: '0 0 14px' }}>{tr.dangerBody}</p>
                  <button disabled={busy} onClick={() => { if (detail.subscription_status === 'suspended' || window.confirm(tr.confirmSuspend)) void toggleSuspend() }}
                    style={{ background: detail.subscription_status === 'suspended' ? 'rgba(34,197,94,.14)' : 'rgba(225,29,72,.12)', color: detail.subscription_status === 'suspended' ? '#16a34a' : '#e11d48', border: `1px solid ${detail.subscription_status === 'suspended' ? 'rgba(34,197,94,.4)' : 'rgba(225,29,72,.4)'}`, borderRadius: 100, padding: '10px 20px', fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>
                    {detail.subscription_status === 'suspended' ? tr.reactivate : tr.suspend}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nova empresa */}
      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--scrim)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
          <div onClick={(e) => e.stopPropagation()} className="app-modal" style={{ width: '100%', maxWidth: 520, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 26 }}>
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
              {!adminJaTemConta && (
                <PasswordInput style={fld} placeholder={tr.uPasswordOptional} value={nf.admin_password} onChange={(e) => setNf({ ...nf, admin_password: e.target.value })} />
              )}
              <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', color: 'var(--heading)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5 }}>
                {adminJaTemConta ? tr.existingNote : tr.uPasswordOptionalHint}
              </div>
              {(() => {
                const senhaIncompleta = !adminJaTemConta && nf.admin_password.trim() !== '' && nf.admin_password.length < 8
                const travado = busy || !nf.name.trim() || !nf.admin_name.trim() || !nf.admin_email.trim() || senhaIncompleta
                return (
                  <button disabled={travado} onClick={() => void createCompany()} style={{ ...btnAccent, marginTop: 6, opacity: travado ? 0.6 : 1 }}>{tr.create}</button>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      <AvatarEditor
        open={editorFoto}
        onClose={() => setEditorFoto(false)}
        onSaved={(url) => { setMinhaFoto(url); setToast(tr.photoSaved); setTimeout(() => setToast(null), 2200) }}
        atualUrl={minhaFoto}
        textos={{ title: tr.photoTitle, pick: tr.photoPick, zoom: 'Zoom', save: tr.save, saving: '…', hint: tr.photoHint, fail: 'Erro', novaFoto: tr.photoPick }}
      />

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--heading)', color: 'var(--surface)', padding: '12px 22px', borderRadius: 100, fontWeight: 700, fontSize: 14, zIndex: 10002 }}>{toast}</div>
      )}
    </div>
  )
}
