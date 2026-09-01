/**
 * O manual do console da plataforma.
 *
 * Aqui NÃO há filtro por permissão, e é de propósito: a conta de plataforma é
 * uma só, com um acesso só. Montar sob medida um manual para um público de um
 * perfil seria complexidade sem leitor. A estrutura de dados é a mesma do
 * manual do usuário para que a tela que desenha os dois seja uma só — e os três
 * idiomas continuam obrigatórios, porque o console também troca de língua.
 */
import { t3, type ManualCapitulo } from './tipos'

export const CAPITULOS_PLATAFORMA: ManualCapitulo[] = [
  {
    id: 'o-que-e',
    titulo: t3('O que é a conta de plataforma', 'What the platform account is', 'Qué es la cuenta de plataforma'),
    resumo: t3(
      'Ela resolve o que ninguém de dentro da empresa consegue — e termina onde começa o trabalho do cliente.',
      'It solves what nobody inside the company can — and ends where the client\'s work begins.',
      'Resuelve lo que nadie desde dentro de la empresa puede — y termina donde empieza el trabajo del cliente.',
    ),
    secoes: [
      {
        id: 'limites',
        titulo: t3('Os limites da conta', 'The limits of the account', 'Los límites de la cuenta'),
        corpo: [t3(
          'A conta de plataforma é a da <b>Soluqtion</b>, não a de um cliente. Ela enxerga todas as empresas e faz o que só quem está de fora pode fazer: criar a empresa, ampliar o contratado, reenviar um convite que não chegou, destravar um e-mail preso.',
          'The platform account belongs to <b>Soluqtion</b>, not to a client. It sees every company and does what only an outsider can: create the company, raise what was contracted, resend an invitation that never arrived, unstick a blocked e-mail.',
          'La cuenta de plataforma es la de <b>Soluqtion</b>, no la de un cliente. Ve todas las empresas y hace lo que solo alguien de fuera puede: crear la empresa, ampliar lo contratado, reenviar una invitación que no llegó, destrabar un correo atascado.',
        )],
        notas: [{
          tipo: 'aviso',
          texto: t3(
            '<b>O que ela NÃO é:</b> um atalho para operar a empresa do cliente. O console não abre casos nem lê denúncias — e essa separação é o que sustenta a confiança de quem faz um relato.',
            '<b>What it is NOT:</b> a shortcut for running the client\'s company. The console does not open cases or read reports — and that separation is what upholds the trust of whoever files a report.',
            '<b>Lo que NO es:</b> un atajo para operar la empresa del cliente. La consola no abre casos ni lee denuncias — y esa separación es lo que sostiene la confianza de quien hace un reporte.',
          ),
        }],
        tabela: {
          colunas: [
            t3('Conta de plataforma', 'Platform account', 'Cuenta de plataforma'),
            t3('Conta de empresa', 'Company account', 'Cuenta de empresa'),
          ],
          linhas: [
            [
              t3('Vê todas as empresas', 'Sees every company', 'Ve todas las empresas'),
              t3('Vê só a própria', 'Sees only its own', 'Ve solo la propia'),
            ],
            [
              t3('Cria empresas e define limites', 'Creates companies and sets limits', 'Crea empresas y define límites'),
              t3('Trabalha dentro dos limites', 'Works within the limits', 'Trabaja dentro de los límites'),
            ],
            [
              t3('Não lê casos', 'Does not read cases', 'No lee casos'),
              t3('Recebe, apura e responde casos', 'Receives, investigates and answers cases', 'Recibe, averigua y responde casos'),
            ],
            [
              t3('Não aparece na trilha de auditoria da empresa', 'Does not appear in the company audit trail', 'No aparece en la traza de auditoría de la empresa'),
              t3('Cada ação fica registrada com nome e hora', 'Every action is recorded with name and time', 'Cada acción queda registrada con nombre y hora'),
            ],
          ],
        },
      },
    ],
  },

  {
    id: 'areas',
    titulo: t3('As seis áreas do console', 'The six areas of the console', 'Las seis áreas de la consola'),
    resumo: t3(
      'O mapa da casa: onde fica cada coisa e por onde começa um atendimento.',
      'The map of the house: where everything is and where a support call starts.',
      'El mapa de la casa: dónde está cada cosa y por dónde empieza una atención.',
    ),
    secoes: [
      {
        id: 'mapa',
        titulo: t3('Para que serve cada área', 'What each area is for', 'Para qué sirve cada área'),
        tabela: {
          colunas: [t3('Área', 'Area', 'Área'), t3('Use quando', 'Use it when', 'Úsala cuando')],
          linhas: [
            [
              t3('<b>Empresas</b>', '<b>Companies</b>', '<b>Empresas</b>'),
              t3(
                'Criar cliente novo, mudar plano, ampliar limites, suspender.',
                'Creating a new client, changing plan, raising limits, suspending.',
                'Crear cliente nuevo, cambiar plan, ampliar límites, suspender.',
              ),
            ],
            [
              t3('<b>Pessoas</b>', '<b>People</b>', '<b>Personas</b>'),
              t3(
                'Alguém não consegue entrar, ou precisa de acesso a uma empresa.',
                'Someone cannot sign in, or needs access to a company.',
                'Alguien no puede entrar, o necesita acceso a una empresa.',
              ),
            ],
            [
              t3('<b>Custos e entradas</b>', '<b>Costs and revenue</b>', '<b>Costos e ingresos</b>'),
              t3(
                'Conferir o contratado, o que entrou e o que custou.',
                'Checking what was contracted, what came in and what it cost.',
                'Revisar lo contratado, lo que entró y lo que costó.',
              ),
            ],
            [
              t3('<b>Armazenamento</b>', '<b>Storage</b>', '<b>Almacenamiento</b>'),
              t3(
                'Ver quanto espaço cada empresa ocupa do que contratou.',
                'Seeing how much of its contracted space each company uses.',
                'Ver cuánto espacio ocupa cada empresa de lo que contrató.',
              ),
            ],
            [
              t3('<b>Tokens de IA</b>', '<b>AI tokens</b>', '<b>Tokens de IA</b>'),
              t3(
                'Ver quanto do assistente cada empresa já usou no ciclo.',
                'Seeing how much of the assistant each company has used this cycle.',
                'Ver cuánto del asistente ya usó cada empresa en el ciclo.',
              ),
            ],
            [
              t3('<b>Sistema</b>', '<b>System</b>', '<b>Sistema</b>'),
              t3(
                'O sintoma aparece em <b>todos</b> os clientes ao mesmo tempo.',
                'The symptom shows up for <b>every</b> client at once.',
                'El síntoma aparece en <b>todos</b> los clientes al mismo tiempo.',
              ),
            ],
          ],
        },
        figuras: [
          {
            src: 'p03-console-areas',
            legenda: t3(
              '<b>O console.</b> <b>1</b> o menu com as seis áreas; <b>2</b> o botão que cria uma empresa nova.',
              '<b>The console.</b> <b>1</b> the menu with the six areas; <b>2</b> the button that creates a new company.',
              '<b>La consola.</b> <b>1</b> el menú con las seis áreas; <b>2</b> el botón que crea una empresa nueva.',
            ),
          },
          {
            src: 'p02-console-empresas',
            legenda: t3(
              '<b>Empresas.</b> A lista completa, com plano, pessoas, canais, casos e consumo. Clique numa linha para abrir a gaveta.',
              '<b>Companies.</b> The full list, with plan, people, channels, cases and usage. Click a row to open the drawer.',
              '<b>Empresas.</b> La lista completa, con plan, personas, canales, casos y consumo. Haz clic en una fila para abrir el cajón.',
            ),
          },
        ],
      },
    ],
  },

  {
    id: 'criar-empresa',
    titulo: t3('Criar uma empresa', 'Creating a company', 'Crear una empresa'),
    resumo: t3(
      'O formulário campo a campo, os dois erros que geram chamado, e a entrega completa.',
      'The form field by field, the two mistakes that generate support tickets, and the full handover.',
      'El formulario campo a campo, los dos errores que generan tickets, y la entrega completa.',
    ),
    secoes: [
      {
        id: 'campos',
        titulo: t3('Os campos do formulário', 'The form fields', 'Los campos del formulario'),
        campos: {
          titulo: t3('Nova empresa', 'New company', 'Nueva empresa'),
          itens: [
            {
              nome: t3('Nome da empresa', 'Company name', 'Nombre de la empresa'),
              desc: t3(
                'Como o cliente será chamado no sistema e nos e-mails. Use o nome comercial, não a razão social.',
                'How the client will be called in the system and in e-mails. Use the trade name, not the legal entity name.',
                'Cómo se llamará al cliente en el sistema y en los correos. Usa el nombre comercial, no la razón social.',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('Endereço público', 'Public address', 'Dirección pública'),
              desc: t3(
                'O trecho que vai no link do canal. Em branco, o sistema gera a partir do nome.',
                'The slice that goes into the channel link. Left blank, the system generates it from the name.',
                'El tramo que va en el enlace del canal. En blanco, el sistema lo genera a partir del nombre.',
              ),
              obrigatorio: false,
            },
            {
              nome: t3('Plano', 'Plan', 'Plan'),
              desc: t3(
                'Define assentos, módulos liberados e os limites de assistente e espaço. <b>Nunca deixe em branco.</b>',
                'Sets seats, unlocked modules and the assistant and storage limits. <b>Never leave it blank.</b>',
                'Define asientos, módulos liberados y los límites de asistente y espacio. <b>Nunca lo dejes en blanco.</b>',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('Nome do administrador', 'Administrator name', 'Nombre del administrador'),
              desc: t3(
                'A pessoa que recebe o convite e monta a casa por dentro.',
                'The person who receives the invitation and sets up the house from inside.',
                'La persona que recibe la invitación y arma la casa por dentro.',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('E-mail do administrador', 'Administrator e-mail', 'Correo del administrador'),
              desc: t3(
                'Para onde vai o convite. Confira letra por letra.',
                'Where the invitation goes. Check it letter by letter.',
                'A dónde va la invitación. Revísalo letra por letra.',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('Senha', 'Password', 'Contraseña'),
              desc: t3(
                '<b>Deixe em branco.</b> A pessoa recebe um código por e-mail e escolhe a própria senha.',
                '<b>Leave it blank.</b> The person gets a code by e-mail and chooses their own password.',
                '<b>Déjala en blanco.</b> La persona recibe un código por correo y elige su propia contraseña.',
              ),
              obrigatorio: false,
            },
          ],
        },
        figuras: [{
          src: 'p04-nova-empresa',
          legenda: t3(
            '<b>Nova empresa.</b> Fechar no <b>×</b> não cria nada — só o botão <b>Criar empresa</b> conclui.',
            '<b>New company.</b> Closing with <b>×</b> creates nothing — only the <b>Create company</b> button completes it.',
            '<b>Nueva empresa.</b> Cerrar con <b>×</b> no crea nada — solo el botón <b>Crear empresa</b> concluye.',
          ),
        }],
      },
      {
        id: 'dois-erros',
        titulo: t3(
          'Os dois erros que geram chamado',
          'The two mistakes that generate tickets',
          'Los dos errores que generan tickets',
        ),
        notas: [
          {
            tipo: 'nota',
            texto: t3(
              '<b>Senha preenchida.</b> Você passa a conhecer a senha de um cliente, e ela precisa trafegar por um caminho inseguro até chegar nele — que é exatamente o que o convite por e-mail existe para evitar.',
              '<b>Password filled in.</b> You come to know a client\'s password, and it has to travel an insecure path to reach them — which is exactly what the e-mail invitation exists to avoid.',
              '<b>Contraseña completada.</b> Pasas a conocer la contraseña de un cliente, y tiene que viajar por un camino inseguro hasta llegar a él — que es justo lo que la invitación por correo existe para evitar.',
            ),
          },
          {
            tipo: 'aviso',
            texto: t3(
              '<b>Plano em branco.</b> A empresa nasce com <b>uma vaga só</b>. O sintoma aparece depois, quando o cliente tenta convidar a primeira pessoa e recebe "limite de usuários atingido (1/1)".',
              '<b>Blank plan.</b> The company is born with <b>a single seat</b>. The symptom shows up later, when the client tries to invite the first person and gets "user limit reached (1/1)".',
              '<b>Plan en blanco.</b> La empresa nace con <b>un solo cupo</b>. El síntoma aparece después, cuando el cliente intenta invitar a la primera persona y recibe "límite de usuarios alcanzado (1/1)".',
            ),
          },
        ],
      },
      {
        id: 'entrega',
        titulo: t3(
          'Entrega completa de um cliente novo',
          'Full handover of a new client',
          'Entrega completa de un cliente nuevo',
        ),
        passos: [
          t3('Crie a empresa <b>com plano</b> e sem senha.', 'Create the company <b>with a plan</b> and with no password.', 'Crea la empresa <b>con plan</b> y sin contraseña.'),
          t3(
            'Confira os limites na gaveta: assistente e espaço batem com o contratado?',
            'Check the limits in the drawer: do assistant and storage match what was contracted?',
            'Revisa los límites en el cajón: ¿asistente y espacio coinciden con lo contratado?',
          ),
          t3(
            'Avise o cliente de que o e-mail chegou e que o convite vale <b>7 dias</b>.',
            'Tell the client the e-mail has arrived and that the invitation is valid for <b>7 days</b>.',
            'Avisa al cliente de que el correo llegó y que la invitación vale <b>7 días</b>.',
          ),
          t3(
            'Explique o primeiro dia dele: criar canal → <b>publicar o formulário</b> → publicar o fluxo → convidar a equipe.',
            'Explain their first day: create a channel → <b>publish the form</b> → publish the workflow → invite the team.',
            'Explica su primer día: crear canal → <b>publicar el formulario</b> → publicar el flujo → invitar al equipo.',
          ),
        ],
      },
    ],
  },

  {
    id: 'gaveta',
    titulo: t3('A gaveta da empresa', 'The company drawer', 'El cajón de la empresa'),
    resumo: t3(
      'Plano, assentos, limites, membros, canais e papéis — com a ação ao lado de cada bloco.',
      'Plan, seats, limits, members, channels and roles — with the action next to each block.',
      'Plan, asientos, límites, miembros, canales y roles — con la acción al lado de cada bloque.',
    ),
    secoes: [
      {
        id: 'o-que-fazer',
        titulo: t3('O que fazer em cada situação', 'What to do in each situation', 'Qué hacer en cada situación'),
        tabela: {
          colunas: [t3('Ação', 'Action', 'Acción'), t3('Quando usar', 'When to use it', 'Cuándo usarla')],
          linhas: [
            [
              t3('<b>Cota de IA</b>', '<b>AI quota</b>', '<b>Cuota de IA</b>'),
              t3(
                'O cliente esgotou o assistente e contratou mais.',
                'The client used up the assistant and bought more.',
                'El cliente agotó el asistente y contrató más.',
              ),
            ],
            [
              t3('<b>Resetar uso de IA</b>', '<b>Reset AI usage</b>', '<b>Reiniciar uso de IA</b>'),
              t3(
                'Virada de ciclo, ou correção de consumo indevido.',
                'Cycle rollover, or correcting improper usage.',
                'Cambio de ciclo, o corrección de consumo indebido.',
              ),
            ],
            [
              t3('<b>Armazenamento</b>', '<b>Storage</b>', '<b>Almacenamiento</b>'),
              t3(
                'Os canais pararam de aceitar anexos por falta de espaço.',
                'Channels stopped accepting attachments for lack of space.',
                'Los canales dejaron de aceptar adjuntos por falta de espacio.',
              ),
            ],
            [
              t3('<b>Assentos</b>', '<b>Seats</b>', '<b>Asientos</b>'),
              t3(
                'A empresa precisa de mais pessoas do que o plano permite, sem trocar de plano.',
                'The company needs more people than the plan allows, without changing plan.',
                'La empresa necesita más personas de las que el plan permite, sin cambiar de plan.',
              ),
            ],
            [
              t3('<b>Suspender</b>', '<b>Suspend</b>', '<b>Suspender</b>'),
              t3(
                'Inadimplência ou pedido do cliente. Fica inacessível sem perder dado.',
                'Non-payment or client request. It becomes inaccessible without losing data.',
                'Impago o pedido del cliente. Queda inaccesible sin perder datos.',
              ),
            ],
          ],
        },
        figuras: [
          {
            src: 'p05-empresa-detalhe',
            legenda: t3(
              '<b>Detalhe da empresa.</b> Cada bloco tem o <b>próprio</b> botão de salvar — salvar um limite não salva o outro.',
              '<b>Company detail.</b> Each block has its <b>own</b> save button — saving one limit does not save the other.',
              '<b>Detalle de la empresa.</b> Cada bloque tiene su <b>propio</b> botón de guardar — guardar un límite no guarda el otro.',
            ),
          },
          {
            src: 'p06-empresa-limites',
            legenda: t3(
              '<b>Os limites contratados.</b> <b>1</b> o assistente; <b>2</b> o espaço. São os dois números que o cliente sente quando acabam.',
              '<b>The contracted limits.</b> <b>1</b> the assistant; <b>2</b> the storage. These are the two numbers the client feels when they run out.',
              '<b>Los límites contratados.</b> <b>1</b> el asistente; <b>2</b> el espacio. Son los dos números que el cliente siente cuando se acaban.',
            ),
          },
        ],
      },
    ],
  },

  {
    id: 'pessoas-plataforma',
    titulo: t3('Pessoas', 'People', 'Personas'),
    resumo: t3(
      'A primeira tela de qualquer atendimento: quem liga sabe o próprio e-mail, e raramente o resto.',
      'The first screen of any support call: whoever calls knows their own e-mail, and rarely the rest.',
      'La primera pantalla de cualquier atención: quien llama sabe su propio correo, y rara vez el resto.',
    ),
    secoes: [
      {
        id: 'quatro-perguntas',
        titulo: t3(
          'Resolver "não consigo entrar" em quatro perguntas',
          'Solving "I cannot sign in" in four questions',
          'Resolver "no puedo entrar" en cuatro preguntas',
        ),
        passos: [
          t3(
            'A conta <b>existe</b>? Busque pelo e-mail. Aparecendo como <i>convite pendente</i>, nunca foi aceita — use <b>Reenviar convite</b>.',
            'Does the account <b>exist</b>? Search by e-mail. If it shows as a <i>pending invitation</i>, it was never accepted — use <b>Resend invitation</b>.',
            '¿La cuenta <b>existe</b>? Busca por correo. Si aparece como <i>invitación pendiente</i>, nunca fue aceptada — usa <b>Reenviar invitación</b>.',
          ),
          t3(
            'Está <b>ativa</b>? Conta desativada não entra, e o pedido de senha responde explicando.',
            'Is it <b>active</b>? A deactivated account cannot sign in, and the password request answers with an explanation.',
            '¿Está <b>activa</b>? Una cuenta desactivada no entra, y el pedido de contraseña responde explicando.',
          ),
          t3(
            'O e-mail está <b>verificado</b>? Se não, <b>Enviar verificação</b>.',
            'Is the e-mail <b>verified</b>? If not, <b>Send verification</b>.',
            '¿El correo está <b>verificado</b>? Si no, <b>Enviar verificación</b>.',
          ),
          t3(
            'É senha mesmo? <b>Reenviar acesso</b> manda o código de redefinição.',
            'Is it really the password? <b>Resend access</b> sends the reset code.',
            '¿De verdad es la contraseña? <b>Reenviar acceso</b> manda el código de restablecimiento.',
          ),
        ],
        figuras: [{
          src: 'p07-pessoas',
          legenda: t3(
            '<b>Pessoas.</b> <b>1</b> a busca em toda a plataforma; <b>2</b> o botão que cria uma pessoa nova.',
            '<b>People.</b> <b>1</b> search across the whole platform; <b>2</b> the button that creates a new person.',
            '<b>Personas.</b> <b>1</b> la búsqueda en toda la plataforma; <b>2</b> el botón que crea una persona nueva.',
          ),
        }],
      },
      {
        id: 'nova-pessoa',
        titulo: t3('Criar uma pessoa', 'Creating a person', 'Crear una persona'),
        campos: {
          titulo: t3('Nova pessoa', 'New person', 'Nueva persona'),
          itens: [
            {
              nome: t3('Empresa', 'Company', 'Empresa'),
              desc: t3(
                'Em qual empresa ela entra. Se já participa de outra, isso não substitui — soma.',
                'Which company they join. If they already belong to another, this does not replace it — it adds.',
                'En qué empresa entra. Si ya participa en otra, esto no sustituye — suma.',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('Nome', 'Name', 'Nombre'),
              desc: t3(
                'Como aparece para os colegas, nos casos e na trilha de auditoria.',
                'How they appear to colleagues, in cases and in the audit trail.',
                'Cómo aparece ante los colegas, en los casos y en la traza de auditoría.',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('E-mail', 'E-mail', 'Correo'),
              desc: t3(
                'Para onde vai o convite, e o login dela daí em diante.',
                'Where the invitation goes, and their login from then on.',
                'A dónde va la invitación, y su acceso de ahí en adelante.',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('Papel', 'Role', 'Rol'),
              desc: t3(
                'O que ela pode fazer. <b>Sem papel, entra e não consegue fazer nada</b> — é o esquecimento mais comum.',
                'What they can do. <b>With no role, they get in and can do nothing</b> — the most common oversight.',
                'Qué puede hacer. <b>Sin rol, entra y no puede hacer nada</b> — es el olvido más común.',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('Senha', 'Password', 'Contraseña'),
              desc: t3(
                'Some sozinho quando o e-mail já tem conta. Nos demais casos, deixe em branco.',
                'It disappears on its own when the e-mail already has an account. Otherwise, leave it blank.',
                'Desaparece solo cuando el correo ya tiene cuenta. En los demás casos, déjala en blanco.',
              ),
              obrigatorio: false,
            },
          ],
        },
        figuras: [{
          src: 'p08-nova-pessoa',
          legenda: t3(
            '<b>Nova pessoa.</b> <b>1</b> a empresa em que ela entra; <b>2</b> o e-mail que recebe o convite.',
            '<b>New person.</b> <b>1</b> the company they join; <b>2</b> the e-mail that receives the invitation.',
            '<b>Nueva persona.</b> <b>1</b> la empresa en la que entra; <b>2</b> el correo que recibe la invitación.',
          ),
        }],
      },
      {
        id: 'acoes',
        titulo: t3(
          'As ações disponíveis em cada pessoa',
          'The actions available on each person',
          'Las acciones disponibles en cada persona',
        ),
        tabela: {
          colunas: [t3('Ação', 'Action', 'Acción'), t3('O que faz', 'What it does', 'Qué hace')],
          linhas: [
            [
              t3('<b>Reenviar acesso</b>', '<b>Resend access</b>', '<b>Reenviar acceso</b>'),
              t3(
                'Manda de novo o código para quem já é ativo e perdeu a senha.',
                'Sends the code again to someone already active who lost their password.',
                'Manda otra vez el código a quien ya es activo y perdió la contraseña.',
              ),
            ],
            [
              t3('<b>Enviar verificação</b>', '<b>Send verification</b>', '<b>Enviar verificación</b>'),
              t3('Reenvia o código de confirmação do e-mail.', 'Resends the e-mail confirmation code.', 'Reenvía el código de confirmación del correo.'),
            ],
            [
              t3('<b>Marcar verificado</b>', '<b>Mark as verified</b>', '<b>Marcar verificado</b>'),
              t3(
                'Carimba como confirmado sem enviar nada. Use com parcimônia.',
                'Stamps it as confirmed without sending anything. Use sparingly.',
                'Marca como confirmado sin enviar nada. Úsalo con moderación.',
              ),
            ],
            [
              t3('<b>Definir senha</b>', '<b>Set password</b>', '<b>Definir contraseña</b>'),
              t3(
                'Troca a senha na hora — para o caso em que a pessoa está na linha.',
                'Changes the password on the spot — for when the person is on the line.',
                'Cambia la contraseña al instante — para cuando la persona está en la línea.',
              ),
            ],
            [
              t3('<b>Desativar conta</b>', '<b>Deactivate account</b>', '<b>Desactivar cuenta</b>'),
              t3('Tira o acesso sem apagar nada.', 'Removes access without deleting anything.', 'Quita el acceso sin borrar nada.'),
            ],
            [
              t3('<b>Reenviar convite</b>', '<b>Resend invitation</b>', '<b>Reenviar invitación</b>'),
              t3(
                'Aparece em quem não aceitou. Gera código novo e renova o prazo.',
                'Shows for whoever has not accepted. Generates a new code and renews the deadline.',
                'Aparece en quien no aceptó. Genera código nuevo y renueva el plazo.',
              ),
            ],
            [
              t3('<b>Excluir</b>', '<b>Delete</b>', '<b>Eliminar</b>'),
              t3(
                'A única ação que <b>libera o e-mail</b> para outro cadastro.',
                'The only action that <b>frees the e-mail</b> for another registration.',
                'La única acción que <b>libera el correo</b> para otro registro.',
              ),
            ],
          ],
        },
        notas: [{
          tipo: 'aviso',
          texto: t3(
            '<b>Excluir mostra uma prévia antes.</b> Quem nunca assinou nada é apagado de verdade; quem já assinou tem o e-mail liberado e os registros preservados — apagá-los faria as assinaturas dela aparecerem como adulteradas para quem conferir depois.',
            '<b>Deleting shows a preview first.</b> Someone who never signed anything is truly erased; someone who has signed gets the e-mail freed and the records preserved — erasing them would make their signatures look tampered with to anyone checking later.',
            '<b>Eliminar muestra una vista previa antes.</b> Quien nunca firmó nada se borra de verdad; quien ya firmó tiene el correo liberado y los registros preservados — borrarlos haría que sus firmas aparecieran como adulteradas para quien verifique después.',
          ),
        }],
      },
    ],
  },

  {
    id: 'multi-vinculo',
    titulo: t3('Uma pessoa em duas empresas', 'One person in two companies', 'Una persona en dos empresas'),
    resumo: t3(
      'Dentro de uma empresa, cada pessoa entra uma vez só. Entre empresas, quantas for preciso.',
      'Inside one company, each person exists once. Across companies, as many as needed.',
      'Dentro de una empresa, cada persona entra una sola vez. Entre empresas, cuantas haga falta.',
    ),
    secoes: [
      {
        id: 'como',
        titulo: t3('Como fazer', 'How to do it', 'Cómo hacerlo'),
        passos: [
          t3(
            'Em <b>Pessoas</b>, use <b>Nova pessoa</b> e informe o e-mail que já existe.',
            'On <b>People</b>, use <b>New person</b> and enter the e-mail that already exists.',
            'En <b>Personas</b>, usa <b>Nueva persona</b> e indica el correo que ya existe.',
          ),
          t3(
            'O formulário reconhece a conta e <b>esconde o campo de senha</b>, avisando que será um segundo vínculo.',
            'The form recognizes the account and <b>hides the password field</b>, warning that this will be a second membership.',
            'El formulario reconoce la cuenta y <b>oculta el campo de contraseña</b>, avisando que será un segundo vínculo.',
          ),
          t3('Escolha a empresa e o papel, e confirme.', 'Pick the company and the role, and confirm.', 'Elige la empresa y el rol, y confirma.'),
          t3(
            'A pessoa passa a ver as duas empresas ao entrar — a senha dela não muda.',
            'The person now sees both companies on sign-in — their password does not change.',
            'La persona pasa a ver las dos empresas al entrar — su contraseña no cambia.',
          ),
        ],
        figuras: [{
          src: '56-hub-escolher-empresa',
          legenda: t3(
            '<b>O que a pessoa vê depois.</b> Ao entrar, ela escolhe a empresa — com o papel de cada uma à mostra.',
            '<b>What the person sees afterwards.</b> On signing in, they pick the company — with their role in each on display.',
            '<b>Lo que ve la persona después.</b> Al entrar, elige la empresa — con el rol de cada una a la vista.',
          ),
        }],
        notas: [{
          tipo: 'nota',
          texto: t3(
            '<b>Repetir a mesma empresa dá erro</b>, e é proposital: duas fichas da mesma pessoa na mesma empresa é duplicidade, não vínculo duplo.',
            '<b>Repeating the same company errors out</b>, on purpose: two records of the same person in the same company is duplication, not dual membership.',
            '<b>Repetir la misma empresa da error</b>, y es a propósito: dos fichas de la misma persona en la misma empresa es duplicidad, no vínculo doble.',
          ),
        }],
      },
    ],
  },

  {
    id: 'numeros',
    titulo: t3(
      'Custos, armazenamento e assistente',
      'Costs, storage and assistant',
      'Costos, almacenamiento y asistente',
    ),
    resumo: t3(
      'As leituras de todas as empresas na mesma tela.',
      'The readings for every company on one screen.',
      'Las lecturas de todas las empresas en la misma pantalla.',
    ),
    secoes: [
      {
        id: 'custos',
        titulo: t3('Custos e entradas', 'Costs and revenue', 'Costos e ingresos'),
        corpo: [t3(
          '<b>Contratado</b> é o que os planos somam; <b>recebido</b> é o que efetivamente entrou pela cobrança; <b>custo</b> é o consumo medido. Dado ausente aparece vazio, nunca como zero — zero é uma informação, ausência é outra.',
          '<b>Contracted</b> is what the plans add up to; <b>received</b> is what actually came in through billing; <b>cost</b> is measured consumption. Missing data shows as blank, never as zero — zero is one piece of information, absence is another.',
          '<b>Contratado</b> es lo que suman los planes; <b>recibido</b> es lo que efectivamente entró por el cobro; <b>costo</b> es el consumo medido. Un dato ausente aparece vacío, nunca como cero — cero es una información, ausencia es otra.',
        )],
        figuras: [{
          src: 'p09-custos',
          legenda: t3(
            '<b>Custos e entradas.</b> Três leituras que não se misturam.',
            '<b>Costs and revenue.</b> Three readings that do not mix.',
            '<b>Costos e ingresos.</b> Tres lecturas que no se mezclan.',
          ),
        }],
      },
      {
        id: 'espaco',
        titulo: t3(
          'Armazenamento e uso do assistente',
          'Storage and assistant usage',
          'Almacenamiento y uso del asistente',
        ),
        figuras: [
          {
            src: 'p10-armazenamento',
            legenda: t3(
              '<b>Armazenamento.</b> Quanto cada empresa ocupa do que contratou.',
              '<b>Storage.</b> How much of its contracted space each company uses.',
              '<b>Almacenamiento.</b> Cuánto ocupa cada empresa de lo que contrató.',
            ),
          },
          {
            src: 'p11-tokens-ia',
            legenda: t3(
              '<b>Tokens de IA.</b> A mesma leitura para o assistente. O ajuste continua na gaveta da empresa.',
              '<b>AI tokens.</b> The same reading for the assistant. Adjusting is still done in the company drawer.',
              '<b>Tokens de IA.</b> La misma lectura para el asistente. El ajuste sigue en el cajón de la empresa.',
            ),
          },
        ],
      },
      {
        id: 'sistema',
        titulo: t3('Sistema', 'System', 'Sistema'),
        figuras: [{
          src: 'p12-sistema',
          legenda: t3(
            '<b>Sistema.</b> O lugar de olhar quando algo parece errado em toda a plataforma.',
            '<b>System.</b> The place to look when something seems wrong across the whole platform.',
            '<b>Sistema.</b> El lugar donde mirar cuando algo parece mal en toda la plataforma.',
          ),
        }],
        notas: [{
          tipo: 'nota',
          texto: t3(
            '<b>Uma empresa com problema não é problema de sistema.</b> Se só um cliente reclama, o caminho é a gaveta dele.',
            '<b>One company with a problem is not a system problem.</b> If only one client complains, the path is their drawer.',
            '<b>Una empresa con problema no es problema de sistema.</b> Si solo un cliente reclama, el camino es su cajón.',
          ),
        }],
      },
    ],
  },

  {
    id: 'celular',
    titulo: t3('O console no celular', 'The console on a phone', 'La consola en el móvil'),
    resumo: t3(
      'O atendimento que chega fora da mesa não precisa esperar você chegar nela.',
      'Support that arrives away from your desk need not wait until you reach it.',
      'La atención que llega fuera del escritorio no tiene que esperar a que llegues a él.',
    ),
    secoes: [
      {
        id: 'mobile',
        titulo: t3('Em tela pequena', 'On a small screen', 'En pantalla pequeña'),
        figuras: [
          {
            src: 'p13-console-mobile',
            legenda: t3(
              '<b>No celular.</b> As tabelas rolam de lado em vez de espremer as colunas, e os formulários empilham os campos.',
              '<b>On a phone.</b> Tables scroll sideways instead of squeezing the columns, and forms stack their fields.',
              '<b>En el móvil.</b> Las tablas se desplazan de lado en vez de apretar las columnas, y los formularios apilan los campos.',
            ),
          },
          {
            src: 'p14-console-mobile-menu',
            legenda: t3(
              '<b>Menu no celular.</b> As seis áreas atrás do botão de menu, na mesma ordem.',
              '<b>Menu on a phone.</b> The six areas behind the menu button, in the same order.',
              '<b>Menú en el móvil.</b> Las seis áreas detrás del botón de menú, en el mismo orden.',
            ),
          },
        ],
      },
    ],
  },

  {
    id: 'emails-plataforma',
    titulo: t3(
      'Os e-mails que a plataforma dispara',
      'The e-mails the platform triggers',
      'Los correos que dispara la plataforma',
    ),
    resumo: t3(
      'Vale saber o que o cliente recebe antes de clicar.',
      'Worth knowing what the client receives before you click.',
      'Vale saber qué recibe el cliente antes de hacer clic.',
    ),
    secoes: [
      {
        id: 'quais',
        titulo: t3('Ação no console → o que chega', 'Console action → what arrives', 'Acción en la consola → qué llega'),
        tabela: {
          colunas: [
            t3('Ação no console', 'Console action', 'Acción en la consola'),
            t3('O que chega', 'What arrives', 'Qué llega'),
          ],
          linhas: [
            [
              t3('Criar empresa (sem senha)', 'Create company (no password)', 'Crear empresa (sin contraseña)'),
              t3(
                '"Seu acesso a [empresa]" — código e link para definir senha.',
                '"Your access to [company]" — code and link to set a password.',
                '"Tu acceso a [empresa]" — código y enlace para definir contraseña.',
              ),
            ],
            [
              t3('Nova pessoa com e-mail já existente', 'New person with an existing e-mail', 'Nueva persona con correo ya existente'),
              t3(
                '"Convite para [empresa]" — avisa que o login continua o mesmo.',
                '"Invitation to [company]" — it says the login stays the same.',
                '"Invitación a [empresa]" — avisa que el acceso sigue igual.',
              ),
            ],
            [
              t3('Reenviar convite', 'Resend invitation', 'Reenviar invitación'),
              t3(
                'Mesmo e-mail do convite, com <b>código novo</b> e prazo renovado.',
                'The same invitation e-mail, with a <b>new code</b> and a renewed deadline.',
                'El mismo correo de invitación, con <b>código nuevo</b> y plazo renovado.',
              ),
            ],
            [
              t3('Reenviar acesso', 'Resend access', 'Reenviar acceso'),
              t3('Código de redefinição, válido por 30 minutos.', 'Reset code, valid for 30 minutes.', 'Código de restablecimiento, válido por 30 minutos.'),
            ],
            [
              t3('Enviar verificação', 'Send verification', 'Enviar verificación'),
              t3('Código de confirmação, válido por 24 horas.', 'Confirmation code, valid for 24 hours.', 'Código de confirmación, válido por 24 horas.'),
            ],
            [
              t3('Desativar conta', 'Deactivate account', 'Desactivar cuenta'),
              t3(
                'Nada na hora; se a pessoa pedir senha, recebe a explicação.',
                'Nothing at the time; if the person asks for a password, they get the explanation.',
                'Nada en el momento; si la persona pide contraseña, recibe la explicación.',
              ),
            ],
          ],
        },
        figuras: [{
          src: 'email-convite-novo',
          legenda: t3(
            '<b>O que o admin do cliente recebe ao criar a empresa sem senha.</b> Código de 8 dígitos, válido por 7 dias.',
            '<b>What the client admin receives when the company is created with no password.</b> An 8-digit code, valid for 7 days.',
            '<b>Lo que recibe el admin del cliente al crear la empresa sin contraseña.</b> Código de 8 dígitos, válido por 7 días.',
          ),
        }],
      },
    ],
  },

  {
    id: 'nunca',
    titulo: t3('O que nunca fazer', 'What never to do', 'Qué nunca hacer'),
    resumo: t3(
      'Quatro atalhos que parecem inofensivos e cobram caro depois.',
      'Four shortcuts that look harmless and cost dearly later.',
      'Cuatro atajos que parecen inofensivos y cobran caro después.',
    ),
    secoes: [
      {
        id: 'lista',
        titulo: t3('Os quatro', 'The four', 'Los cuatro'),
        tabela: {
          colunas: [t3('Não faça', 'Do not', 'No hagas'), t3('Por quê', 'Why', 'Por qué')],
          linhas: [
            [
              t3('Preencher a senha ao criar pessoa', 'Fill in the password when creating a person', 'Completar la contraseña al crear una persona'),
              t3(
                'Você passa a conhecer a senha de um cliente, e ela precisa trafegar por um caminho inseguro.',
                'You come to know a client\'s password, and it has to travel an insecure path.',
                'Pasas a conocer la contraseña de un cliente, y tiene que viajar por un camino inseguro.',
              ),
            ],
            [
              t3('Excluir sem ler a prévia', 'Delete without reading the preview', 'Eliminar sin leer la vista previa'),
              t3(
                'A prévia é o único aviso de parecer aberto e de assinatura existente.',
                'The preview is the only warning of an open opinion and of an existing signature.',
                'La vista previa es el único aviso de dictamen abierto y de firma existente.',
              ),
            ],
            [
              t3('Usar o console para ler casos', 'Use the console to read cases', 'Usar la consola para leer casos'),
              t3(
                'Ele não faz isso — e a separação é o que sustenta a confiança no canal.',
                'It does not do that — and the separation is what upholds trust in the channel.',
                'No hace eso — y la separación es lo que sostiene la confianza en el canal.',
              ),
            ],
            [
              t3('Marcar e-mail como verificado por rotina', 'Mark e-mails as verified as a matter of routine', 'Marcar correos como verificados por rutina'),
              t3(
                'Carimba como provado algo que ninguém provou.',
                'It stamps as proven something nobody proved.',
                'Marca como probado algo que nadie probó.',
              ),
            ],
          ],
        },
        notas: [{
          tipo: 'ok',
          texto: t3(
            '<b>A régua para decidir sozinho:</b> se a ação resolve algo que o cliente <b>não conseguiria</b> fazer por dentro, é sua. Se ele conseguiria e só não sabe como, o certo é ensinar.',
            '<b>The rule for deciding on your own:</b> if the action solves something the client <b>could not</b> do from inside, it is yours. If they could and simply do not know how, the right move is to teach.',
            '<b>La regla para decidir solo:</b> si la acción resuelve algo que el cliente <b>no podría</b> hacer por dentro, es tuya. Si podría y solo no sabe cómo, lo correcto es enseñar.',
          ),
        }],
      },
    ],
  },
]
