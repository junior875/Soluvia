/**
 * O que pode ser anexado — perguntado ao servidor, nunca escrito à mão aqui.
 *
 * A regra que RECUSA vive no backend. Uma segunda lista deste lado divergiria no
 * primeiro formato novo, e o sintoma seria a tela prometer um tipo que o
 * servidor rejeita — o pior lugar possível para uma promessa quebrada, porque
 * quem está anexando prova já está inseguro.
 */
import { BASE_URL } from './api'

export type TiposAceitos = {
  extensions: string[]
  groups: Record<string, string[]>
  max_bytes: number
  max_files: number
}

let cache: Promise<TiposAceitos> | null = null

/** Busca uma vez por sessão: a lista não muda entre dois cliques. */
export function carregarTiposAceitos(): Promise<TiposAceitos> {
  if (!cache) {
    cache = fetch(`${BASE_URL}/public/uploads/accepted-types`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<TiposAceitos>
      })
      .catch((e) => {
        // Falhou? Esquece o cache para a próxima tentativa não herdar o erro.
        cache = null
        throw e
      })
  }
  return cache
}

export function megabytes(bytes: number): number {
  return Math.round(bytes / 1024 / 1024)
}

/**
 * Extensões para o atributo `accept` do seletor de arquivos.
 *
 * Filtra já na janela do sistema operacional: o erro que não acontece é melhor
 * que a mensagem de erro mais clara do mundo.
 */
export function paraAccept(t: TiposAceitos | null): string | undefined {
  return t?.extensions.length ? t.extensions.join(',') : undefined
}
