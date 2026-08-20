/**
 * Destino pretendido — para onde a pessoa estava indo quando o login
 * interrompeu.
 *
 * O caso de uso que criou isto: o e-mail de triagem manda para
 * `#painel/cases?protocolo=DG-QB2L-XWN6`. Sem sessão, a tela de "sessão
 * expirou" jogava a pessoa em `#entrar` e o login terminava em `#painel` fixo.
 * O protocolo — que estava escrito no próprio e-mail que a trouxe até ali —
 * evaporava no caminho, e ela caía numa lista para procurá-lo à mão.
 *
 * Três decisões que valem explicação:
 *
 * · **sessionStorage, não localStorage.** O destino não pode sobreviver ao
 *   fechamento da aba. Em localStorage, um link clicado hoje sequestraria um
 *   login normal feito daqui a três dias.
 * · **Prazo curto mesmo dentro da aba.** Uma pessoa que abriu o link, foi
 *   almoçar e voltou para entrar por outro motivo não deve ser teleportada
 *   para um caso que já esqueceu.
 * · **Só aceita destino de painel.** O valor guardado vira `location.hash`, e
 *   escrever string vinda de armazenamento em endereço, sem conferir, é o tipo
 *   de atalho que um dia vira redirecionamento inesperado.
 */
const CHAVE = 'soluvia.destino'
const VALIDADE_MS = 30 * 60 * 1000

/** Aceita só rotas internas do painel — nada de URL absoluta nem protocolo. */
function ehDestinoValido(hash: string): boolean {
  return /^painel(\/|$|\?)/.test(hash)
}

function normalizar(hash: string): string {
  return hash.replace(/^#+/, '')
}

/**
 * Guarda para onde a pessoa ia. Chamar ANTES de mandá-la para o login —
 * depois de trocar o hash a informação já se perdeu.
 */
export function guardarDestino(hash: string = window.location.hash): void {
  const destino = normalizar(hash)
  if (!ehDestinoValido(destino)) return
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify({ destino, em: Date.now() }))
  } catch {
    /* modo privado / storage cheio — seguir sem o atalho é aceitável */
  }
}

/**
 * Devolve o destino guardado UMA vez e o apaga.
 *
 * Consumir na leitura é de propósito: se ficasse, o próximo login normal
 * saltaria de volta para um caso que a pessoa não pediu.
 */
export function consumirDestino(): string | null {
  try {
    const cru = sessionStorage.getItem(CHAVE)
    sessionStorage.removeItem(CHAVE)
    if (!cru) return null
    const { destino, em } = JSON.parse(cru) as { destino?: string; em?: number }
    if (!destino || !em) return null
    if (Date.now() - em > VALIDADE_MS) return null
    return ehDestinoValido(destino) ? destino : null
  } catch {
    return null
  }
}

/** Descarta o destino sem usá-lo (ex.: quem entrou é admin de plataforma). */
export function limparDestino(): void {
  try {
    sessionStorage.removeItem(CHAVE)
  } catch {
    /* idem */
  }
}
