/**
 * O manual do usuário, capítulo a capítulo — a mesma matéria dos PDFs, escrita
 * para leitura em tela e com os MESMOS prints (`/manual/*.webp`).
 *
 * Cada capítulo declara o que exige no formato de `registry.tsx`, e `ManualView`
 * filtra com `evaluate()`. Cada texto vem nos três idiomas, obrigatoriamente —
 * ver `tipos.ts` para o porquê das duas coisas.
 */
import { t3, type ManualCapitulo } from './tipos'

/** Permissões que abrem o Canal de Denúncias (espelha a tela `cases`). */
const VER_CASOS = ['etica.view_cases', 'privacidade.view_requests', 'incidentes.view']

export const CAPITULOS: ManualCapitulo[] = [
  // ─────────────────────────────────────────────── fundamentos
  {
    id: 'organizacao',
    titulo: t3('Como a Soluvia se organiza', 'How Soluvia is organized', 'Cómo se organiza Soluvia'),
    resumo: t3(
      'As quatro peças do sistema e a ordem em que elas se encaixam.',
      'The four pieces of the system and the order they fit together.',
      'Las cuatro piezas del sistema y el orden en que encajan.',
    ),
    secoes: [
      {
        id: 'quatro-pecas',
        titulo: t3('As quatro peças', 'The four pieces', 'Las cuatro piezas'),
        corpo: [t3(
          'Entender a ordem abaixo evita a maior parte das dúvidas. Cada peça vive dentro da anterior e não atravessa para outra.',
          'Understanding the order below prevents most questions. Each piece lives inside the previous one and never crosses over to another.',
          'Entender el orden de abajo evita la mayoría de las dudas. Cada pieza vive dentro de la anterior y no cruza a otra.',
        )],
        tabela: {
          colunas: [t3('Peça', 'Piece', 'Pieza'), t3('O que é', 'What it is', 'Qué es')],
          linhas: [
            [
              t3('Empresa', 'Company', 'Empresa'),
              t3(
                'Tudo — pessoas, canais, casos — vive dentro dela e não atravessa para outra.',
                'Everything — people, channels, cases — lives inside it and never crosses over to another.',
                'Todo — personas, canales, casos — vive dentro de ella y no cruza a otra.',
              ),
            ],
            [
              t3('Canal', 'Channel', 'Canal'),
              t3(
                'A porta de entrada pública. Um canal de <b>denúncias</b> e um de <b>SAC</b> são coisas diferentes, cada um com seu link.',
                'The public front door. A <b>whistleblowing</b> channel and a <b>consumer service</b> channel are different things, each with its own link.',
                'La puerta de entrada pública. Un canal de <b>denuncias</b> y uno de <b>atención al consumidor</b> son cosas distintas, cada uno con su enlace.',
              ),
            ],
            [
              t3('Formulário', 'Form', 'Formulario'),
              t3(
                'O que a pessoa de fora preenche naquele canal.',
                'What the person outside fills in on that channel.',
                'Lo que la persona de fuera completa en ese canal.',
              ),
            ],
            [
              t3('Fluxo', 'Workflow', 'Flujo'),
              t3(
                'O caminho que o relato percorre depois de entrar: quem analisa, em que ordem, com que prazo.',
                'The path a report follows after it arrives: who reviews it, in what order, with what deadline.',
                'El camino que recorre el reporte tras entrar: quién analiza, en qué orden y con qué plazo.',
              ),
            ],
          ],
        },
        notas: [{
          tipo: 'nota',
          texto: t3(
            '<b>A regra que explica o resto:</b> o formulário e o fluxo só valem depois de <b>publicados</b>. Enquanto estiverem em rascunho, o canal continua mostrando a versão anterior — e é isso que permite mexer no formulário sem derrubar o canal que já está no ar.',
            '<b>The rule that explains the rest:</b> the form and the workflow only take effect once <b>published</b>. While they are drafts, the channel keeps serving the previous version — and that is what lets you edit a form without taking down a channel that is already live.',
            '<b>La regla que explica el resto:</b> el formulario y el flujo solo valen tras ser <b>publicados</b>. Mientras estén en borrador, el canal sigue mostrando la versión anterior — y eso es lo que permite modificar el formulario sin tumbar el canal que ya está en línea.',
          ),
        }],
      },
      {
        id: 'primeiro-dia',
        titulo: t3('Seu primeiro dia, em sete passos', 'Your first day, in seven steps', 'Tu primer día, en siete pasos'),
        passos: [
          t3('Aceite o convite e defina a sua senha.', 'Accept the invitation and set your password.', 'Acepta la invitación y define tu contraseña.'),
          t3('Entre e reconheça o painel.', 'Sign in and get to know the dashboard.', 'Entra y reconoce el panel.'),
          t3('Crie o canal — ele nasce ativo, mas ainda vazio.', 'Create the channel — it is born active, but still empty.', 'Crea el canal — nace activo, pero todavía vacío.'),
          t3('Monte e <b>publique</b> o formulário — agora o link funciona.', 'Build and <b>publish</b> the form — now the link works.', 'Arma y <b>publica</b> el formulario — ahora el enlace funciona.'),
          t3('Monte e publique o fluxo — define quem analisa.', 'Build and publish the workflow — it defines who reviews.', 'Arma y publica el flujo — define quién analiza.'),
          t3('Convide a equipe e dê os papéis.', 'Invite the team and assign roles.', 'Invita al equipo y asigna los roles.'),
          t3('Divulgue o link público.', 'Share the public link.', 'Difunde el enlace público.'),
        ],
        corpo: [t3(
          'Cada passo tem o seu capítulo aqui no manual, na mesma ordem.',
          'Each step has its own chapter in this manual, in the same order.',
          'Cada paso tiene su capítulo en este manual, en el mismo orden.',
        )],
      },
    ],
  },

  {
    id: 'entrar',
    titulo: t3('Entrar e se localizar', 'Signing in and finding your way', 'Entrar y ubicarte'),
    resumo: t3(
      'A tela de entrada, a recuperação de senha e como o painel se divide.',
      'The sign-in screen, password recovery, and how the dashboard is laid out.',
      'La pantalla de entrada, la recuperación de contraseña y cómo se divide el panel.',
    ),
    tela: 'overview',
    secoes: [
      {
        id: 'a-entrada',
        titulo: t3('A tela de entrada', 'The sign-in screen', 'La pantalla de entrada'),
        corpo: [t3(
          'É a única tela deste manual que você não consegue abrir a partir daqui — se está lendo isto, já entrou. Ela está aqui para você reconhecer o caminho quando precisar explicá-lo a alguém.',
          'It is the only screen in this manual you cannot open from here — if you are reading this, you are already in. It is here so you recognize the path when you need to explain it to someone.',
          'Es la única pantalla de este manual que no puedes abrir desde aquí — si estás leyendo esto, ya entraste. Está aquí para que reconozcas el camino cuando tengas que explicárselo a alguien.',
        )],
        figuras: [{
          src: '02-login',
          legenda: t3(
            '<b>Tela de entrada.</b> <b>1</b> o e-mail cadastrado; <b>2</b> a senha; <b>3</b> o botão Entrar; <b>4</b> a recuperação por código.',
            '<b>Sign-in screen.</b> <b>1</b> the registered e-mail; <b>2</b> the password; <b>3</b> the Sign in button; <b>4</b> recovery by code.',
            '<b>Pantalla de entrada.</b> <b>1</b> el correo registrado; <b>2</b> la contraseña; <b>3</b> el botón Entrar; <b>4</b> la recuperación por código.',
          ),
        }],
      },
      {
        id: 'esqueci-senha',
        titulo: t3('Esqueci a minha senha', 'I forgot my password', 'Olvidé mi contraseña'),
        passos: [
          t3('Clique em <b>Esqueci minha senha</b> e informe o e-mail.', 'Click <b>Forgot my password</b> and enter your e-mail.', 'Haz clic en <b>Olvidé mi contraseña</b> e indica tu correo.'),
          t3('Confira a caixa de entrada: chega um código de 8 dígitos, válido por 30 minutos.', 'Check your inbox: an 8-digit code arrives, valid for 30 minutes.', 'Revisa tu bandeja: llega un código de 8 dígitos, válido por 30 minutos.'),
          t3('Volte à tela, digite o código e escolha a nova senha (mínimo de 8 caracteres).', 'Go back to the screen, type the code and choose a new password (at least 8 characters).', 'Vuelve a la pantalla, escribe el código y elige la nueva contraseña (mínimo 8 caracteres).'),
        ],
        figuras: [{
          src: '03-esqueci-senha',
          legenda: t3(
            '<b>Passo 1.</b> Você informa o e-mail e pede o código. A resposta na tela é sempre a mesma, exista ou não a conta — isso impede que alguém descubra quais e-mails estão cadastrados.',
            '<b>Step 1.</b> You enter the e-mail and request the code. The on-screen answer is always the same, whether or not the account exists — that stops anyone from discovering which e-mails are registered.',
            '<b>Paso 1.</b> Indicas el correo y pides el código. La respuesta en pantalla es siempre la misma, exista o no la cuenta — eso impide que alguien descubra qué correos están registrados.',
          ),
        }],
        notas: [{
          tipo: 'nota',
          texto: t3(
            '<b>Conta desativada?</b> Em vez do código, chega um e-mail explicando a situação. Quem reativa é o administrador da empresa, na tela de Pessoas.',
            '<b>Account deactivated?</b> Instead of the code, an e-mail arrives explaining the situation. Reactivation is done by the company administrator, on the People screen.',
            '<b>¿Cuenta desactivada?</b> En lugar del código llega un correo explicando la situación. Quien reactiva es el administrador de la empresa, en la pantalla de Personas.',
          ),
        }],
      },
      {
        id: 'o-painel',
        titulo: t3('Onde fica cada coisa', 'Where everything is', 'Dónde está cada cosa'),
        corpo: [t3(
          'O menu lateral agrupa as telas em <b>Geral</b>, <b>Módulos</b>, <b>Canais e formulários</b> e <b>Administração</b>. Você só enxerga o que o seu acesso permite — por isso o menu de duas pessoas da mesma empresa pode ser diferente.',
          'The side menu groups screens into <b>General</b>, <b>Modules</b>, <b>Channels and forms</b> and <b>Administration</b>. You only see what your access allows — which is why two people from the same company can have different menus.',
          'El menú lateral agrupa las pantallas en <b>General</b>, <b>Módulos</b>, <b>Canales y formularios</b> y <b>Administración</b>. Solo ves lo que tu acceso permite — por eso el menú de dos personas de la misma empresa puede ser distinto.',
        )],
        figuras: [{
          src: '06-painel-areas',
          legenda: t3(
            '<b>Como o painel se divide.</b> <b>1</b> o menu lateral; <b>2</b> a barra superior, com o nome da empresa, as notificações, o idioma e o tema.',
            '<b>How the dashboard is laid out.</b> <b>1</b> the side menu; <b>2</b> the top bar, with the company name, notifications, language and theme.',
            '<b>Cómo se divide el panel.</b> <b>1</b> el menú lateral; <b>2</b> la barra superior, con el nombre de la empresa, las notificaciones, el idioma y el tema.',
          ),
        }],
      },
    ],
  },

  // ─────────────────────────────────────────────── trabalho do dia
  {
    id: 'meus-atendimentos',
    titulo: t3('Meus atendimentos', 'My assignments', 'Mis atenciones'),
    resumo: t3(
      'O que está esperando uma ação sua — a primeira tela do seu dia.',
      'What is waiting on you — the first screen of your day.',
      'Lo que espera una acción tuya — la primera pantalla de tu día.',
    ),
    tela: 'mine',
    secoes: [
      {
        id: 'a-fila',
        titulo: t3('A sua fila', 'Your queue', 'Tu cola'),
        corpo: [
          t3(
            'Liberado o fluxo de um caso, cada etapa vira uma ficha para quem responde por ela. É aqui que a sua aparece, com o protocolo, o nome da etapa, o tipo e o prazo.',
            'Once a case workflow is released, each stage becomes a card for whoever answers for it. Yours shows up here, with the reference number, the stage name, the type and the deadline.',
            'Liberado el flujo de un caso, cada etapa se vuelve una ficha para quien responde por ella. Aquí aparece la tuya, con el número de protocolo, el nombre de la etapa, el tipo y el plazo.',
          ),
          t3(
            'O número vermelho no menu conta quantas esperam por você.',
            'The red number in the menu counts how many are waiting on you.',
            'El número rojo del menú cuenta cuántas te esperan.',
          ),
        ],
        figuras: [{
          src: '73-meus-atendimentos',
          legenda: t3(
            '<b>Onde a sua etapa aparece.</b> <b>1</b> a linha da etapa que é sua; o botão <b>Abrir</b> leva ao caso já posicionado nela.',
            '<b>Where your stage shows up.</b> <b>1</b> the row of the stage that is yours; the <b>Open</b> button takes you to the case already positioned on it.',
            '<b>Dónde aparece tu etapa.</b> <b>1</b> la fila de la etapa que es tuya; el botón <b>Abrir</b> lleva al caso ya posicionado en ella.',
          ),
        }],
        notas: [{
          tipo: 'nota',
          texto: t3(
            '<b>Meus atendimentos × Meus acompanhamentos.</b> <b>Atendimentos</b> é o que espera uma ação sua — você responde por aquela etapa. <b>Acompanhamentos</b> é o que você apenas observa.',
            '<b>My assignments × What I follow.</b> <b>Assignments</b> is what is waiting on you — you answer for that stage. <b>What I follow</b> is what you merely watch.',
            '<b>Mis atenciones × Mis seguimientos.</b> <b>Atenciones</b> es lo que espera una acción tuya — tú respondes por esa etapa. <b>Seguimientos</b> es lo que solo observas.',
          ),
        }],
      },
      {
        id: 'dentro-do-caso',
        titulo: t3('Dentro do caso', 'Inside the case', 'Dentro del caso'),
        corpo: [t3(
          'O caso abre com o relato como a pessoa escreveu, as provas anexadas, a linha do tempo e o bloco da sua etapa. Cada etapa tem um <b>tipo</b>, e o tipo decide o que o sistema pede na hora do parecer.',
          'The case opens with the report exactly as it was written, the attached evidence, the timeline and the block for your stage. Each stage has a <b>type</b>, and the type decides what the system asks for when you give your opinion.',
          'El caso abre con el relato tal como lo escribió la persona, las pruebas adjuntas, la línea de tiempo y el bloque de tu etapa. Cada etapa tiene un <b>tipo</b>, y el tipo decide qué pide el sistema a la hora del dictamen.',
        )],
        tabela: {
          colunas: [
            t3('Tipo de etapa', 'Stage type', 'Tipo de etapa'),
            t3('O que o sistema pede', 'What the system asks for', 'Qué pide el sistema'),
          ],
          linhas: [
            [
              t3('Decisão', 'Decision', 'Decisión'),
              t3(
                'Procede / não procede / precisa de mais informação. É a etapa de triagem e a de veredito.',
                'Founded / unfounded / needs more information. This is the triage stage and the verdict stage.',
                'Procede / no procede / necesita más información. Es la etapa de triaje y la del veredicto.',
              ),
            ],
            [
              t3('Avaliação', 'Assessment', 'Evaluación'),
              t3(
                'Uma nota ou classificação (gravidade, risco), com as observações.',
                'A score or classification (severity, risk), with notes.',
                'Una nota o clasificación (gravedad, riesgo), con las observaciones.',
              ),
            ],
            [
              t3('Investigação', 'Investigation', 'Investigación'),
              t3(
                'O parecer descritivo, o que foi apurado, com anexos de evidência.',
                'The written findings, what was uncovered, with evidence attachments.',
                'El dictamen descriptivo, lo que se averiguó, con anexos de evidencia.',
              ),
            ],
            [
              t3('Urgência', 'Urgency', 'Urgencia'),
              t3(
                'Prioridade do caso — define quem olha primeiro e com quanta pressa.',
                'Case priority — it defines who looks first and how urgently.',
                'Prioridad del caso — define quién mira primero y con cuánta prisa.',
              ),
            ],
          ],
        },
        figuras: [{
          src: '61-caso-etapa',
          legenda: t3(
            '<b>O caso aberto.</b> <b>1</b> a etapa em que ele está. Abaixo vêm o relato, as provas e o formulário do parecer.',
            '<b>The case, open.</b> <b>1</b> the stage it is on. Below come the report, the evidence and the opinion form.',
            '<b>El caso abierto.</b> <b>1</b> la etapa en la que está. Abajo vienen el relato, las pruebas y el formulario del dictamen.',
          ),
        }],
      },
      {
        id: 'responder',
        titulo: t3('Responder e assinar', 'Answering and signing', 'Responder y firmar'),
        passos: [
          t3('Abra o caso pela lista, leia o relato e as provas.', 'Open the case from the list, read the report and the evidence.', 'Abre el caso desde la lista, lee el relato y las pruebas.'),
          t3('Desça até o bloco da <b>sua</b> etapa.', 'Scroll down to <b>your</b> stage block.', 'Baja hasta el bloque de <b>tu</b> etapa.'),
          t3('Escreva o parecer no formato que o tipo da etapa pede.', 'Write the opinion in the format the stage type asks for.', 'Escribe el dictamen en el formato que pide el tipo de etapa.'),
          t3('Se a etapa exigir, <b>assine digitalmente</b> — pede rubrica e CPF.', 'If the stage requires it, <b>sign digitally</b> — it asks for a signature mark and tax ID.', 'Si la etapa lo exige, <b>firma digitalmente</b> — pide rúbrica y documento de identidad.'),
          t3('O caso avança sozinho para a próxima etapa, ou é encerrado.', 'The case moves on by itself to the next stage, or is closed.', 'El caso avanza solo a la siguiente etapa, o se cierra.'),
        ],
        figuras: [{
          src: '48-parecer-formulario',
          legenda: t3(
            '<b>Responder.</b> Cada etapa que é sua traz o campo do parecer. <b>1</b> o miolo, que muda conforme o tipo da etapa.',
            '<b>Answering.</b> Every stage that is yours brings the opinion field. <b>1</b> the core, which changes with the stage type.',
            '<b>Responder.</b> Cada etapa que es tuya trae el campo del dictamen. <b>1</b> el centro, que cambia según el tipo de etapa.',
          ),
        }],
        notas: [{
          tipo: 'nota',
          texto: t3(
            '<b>Quem encerra o caso.</b> Toda apuração tem um <b>encerrador</b> — a etapa marcada como "quem encerra". Só o parecer dela fecha o caso; as demais etapas empurram o caso adiante.',
            '<b>Who closes the case.</b> Every investigation has a <b>closer</b> — the stage marked as "who closes". Only its opinion closes the case; the other stages push the case forward.',
            '<b>Quién cierra el caso.</b> Toda averiguación tiene un <b>cerrador</b> — la etapa marcada como "quién cierra". Solo su dictamen cierra el caso; las demás etapas empujan el caso adelante.',
          ),
        }],
      },
    ],
  },

  {
    id: 'acompanhamentos',
    titulo: t3('Meus acompanhamentos', 'What I follow', 'Mis seguimientos'),
    resumo: t3(
      'Os casos que você observa, sem responder por nenhuma etapa deles.',
      'The cases you watch, without answering for any of their stages.',
      'Los casos que observas, sin responder por ninguna de sus etapas.',
    ),
    tela: 'watching',
    secoes: [
      {
        id: 'o-que-e',
        titulo: t3('O que entra aqui', 'What lands here', 'Qué entra aquí'),
        corpo: [t3(
          'Você aparece como observador de uma etapa quando o fluxo o inclui nela. Recebe os avisos e enxerga o andamento, mas não precisa responder nada.',
          'You appear as a watcher of a stage when the workflow includes you in it. You get the notices and see the progress, but you do not have to answer anything.',
          'Apareces como observador de una etapa cuando el flujo te incluye en ella. Recibes los avisos y ves el avance, pero no tienes que responder nada.',
        )],
        figuras: [{
          src: '12-meus-acompanhamentos',
          legenda: t3(
            '<b>Meus acompanhamentos.</b> Diferente de Meus atendimentos: aqui nada espera por você.',
            '<b>What I follow.</b> Unlike My assignments: nothing here is waiting on you.',
            '<b>Mis seguimientos.</b> A diferencia de Mis atenciones: aquí nada te espera.',
          ),
        }],
      },
    ],
  },

  {
    id: 'cofre',
    titulo: t3('Cofre de provas', 'Evidence vault', 'Bóveda de pruebas'),
    resumo: t3(
      'Tudo que foi anexado aos casos, num lugar só — e o que dá para ver sem baixar.',
      'Everything attached to cases, in one place — and what you can view without downloading.',
      'Todo lo adjuntado a los casos, en un solo lugar — y qué se puede ver sin descargar.',
    ),
    tela: 'evidence',
    requires: { anyOf: ['etica.view_evidence', 'sac.view_evidence'] },
    secoes: [
      {
        id: 'o-cofre',
        titulo: t3('O cofre', 'The vault', 'La bóveda'),
        corpo: [t3(
          'Reúne os arquivos anexados aos casos, com registro de quem abriu e quando. <b>Ver</b> e <b>Baixar</b> são permissões diferentes: pode haver quem só veja, sem poder levar o arquivo.',
          'It gathers the files attached to cases, recording who opened them and when. <b>View</b> and <b>Download</b> are different permissions: someone may be allowed to look without being allowed to take the file.',
          'Reúne los archivos adjuntos a los casos, con registro de quién abrió y cuándo. <b>Ver</b> y <b>Descargar</b> son permisos distintos: puede haber quien solo mire, sin poder llevarse el archivo.',
        )],
        figuras: [{
          src: '13-cofre-provas',
          legenda: t3(
            '<b>Cofre de provas.</b> Busca por caso, por tipo e por quem anexou.',
            '<b>Evidence vault.</b> Search by case, by type and by who attached it.',
            '<b>Bóveda de pruebas.</b> Búsqueda por caso, por tipo y por quién adjuntó.',
          ),
        }],
      },
      {
        id: 'formatos',
        titulo: t3('O que abre dentro do site', 'What opens inside the site', 'Qué se abre dentro del sitio'),
        corpo: [t3(
          'Ao clicar em <b>Ver</b>, o arquivo abre aqui mesmo, sem aba nova e sem baixar nada. Quando o formato não tem como ser exibido, o botão <b>Ver</b> nem aparece — só o de baixar.',
          'Clicking <b>View</b> opens the file right here, with no new tab and nothing downloaded. When the format cannot be displayed, the <b>View</b> button does not even appear — only the download one.',
          'Al hacer clic en <b>Ver</b>, el archivo se abre aquí mismo, sin pestaña nueva y sin descargar nada. Cuando el formato no se puede mostrar, el botón <b>Ver</b> ni aparece — solo el de descargar.',
        )],
        tabela: {
          colunas: [
            t3('Tipo de arquivo', 'File type', 'Tipo de archivo'),
            t3('O que acontece', 'What happens', 'Qué pasa'),
          ],
          linhas: [
            [
              t3('Imagem (JPG, PNG, WebP, GIF)', 'Image (JPG, PNG, WebP, GIF)', 'Imagen (JPG, PNG, WebP, GIF)'),
              t3('Abre na tela, em tamanho grande.', 'Opens on screen, full size.', 'Se abre en pantalla, en tamaño grande.'),
            ],
            [
              t3('Vídeo (MP4, WebM)', 'Video (MP4, WebM)', 'Video (MP4, WebM)'),
              t3(
                'Toca no player. Formato que o navegador não decodifica — .mkv, por exemplo — avisa em vez de ficar parado.',
                'Plays in the player. A format the browser cannot decode — .mkv, for instance — says so instead of hanging.',
                'Se reproduce en el reproductor. Un formato que el navegador no decodifica — .mkv, por ejemplo — avisa en lugar de quedarse parado.',
              ),
            ],
            [
              t3('Áudio (MP3, WAV, OGG)', 'Audio (MP3, WAV, OGG)', 'Audio (MP3, WAV, OGG)'),
              t3('Toca no player, com o nome do arquivo à vista.', 'Plays in the player, with the file name in sight.', 'Se reproduce en el reproductor, con el nombre del archivo a la vista.'),
            ],
            [
              t3('PDF', 'PDF', 'PDF'),
              t3('Abre página por página, dentro do site.', 'Opens page by page, inside the site.', 'Se abre página por página, dentro del sitio.'),
            ],
            [
              t3('Texto (TXT, CSV)', 'Text (TXT, CSV)', 'Texto (TXT, CSV)'),
              t3('Mostra o conteúdo.', 'Shows the contents.', 'Muestra el contenido.'),
            ],
            [
              t3('Word, Excel, ZIP', 'Word, Excel, ZIP', 'Word, Excel, ZIP'),
              t3(
                '<b>Só aparece "Baixar".</b> Navegador nenhum exibe esses formatos — oferecer "ver" seria prometer uma prévia que não existe.',
                '<b>Only "Download" appears.</b> No browser displays these formats — offering "view" would promise a preview that does not exist.',
                '<b>Solo aparece "Descargar".</b> Ningún navegador muestra esos formatos — ofrecer "ver" sería prometer una vista previa que no existe.',
              ),
            ],
          ],
        },
      },
    ],
  },

  {
    id: 'casos',
    titulo: t3('Canal de Denúncias', 'Whistleblowing channel', 'Canal de Denuncias'),
    resumo: t3(
      'A lista completa dos relatos do módulo de ética, e como um deles entra.',
      'The complete list of reports in the ethics module, and how one comes in.',
      'La lista completa de los reportes del módulo de ética, y cómo entra uno.',
    ),
    tela: 'cases',
    requires: { anyOf: VER_CASOS },
    secoes: [
      {
        id: 'a-lista',
        titulo: t3('A lista de casos', 'The case list', 'La lista de casos'),
        corpo: [t3(
          'Todos os relatos do módulo, não só os que esperam por você. É onde se procura um protocolo específico e onde se libera o fluxo de um caso recém-chegado.',
          'Every report in the module, not only the ones waiting on you. This is where you look up a specific reference number and where you release the workflow of a newly arrived case.',
          'Todos los reportes del módulo, no solo los que te esperan. Es donde se busca un protocolo específico y donde se libera el flujo de un caso recién llegado.',
        )],
        figuras: [{
          src: '44-caso-na-lista',
          legenda: t3(
            '<b>O caso na lista.</b> <b>1</b> a linha do relato que acabou de entrar, com protocolo, gravidade e situação.',
            '<b>The case in the list.</b> <b>1</b> the row of the report that just came in, with reference number, severity and status.',
            '<b>El caso en la lista.</b> <b>1</b> la fila del reporte que acaba de entrar, con protocolo, gravedad y situación.',
          ),
        }],
      },
      {
        id: 'aviso',
        titulo: t3('O aviso que chega primeiro', 'The notice that arrives first', 'El aviso que llega primero'),
        corpo: [t3(
          'Assim que um relato entra, quem responde pelo canal recebe um e-mail com o protocolo e o link. O caso ainda não tem responsável: as fichas das etapas só nascem quando o fluxo é liberado.',
          'As soon as a report comes in, whoever answers for the channel gets an e-mail with the reference number and the link. The case has no owner yet: stage cards are only created when the workflow is released.',
          'En cuanto entra un reporte, quien responde por el canal recibe un correo con el protocolo y el enlace. El caso aún no tiene responsable: las fichas de las etapas solo nacen cuando se libera el flujo.',
        )],
        figuras: [{
          src: 'email-novo-caso',
          legenda: t3(
            '<b>Nova denúncia recebida.</b> O botão leva direto ao caso, já na tela de liberar o fluxo.',
            '<b>New report received.</b> The button goes straight to the case, already on the release-workflow screen.',
            '<b>Nueva denuncia recibida.</b> El botón lleva directo al caso, ya en la pantalla de liberar el flujo.',
          ),
        }],
      },
      {
        id: 'publico',
        titulo: t3('O que o público vê', 'What the public sees', 'Lo que ve el público'),
        corpo: [t3(
          'Do lado de fora, quem quer relatar encontra o formulário que você publicou. Ao enviar, recebe um <b>protocolo</b> — o número com que acompanha o andamento e responde a pedidos de esclarecimento.',
          'From the outside, whoever wants to report finds the form you published. On submitting, they get a <b>reference number</b> — the number they use to follow progress and answer requests for clarification.',
          'Desde fuera, quien quiere reportar encuentra el formulario que publicaste. Al enviar, recibe un <b>protocolo</b> — el número con el que sigue el avance y responde a pedidos de aclaración.',
        )],
        figuras: [
          {
            src: '41-publico-formulario-vazio',
            legenda: t3(
              '<b>O formulário no ar.</b> <b>1</b> o campo do relato. Mais abaixo vêm os anexos de prova.',
              '<b>The form, live.</b> <b>1</b> the report field. Further down come the evidence attachments.',
              '<b>El formulario en línea.</b> <b>1</b> el campo del relato. Más abajo vienen los adjuntos de prueba.',
            ),
          },
          {
            src: '43-publico-protocolo',
            legenda: t3(
              '<b>Protocolo.</b> É com ele que a pessoa acompanha — e sem ele não há como recuperar o relato.',
              '<b>Reference number.</b> It is what the person uses to follow up — and without it there is no way to retrieve the report.',
              '<b>Protocolo.</b> Es con él que la persona da seguimiento — y sin él no hay forma de recuperar el reporte.',
            ),
          },
        ],
      },
    ],
  },

  {
    id: 'sac',
    titulo: t3('SAC — Atendimento ao Consumidor', 'Consumer service desk', 'Atención al Consumidor'),
    resumo: t3(
      'A mesma mecânica do canal de denúncias, com identificação obrigatória e prazo legal.',
      'The same mechanics as the whistleblowing channel, with mandatory identification and a legal deadline.',
      'La misma mecánica del canal de denuncias, con identificación obligatoria y plazo legal.',
    ),
    tela: 'sac',
    requires: { module: 'sac', anyOf: ['sac.view_demands'] },
    secoes: [
      {
        id: 'diferencas',
        titulo: t3('O que muda em relação à denúncia', 'What changes compared to whistleblowing', 'Qué cambia respecto a la denuncia'),
        tabela: {
          colunas: [
            t3('No canal de denúncias', 'In the whistleblowing channel', 'En el canal de denuncias'),
            t3('No SAC', 'In the consumer desk', 'En atención al consumidor'),
          ],
          linhas: [
            [
              t3('O relato pode ser anônimo', 'The report may be anonymous', 'El reporte puede ser anónimo'),
              t3('A identificação é <b>obrigatória</b>', 'Identification is <b>mandatory</b>', 'La identificación es <b>obligatoria</b>'),
            ],
            [
              t3('Sem prazo legal próprio', 'No legal deadline of its own', 'Sin plazo legal propio'),
              t3(
                '<b>7 dias corridos</b> para responder (Decreto 11.034/2022)',
                '<b>7 calendar days</b> to answer (Brazilian Decree 11.034/2022)',
                '<b>7 días corridos</b> para responder (Decreto brasileño 11.034/2022)',
              ),
            ],
            [
              t3('O lembrete é o prazo do fluxo', 'The reminder is the workflow deadline', 'El recordatorio es el plazo del flujo'),
              t3(
                'O sistema cobra pelo prazo legal, contado da abertura',
                'The system chases the legal deadline, counted from opening',
                'El sistema reclama por el plazo legal, contado desde la apertura',
              ),
            ],
          ],
        },
        figuras: [
          {
            src: '11-casos-sac',
            legenda: t3(
              '<b>Casos (SAC).</b> A mesma tela do atendimento ao consumidor, com o prazo correndo à vista.',
              '<b>Cases (consumer desk).</b> The same screen for consumer service, with the deadline ticking in plain sight.',
              '<b>Casos (atención al consumidor).</b> La misma pantalla, con el plazo corriendo a la vista.',
            ),
          },
          {
            src: '58-publico-sac-formulario',
            legenda: t3(
              '<b>O formulário do SAC.</b> Repare: aqui a identificação não é escolha.',
              '<b>The consumer desk form.</b> Note: here identification is not a choice.',
              '<b>El formulario de atención.</b> Fíjate: aquí la identificación no es una elección.',
            ),
          },
        ],
      },
    ],
  },

  {
    id: 'assinatura',
    titulo: t3('Assinatura Digital', 'Digital signature', 'Firma digital'),
    resumo: t3(
      'Enviar um documento, posicionar os campos, assinar — e o que sai do outro lado.',
      'Upload a document, place the fields, sign — and what comes out the other side.',
      'Subir un documento, ubicar los campos, firmar — y qué sale del otro lado.',
    ),
    tela: 'signature',
    requires: { module: 'assinatura', anyOf: ['assinatura.view'] },
    secoes: [
      {
        id: 'passo-1',
        titulo: t3('Passo 1 — enviar o documento', 'Step 1 — upload the document', 'Paso 1 — subir el documento'),
        corpo: [t3(
          'A tela aceita PDF e DOCX, até 20 MB por documento.',
          'The screen accepts PDF and DOCX, up to 20 MB per document.',
          'La pantalla acepta PDF y DOCX, hasta 20 MB por documento.',
        )],
        figuras: [{
          src: '14-assinatura',
          legenda: t3(
            '<b>Assinatura Digital.</b> Cada documento enviado aparece na lista com a sua situação.',
            '<b>Digital signature.</b> Every uploaded document appears in the list with its status.',
            '<b>Firma digital.</b> Cada documento subido aparece en la lista con su situación.',
          ),
        }],
      },
      {
        id: 'passo-2',
        titulo: t3('Passo 2 — posicionar os campos', 'Step 2 — place the fields', 'Paso 2 — ubicar los campos'),
        corpo: [
          t3(
            'O documento abre página a página e você marca <b>onde</b> cada assinatura entra: clique para criar a caixa, arraste para o lugar exato. Dá para posicionar vários campos.',
            'The document opens page by page and you mark <b>where</b> each signature goes: click to create the box, drag to the exact spot. You can place several fields.',
            'El documento abre página por página y marcas <b>dónde</b> entra cada firma: haz clic para crear la caja, arrastra al lugar exacto. Puedes ubicar varios campos.',
          ),
          t3(
            'Sem posicionar nenhum, a assinatura é carimbada no rodapé da última página.',
            'If you place none, the signature is stamped at the foot of the last page.',
            'Si no ubicas ninguno, la firma se estampa al pie de la última página.',
          ),
        ],
        figuras: [{
          src: '63-assinatura-campos',
          legenda: t3(
            '<b>Posicionar os campos.</b> <b>1</b> a caixa que acabou de ser criada.',
            '<b>Placing the fields.</b> <b>1</b> the box that was just created.',
            '<b>Ubicar los campos.</b> <b>1</b> la caja que acaba de crearse.',
          ),
        }],
      },
      {
        id: 'passo-3',
        titulo: t3(
          'Passo 3 — o que a janela de assinar pede',
          'Step 3 — what the signing window asks for',
          'Paso 3 — qué pide la ventana de firma',
        ),
        campos: {
          titulo: t3('A janela de assinar', 'The signing window', 'La ventana de firma'),
          itens: [
            {
              nome: t3('Tipo de assinatura', 'Signature type', 'Tipo de firma'),
              desc: t3(
                'Duas opções: <b>Rubrica</b> (o traço) ou <b>Assinatura digital</b> (uma tarja pronta, sem desenhar).',
                'Two options: <b>Signature mark</b> (the stroke) or <b>Digital signature</b> (a ready-made stamp, nothing to draw).',
                'Dos opciones: <b>Rúbrica</b> (el trazo) o <b>Firma digital</b> (un sello listo, sin dibujar).',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('Rubrica', 'Signature mark', 'Rúbrica'),
              desc: t3(
                'Só quando o tipo é Rubrica: desenhe com o dedo ou o mouse, ou deixe o sistema gerar a partir do seu nome.',
                'Only when the type is a signature mark: draw with your finger or mouse, or let the system generate one from your name.',
                'Solo cuando el tipo es Rúbrica: dibuja con el dedo o el ratón, o deja que el sistema la genere a partir de tu nombre.',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('CPF', 'Tax ID (CPF)', 'Documento (CPF)'),
              desc: t3(
                'Os 11 dígitos. São conferidos na hora — número inventado é recusado. Guardamos apenas mascarado (***.***.**0-00).',
                'The 11 digits. They are checked on the spot — a made-up number is rejected. We store it masked only (***.***.**0-00).',
                'Los 11 dígitos. Se verifican al instante — un número inventado es rechazado. Lo guardamos solo enmascarado (***.***.**0-00).',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('Localização', 'Location', 'Ubicación'),
              desc: t3(
                'Reforça a prova com o lugar de onde você assinou. Pede a sua permissão, e a do navegador; dá para assinar sem.',
                'Strengthens the evidence with where you signed from. It asks your permission, and the browser\'s; you can sign without it.',
                'Refuerza la prueba con el lugar desde donde firmaste. Pide tu permiso, y el del navegador; se puede firmar sin ello.',
              ),
              obrigatorio: false,
            },
            {
              nome: t3(
                'Salvar minha rubrica neste dispositivo',
                'Save my signature mark on this device',
                'Guardar mi rúbrica en este dispositivo',
              ),
              desc: t3(
                'Guarda só o desenho, para a próxima vez. O CPF e a localização nunca são salvos.',
                'It stores only the drawing, for next time. The tax ID and the location are never saved.',
                'Guarda solo el dibujo, para la próxima vez. El documento y la ubicación nunca se guardan.',
              ),
              obrigatorio: false,
            },
          ],
        },
        figuras: [{
          src: '74-assinar-tipos',
          legenda: t3(
            '<b>A janela de assinar.</b> <b>1</b> Rubrica, o traço; <b>2</b> Assinatura digital, a tarja pronta; <b>3</b> o CPF, obrigatório nos dois casos.',
            '<b>The signing window.</b> <b>1</b> Signature mark, the stroke; <b>2</b> Digital signature, the ready-made stamp; <b>3</b> the tax ID, mandatory in both cases.',
            '<b>La ventana de firma.</b> <b>1</b> Rúbrica, el trazo; <b>2</b> Firma digital, el sello listo; <b>3</b> el documento, obligatorio en ambos casos.',
          ),
        }],
      },
      {
        id: 'duas-formas',
        titulo: t3('As duas formas de assinar', 'The two ways to sign', 'Las dos formas de firmar'),
        corpo: [
          t3(
            'Você desenha, ou deixa o sistema desenhar a partir do nome digitado — útil no computador, onde desenhar com o mouse quase nunca sai bonito.',
            'You draw, or you let the system draw from the typed name — handy on a computer, where drawing with a mouse almost never looks good.',
            'Dibujas, o dejas que el sistema dibuje a partir del nombre escrito — útil en la computadora, donde dibujar con el ratón casi nunca sale bien.',
          ),
          t3(
            'O valor jurídico é o mesmo nos dois casos: ele vem da assinatura eletrônica (chave, data/hora e trilha), não do traço.',
            'The legal weight is the same either way: it comes from the electronic signature (key, timestamp and audit trail), not from the stroke.',
            'El valor jurídico es el mismo en ambos casos: viene de la firma electrónica (clave, fecha/hora y traza), no del trazo.',
          ),
        ],
        figuras: [
          {
            src: '75-assinar-rubrica-desenho',
            legenda: t3(
              '<b>Você desenha.</b> <b>1</b> o quadro onde se traça a rubrica. Errou? O botão <b>Limpar</b> apaga.',
              '<b>You draw.</b> <b>1</b> the pad where the mark is traced. Made a mistake? The <b>Clear</b> button erases it.',
              '<b>Tú dibujas.</b> <b>1</b> el recuadro donde se traza la rúbrica. ¿Te equivocaste? El botón <b>Limpiar</b> borra.',
            ),
          },
          {
            src: '76-assinar-rubrica-gerada',
            legenda: t3(
              '<b>Ou o sistema desenha por você.</b> <b>1</b> a aba de gerar; <b>2</b> os estilos de letra disponíveis.',
              '<b>Or the system draws for you.</b> <b>1</b> the generate tab; <b>2</b> the available lettering styles.',
              '<b>O el sistema dibuja por ti.</b> <b>1</b> la pestaña de generar; <b>2</b> los estilos de letra disponibles.',
            ),
          },
        ],
        notas: [{
          tipo: 'nota',
          texto: t3(
            '<b>Não quer rubrica nenhuma?</b> Escolha o tipo <b>Assinatura digital</b>: o documento recebe uma tarja oficial com o seu nome, o CPF mascarado, a data e hora e o código de verificação. Nada para desenhar.',
            '<b>Do not want a mark at all?</b> Choose the <b>Digital signature</b> type: the document gets an official stamp with your name, the masked tax ID, the date and time and the verification code. Nothing to draw.',
            '<b>¿No quieres rúbrica?</b> Elige el tipo <b>Firma digital</b>: el documento recibe un sello oficial con tu nombre, el documento enmascarado, la fecha y hora y el código de verificación. Nada que dibujar.',
          ),
        }],
      },
      {
        id: 'localizacao',
        titulo: t3('A permissão de localização', 'The location permission', 'El permiso de ubicación'),
        corpo: [t3(
          'A localização é <b>opcional</b> e passa por duas permissões: a que a Soluvia pede, e a que o próprio navegador pede em seguida.',
          'Location is <b>optional</b> and goes through two permissions: the one Soluvia asks for, and the one the browser itself asks for right after.',
          'La ubicación es <b>opcional</b> y pasa por dos permisos: el que pide Soluvia, y el que pide el propio navegador enseguida.',
        )],
        passos: [
          t3('Clique em <b>Localização</b> na janela de assinar.', 'Click <b>Location</b> in the signing window.', 'Haz clic en <b>Ubicación</b> en la ventana de firma.'),
          t3('Escolha <b>Permitir e capturar</b>.', 'Choose <b>Allow and capture</b>.', 'Elige <b>Permitir y capturar</b>.'),
          t3(
            'O <b>navegador</b> pergunta de novo, na barra de endereço — clique em <b>Permitir</b> ali também. São duas permissões diferentes.',
            'The <b>browser</b> asks again, in the address bar — click <b>Allow</b> there too. They are two different permissions.',
            'El <b>navegador</b> pregunta otra vez, en la barra de direcciones — haz clic en <b>Permitir</b> ahí también. Son dos permisos distintos.',
          ),
          t3(
            'A linha passa a mostrar <b>Localização capturada</b>, com as coordenadas.',
            'The line then shows <b>Location captured</b>, with the coordinates.',
            'La línea pasa a mostrar <b>Ubicación capturada</b>, con las coordenadas.',
          ),
        ],
        figuras: [{
          src: '78-assinar-geo-consentimento',
          legenda: t3(
            '<b>A pergunta da Soluvia.</b> <b>1</b> Permitir e capturar; <b>2</b> Assinar sem localização, que segue em frente sem nada disso.',
            "<b>Soluvia's question.</b> <b>1</b> Allow and capture; <b>2</b> Sign without location, which goes ahead without any of it.",
            '<b>La pregunta de Soluvia.</b> <b>1</b> Permitir y capturar; <b>2</b> Firmar sin ubicación, que sigue adelante sin nada de eso.',
          ),
        }],
        notas: [{
          tipo: 'nota',
          texto: t3(
            '<b>Negou sem querer, ou o aparelho não tem GPS?</b> A janela avisa ("Permissão negada" ou "Localização indisponível") e a assinatura segue normalmente, apenas sem esse dado. Para liberar depois, use o cadeado ao lado do endereço do site, no seu navegador.',
            '<b>Denied by accident, or the device has no GPS?</b> The window says so ("Permission denied" or "Location unavailable") and signing goes ahead normally, just without that data. To allow it later, use the padlock next to the site address in your browser.',
            '<b>¿Denegaste sin querer, o el aparato no tiene GPS?</b> La ventana avisa ("Permiso denegado" o "Ubicación no disponible") y la firma sigue normalmente, solo sin ese dato. Para permitirlo después, usa el candado junto a la dirección del sitio, en tu navegador.',
          ),
        }],
      },
      {
        id: 'o-que-sai',
        titulo: t3('O arquivo que sai, e como conferir', 'The file that comes out, and how to check it', 'El archivo que sale, y cómo verificarlo'),
        corpo: [
          t3(
            'O documento assinado ganha uma página de evidências: signatário, CPF mascarado, data/hora em UTC, código de verificação e um QR Code.',
            'The signed document gains an evidence page: signer, masked tax ID, UTC timestamp, verification code and a QR code.',
            'El documento firmado gana una página de evidencias: firmante, documento enmascarado, fecha/hora en UTC, código de verificación y un código QR.',
          ),
          t3(
            'Qualquer pessoa que aponte a câmera do celular para o QR cai numa página pública que confirma quem assinou, quando, e se o arquivo apresentado é exatamente o que foi assinado — sem precisar de conta.',
            'Anyone who points a phone camera at the QR lands on a public page confirming who signed, when, and whether the file presented is exactly the one that was signed — no account needed.',
            'Cualquiera que apunte la cámara del móvil al QR llega a una página pública que confirma quién firmó, cuándo, y si el archivo presentado es exactamente el que se firmó — sin necesidad de cuenta.',
          ),
        ],
        figuras: [
          {
            src: '65-assinado-qr',
            legenda: t3(
              '<b>A página de evidências.</b> O código de verificação e o QR Code.',
              '<b>The evidence page.</b> The verification code and the QR code.',
              '<b>La página de evidencias.</b> El código de verificación y el código QR.',
            ),
          },
          {
            src: '66-verificador',
            legenda: t3(
              '<b>O que o QR abre.</b> A confirmação pública, sem login.',
              '<b>What the QR opens.</b> The public confirmation, no login.',
              '<b>Lo que abre el QR.</b> La confirmación pública, sin iniciar sesión.',
            ),
          },
        ],
        notas: [
          {
            tipo: 'nota',
            texto: t3(
              '<b>Por que o CPF é obrigatório:</b> a identificação é o que dá valor à assinatura avançada. Sem um CPF válido, o sistema recusa o ato.',
              '<b>Why the tax ID is mandatory:</b> identification is what gives an advanced signature its weight. Without a valid tax ID, the system refuses to sign.',
              '<b>Por qué el documento es obligatorio:</b> la identificación es lo que da valor a la firma avanzada. Sin un documento válido, el sistema rechaza el acto.',
            ),
          },
          {
            tipo: 'aviso',
            texto: t3(
              '<b>E se alguém editar o documento assinado?</b> O arquivo sai com uma certificação embutida: quem editar e salvar por cima quebra o selo, e o leitor de PDF avisa que o documento foi alterado desde a certificação. Se o arquivo for regerado do zero, o QR entrega — a página de verificação avisa que aquele arquivo não é o que foi assinado.',
              '<b>What if someone edits the signed document?</b> The file comes out with an embedded certification: editing and saving over it breaks the seal, and the PDF reader warns that the document has been altered since certification. If the file is rebuilt from scratch, the QR gives it away — the verification page says that file is not the one that was signed.',
              '<b>¿Y si alguien edita el documento firmado?</b> El archivo sale con una certificación incrustada: quien edite y guarde encima rompe el sello, y el lector de PDF avisa que el documento fue alterado desde la certificación. Si el archivo se regenera desde cero, el QR lo delata — la página de verificación avisa que ese archivo no es el que se firmó.',
            ),
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────── administração
  {
    id: 'pessoas',
    titulo: t3('Pessoas', 'People', 'Personas'),
    resumo: t3(
      'Quem trabalha na empresa, com o papel de cada um — e como convidar mais alguém.',
      'Who works at the company, with each person\'s role — and how to invite someone else.',
      'Quién trabaja en la empresa, con el rol de cada uno — y cómo invitar a alguien más.',
    ),
    tela: 'people',
    requires: { allOf: ['admin.manage_users'] },
    secoes: [
      {
        id: 'convidar',
        titulo: t3('Convidar alguém da equipe', 'Inviting a teammate', 'Invitar a alguien del equipo'),
        passos: [
          t3('Em <b>Pessoas</b>, clique em <b>Convidar</b>.', 'On <b>People</b>, click <b>Invite</b>.', 'En <b>Personas</b>, haz clic en <b>Invitar</b>.'),
          t3(
            'Informe o e-mail e escolha o <b>papel</b>. Sem papel, a pessoa entra sem poder fazer nada — é o esquecimento mais comum.',
            'Enter the e-mail and pick the <b>role</b>. With no role, the person gets in unable to do anything — the most common oversight.',
            'Indica el correo y elige el <b>rol</b>. Sin rol, la persona entra sin poder hacer nada — es el olvido más común.',
          ),
          t3(
            'Ela recebe o e-mail com um código e define a própria senha.',
            'They receive the e-mail with a code and set their own password.',
            'Recibe el correo con un código y define su propia contraseña.',
          ),
          t3(
            'Enquanto não aceitar, aparece na lista como <b>convite pendente</b>, com a opção de reenviar.',
            'Until they accept, they appear in the list as a <b>pending invitation</b>, with the option to resend.',
            'Mientras no acepte, aparece en la lista como <b>invitación pendiente</b>, con la opción de reenviar.',
          ),
        ],
        figuras: [{
          src: '15-pessoas',
          legenda: t3(
            '<b>Pessoas.</b> Quem trabalha na empresa, com o papel de cada um.',
            '<b>People.</b> Who works at the company, with each person\'s role.',
            '<b>Personas.</b> Quién trabaja en la empresa, con el rol de cada uno.',
          ),
        }],
      },
    ],
  },

  {
    id: 'papeis',
    titulo: t3('Papéis e permissões', 'Roles and permissions', 'Roles y permisos'),
    resumo: t3(
      'Onde se define o que cada papel pode fazer — e como criar um sob medida.',
      'Where you define what each role can do — and how to build a custom one.',
      'Donde se define qué puede hacer cada rol — y cómo crear uno a medida.',
    ),
    tela: 'roles',
    requires: { allOf: ['admin.manage_roles'] },
    secoes: [
      {
        id: 'o-que-e',
        titulo: t3(
          'Papel é um conjunto de permissões',
          'A role is a set of permissions',
          'Un rol es un conjunto de permisos',
        ),
        corpo: [
          t3(
            'Um papel não é um cargo: é uma lista de permissões marcadas. Duas pessoas com o mesmo papel enxergam o mesmo sistema; mudar o papel muda o menu de todo mundo que o tem.',
            'A role is not a job title: it is a list of ticked permissions. Two people with the same role see the same system; changing the role changes the menu for everyone who has it.',
            'Un rol no es un cargo: es una lista de permisos marcados. Dos personas con el mismo rol ven el mismo sistema; cambiar el rol cambia el menú de todos los que lo tienen.',
          ),
          t3(
            'Também dá para ajustar a permissão de <b>uma</b> pessoa específica, sem mexer no papel dela.',
            'You can also adjust the permission of <b>one</b> specific person, without touching their role.',
            'También se puede ajustar el permiso de <b>una</b> persona específica, sin tocar su rol.',
          ),
        ],
        figuras: [{
          src: '16-papeis',
          legenda: t3(
            '<b>Papéis.</b> O que cada papel pode fazer, por módulo.',
            '<b>Roles.</b> What each role can do, per module.',
            '<b>Roles.</b> Qué puede hacer cada rol, por módulo.',
          ),
        }],
      },
      {
        id: 'papel-novo',
        titulo: t3('Criar um papel sob medida', 'Creating a custom role', 'Crear un rol a medida'),
        corpo: [t3(
          'O botão <b>Novo papel</b> abre o construtor: dê um nome, escolha a cor e marque, módulo a módulo, o que esse papel pode fazer. Use quando os papéis de sistema não descrevem a função — um "Auditor externo" que só lê, por exemplo.',
          'The <b>New role</b> button opens the builder: give it a name, pick a colour and tick, module by module, what this role can do. Use it when the system roles do not describe the job — an "external auditor" who only reads, for instance.',
          'El botón <b>Nuevo rol</b> abre el constructor: dale un nombre, elige el color y marca, módulo por módulo, qué puede hacer ese rol. Úsalo cuando los roles del sistema no describen la función — un "auditor externo" que solo lee, por ejemplo.',
        )],
        figuras: [{
          src: '62-papel-novo',
          legenda: t3(
            '<b>Criar um papel personalizado.</b> <b>1</b> o nome do papel; abaixo, as permissões por módulo.',
            '<b>Creating a custom role.</b> <b>1</b> the role name; below, the permissions per module.',
            '<b>Crear un rol personalizado.</b> <b>1</b> el nombre del rol; abajo, los permisos por módulo.',
          ),
        }],
        notas: [{
          tipo: 'ok',
          texto: t3(
            'É este mesmo conjunto de permissões que decide o que aparece <b>neste manual</b>. Dar uma permissão nova a alguém abre capítulos novos para essa pessoa — e ela é avisada disso.',
            'It is this same set of permissions that decides what appears <b>in this manual</b>. Granting someone a new permission opens new chapters for them — and they are told about it.',
            'Es este mismo conjunto de permisos el que decide qué aparece <b>en este manual</b>. Dar un permiso nuevo a alguien abre capítulos nuevos para esa persona — y se le avisa.',
          ),
        }],
      },
    ],
  },

  {
    id: 'canais',
    titulo: t3('Canais', 'Channels', 'Canales'),
    resumo: t3(
      'A porta pública: criar, nomear, divulgar — e a ordem que coloca o canal no ar.',
      'The public door: create, name, share — and the order that puts a channel live.',
      'La puerta pública: crear, nombrar, difundir — y el orden que pone el canal en línea.',
    ),
    tela: 'channels',
    requires: { allOf: ['admin.manage_roles'] },
    secoes: [
      {
        id: 'criar',
        titulo: t3('Criar um canal', 'Creating a channel', 'Crear un canal'),
        campos: {
          titulo: t3(
            'O que preencher ao criar o canal',
            'What to fill in when creating the channel',
            'Qué completar al crear el canal',
          ),
          itens: [
            {
              nome: t3('Módulo', 'Module', 'Módulo'),
              desc: t3(
                '<b>Ética & Denúncias</b> para relatos de conduta; <b>SAC</b> para consumidores. A escolha define as regras: o SAC exige identificação e conta o prazo legal de 7 dias corridos.',
                '<b>Ethics & Whistleblowing</b> for conduct reports; <b>Consumer desk</b> for consumers. The choice sets the rules: the consumer desk requires identification and counts the 7 calendar-day legal deadline.',
                '<b>Ética y Denuncias</b> para reportes de conducta; <b>Atención al Consumidor</b> para consumidores. La elección define las reglas: la atención exige identificación y cuenta el plazo legal de 7 días corridos.',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('Nome do canal', 'Channel name', 'Nombre del canal'),
              desc: t3(
                'O nome que o público lê no topo da página — "Canal de Denúncias", "Fale Conosco". O endereço do link é gerado a partir dele.',
                'The name the public reads at the top of the page — "Whistleblowing channel", "Contact us". The link address is generated from it.',
                'El nombre que el público lee arriba de la página — "Canal de Denuncias", "Contáctanos". La dirección del enlace se genera a partir de él.',
              ),
              obrigatorio: true,
            },
          ],
        },
        figuras: [
          {
            src: '22-canal-novo-modal',
            legenda: t3(
              '<b>Canal novo.</b> Só duas escolhas: o módulo e o nome.',
              '<b>New channel.</b> Only two choices: the module and the name.',
              '<b>Canal nuevo.</b> Solo dos elecciones: el módulo y el nombre.',
            ),
          },
          {
            src: '21-canais-acoes',
            legenda: t3(
              '<b>As ações de cada canal.</b> <b>1</b> cria um canal novo; <b>2</b> copia o link público para divulgar; <b>3</b> abre a edição.',
              '<b>The actions on each channel.</b> <b>1</b> creates a new channel; <b>2</b> copies the public link to share; <b>3</b> opens editing.',
              '<b>Las acciones de cada canal.</b> <b>1</b> crea un canal nuevo; <b>2</b> copia el enlace público para difundir; <b>3</b> abre la edición.',
            ),
          },
        ],
      },
      {
        id: 'ordem',
        titulo: t3(
          'A ordem que coloca o canal no ar',
          'The order that puts a channel live',
          'El orden que pone el canal en línea',
        ),
        notas: [{
          tipo: 'aviso',
          texto: t3(
            '<b>Criar o canal não coloca nada no ar.</b> Só o <b>formulário publicado</b> abre a porta. Criado o canal, ele nasce ativo mas <i>sem formulário</i> — quem abrir o link agora vê "canal indisponível". É o erro mais comum de quem começa.',
            '<b>Creating the channel puts nothing live.</b> Only the <b>published form</b> opens the door. Once created, the channel is born active but <i>with no form</i> — anyone opening the link now sees "channel unavailable". It is the most common beginner mistake.',
            '<b>Crear el canal no pone nada en línea.</b> Solo el <b>formulario publicado</b> abre la puerta. Creado el canal, nace activo pero <i>sin formulario</i> — quien abra el enlace ahora ve "canal no disponible". Es el error más común de quien empieza.',
          ),
        }],
        passos: [
          t3('Vá em <b>Canais</b> e clique em <b>Criar canal</b>.', 'Go to <b>Channels</b> and click <b>Create channel</b>.', 'Ve a <b>Canales</b> y haz clic en <b>Crear canal</b>.'),
          t3('Escolha o módulo e dê o nome.', 'Pick the module and give it a name.', 'Elige el módulo y dale el nombre.'),
          t3('Siga para o capítulo do <b>Formulário</b> e publique-o.', 'Move on to the <b>Form</b> chapter and publish it.', 'Sigue al capítulo del <b>Formulario</b> y publícalo.'),
          t3('Publique o <b>fluxo</b> — ele define quem analisa.', 'Publish the <b>workflow</b> — it defines who reviews.', 'Publica el <b>flujo</b> — define quién analiza.'),
          t3('Só então divulgue o <b>link público</b>.', 'Only then share the <b>public link</b>.', 'Solo entonces difunde el <b>enlace público</b>.'),
        ],
      },
    ],
  },

  {
    id: 'formulario',
    titulo: t3('Formulário', 'Form', 'Formulario'),
    resumo: t3(
      'As perguntas que o público responde — à mão, com o assistente, e em três idiomas.',
      'The questions the public answers — by hand, with the assistant, and in three languages.',
      'Las preguntas que responde el público — a mano, con el asistente, y en tres idiomas.',
    ),
    tela: 'formbuilder',
    requires: { anyOf: ['etica.build_form', 'sac.build_form'] },
    secoes: [
      {
        id: 'a-mao',
        titulo: t3('Montar à mão', 'Building by hand', 'Armar a mano'),
        corpo: [t3(
          'À esquerda ficam os campos que a pessoa vai preencher; à direita, a prévia exata do que o público enxerga. Cada campo tem tipo (texto, data, anexo, escolha), rótulo, e se é obrigatório.',
          'On the left are the fields the person will fill in; on the right, the exact preview of what the public sees. Each field has a type (text, date, attachment, choice), a label, and whether it is required.',
          'A la izquierda están los campos que la persona completará; a la derecha, la vista previa exacta de lo que ve el público. Cada campo tiene tipo (texto, fecha, adjunto, opción), etiqueta, y si es obligatorio.',
        )],
        figuras: [{
          src: '25-formulario-manual',
          legenda: t3(
            '<b>À mão.</b> <b>1</b> acrescenta um campo; você escolhe o tipo e a ordem.',
            '<b>By hand.</b> <b>1</b> adds a field; you choose the type and the order.',
            '<b>A mano.</b> <b>1</b> agrega un campo; tú eliges el tipo y el orden.',
          ),
        }],
      },
      {
        id: 'com-assistente',
        titulo: t3('Montar com o assistente', 'Building with the assistant', 'Armar con el asistente'),
        corpo: [t3(
          'Você descreve em português o que precisa — "formulário de assédio conforme a NR-1" — e o assistente monta os campos. Continua sendo possível editar tudo depois: é um ponto de partida, não uma decisão final.',
          'You describe what you need in plain words — "a harassment form following the NR-1 standard" — and the assistant builds the fields. You can still edit everything afterwards: it is a starting point, not a final decision.',
          'Describes en palabras simples lo que necesitas — "formulario de acoso conforme a la NR-1" — y el asistente arma los campos. Todo se puede editar después: es un punto de partida, no una decisión final.',
        )],
        figuras: [{
          src: '26-formulario-ia',
          legenda: t3(
            '<b>Com o assistente.</b> <b>1</b> a caixa onde você escreve o que precisa.',
            '<b>With the assistant.</b> <b>1</b> the box where you write what you need.',
            '<b>Con el asistente.</b> <b>1</b> la caja donde escribes lo que necesitas.',
          ),
        }],
      },
      {
        id: 'idiomas',
        titulo: t3('Os três idiomas', 'The three languages', 'Los tres idiomas'),
        corpo: [t3(
          'O formulário público existe em português, inglês e espanhol. O botão <b>Traduzir p/ todos os idiomas</b> traduz o formulário inteiro de uma vez — e consome cota do assistente.',
          'The public form exists in Portuguese, English and Spanish. The <b>Translate to all languages</b> button translates the whole form at once — and consumes assistant quota.',
          'El formulario público existe en portugués, inglés y español. El botón <b>Traducir a todos los idiomas</b> traduce el formulario entero de una vez — y consume cuota del asistente.',
        )],
        figuras: [
          {
            src: '59-formulario-traduzir',
            legenda: t3(
              '<b>Três idiomas.</b> <b>1</b> o botão que traduz tudo; <b>2</b> os idiomas do formulário.',
              '<b>Three languages.</b> <b>1</b> the button that translates everything; <b>2</b> the form languages.',
              '<b>Tres idiomas.</b> <b>1</b> el botón que traduce todo; <b>2</b> los idiomas del formulario.',
            ),
          },
          {
            src: '60-formulario-bloqueio-idioma',
            legenda: t3(
              '<b>A trava que evita formulário pela metade.</b> Trocar para um idioma ainda não traduzido não deixa passar: primeiro traduza, depois o idioma abre.',
              '<b>The lock that prevents a half-finished form.</b> Switching to a language not yet translated is not allowed: translate first, then the language opens.',
              '<b>El seguro que evita un formulario a medias.</b> Cambiar a un idioma aún no traducido no pasa: primero traduce, después el idioma se abre.',
            ),
          },
        ],
      },
      {
        id: 'publicar',
        titulo: t3('Revisar e publicar', 'Reviewing and publishing', 'Revisar y publicar'),
        corpo: [t3(
          'A prévia à direita é a revisão: o que se vê ali é exatamente o que o público verá. Conferiu? <b>Publicar</b>. Só agora o link público muda.',
          'The preview on the right is the review: what you see there is exactly what the public will see. Checked it? <b>Publish</b>. Only now does the public link change.',
          'La vista previa de la derecha es la revisión: lo que se ve ahí es exactamente lo que verá el público. ¿Lo revisaste? <b>Publicar</b>. Solo ahora cambia el enlace público.',
        )],
        figuras: [{
          src: '27-formulario-publicar',
          legenda: t3(
            '<b>Revisar e publicar.</b> <b>1</b> o botão que troca a versão no ar.',
            '<b>Review and publish.</b> <b>1</b> the button that swaps the live version.',
            '<b>Revisar y publicar.</b> <b>1</b> el botón que cambia la versión en línea.',
          ),
        }],
      },
    ],
  },

  {
    id: 'fluxo',
    titulo: t3('Fluxo de apuração', 'Investigation workflow', 'Flujo de averiguación'),
    resumo: t3(
      'O caminho do relato depois de entrar: quem analisa, em que ordem e com que prazo.',
      'The path of a report after it arrives: who reviews it, in what order and with what deadline.',
      'El camino del reporte tras entrar: quién analiza, en qué orden y con qué plazo.',
    ),
    tela: 'flowbuilder',
    requires: { anyOf: ['etica.build_flow', 'sac.build_flow'] },
    secoes: [
      {
        id: 'blocos',
        titulo: t3(
          'Etapas, na ordem em que acontecem',
          'Stages, in the order they happen',
          'Etapas, en el orden en que ocurren',
        ),
        corpo: [t3(
          'Cada bloco é uma etapa e aponta para um papel (qualquer pessoa daquele papel pode pegar) ou para uma pessoa específica.',
          'Each block is a stage and points to a role (anyone in that role may pick it up) or to a specific person.',
          'Cada bloque es una etapa y apunta a un rol (cualquier persona de ese rol puede tomarla) o a una persona específica.',
        )],
        figuras: [{
          src: '28-fluxo-visao',
          legenda: t3(
            '<b>Construtor de fluxo.</b> As etapas na ordem em que acontecem.',
            '<b>Workflow builder.</b> The stages in the order they happen.',
            '<b>Constructor de flujo.</b> Las etapas en el orden en que ocurren.',
          ),
        }],
      },
      {
        id: 'paralelo',
        titulo: t3('Paralelo e sequencial', 'Parallel and sequential', 'Paralelo y secuencial'),
        tabela: {
          colunas: [t3('Você quer', 'You want', 'Quieres'), t3('Como montar', 'How to build it', 'Cómo armarlo')],
          linhas: [
            [
              t3('Ao mesmo tempo (paralelo)', 'At the same time (parallel)', 'Al mismo tiempo (paralelo)'),
              t3(
                'Coloque os blocos lado a lado, dentro do mesmo grupo. Todos recebem a ficha juntos — bom quando Jurídico e RH podem analisar em paralelo.',
                'Place the blocks side by side, inside the same group. They all get the card together — good when Legal and HR can review in parallel.',
                'Coloca los bloques lado a lado, dentro del mismo grupo. Todos reciben la ficha juntos — bueno cuando Legal y RR. HH. pueden analizar en paralelo.',
              ),
            ],
            [
              t3('Um depois do outro (sequencial)', 'One after another (sequential)', 'Uno después del otro (secuencial)'),
              t3(
                'Puxe a bolinha laranja de um bloco e solte no vazio: nasce um bloco novo depois dele. O segundo só começa quando o primeiro entrega o parecer.',
                'Drag the orange dot from a block and drop it on empty space: a new block is born after it. The second only starts when the first delivers its opinion.',
                'Arrastra el punto naranja de un bloque y suéltalo en el vacío: nace un bloque nuevo después de él. El segundo solo comienza cuando el primero entrega el dictamen.',
              ),
            ],
          ],
        },
        figuras: [{
          src: '71-fluxo-paralelo',
          legenda: t3(
            '<b>1</b> o rótulo <b>AO MESMO TEMPO</b>: tudo dentro desse bloco corre junto; <b>2</b> o encerramento, que só acontece depois.',
            '<b>1</b> the <b>AT THE SAME TIME</b> label: everything inside that block runs together; <b>2</b> the closing, which only happens afterwards.',
            '<b>1</b> la etiqueta <b>AL MISMO TIEMPO</b>: todo lo que está dentro de ese bloque corre junto; <b>2</b> el cierre, que solo ocurre después.',
          ),
        }],
      },
      {
        id: 'configurar-etapa',
        titulo: t3('Configurar cada etapa', 'Configuring each stage', 'Configurar cada etapa'),
        corpo: [t3(
          'Clicar num bloco abre o painel de configuração à direita.',
          'Clicking a block opens the configuration panel on the right.',
          'Hacer clic en un bloque abre el panel de configuración a la derecha.',
        )],
        campos: {
          titulo: t3('O que preencher em cada etapa', 'What to fill in on each stage', 'Qué completar en cada etapa'),
          itens: [
            {
              nome: t3('O que essa pessoa faz', 'What this person does', 'Qué hace esa persona'),
              desc: t3(
                '<b>Decisão</b> (procede ou não), <b>Avaliação</b> (dar uma nota), <b>Investigação</b> (apurar e descrever) ou <b>Urgência</b> (definir prioridade). É o que decide o formulário que o designado vai ver.',
                '<b>Decision</b> (founded or not), <b>Assessment</b> (give a score), <b>Investigation</b> (look into it and describe) or <b>Urgency</b> (set priority). It decides the form the assignee will see.',
                '<b>Decisión</b> (procede o no), <b>Evaluación</b> (dar una nota), <b>Investigación</b> (averiguar y describir) o <b>Urgencia</b> (definir prioridad). Es lo que decide el formulario que verá el asignado.',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('Quem responde', 'Who answers', 'Quién responde'),
              desc: t3(
                'Um <b>papel</b> — e aí qualquer pessoa dele pode pegar — ou uma <b>pessoa específica</b>.',
                'A <b>role</b> — in which case anyone in it may pick it up — or a <b>specific person</b>.',
                'Un <b>rol</b> — y entonces cualquiera de él puede tomarla — o una <b>persona específica</b>.',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('Prazo', 'Deadline', 'Plazo'),
              desc: t3(
                'Em horas ou dias. O que dispara os lembretes e mostra o atraso na fila.',
                'In hours or days. It is what triggers reminders and shows delay in the queue.',
                'En horas o días. Es lo que dispara los recordatorios y muestra el retraso en la cola.',
              ),
              obrigatorio: true,
            },
            {
              nome: t3('Observadores', 'Watchers', 'Observadores'),
              desc: t3(
                'Quem acompanha essa etapa sem responder por ela. Recebem os avisos, não recebem ficha.',
                'Who follows this stage without answering for it. They get the notices, not the card.',
                'Quién sigue esa etapa sin responder por ella. Reciben los avisos, no reciben ficha.',
              ),
              obrigatorio: false,
            },
            {
              nome: t3('Exigir assinatura digital', 'Require digital signature', 'Exigir firma digital'),
              desc: t3(
                'Ligado, o parecer só avança depois de assinado com rubrica e CPF.',
                'When on, the opinion only moves forward after being signed with a mark and tax ID.',
                'Activado, el dictamen solo avanza tras ser firmado con rúbrica y documento.',
              ),
              obrigatorio: false,
            },
          ],
        },
        figuras: [{
          src: '70-fluxo-bloco-modal',
          legenda: t3(
            '<b>Clique no bloco e ele abre à direita.</b> O painel tem as quatro perguntas acima, numeradas.',
            '<b>Click the block and it opens on the right.</b> The panel has the four questions above, numbered.',
            '<b>Haz clic en el bloque y se abre a la derecha.</b> El panel tiene las cuatro preguntas de arriba, numeradas.',
          ),
        }],
        notas: [{
          tipo: 'aviso',
          texto: t3(
            '<b>"Falta preencher: quem encerra o caso".</b> Essa tarja aparece enquanto nenhuma etapa estiver marcada como a que encerra. Sem encerrador, o caso corre e nunca fecha — clique nela para resolver.',
            '<b>"Missing: who closes the case".</b> This banner shows while no stage is marked as the closing one. With no closer, the case runs and never closes — click it to fix.',
            '<b>"Falta indicar: quién cierra el caso".</b> Ese aviso aparece mientras ninguna etapa esté marcada como la que cierra. Sin cerrador, el caso corre y nunca se cierra — haz clic en él para resolverlo.',
          ),
        }],
      },
      {
        id: 'salvar-fluxo',
        titulo: t3('Salvar o fluxo', 'Saving the workflow', 'Guardar el flujo'),
        corpo: [t3(
          'Salvar coloca a nova versão em vigor. Casos que já estavam correndo seguem no fluxo em que entraram — trocar o fluxo não reescreve o passado.',
          'Saving puts the new version into effect. Cases already running stay on the workflow they entered — changing the workflow does not rewrite the past.',
          'Guardar pone la nueva versión en vigor. Los casos que ya estaban corriendo siguen en el flujo en el que entraron — cambiar el flujo no reescribe el pasado.',
        )],
        figuras: [{
          src: '31-fluxo-publicar',
          legenda: t3(
            '<b>Salvar o fluxo.</b> <b>1</b> coloca a nova versão em vigor.',
            '<b>Saving the workflow.</b> <b>1</b> puts the new version into effect.',
            '<b>Guardar el flujo.</b> <b>1</b> pone la nueva versión en vigor.',
          ),
        }],
      },
    ],
  },

  {
    id: 'avisos',
    titulo: t3('Avisos', 'Announcements', 'Avisos'),
    resumo: t3(
      'Comunicados que a empresa envia à equipe — diferente das notificações do sistema.',
      'Messages the company sends to the team — different from system notifications.',
      'Comunicados que la empresa envía al equipo — distinto de las notificaciones del sistema.',
    ),
    tela: 'announcements',
    requires: { anyOf: ['admin.notify'] },
    secoes: [
      {
        id: 'como',
        titulo: t3('Enviar um aviso', 'Sending an announcement', 'Enviar un aviso'),
        corpo: [t3(
          'Escolha o canal, escreva o assunto e a mensagem, e o aviso sai por e-mail para quem você indicar. Diferente das notificações do sistema, que são automáticas.',
          'Pick the channel, write the subject and the message, and the announcement goes out by e-mail to whoever you choose. Unlike system notifications, which are automatic.',
          'Elige el canal, escribe el asunto y el mensaje, y el aviso sale por correo a quien indiques. A diferencia de las notificaciones del sistema, que son automáticas.',
        )],
        figuras: [{
          src: '19-comunicados',
          legenda: t3(
            '<b>Central de avisos.</b> O comunicado, e para quem vai.',
            '<b>Announcement centre.</b> The message, and who it goes to.',
            '<b>Central de avisos.</b> El comunicado, y a quién va.',
          ),
        }],
      },
    ],
  },

  {
    id: 'plano',
    titulo: t3('Plano, assistente e espaço', 'Plan, assistant and storage', 'Plan, asistente y espacio'),
    resumo: t3(
      'Quantas pessoas cabem, quanto do assistente dá para usar e quanto espaço há para provas.',
      'How many people fit, how much of the assistant you can use, and how much space there is for evidence.',
      'Cuántas personas caben, cuánto del asistente se puede usar y cuánto espacio hay para pruebas.',
    ),
    tela: 'billing',
    requires: { allOf: ['admin.billing'] },
    secoes: [
      {
        id: 'o-plano',
        titulo: t3('O plano atual', 'The current plan', 'El plan actual'),
        corpo: [t3(
          'Mostra o que o plano inclui e quantas vagas já foram usadas. Trocar de plano muda assentos, módulos disponíveis e os limites do assistente e de espaço.',
          'It shows what the plan includes and how many seats are used. Changing plan changes seats, available modules and the assistant and storage limits.',
          'Muestra qué incluye el plan y cuántos cupos ya se usaron. Cambiar de plan cambia asientos, módulos disponibles y los límites del asistente y del espacio.',
        )],
        figuras: [
          {
            src: '17-plano',
            legenda: t3(
              '<b>Plano.</b> O plano atual, o que inclui e as vagas usadas.',
              '<b>Plan.</b> The current plan, what it includes and the seats used.',
              '<b>Plan.</b> El plan actual, qué incluye y los cupos usados.',
            ),
          },
          {
            src: '38-plano-upgrade',
            legenda: t3(
              '<b>Trocar de plano.</b> <b>1</b> o botão que abre a troca.',
              '<b>Changing plan.</b> <b>1</b> the button that opens the switch.',
              '<b>Cambiar de plan.</b> <b>1</b> el botón que abre el cambio.',
            ),
          },
        ],
      },
      {
        id: 'limites',
        titulo: t3('Quando os limites acabam', 'When the limits run out', 'Cuando se acaban los límites'),
        corpo: [t3(
          'O aviso aparece aos <b>85%</b> e o bloqueio ao esgotar. Com o espaço cheio, os canais param de aceitar anexos — os relatos continuam entrando, sem foto nem documento. É o primeiro lugar a olhar quando alguém diz que "não consegue anexar".',
          'The warning shows at <b>85%</b> and the block when it runs out. With storage full, channels stop accepting attachments — reports keep coming in, without photo or document. It is the first place to look when someone says they "cannot attach".',
          'El aviso aparece al <b>85%</b> y el bloqueo al agotarse. Con el espacio lleno, los canales dejan de aceptar adjuntos — los reportes siguen entrando, sin foto ni documento. Es el primer lugar a mirar cuando alguien dice que "no puede adjuntar".',
        )],
        figuras: [{
          src: '37-config-tokens-ia',
          legenda: t3(
            '<b>Uso do assistente.</b> <b>1</b> o seu consumo e o da empresa. A barra fica âmbar aos 85% e vermelha quando esgota.',
            '<b>Assistant usage.</b> <b>1</b> your consumption and the company\'s. The bar turns amber at 85% and red when exhausted.',
            '<b>Uso del asistente.</b> <b>1</b> tu consumo y el de la empresa. La barra se pone ámbar al 85% y roja al agotarse.',
          ),
        }],
      },
    ],
  },

  {
    id: 'auditoria',
    titulo: t3('Trilha de auditoria', 'Audit trail', 'Traza de auditoría'),
    resumo: t3(
      'Quem fez o quê, quando e de onde — e como extrair isso para um processo.',
      'Who did what, when and from where — and how to export it for a proceeding.',
      'Quién hizo qué, cuándo y desde dónde — y cómo extraerlo para un proceso.',
    ),
    tela: 'audit',
    requires: { allOf: ['admin.view_audit'] },
    secoes: [
      {
        id: 'extrair',
        titulo: t3('Extrair um período', 'Exporting a period', 'Extraer un periodo'),
        passos: [
          t3('Abra <b>Auditoria</b> e preencha o intervalo de datas.', 'Open <b>Audit</b> and fill in the date range.', 'Abre <b>Auditoría</b> y completa el intervalo de fechas.'),
          t3('Se precisar, afine por pessoa ou por tipo de ação.', 'If needed, narrow by person or action type.', 'Si hace falta, afina por persona o por tipo de acción.'),
          t3(
            'Clique em <b>Exportar PDF</b> — o arquivo traz só o que está filtrado.',
            'Click <b>Export PDF</b> — the file carries only what is filtered.',
            'Haz clic en <b>Exportar PDF</b> — el archivo trae solo lo filtrado.',
          ),
        ],
        figuras: [
          {
            src: '18-auditoria',
            legenda: t3(
              '<b>Escolher o período.</b> <b>1</b> o intervalo de datas; <b>2</b> o botão que exporta.',
              '<b>Choosing the period.</b> <b>1</b> the date range; <b>2</b> the export button.',
              '<b>Elegir el periodo.</b> <b>1</b> el intervalo de fechas; <b>2</b> el botón que exporta.',
            ),
          },
          {
            src: '67-audit-arquivo',
            legenda: t3(
              '<b>O arquivo que sai.</b> Logotipo, data de geração, contagem de eventos e a tabela: quando, quem, o que aconteceu e o detalhe.',
              '<b>The file that comes out.</b> Logo, generation date, event count and the table: when, who, what happened and the detail.',
              '<b>El archivo que sale.</b> Logotipo, fecha de generación, conteo de eventos y la tabla: cuándo, quién, qué pasó y el detalle.',
            ),
          },
        ],
        notas: [{
          tipo: 'ok',
          texto: t3(
            'Cada linha traz o ator, a data, o endereço de onde partiu e o navegador. Os registros são <b>encadeados entre si</b>: alterar ou remover um deles quebra a corrente, e o próprio sistema acusa.',
            'Each line carries the actor, the date, the address it came from and the browser. The records are <b>chained to one another</b>: altering or removing one breaks the chain, and the system itself flags it.',
            'Cada línea trae el actor, la fecha, la dirección de origen y el navegador. Los registros están <b>encadenados entre sí</b>: alterar o eliminar uno rompe la cadena, y el propio sistema lo acusa.',
          ),
        }],
      },
    ],
  },

  {
    id: 'configuracoes',
    titulo: t3('Configurações da sua conta', 'Your account settings', 'Configuración de tu cuenta'),
    resumo: t3(
      'Tema, idioma, senha e os seus dados pessoais.',
      'Theme, language, password and your personal data.',
      'Tema, idioma, contraseña y tus datos personales.',
    ),
    tela: 'settings',
    secoes: [
      {
        id: 'preferencias',
        titulo: t3('Suas preferências', 'Your preferences', 'Tus preferencias'),
        corpo: [
          t3(
            'Tema, idioma e tamanho da letra acompanham a sua conta, não este aparelho: mudou aqui, muda em qualquer lugar onde você entrar.',
            'Theme, language and text size follow your account, not this device: change it here and it changes wherever you sign in.',
            'Tema, idioma y tamaño de letra acompañan a tu cuenta, no a este aparato: lo cambias aquí y cambia dondequiera que entres.',
          ),
          t3(
            'Abaixo ficam a troca de senha, a exportação dos seus dados e a exclusão da conta.',
            'Below are the password change, the export of your data and account deletion.',
            'Abajo están el cambio de contraseña, la exportación de tus datos y la eliminación de la cuenta.',
          ),
        ],
        figuras: [{
          src: '20-configuracoes',
          legenda: t3(
            '<b>Suas preferências.</b> Tema, idioma e tamanho da letra.',
            '<b>Your preferences.</b> Theme, language and text size.',
            '<b>Tus preferencias.</b> Tema, idioma y tamaño de letra.',
          ),
        }],
      },
    ],
  },

  {
    id: 'duas-empresas',
    titulo: t3('Participar de duas empresas', 'Belonging to two companies', 'Participar en dos empresas'),
    resumo: t3(
      'Um login e uma senha para trabalhar em mais de uma empresa.',
      'One login and one password to work at more than one company.',
      'Un usuario y una contraseña para trabajar en más de una empresa.',
    ),
    secoes: [
      {
        id: 'como-funciona',
        titulo: t3('Como funciona', 'How it works', 'Cómo funciona'),
        corpo: [
          t3(
            'A mesma pessoa pode participar de várias empresas com <b>um único login e uma única senha</b>. Dentro de cada empresa ela entra uma vez só, com o papel que aquela empresa lhe deu.',
            'The same person can belong to several companies with <b>a single login and a single password</b>. Inside each company they exist once, with the role that company gave them.',
            'La misma persona puede participar en varias empresas con <b>un único usuario y una única contraseña</b>. Dentro de cada empresa entra una sola vez, con el rol que esa empresa le dio.',
          ),
          t3(
            'Com um vínculo só, nada disso aparece — o login vai direto ao painel.',
            'With only one membership, none of this appears — the login goes straight to the dashboard.',
            'Con un solo vínculo, nada de esto aparece — el ingreso va directo al panel.',
          ),
        ],
        figuras: [
          {
            src: '56-hub-escolher-empresa',
            legenda: t3(
              '<b>A escolha, no login.</b> <b>1</b> as empresas de que você participa, com o seu papel em cada uma.',
              '<b>The choice, at sign-in.</b> <b>1</b> the companies you belong to, with your role in each.',
              '<b>La elección, al entrar.</b> <b>1</b> las empresas en las que participas, con tu rol en cada una.',
            ),
          },
          {
            src: '57-trocar-empresa-topo',
            legenda: t3(
              '<b>Trocar depois de entrar.</b> <b>1</b> o nome da empresa na barra superior vira botão e devolve a escolha.',
              '<b>Switching after signing in.</b> <b>1</b> the company name in the top bar becomes a button and gives the choice back.',
              '<b>Cambiar después de entrar.</b> <b>1</b> el nombre de la empresa en la barra superior se vuelve botón y devuelve la elección.',
            ),
          },
        ],
        notas: [{
          tipo: 'nota',
          texto: t3(
            '<b>Trocar de empresa troca de tela.</b> Ao escolher outra empresa você volta para o painel dela — a tela em que você estava pode não existir do outro lado.',
            '<b>Switching company switches screen.</b> Choosing another company takes you back to its dashboard — the screen you were on may not exist on the other side.',
            '<b>Cambiar de empresa cambia de pantalla.</b> Al elegir otra empresa vuelves a su panel — la pantalla en la que estabas puede no existir del otro lado.',
          ),
        }],
      },
    ],
  },

  {
    id: 'emails',
    titulo: t3('Os e-mails que o sistema envia', 'The e-mails the system sends', 'Los correos que envía el sistema'),
    resumo: t3(
      'O que a Soluvia manda por e-mail, e o que cada mensagem quer de você.',
      'What Soluvia sends by e-mail, and what each message wants from you.',
      'Qué envía Soluvia por correo, y qué quiere de ti cada mensaje.',
    ),
    secoes: [
      {
        id: 'quais',
        titulo: t3('Quais chegam, e quando', 'Which arrive, and when', 'Cuáles llegan, y cuándo'),
        tabela: {
          colunas: [
            t3('Quando você recebe', 'When you get it', 'Cuándo lo recibes'),
            t3('O que é', 'What it is', 'Qué es'),
          ],
          linhas: [
            [
              t3('Foi convidado para uma empresa', 'You were invited to a company', 'Te invitaron a una empresa'),
              t3(
                'Código de 8 dígitos + botão para definir a senha. Vale 7 dias.',
                '8-digit code + button to set the password. Valid for 7 days.',
                'Código de 8 dígitos + botón para definir la contraseña. Vale 7 días.',
              ),
            ],
            [
              t3('Foi convidado e <b>já tem conta</b>', 'You were invited and <b>already have an account</b>', 'Te invitaron y <b>ya tienes cuenta</b>'),
              t3(
                'Só confirma: a senha é a mesma, e a empresa nova entra no seu login.',
                'It just confirms: the password stays the same, and the new company joins your login.',
                'Solo confirma: la contraseña es la misma, y la empresa nueva entra en tu acceso.',
              ),
            ],
            [
              t3('Pediu nova senha', 'You asked for a new password', 'Pediste nueva contraseña'),
              t3('Código de redefinição, válido por 30 minutos.', 'Reset code, valid for 30 minutes.', 'Código de restablecimiento, válido por 30 minutos.'),
            ],
            [
              t3('Precisa confirmar o endereço', 'You need to confirm your address', 'Debes confirmar tu dirección'),
              t3('Código de verificação, válido por 24 horas.', 'Verification code, valid for 24 hours.', 'Código de verificación, válido por 24 horas.'),
            ],
            [
              t3('Entrou um relato no seu canal', 'A report came into your channel', 'Entró un reporte en tu canal'),
              t3('Aviso de caso novo, com o protocolo.', 'New case notice, with the reference number.', 'Aviso de caso nuevo, con el protocolo.'),
            ],
            [
              t3('O prazo do SAC está correndo', 'The consumer deadline is running', 'El plazo de atención está corriendo'),
              t3('Lembrete com os dias restantes.', 'Reminder with the days remaining.', 'Recordatorio con los días restantes.'),
            ],
            [
              t3('Sua conta está desativada', 'Your account is deactivated', 'Tu cuenta está desactivada'),
              t3('Explicação no lugar do código — nada é alterado.', 'An explanation instead of the code — nothing is changed.', 'Explicación en lugar del código — nada se altera.'),
            ],
          ],
        },
        figuras: [
          {
            src: 'email-convite-novo',
            legenda: t3(
              '<b>O convite.</b> O código em destaque e o botão de definir a senha.',
              '<b>The invitation.</b> The code highlighted and the button to set the password.',
              '<b>La invitación.</b> El código destacado y el botón para definir la contraseña.',
            ),
          },
          {
            src: 'email-redefinir-senha',
            legenda: t3(
              '<b>Redefinição de senha.</b> O código de 8 dígitos, válido por 30 minutos.',
              '<b>Password reset.</b> The 8-digit code, valid for 30 minutes.',
              '<b>Restablecimiento de contraseña.</b> El código de 8 dígitos, válido por 30 minutos.',
            ),
          },
        ],
      },
    ],
  },

  {
    id: 'faq',
    titulo: t3('Perguntas frequentes', 'Frequently asked questions', 'Preguntas frecuentes'),
    resumo: t3(
      'As dúvidas que mais aparecem, com a resposta curta.',
      'The questions that come up most, with the short answer.',
      'Las dudas que más aparecen, con la respuesta corta.',
    ),
    secoes: [
      {
        id: 'lista',
        titulo: t3('As mais comuns', 'The most common ones', 'Las más comunes'),
        tabela: {
          colunas: [t3('Pergunta', 'Question', 'Pregunta'), t3('Resposta', 'Answer', 'Respuesta')],
          linhas: [
            [
              t3('Publiquei o formulário e o canal continua igual.', 'I published the form and the channel looks the same.', 'Publiqué el formulario y el canal sigue igual.'),
              t3(
                'Confira se publicou o formulário <b>daquele canal</b> — cada canal tem o seu. Enquanto não publica, o canal serve a versão anterior.',
                'Check whether you published the form <b>for that channel</b> — each channel has its own. Until you publish, the channel serves the previous version.',
                'Verifica si publicaste el formulario <b>de ese canal</b> — cada canal tiene el suyo. Mientras no publiques, el canal sirve la versión anterior.',
              ),
            ],
            [
              t3('O canal diz "indisponível".', 'The channel says "unavailable".', 'El canal dice "no disponible".'),
              t3(
                'Ele ainda não tem formulário publicado. Vá em Formulário, monte e clique em Publicar.',
                'It has no published form yet. Go to Form, build it and click Publish.',
                'Todavía no tiene formulario publicado. Ve a Formulario, ármalo y haz clic en Publicar.',
              ),
            ],
            [
              t3('Ninguém foi avisado do caso novo.', 'Nobody was told about the new case.', 'Nadie fue avisado del caso nuevo.'),
              t3(
                'O aviso sai quando o <b>fluxo é liberado</b> — é ele que cria as fichas e define quem responde.',
                'The notice goes out when the <b>workflow is released</b> — that is what creates the cards and defines who answers.',
                'El aviso sale cuando se <b>libera el flujo</b> — es él quien crea las fichas y define quién responde.',
              ),
            ],
            [
              t3('Não consigo anexar arquivos.', 'I cannot attach files.', 'No puedo adjuntar archivos.'),
              t3(
                'Provavelmente o armazenamento encheu. Os relatos continuam entrando, sem anexo.',
                'Storage has probably filled up. Reports keep coming in, without attachments.',
                'Probablemente el almacenamiento se llenó. Los reportes siguen entrando, sin adjunto.',
              ),
            ],
            [
              t3('O assistente parou de responder.', 'The assistant stopped answering.', 'El asistente dejó de responder.'),
              t3(
                'A cota do assistente acabou, ou o seu crédito pessoal. Peça ao administrador.',
                'The assistant quota ran out, or your personal credit did. Ask the administrator.',
                'Se acabó la cuota del asistente, o tu crédito personal. Pídeselo al administrador.',
              ),
            ],
            [
              t3('Não recebi o e-mail do convite.', 'I did not get the invitation e-mail.', 'No recibí el correo de invitación.'),
              t3(
                'Veja o spam. Persistindo, peça <b>reenviar convite</b> — gera código novo e renova o prazo.',
                'Check spam. If it persists, ask for <b>resend invitation</b> — it generates a new code and renews the deadline.',
                'Revisa el spam. Si persiste, pide <b>reenviar invitación</b> — genera código nuevo y renueva el plazo.',
              ),
            ],
            [
              t3('Esqueci a senha e não chegou nada.', 'I forgot my password and nothing arrived.', 'Olvidé la contraseña y no llegó nada.'),
              t3(
                'Se a conta estiver desativada, chega uma explicação em vez do código. E se o endereço não existir, nada é enviado — de propósito.',
                'If the account is deactivated, an explanation arrives instead of the code. And if the address does not exist, nothing is sent — on purpose.',
                'Si la cuenta está desactivada, llega una explicación en lugar del código. Y si la dirección no existe, no se envía nada — a propósito.',
              ),
            ],
            [
              t3('O sistema recusou meu CPF na assinatura.', 'The system rejected my tax ID when signing.', 'El sistema rechazó mi documento al firmar.'),
              t3(
                'O CPF é obrigatório e os dígitos verificadores são conferidos. Confira o número digitado.',
                'The tax ID is mandatory and its check digits are verified. Check the number you typed.',
                'El documento es obligatorio y los dígitos verificadores se comprueban. Revisa el número escrito.',
              ),
            ],
            [
              t3('Convidei alguém e deu "limite de usuários atingido".', 'I invited someone and got "user limit reached".', 'Invité a alguien y salió "límite de usuarios alcanzado".'),
              t3(
                'A empresa está sem plano, ou já ocupou todas as vagas dele. Fale com a plataforma.',
                'The company has no plan, or has already used every seat. Talk to the platform.',
                'La empresa no tiene plan, o ya ocupó todos sus cupos. Habla con la plataforma.',
              ),
            ],
            [
              t3('A pessoa entrou mas não vê nada.', 'The person got in but sees nothing.', 'La persona entró pero no ve nada.'),
              t3(
                'Ela ficou sem papel. Vá em Pessoas e atribua um — é o papel que libera as telas.',
                'They were left with no role. Go to People and assign one — the role is what unlocks the screens.',
                'Se quedó sin rol. Ve a Personas y asigna uno — es el rol lo que libera las pantallas.',
              ),
            ],
          ],
        },
      },
    ],
  },
]
