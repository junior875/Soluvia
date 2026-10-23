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

/** Partes do aviso que podem ser copy nossa — ver `FormField.native_off`. */
export type ParteDoAviso = 'label' | 'help'

/**
 * Rótulo e texto a exibir no campo de aviso de privacidade.
 *
 * A decisão é POR PARTE (`native_off`), não pelo campo inteiro. Antes era pelo
 * campo, e a edição mais comum do cliente — trocar o parágrafo da LGPD pelo
 * texto dele e manter o nome do aviso — apagava a marca do rótulo junto: a
 * frase em inglês saía com o nome de fábrica em português no meio ("I have
 * read and understood the Aviso de Privacidade"). Agora cada parte reescrita é
 * do cliente e a outra continua sendo nossa, traduzida.
 *
 * Parte que ninguém reescreveu é servida SEMPRE no idioma de quem lê, sem
 * olhar o idioma do que chegou. Antes a copy de fábrica só assumia quando
 * `idiomaDoTexto !== idiomaDeQuemLe`, e essa comparação acreditava no
 * `base_lang` do formulário: salvo com `lang: "en"` e o texto de fábrica ainda
 * em português, o servidor dizia "este é o inglês" e a página servia o
 * parágrafo em português a quem lia em inglês. Como a parte marcada é a NOSSA
 * copy (se o cliente mexesse, viria em `native_off`), a de fábrica no idioma
 * certo nunca é pior — inclusive quando a tradução por IA já rodou, porque
 * essa tradução é a nossa própria copy passada pela máquina.
 *
 * Por isso o idioma do que foi SERVIDO saiu do contrato: ele só servia para
 * aquela comparação, e era o dado em que não se podia confiar. O texto do
 * CLIENTE continua indo como está — traduzi-lo não é trabalho desta função.
 */
export function copyDoAviso(
  campo: { label?: string; help?: string; native?: string | null; native_off?: string[] | null },
  idiomaDeQuemLe: string,
): CopyDoAviso {
  const padrao = avisoPadrao(campo.native, idiomaDeQuemLe)
  const reescrito = campo.native_off ?? []
  const rotulo = (campo.label ?? '').trim()
  const texto = (campo.help ?? '').trim()
  // Esta parte ainda é copy nossa? Então quem manda é o idioma de quem lê.
  const deFabrica = (parte: ParteDoAviso) => Boolean(padrao) && !reescrito.includes(parte)
  return {
    rotulo: deFabrica('label') ? padrao!.rotulo : (rotulo || padrao?.rotulo || ''),
    texto: deFabrica('help') ? padrao!.texto : (texto || padrao?.texto || ''),
  }
}
