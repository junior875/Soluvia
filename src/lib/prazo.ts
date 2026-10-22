/** Prazo no cliente: resolver o placeholder e escrever o rótulo.
 *
 *  O NÚMERO nunca nasce aqui — vem do canal, pelo servidor. Este arquivo só
 *  monta a frase, e existe por dois motivos:
 *
 *  1. `{prazo}` é resolvido no CLIENTE, e não no servidor, porque o mesmo texto
 *     de introdução aparece na prévia do construtor de formulário. Lá quem
 *     edita precisa VER que ali existe um placeholder — se o servidor já
 *     entregasse a frase pronta, a pessoa acharia que o número foi digitado e
 *     voltaria a digitá-lo à mão, que foi exatamente o defeito original.
 *  2. O rótulo em idioma: a tela interna troca de idioma sem recarregar, e
 *     pedir um texto novo ao servidor a cada troca seria uma ida de rede para
 *     escrever "5 dias úteis".
 */

export type PrazoModo = 'horas' | 'corridos' | 'uteis'

type Idioma = 'pt' | 'en' | 'es'

/** (singular, plural) por modo e idioma — espelha `app/core/calendario.py`. */
const ROTULOS: Record<PrazoModo, Record<Idioma, [string, string]>> = {
  uteis: {
    pt: ['{n} dia útil', '{n} dias úteis'],
    en: ['{n} business day', '{n} business days'],
    es: ['{n} día hábil', '{n} días hábiles'],
  },
  corridos: {
    pt: ['{n} dia corrido', '{n} dias corridos'],
    en: ['{n} calendar day', '{n} calendar days'],
    es: ['{n} día corrido', '{n} días corridos'],
  },
  horas: {
    pt: ['{n} hora', '{n} horas'],
    en: ['{n} hour', '{n} hours'],
    es: ['{n} hora', '{n} horas'],
  },
}

/** O prazo escrito. Vazio quando não há prazo — e aí nada é prometido. */
export function rotuloPrazo(quantidade: number, modo: PrazoModo, lang = 'pt'): string {
  const n = Math.trunc(Number(quantidade) || 0)
  if (n <= 0) return ''
  const porIdioma = ROTULOS[modo] ?? ROTULOS.corridos
  const [singular, plural] = porIdioma[(lang as Idioma)] ?? porIdioma.pt
  return (n === 1 ? singular : plural).replace('{n}', String(n))
}

/** Troca `{prazo}` pelo rótulo do canal no texto da introdução.
 *
 *  Sem prazo configurado o placeholder é apagado junto com o que sobraria em
 *  volta dele: "Respondemos em até ." é pior que uma frase mais curta. Por isso
 *  a limpeza de espaço duplo e de espaço antes da pontuação.
 */
export function resolverPrazo(texto: string, label: string): string {
  if (!texto) return ''
  if (!texto.includes('{prazo}')) return texto
  return texto
    .replace(/\{prazo\}/g, label)
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()
}

/** O texto do selo de prazo, a partir do que o servidor gravou.
 *
 *  Recebe o vencimento e a RÉGUA: contar em dias corridos um prazo prometido em
 *  dias úteis dizia "faltam 3 d" numa sexta em que dois deles eram sábado e
 *  domingo. `null` = sem prazo, e aí não há selo.
 */
export function diasRestantes(
  vencimento: string | null | undefined,
  modo: PrazoModo | null | undefined,
  agora: Date = new Date(),
): number | null {
  if (!vencimento) return null
  const prazo = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(vencimento) ? vencimento : `${vencimento}Z`)
  if (Number.isNaN(prazo.getTime())) return null
  if (modo !== 'uteis') return Math.floor((prazo.getTime() - agora.getTime()) / 86_400_000)

  // Em dias úteis a conta é por DIA DE CALENDÁRIO em Brasília, para casar com
  // o vencimento que o servidor gravou (fim do dia, 23:59:59 BRT).
  const diaBr = (d: Date) => {
    const iso = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const [a, m, dd] = iso.split('-').map(Number)
    return Date.UTC(a, m - 1, dd)
  }
  const deHoje = diaBr(agora)
  const doPrazo = diaBr(prazo)
  const contar = (de: number, ate: number) => {
    let n = 0
    for (let t = de + 86_400_000; t <= ate; t += 86_400_000) {
      const dia = new Date(t).getUTCDay()
      if (dia !== 0 && dia !== 6) n += 1
    }
    return n
  }
  // Feriados NÃO entram nesta conta de propósito: o cliente não tem o
  // calendário da empresa, e o número exibido pode ficar no máximo um dia
  // otimista. O que decide atraso de verdade é o `due_at` do servidor, que já
  // nasceu com os feriados aplicados.
  return prazo.getTime() <= agora.getTime()
    ? -contar(doPrazo, deHoje)
    : contar(deHoje, doPrazo)
}
