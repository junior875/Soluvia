// Máscaras "pré-prontas" para o formulário PÚBLICO montado no Form Builder.
//
// O formulário é dinâmico (inclusive gerado pelo agente de IA), então não há
// onde o autor marcar "isto é um telefone". A saída que não depende de
// ninguém configurar nada: reconhecer o campo pelo RÓTULO/CHAVE e aplicar a
// máscara certa aqui, na hora de digitar. Errar o palpite é inofensivo — a
// máscara só entra quando o texto do campo diz claramente o que ele é.
import { maskCpf } from './cpf'

/** (00) 00000-0000 — aceita fixo (8 dígitos) e celular (9). */
export function maskTelefone(bruto: string): string {
  const d = bruto.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** 00.000.000/0000-00 */
export function maskCnpj(bruto: string): string {
  const d = bruto.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/** DG-XXXX-XXXX — o protocolo do relato, como ele é gerado.
 *
 * O campo de acompanhamento recebia texto cru: quem colava o protocolo do
 * e-mail em minúsculas, sem os hífens ou com um espaço no meio, levava
 * "Protocolo ou código inválido" com o código certo na mão. A máscara faz o
 * campo mostrar desde a digitação a MESMA grafia que o servidor gravou.
 *
 * O prefixo é sempre `DG`, então oito caracteres sem ele significam que a
 * pessoa colou só os dois blocos — essa parte é a mesma regra da
 * `normalizar_protocolo` do backend, que continua sendo a fonte da verdade.
 *
 * Onde as duas NÃO são iguais, e de propósito: só aqui se extrai o protocolo
 * de dentro de um texto maior ("Protocolo: DG-7K3F-9QX2", como o e-mail
 * mostra). O backend não faz isso — ele recusa o que não tem formato de
 * protocolo. Quem digita no campo já manda normalizado; quem chama a API na
 * mão com o rótulo colado leva 404, que é o comportamento pretendido.
 */
export function maskProtocolo(bruto: string): string {
  const limpo = (bruto || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  let d = limpo.slice(0, 10)
  // Colagem com rótulo ("Protocolo: DG-7K3F-9QX2", como o e-mail mostra):
  // pegar os dez primeiros caracteres daria "PR-OTOC-OLOD". Só entra quando já
  // há mais de dez caracteres, para não atropelar quem está digitando.
  if (limpo.length > 10) {
    const achado = limpo.match(/DG[A-Z0-9]{8}/)
    if (achado) d = achado[0]
  }
  if (d.length === 8 && !d.startsWith('DG')) d = `DG${d}`
  if (d.length <= 2) return d
  // Os dois primeiros caracteres são repetidos como vieram, e não fixados em
  // "DG": prefixo errado tem de ficar visível para a pessoa ver que errou.
  if (d.length <= 6) return `${d.slice(0, 2)}-${d.slice(2)}`
  return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
}

/** 00000-000 */
export function maskCep(bruto: string): string {
  const d = bruto.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export interface MascaraDeCampo {
  aplicar: (v: string) => string
  inputMode: 'tel' | 'numeric'
}

/** A máscara do campo, deduzida do rótulo + chave. Null = campo livre. */
export function mascaraPara(rotulo: string, chave: string): MascaraDeCampo | null {
  const texto = `${rotulo} ${chave}`.toLowerCase()
  if (/\bcpf\b/.test(texto)) return { aplicar: maskCpf, inputMode: 'numeric' }
  if (/\bcnpj\b/.test(texto)) return { aplicar: maskCnpj, inputMode: 'numeric' }
  if (/telefone|celular|whatsapp|\bfone\b|\bphone\b|tel\./.test(texto)) {
    return { aplicar: maskTelefone, inputMode: 'tel' }
  }
  if (/\bcep\b/.test(texto)) return { aplicar: maskCep, inputMode: 'numeric' }
  return null
}
