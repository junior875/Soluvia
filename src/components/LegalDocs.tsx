// Documentos legais: Termos de Uso e Política de Privacidade (LGPD).
// Renderiza em tela cheia quando a URL é #termos ou #privacidade.
// Conteúdo em triplo idioma (PT/EN/ES). A versão PT é a de referência jurídica
// (LGPD — Lei 13.709/2018); EN/ES são traduções de cortesia (ver rodapé).

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../i18n/LanguageProvider'
import type { Lang } from '../i18n/translations'
import PrefSwitcher from './PrefSwitcher'

interface Section { h: string; p: string[] }

const UI: Record<Lang, { updated: string; close: string; terms: string; privacy: string; by: string; disclaimer: string }> = {
  pt: {
    updated: 'Última atualização: 23 de junho de 2026', close: 'Fechar',
    terms: 'Termos de Uso', privacy: 'Política de Privacidade', by: 'Soluvia by Soluqtion',
    disclaimer: 'Este documento tem caráter informativo e não substitui aconselhamento jurídico individualizado. Em caso de conflito, prevalece a legislação aplicável (LGPD — Lei 13.709/2018) e a versão em português.',
  },
  en: {
    updated: 'Last updated: June 23, 2026', close: 'Close',
    terms: 'Terms of Use', privacy: 'Privacy Policy', by: 'Soluvia by Soluqtion',
    disclaimer: 'This document is informational and does not replace individualized legal advice. In case of conflict, the applicable law (Brazil’s LGPD — Law 13.709/2018) and the Portuguese version prevail.',
  },
  es: {
    updated: 'Última actualización: 23 de junio de 2026', close: 'Cerrar',
    terms: 'Términos de Uso', privacy: 'Política de Privacidad', by: 'Soluvia by Soluqtion',
    disclaimer: 'Este documento es informativo y no sustituye el asesoramiento jurídico individualizado. En caso de conflicto, prevalecen la legislación aplicable (LGPD de Brasil — Ley 13.709/2018) y la versión en portugués.',
  },
}

const TERMS: Record<Lang, Section[]> = {
  pt: [
    { h: '1. Definições', p: [
      '“Plataforma” ou “Soluvia”: o software de gestão de canais de ética, denúncias, privacidade (LGPD), incidentes e riscos psicossociais (NR-1) oferecido pela Soluqtion.',
      '“Soluqtion”: a fornecedora da Plataforma, operadora de dados pessoais nos termos da LGPD.',
      '“Cliente” ou “Empresa”: a pessoa jurídica que contrata a Plataforma e atua como Controladora dos dados pessoais tratados em seu ambiente.',
      '“Usuário”: a pessoa física autorizada pelo Cliente a acessar a Plataforma (administrador, gestor, RH/Compliance, DPO etc.).',
      '“Colaborador/Relatante”: pessoa que registra um relato por meio dos canais públicos, de forma anônima ou identificada.',
    ] },
    { h: '2. Aceitação e elegibilidade', p: [
      'Ao criar uma conta, contratar um plano ou utilizar a Plataforma, você declara ter lido e aceitado integralmente estes Termos e a Política de Privacidade.',
      'O Usuário deve ser maior de 18 anos e ter poderes para representar a Empresa que contrata o serviço.',
    ] },
    { h: '3. Descrição do serviço', p: [
      'A Soluvia é um SaaS B2B multi-tenant que provê canais seguros, trilha de evidências, prazos (SLA), fluxos configuráveis, controle de acesso por papéis e relatórios.',
      'A disponibilidade dos módulos (Ética, Privacidade, Incidentes, NR-1) depende do plano contratado. A Soluqtion pode evoluir funcionalidades, mantendo a finalidade essencial do serviço.',
    ] },
    { h: '4. Cadastro, conta e segurança', p: [
      'O Usuário é responsável pela veracidade dos dados informados e pela guarda de suas credenciais. Recomendamos senhas fortes e a não compartilhar acessos.',
      'A Empresa é responsável por gerir os papéis e escopos atribuídos aos seus Usuários e por remover acessos quando necessário.',
      'Notifique imediatamente a Soluqtion em caso de uso não autorizado da conta.',
    ] },
    { h: '5. Planos, assinatura e pagamento', p: [
      'A contratação é por assinatura recorrente (mensal ou anual), processada com segurança pela Stripe. A Soluqtion não armazena os dados completos do cartão.',
      'A assinatura renova-se automaticamente ao fim de cada ciclo, salvo cancelamento prévio. O cancelamento encerra a renovação seguinte; o acesso permanece até o fim do período já pago.',
      'Tributos aplicáveis podem incidir sobre os valores. Reembolsos seguem a legislação consumerista e a política vigente informada na contratação.',
    ] },
    { h: '6. Uso aceitável', p: [
      'É vedado: (i) usar a Plataforma para fins ilícitos; (ii) tentar burlar controles de segurança, escopos ou isolamento entre tenants; (iii) realizar engenharia reversa, copiar ou revender o software; (iv) inserir conteúdo que viole direitos de terceiros.',
      'O uso indevido pode acarretar suspensão imediata, sem prejuízo das medidas legais cabíveis.',
    ] },
    { h: '7. Tratamento de dados pessoais (papéis)', p: [
      'No tratamento dos dados inseridos no ambiente do Cliente (relatos, titulares, evidências), o Cliente é o Controlador e a Soluqtion atua como Operadora, tratando dados conforme as instruções do Cliente e a LGPD (Lei 13.709/2018).',
      'Quanto aos dados de cadastro e de uso da própria Plataforma (conta do Usuário, faturamento), a Soluqtion atua como Controladora. Detalhes na Política de Privacidade.',
      'As partes comprometem-se a adotar medidas técnicas e organizacionais de segurança e a colaborar no atendimento aos direitos dos titulares e a eventuais requisições da ANPD.',
    ] },
    { h: '8. Propriedade intelectual', p: [
      'A Plataforma, marcas, layout, código e documentação são de titularidade da Soluqtion. A contratação concede licença de uso limitada, não exclusiva e intransferível, durante a vigência do plano.',
      'Os dados inseridos pelo Cliente permanecem de titularidade do Cliente e/ou dos respectivos titulares.',
    ] },
    { h: '9. Disponibilidade e suporte', p: [
      'A Soluqtion empenha-se em manter alta disponibilidade, podendo realizar manutenções programadas com aviso prévio quando viável.',
      'O serviço é fornecido “no estado em que se encontra”, sem garantia de operação ininterrupta e isenta de erros.',
    ] },
    { h: '10. Limitação de responsabilidade', p: [
      'Na máxima extensão permitida em lei, a responsabilidade da Soluqtion limita-se aos valores pagos pelo Cliente nos 12 meses anteriores ao evento, excluídos danos indiretos, lucros cessantes e perda de dados decorrentes de uso indevido pelo Cliente.',
    ] },
    { h: '11. Confidencialidade', p: [
      'As partes manterão sigilo sobre informações confidenciais a que tiverem acesso, utilizando-as apenas para a execução do contrato.',
    ] },
    { h: '12. Vigência e rescisão', p: [
      'Estes Termos vigoram enquanto durar a assinatura. Qualquer parte pode rescindir conforme as condições do plano. Encerrado o contrato, a Soluqtion disponibilizará a exportação dos dados por prazo razoável e, depois, procederá à eliminação ou anonimização, ressalvadas obrigações legais de retenção.',
    ] },
    { h: '13. Alterações', p: [
      'Estes Termos podem ser atualizados. Mudanças relevantes serão comunicadas com antecedência razoável. O uso continuado após a vigência implica concordância.',
    ] },
    { h: '14. Lei aplicável e foro', p: [
      'Aplica-se a legislação brasileira. Fica eleito o foro do domicílio do Cliente para dirimir controvérsias, quando assim exigir a lei consumerista; nos demais casos, o foro da comarca da sede da Soluqtion.',
    ] },
    { h: '15. Contato e Encarregado (DPO)', p: [
      'Dúvidas sobre estes Termos: contato@soluqtion.com. Encarregado pelo Tratamento de Dados (DPO): dpo@soluqtion.com.',
    ] },
  ],
  en: [
    { h: '1. Definitions', p: [
      '“Platform” or “Soluvia”: the software for managing ethics/whistleblowing channels, privacy (LGPD), incidents and psychosocial risks (NR-1) provided by Soluqtion.',
      '“Soluqtion”: the provider of the Platform, acting as data processor under the LGPD.',
      '“Client” or “Company”: the legal entity that subscribes to the Platform and acts as Controller of the personal data processed in its environment.',
      '“User”: the individual authorized by the Client to access the Platform (administrator, manager, HR/Compliance, DPO, etc.).',
      '“Employee/Reporter”: a person who submits a report through the public channels, anonymously or identified.',
    ] },
    { h: '2. Acceptance and eligibility', p: [
      'By creating an account, subscribing to a plan or using the Platform, you declare that you have read and fully accepted these Terms and the Privacy Policy.',
      'The User must be over 18 years old and have powers to represent the Company that subscribes to the service.',
    ] },
    { h: '3. Service description', p: [
      'Soluvia is a multi-tenant B2B SaaS providing secure channels, an evidence trail, deadlines (SLA), configurable flows, role-based access control and reports.',
      'Module availability (Ethics, Privacy, Incidents, NR-1) depends on the subscribed plan. Soluqtion may evolve features while preserving the essential purpose of the service.',
    ] },
    { h: '4. Registration, account and security', p: [
      'The User is responsible for the accuracy of the information provided and for safeguarding their credentials. We recommend strong passwords and not sharing access.',
      'The Company is responsible for managing the roles and scopes assigned to its Users and for removing access when necessary.',
      'Notify Soluqtion immediately in case of unauthorized account use.',
    ] },
    { h: '5. Plans, subscription and payment', p: [
      'Subscription is recurring (monthly or yearly), securely processed by Stripe. Soluqtion does not store full card data.',
      'The subscription renews automatically at the end of each cycle unless canceled beforehand. Cancellation ends the next renewal; access remains until the end of the already-paid period.',
      'Applicable taxes may apply to the amounts. Refunds follow consumer law and the policy in force disclosed at subscription.',
    ] },
    { h: '6. Acceptable use', p: [
      'It is forbidden to: (i) use the Platform for unlawful purposes; (ii) attempt to bypass security controls, scopes or tenant isolation; (iii) reverse engineer, copy or resell the software; (iv) insert content that violates third-party rights.',
      'Misuse may result in immediate suspension, without prejudice to applicable legal measures.',
    ] },
    { h: '7. Personal data processing (roles)', p: [
      'For data entered in the Client environment (reports, data subjects, evidence), the Client is the Controller and Soluqtion acts as Processor, processing data according to the Client’s instructions and the LGPD (Law 13.709/2018).',
      'For registration and Platform usage data (User account, billing), Soluqtion acts as Controller. Details in the Privacy Policy.',
      'The parties commit to adopting technical and organizational security measures and to cooperating in fulfilling data subjects’ rights and any ANPD requests.',
    ] },
    { h: '8. Intellectual property', p: [
      'The Platform, brands, layout, code and documentation are owned by Soluqtion. Subscription grants a limited, non-exclusive and non-transferable license to use, for the plan’s duration.',
      'Data entered by the Client remains owned by the Client and/or the respective data subjects.',
    ] },
    { h: '9. Availability and support', p: [
      'Soluqtion strives to maintain high availability and may perform scheduled maintenance with prior notice when feasible.',
      'The service is provided “as is”, without warranty of uninterrupted or error-free operation.',
    ] },
    { h: '10. Limitation of liability', p: [
      'To the maximum extent permitted by law, Soluqtion’s liability is limited to the amounts paid by the Client in the 12 months preceding the event, excluding indirect damages, lost profits and data loss arising from misuse by the Client.',
    ] },
    { h: '11. Confidentiality', p: [
      'The parties shall keep confidential the information they access, using it only to perform the contract.',
    ] },
    { h: '12. Term and termination', p: [
      'These Terms are in force for as long as the subscription lasts. Either party may terminate under the plan’s conditions. Upon termination, Soluqtion will make data export available for a reasonable period and then proceed to delete or anonymize it, except for legal retention obligations.',
    ] },
    { h: '13. Changes', p: [
      'These Terms may be updated. Relevant changes will be communicated with reasonable notice. Continued use after they take effect implies agreement.',
    ] },
    { h: '14. Governing law and jurisdiction', p: [
      'Brazilian law applies. The Client’s domicile court is elected to resolve disputes when required by consumer law; otherwise, the court of Soluqtion’s headquarters.',
    ] },
    { h: '15. Contact and Data Protection Officer (DPO)', p: [
      'Questions about these Terms: contato@soluqtion.com. Data Protection Officer (DPO): dpo@soluqtion.com.',
    ] },
  ],
  es: [
    { h: '1. Definiciones', p: [
      '“Plataforma” o “Soluvia”: el software de gestión de canales de ética, denuncias, privacidad (LGPD), incidentes y riesgos psicosociales (NR-1) ofrecido por Soluqtion.',
      '“Soluqtion”: la proveedora de la Plataforma, encargada del tratamiento de datos personales conforme a la LGPD.',
      '“Cliente” o “Empresa”: la persona jurídica que contrata la Plataforma y actúa como Responsable de los datos personales tratados en su entorno.',
      '“Usuario”: la persona física autorizada por el Cliente para acceder a la Plataforma (administrador, gestor, RR. HH./Compliance, DPO, etc.).',
      '“Colaborador/Denunciante”: persona que registra un reporte a través de los canales públicos, de forma anónima o identificada.',
    ] },
    { h: '2. Aceptación y elegibilidad', p: [
      'Al crear una cuenta, contratar un plan o utilizar la Plataforma, declaras haber leído y aceptado íntegramente estos Términos y la Política de Privacidad.',
      'El Usuario debe ser mayor de 18 años y tener poderes para representar a la Empresa que contrata el servicio.',
    ] },
    { h: '3. Descripción del servicio', p: [
      'Soluvia es un SaaS B2B multiinquilino que ofrece canales seguros, cadena de evidencias, plazos (SLA), flujos configurables, control de acceso por roles e informes.',
      'La disponibilidad de los módulos (Ética, Privacidad, Incidentes, NR-1) depende del plan contratado. Soluqtion puede evolucionar funcionalidades manteniendo la finalidad esencial del servicio.',
    ] },
    { h: '4. Registro, cuenta y seguridad', p: [
      'El Usuario es responsable de la veracidad de los datos informados y de la custodia de sus credenciales. Recomendamos contraseñas fuertes y no compartir accesos.',
      'La Empresa es responsable de gestionar los roles y alcances asignados a sus Usuarios y de retirar accesos cuando sea necesario.',
      'Notifica de inmediato a Soluqtion en caso de uso no autorizado de la cuenta.',
    ] },
    { h: '5. Planes, suscripción y pago', p: [
      'La contratación es por suscripción recurrente (mensual o anual), procesada de forma segura por Stripe. Soluqtion no almacena los datos completos de la tarjeta.',
      'La suscripción se renueva automáticamente al final de cada ciclo, salvo cancelación previa. La cancelación finaliza la siguiente renovación; el acceso permanece hasta el fin del período ya pagado.',
      'Pueden aplicarse tributos sobre los valores. Los reembolsos siguen la legislación de consumo y la política vigente informada en la contratación.',
    ] },
    { h: '6. Uso aceptable', p: [
      'Está prohibido: (i) usar la Plataforma con fines ilícitos; (ii) intentar eludir controles de seguridad, alcances o aislamiento entre inquilinos; (iii) realizar ingeniería inversa, copiar o revender el software; (iv) insertar contenido que viole derechos de terceros.',
      'El uso indebido puede acarrear suspensión inmediata, sin perjuicio de las medidas legales aplicables.',
    ] },
    { h: '7. Tratamiento de datos personales (roles)', p: [
      'En el tratamiento de los datos ingresados en el entorno del Cliente (reportes, titulares, evidencias), el Cliente es el Responsable y Soluqtion actúa como Encargada, tratando datos conforme a las instrucciones del Cliente y la LGPD (Ley 13.709/2018).',
      'En cuanto a los datos de registro y de uso de la propia Plataforma (cuenta del Usuario, facturación), Soluqtion actúa como Responsable. Detalles en la Política de Privacidad.',
      'Las partes se comprometen a adoptar medidas técnicas y organizativas de seguridad y a colaborar en la atención de los derechos de los titulares y de eventuales solicitudes de la ANPD.',
    ] },
    { h: '8. Propiedad intelectual', p: [
      'La Plataforma, marcas, diseño, código y documentación son de titularidad de Soluqtion. La contratación concede una licencia de uso limitada, no exclusiva e intransferible, durante la vigencia del plan.',
      'Los datos ingresados por el Cliente permanecen bajo la titularidad del Cliente y/o de los respectivos titulares.',
    ] },
    { h: '9. Disponibilidad y soporte', p: [
      'Soluqtion se esfuerza por mantener alta disponibilidad, pudiendo realizar mantenimientos programados con aviso previo cuando sea viable.',
      'El servicio se ofrece “tal cual”, sin garantía de operación ininterrumpida y libre de errores.',
    ] },
    { h: '10. Limitación de responsabilidad', p: [
      'En la máxima medida permitida por la ley, la responsabilidad de Soluqtion se limita a los valores pagados por el Cliente en los 12 meses anteriores al evento, excluidos daños indirectos, lucro cesante y pérdida de datos derivados del uso indebido por el Cliente.',
    ] },
    { h: '11. Confidencialidad', p: [
      'Las partes mantendrán en secreto la información confidencial a la que tengan acceso, utilizándola solo para la ejecución del contrato.',
    ] },
    { h: '12. Vigencia y rescisión', p: [
      'Estos Términos rigen mientras dure la suscripción. Cualquier parte puede rescindir según las condiciones del plan. Finalizado el contrato, Soluqtion pondrá a disposición la exportación de los datos por un plazo razonable y, después, procederá a su eliminación o anonimización, salvo obligaciones legales de retención.',
    ] },
    { h: '13. Cambios', p: [
      'Estos Términos pueden actualizarse. Los cambios relevantes se comunicarán con antelación razonable. El uso continuado tras su vigencia implica conformidad.',
    ] },
    { h: '14. Ley aplicable y jurisdicción', p: [
      'Se aplica la legislación brasileña. Se elige el fuero del domicilio del Cliente para dirimir controversias cuando así lo exija la ley de consumo; en los demás casos, el fuero de la sede de Soluqtion.',
    ] },
    { h: '15. Contacto y Encargado (DPO)', p: [
      'Dudas sobre estos Términos: contato@soluqtion.com. Encargado del Tratamiento de Datos (DPO): dpo@soluqtion.com.',
    ] },
  ],
}

const PRIVACY: Record<Lang, Section[]> = {
  pt: [
    { h: '1. Quem somos', p: [
      'A Soluqtion fornece a Plataforma Soluvia. Em relação aos dados de conta e uso da Plataforma, somos Controladores. Em relação aos dados inseridos pela Empresa-cliente em seu ambiente, atuamos como Operadores, seguindo as instruções do Cliente (Controlador).',
    ] },
    { h: '2. Dados que tratamos', p: [
      'Dados de cadastro: nome, e-mail e senha (armazenada com hash).',
      'Dados de uso: preferências (tema, idioma, tamanho de fonte), papéis, registros de auditoria e logs técnicos.',
      'Dados de pagamento: processados pela Stripe. Não armazenamos o número completo do cartão; guardamos apenas referências (bandeira, últimos 4 dígitos, identificadores de assinatura).',
      'Dados sensíveis no ambiente do Cliente (ex.: relatos, e-mail do denunciante, respostas NR-1) são criptografados em repouso e tratados sob a responsabilidade do Cliente Controlador.',
    ] },
    { h: '3. Finalidades e bases legais', p: [
      'Prestar e manter o serviço contratado (execução de contrato — Art. 7º, V).',
      'Cumprir obrigações legais e regulatórias, inclusive de segurança da informação (Art. 7º, II).',
      'Faturamento e prevenção a fraudes (legítimo interesse / execução de contrato).',
      'Comunicações transacionais (execução de contrato). Comunicações de marketing apenas com consentimento, revogável a qualquer tempo.',
    ] },
    { h: '4. Compartilhamento e transferência internacional', p: [
      'Compartilhamos dados apenas com operadores necessários à prestação do serviço: Stripe (pagamentos), Mailgun (e-mail transacional) e provedores de nuvem/armazenamento (ex.: AWS/Cloudflare).',
      'Alguns desses provedores podem tratar dados fora do Brasil. Nesses casos, adotamos salvaguardas adequadas conforme a LGPD (cláusulas contratuais e padrões de proteção compatíveis).',
    ] },
    { h: '5. Seus direitos (LGPD, Art. 18)', p: [
      'Você pode, a qualquer momento e sem custo: confirmar a existência de tratamento; acessar seus dados; corrigir dados incompletos, inexatos ou desatualizados; solicitar anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade; solicitar a portabilidade; obter informação sobre compartilhamento; e revogar o consentimento.',
      'Exerça esses direitos diretamente em Configurações → Privacidade & LGPD (exportação imediata e solicitações) ou pelo e-mail do Encarregado. Atenderemos nos prazos legais.',
      'A eliminação não é absoluta: podemos reter dados estritamente necessários ao cumprimento de obrigação legal/regulatória ou ao exercício de direitos em processo.',
    ] },
    { h: '6. Retenção', p: [
      'Mantemos os dados pelo tempo necessário às finalidades informadas e às obrigações legais. Encerrada a relação, os dados são eliminados ou anonimizados, salvo retenção legal.',
    ] },
    { h: '7. Segurança', p: [
      'Adotamos medidas técnicas e organizacionais: criptografia em repouso de dados sensíveis, hash de senhas, controle de acesso por papéis e escopo, isolamento entre tenants, trilha de auditoria imutável e princípio do menor privilégio.',
    ] },
    { h: '8. Cookies e armazenamento local', p: [
      'Usamos cookie estritamente necessário para manter sua sessão (refresh token httpOnly) e armazenamento local para suas preferências (tema, idioma, tamanho de fonte). Não usamos cookies de rastreamento de terceiros para publicidade.',
      'No módulo de Assinatura Digital, se você marcar "salvar minha rubrica neste dispositivo", a imagem da sua rubrica fica guardada no armazenamento local do navegador, separada por usuário, apenas para reuso na próxima assinatura. Ela é apagada ao sair da conta e você pode desmarcar a opção a qualquer momento. Seu CPF e sua localização nunca são guardados no dispositivo.',
    ] },
    { h: '9. Encarregado (DPO) e contato', p: [
      'Encarregado pelo Tratamento de Dados (DPO): dpo@soluqtion.com. Você também pode peticionar à Autoridade Nacional de Proteção de Dados (ANPD).',
    ] },
    { h: '10. Alterações desta Política', p: [
      'Podemos atualizar esta Política. Mudanças relevantes serão comunicadas. A versão vigente estará sempre disponível na Plataforma.',
    ] },
  ],
  en: [
    { h: '1. Who we are', p: [
      'Soluqtion provides the Soluvia Platform. For account and Platform usage data, we are Controllers. For data entered by the Client Company in its environment, we act as Processors, following the Client’s (Controller’s) instructions.',
    ] },
    { h: '2. Data we process', p: [
      'Registration data: name, email and password (stored hashed).',
      'Usage data: preferences (theme, language, font size), roles, audit logs and technical logs.',
      'Payment data: processed by Stripe. We do not store the full card number; we keep only references (brand, last 4 digits, subscription identifiers).',
      'Sensitive data in the Client environment (e.g., reports, reporter email, NR-1 answers) are encrypted at rest and processed under the responsibility of the Client Controller.',
    ] },
    { h: '3. Purposes and legal bases', p: [
      'Provide and maintain the subscribed service (contract performance — Art. 7, V).',
      'Comply with legal and regulatory obligations, including information security (Art. 7, II).',
      'Billing and fraud prevention (legitimate interest / contract performance).',
      'Transactional communications (contract performance). Marketing communications only with consent, revocable at any time.',
    ] },
    { h: '4. Sharing and international transfer', p: [
      'We share data only with processors necessary to provide the service: Stripe (payments), Mailgun (transactional email) and cloud/storage providers (e.g., AWS/Cloudflare).',
      'Some of these providers may process data outside Brazil. In such cases, we adopt adequate safeguards under the LGPD (contractual clauses and compatible protection standards).',
    ] },
    { h: '5. Your rights (LGPD, Art. 18)', p: [
      'At any time and free of charge, you may: confirm the existence of processing; access your data; correct incomplete, inaccurate or outdated data; request anonymization, blocking or deletion of unnecessary or non-compliant data; request portability; obtain information about sharing; and revoke consent.',
      'Exercise these rights directly in Settings → Privacy & LGPD (immediate export and requests) or via the DPO email. We will respond within legal deadlines.',
      'Deletion is not absolute: we may retain data strictly necessary to comply with a legal/regulatory obligation or to exercise rights in proceedings.',
    ] },
    { h: '6. Retention', p: [
      'We keep data for as long as necessary for the stated purposes and legal obligations. Once the relationship ends, data is deleted or anonymized, except for legal retention.',
    ] },
    { h: '7. Security', p: [
      'We adopt technical and organizational measures: encryption at rest of sensitive data, password hashing, role- and scope-based access control, tenant isolation, an immutable audit trail and the principle of least privilege.',
    ] },
    { h: '8. Cookies and local storage', p: [
      'We use a strictly necessary cookie to keep your session (httpOnly refresh token) and local storage for your preferences (theme, language, font size). We do not use third-party tracking cookies for advertising.',
      'In the Digital Signature module, if you tick "save my signature on this device", the signature image is kept in the browser local storage, separated per user, solely to reuse it next time. It is erased when you sign out and you can untick the option at any time. Your national ID number and your location are never stored on the device.',
    ] },
    { h: '9. Data Protection Officer (DPO) and contact', p: [
      'Data Protection Officer (DPO): dpo@soluqtion.com. You may also petition the National Data Protection Authority (ANPD).',
    ] },
    { h: '10. Changes to this Policy', p: [
      'We may update this Policy. Relevant changes will be communicated. The current version will always be available on the Platform.',
    ] },
  ],
  es: [
    { h: '1. Quiénes somos', p: [
      'Soluqtion provee la Plataforma Soluvia. Respecto a los datos de cuenta y uso de la Plataforma, somos Responsables. Respecto a los datos ingresados por la Empresa-cliente en su entorno, actuamos como Encargados, siguiendo las instrucciones del Cliente (Responsable).',
    ] },
    { h: '2. Datos que tratamos', p: [
      'Datos de registro: nombre, correo y contraseña (almacenada con hash).',
      'Datos de uso: preferencias (tema, idioma, tamaño de fuente), roles, registros de auditoría y logs técnicos.',
      'Datos de pago: procesados por Stripe. No almacenamos el número completo de la tarjeta; guardamos solo referencias (marca, últimos 4 dígitos, identificadores de suscripción).',
      'Los datos sensibles en el entorno del Cliente (p. ej., reportes, correo del denunciante, respuestas NR-1) se cifran en reposo y se tratan bajo la responsabilidad del Cliente Responsable.',
    ] },
    { h: '3. Finalidades y bases legales', p: [
      'Prestar y mantener el servicio contratado (ejecución de contrato — Art. 7.º, V).',
      'Cumplir obligaciones legales y regulatorias, incluida la seguridad de la información (Art. 7.º, II).',
      'Facturación y prevención de fraudes (interés legítimo / ejecución de contrato).',
      'Comunicaciones transaccionales (ejecución de contrato). Comunicaciones de marketing solo con consentimiento, revocable en cualquier momento.',
    ] },
    { h: '4. Compartición y transferencia internacional', p: [
      'Compartimos datos solo con encargados necesarios para prestar el servicio: Stripe (pagos), Mailgun (correo transaccional) y proveedores de nube/almacenamiento (p. ej., AWS/Cloudflare).',
      'Algunos de estos proveedores pueden tratar datos fuera de Brasil. En esos casos, adoptamos salvaguardas adecuadas conforme a la LGPD (cláusulas contractuales y estándares de protección compatibles).',
    ] },
    { h: '5. Tus derechos (LGPD, Art. 18)', p: [
      'En cualquier momento y sin costo puedes: confirmar la existencia de tratamiento; acceder a tus datos; corregir datos incompletos, inexactos o desactualizados; solicitar la anonimización, bloqueo o eliminación de datos innecesarios o tratados de forma no conforme; solicitar la portabilidad; obtener información sobre la compartición; y revocar el consentimiento.',
      'Ejerce estos derechos directamente en Configuración → Privacidad & LGPD (exportación inmediata y solicitudes) o por el correo del Encargado. Responderemos en los plazos legales.',
      'La eliminación no es absoluta: podemos retener datos estrictamente necesarios para cumplir una obligación legal/regulatoria o para el ejercicio de derechos en un proceso.',
    ] },
    { h: '6. Retención', p: [
      'Conservamos los datos por el tiempo necesario para las finalidades informadas y las obligaciones legales. Finalizada la relación, los datos se eliminan o anonimizan, salvo retención legal.',
    ] },
    { h: '7. Seguridad', p: [
      'Adoptamos medidas técnicas y organizativas: cifrado en reposo de datos sensibles, hash de contraseñas, control de acceso por roles y alcance, aislamiento entre inquilinos, cadena de auditoría inmutable y principio del menor privilegio.',
    ] },
    { h: '8. Cookies y almacenamiento local', p: [
      'Usamos una cookie estrictamente necesaria para mantener tu sesión (refresh token httpOnly) y almacenamiento local para tus preferencias (tema, idioma, tamaño de fuente). No usamos cookies de rastreo de terceros para publicidad.',
      'En el módulo de Firma Digital, si marcas "guardar mi rúbrica en este dispositivo", la imagen de tu rúbrica queda en el almacenamiento local del navegador, separada por usuario, solo para reutilizarla la próxima vez. Se borra al cerrar sesión y puedes desmarcar la opción cuando quieras. Tu documento de identidad y tu ubicación nunca se guardan en el dispositivo.',
    ] },
    { h: '9. Encargado (DPO) y contacto', p: [
      'Encargado del Tratamiento de Datos (DPO): dpo@soluqtion.com. También puedes presentar una petición ante la Autoridad Nacional de Protección de Datos (ANPD).',
    ] },
    { h: '10. Cambios en esta Política', p: [
      'Podemos actualizar esta Política. Los cambios relevantes se comunicarán. La versión vigente estará siempre disponible en la Plataforma.',
    ] },
  ],
}

export default function LegalDocs() {
  const { lang } = useTranslation()
  const ui = UI[lang] ?? UI.pt
  const [doc, setDoc] = useState<'terms' | 'privacy' | null>(null)
  // Hash de onde o usuário veio ao abrir Termos/Privacidade — para o botão Fechar
  // voltar ao lugar certo (o PAINEL se estava logado; a landing se veio do rodapé),
  // em vez de sempre cair na página inicial do site.
  const returnHash = useRef('')

  useEffect(() => {
    const isLegal = (h: string) => h.startsWith('#termos') || h.startsWith('#privacidade')
    const sync = (e?: HashChangeEvent) => {
      const h = window.location.hash.toLowerCase()
      // Ao ABRIR (transição de não-legal → legal), lembra de onde viemos.
      if (isLegal(h) && e) {
        let old = ''
        try { old = new URL(e.oldURL).hash } catch { old = '' }
        if (!isLegal(old.toLowerCase())) returnHash.current = old
      }
      setDoc(h.startsWith('#termos') ? 'terms' : h.startsWith('#privacidade') ? 'privacy' : null)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  if (!doc) return null
  const sections = (doc === 'terms' ? TERMS : PRIVACY)[lang] ?? (doc === 'terms' ? TERMS : PRIVACY).pt
  const title = doc === 'terms' ? ui.terms : ui.privacy
  const close = () => {
    const back = returnHash.current // ex.: '#painel' (logado) ou '' (landing)
    if (back && back !== '#') {
      window.location.hash = back.replace(/^#/, '')
    } else {
      history.replaceState(null, '', window.location.pathname + window.location.search)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
  }

  return (
    <div className="app-scroll" style={{ position: 'fixed', inset: 0, zIndex: 10004, background: 'var(--bg)', overflowY: 'auto', color: 'var(--text)' }}>
      <div style={{ position: 'sticky', top: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px clamp(18px,5vw,40px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <img src="/soluvia.png" alt="Soluvia" style={{ height: 38, width: 'auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <PrefSwitcher compact />
          <button onClick={close} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--heading)', borderRadius: 100, padding: '9px 20px', fontWeight: 700, cursor: 'pointer' }}>{ui.close}</button>
        </div>
      </div>
      <article style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(24px,5vw,52px) clamp(18px,5vw,24px)' }}>
        <h1 style={{ color: 'var(--heading)', fontSize: 'clamp(28px,5vw,42px)', fontWeight: 900, letterSpacing: '-1.5px' }}>{title}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8, marginBottom: 8 }}>{ui.by} · {ui.updated}</p>
        {sections.map((s) => (
          <section key={s.h} style={{ marginTop: 28 }}>
            <h2 style={{ color: 'var(--heading)', fontSize: 19, fontWeight: 800, marginBottom: 10 }}>{s.h}</h2>
            {s.p.map((para, i) => (
              <p key={i} style={{ color: 'var(--text)', fontSize: 15, lineHeight: 1.75, marginBottom: 10 }}>{para}</p>
            ))}
          </section>
        ))}
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          {ui.disclaimer}
        </p>
      </article>
    </div>
  )
}
