// Apoio dos testes das telas PÚBLICAS (relato e acompanhamento).
//
// As duas telas vivem dentro dos provedores de tema e idioma do `main.tsx`.
// Renderizá-las "pelado" estoura no `useTranslation`, que exige o provedor —
// então o teste montaria a árvore errada e o erro falaria de contexto, não do
// comportamento que se quer provar.
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { LanguageProvider } from '../i18n/LanguageProvider'
import { ThemeProvider } from '../theme/ThemeProvider'

export function renderPublico(ui: ReactElement) {
  return render(
    <ThemeProvider>
      <LanguageProvider>{ui}</LanguageProvider>
    </ThemeProvider>,
  )
}

/** `a` aparece antes de `b` na ordem de leitura da página? */
export function vemAntes(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

/** Resposta de `fetch` fingida, com só o que as telas públicas leem. */
export function respostaJson(corpo: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as Response
}
