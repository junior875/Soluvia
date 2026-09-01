/**
 * O manual dentro do site: estrutura de dados.
 *
 * Duas decisões sustentam tudo:
 *
 * 1. **O filtro é o da navegação.** Um capítulo declara o que exige usando o
 *    MESMO `Requirement` das telas (`registry.tsx`), e quem decide se ele
 *    aparece é a MESMA função `evaluate()`. Não são duas listas para manter
 *    sincronizadas — é uma só. Documentar uma tela que a pessoa não pode abrir
 *    é pior do que não documentar nada: ensina um caminho que termina em "sem
 *    permissão".
 *
 * 2. **Os três idiomas são obrigatórios NO TIPO.** Todo texto é um `T3`, com
 *    `pt`, `en` e `es` — nenhum opcional. Acrescentar um capítulo e esquecer o
 *    espanhol vira erro de compilação, não uma frase em português aparecendo no
 *    meio de um manual em inglês. Um `Record<Lang, string>` com fallback teria
 *    sido mais fácil de escrever e teria escondido exatamente o defeito que
 *    mais dói num produto multilíngue: a tradução que nunca chegou.
 *
 * Repare que nada aqui menciona PAPEL. Papel é um conjunto de permissões que
 * cada empresa monta como quer; amarrar o manual a "gestor" ou "analista"
 * quebraria no primeiro papel personalizado que alguém criasse.
 */
import type { Lang } from '../../i18n/translations'
import type { Requirement } from '../registry'

/** Um texto nos três idiomas. Nenhum campo é opcional — de propósito. */
export interface T3 {
  pt: string
  en: string
  es: string
}

/** Açúcar para escrever conteúdo sem repetir as chaves em cada linha. */
export const t3 = (pt: string, en: string, es: string): T3 => ({ pt, en, es })

/** Resolve um texto no idioma da tela. */
export const diga = (texto: T3, lang: Lang): string => texto[lang]

export interface ManualFigura {
  /** Nome do arquivo em /manual (sem extensão). A imagem é a mesma nos três
   *  idiomas: o print é do sistema em português, e trocar de print por idioma
   *  exigiria uma sessão de capturas por língua — a legenda, essa sim, traduz. */
  src: string
  legenda: T3
}

export interface ManualCampo {
  nome: T3
  desc: T3
  obrigatorio: boolean
}

export interface ManualSecao {
  id: string
  titulo: T3
  /** Parágrafos. Aceita <b>, <i> e <code> — nada além disso. */
  corpo?: T3[]
  passos?: T3[]
  campos?: { titulo: T3; itens: ManualCampo[] }
  figuras?: ManualFigura[]
  /** Caixas de apoio: aviso (vermelho), nota (âmbar), ok (verde). */
  notas?: { tipo: 'nota' | 'aviso' | 'ok'; texto: T3 }[]
  tabela?: { colunas: T3[]; linhas: T3[][] }
  /** Recorta a seção dentro de um capítulo já permitido. */
  requires?: Requirement
}

export interface ManualCapitulo {
  id: string
  titulo: T3
  resumo: T3
  /** Id da tela do painel — vira o botão "Abrir esta tela". */
  tela?: string
  /** Sem `requires`, o capítulo vale para todo mundo. */
  requires?: Requirement
  secoes: ManualSecao[]
}
