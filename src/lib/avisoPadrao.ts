// Texto do AVISO DE PRIVACIDADE que vem de fábrica no formulário de um canal.
//
// Por que ele mora aqui e não no banco: o rótulo e o parágrafo da LGPD dos
// modelos padrão (`backend/app/services/channel_form_service.py`) são copy do
// PRODUTO, não do cliente. Como rótulo digitado, eles só existiam em EN/ES se
// alguém rodasse a tradução por IA do formulário — que nasce zerada. O
// resultado num canal criado hoje e aberto em inglês era a frase de aceite
// nativa ("I have read and understood the…") por cima de um parágrafo em
// português, com o próprio nome do aviso em português no meio da frase.
//
// O campo carrega a CHAVE da copy (`FormField.native`, lista fechada no
// servidor) e quem exibe escolhe o texto no idioma de quem lê — do mesmo jeito
// que o resto do dicionário da página pública. Texto do cliente continua sendo
// do cliente: se ele digitar o aviso dele, o construtor apaga a marca e o que
// manda é o que ele escreveu.
export type LangAviso = 'pt' | 'en' | 'es'

export interface CopyDoAviso {
  /** Nome do aviso — é o texto que vira o link quando há `url`. */
  rotulo: string
  /** Parágrafo para ler antes de aceitar. */
  texto: string
}

const PADRAO: Record<string, Record<LangAviso, CopyDoAviso>> = {
  // Canal de ética: a finalidade é APURAR o relato.
  lgpd_etica: {
    pt: {
      rotulo: 'Aviso de Privacidade',
      texto: 'Seus dados são tratados conforme a LGPD (Lei 13.709/2018), apenas para apurar este relato, e o acesso é restrito a quem conduz a apuração. Leia o aviso completo antes de enviar.',
    },
    en: {
      rotulo: 'Privacy Notice',
      texto: 'Your data is processed under the Brazilian data protection law (LGPD, Law 13.709/2018), only to investigate this report, and access is restricted to the people conducting the investigation. Please read the full notice before sending.',
    },
    es: {
      rotulo: 'Aviso de Privacidad',
      texto: 'Tus datos se tratan conforme a la LGPD (Ley 13.709/2018), únicamente para investigar esta denuncia, y el acceso está restringido a quienes conducen la investigación. Lee el aviso completo antes de enviar.',
    },
  },
  // SAC: a finalidade é ATENDER e RESPONDER a demanda (Decreto 11.034/2022).
  lgpd_sac: {
    pt: {
      rotulo: 'Aviso de Privacidade',
      texto: 'Seus dados são tratados conforme a LGPD (Lei 13.709/2018), apenas para atender e responder esta demanda. Leia o aviso completo antes de enviar.',
    },
    en: {
      rotulo: 'Privacy Notice',
      texto: 'Your data is processed under the Brazilian data protection law (LGPD, Law 13.709/2018), only to handle and reply to this request. Please read the full notice before sending.',
    },
    es: {
      rotulo: 'Aviso de Privacidad',
      texto: 'Tus datos se tratan conforme a la LGPD (Ley 13.709/2018), únicamente para atender y responder esta demanda. Lee el aviso completo antes de enviar.',
    },
  },
}

/** A copy nativa desta chave no idioma pedido. `null` quando não há marca. */
export function avisoPadrao(native: string | undefined | null, lang: string): CopyDoAviso | null {
  const copy = native ? PADRAO[native] : undefined
  if (!copy) return null
  return copy[lang as LangAviso] ?? copy.pt
}

/**
 * Rótulo e texto a exibir no campo de aviso de privacidade.
 *
 * `idiomaDoTexto` é o idioma em que o formulário foi SERVIDO (`form.lang` na
 * página pública): sem tradução para o idioma escolhido, o servidor devolve o
 * idioma base. Então a regra é: se o que chegou não está no idioma de quem lê,
 * a copy de fábrica assume; caso contrário o que está guardado manda — pode ser
 * o texto do cliente ou a tradução por IA, e nos dois casos já está no idioma
 * certo.
 */
export function copyDoAviso(
  campo: { label?: string; help?: string; native?: string | null },
  idiomaDoTexto: string,
  idiomaDeQuemLe: string,
): CopyDoAviso {
  const padrao = avisoPadrao(campo.native, idiomaDeQuemLe)
  const rotulo = (campo.label ?? '').trim()
  const texto = (campo.help ?? '').trim()
  if (padrao && idiomaDoTexto !== idiomaDeQuemLe) return padrao
  return {
    rotulo: rotulo || padrao?.rotulo || '',
    texto: texto || padrao?.texto || '',
  }
}
