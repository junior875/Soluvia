// Preparo comum de todo teste de tela.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

// O jsdom não implementa `matchMedia`, e o ThemeProvider pergunta por ele logo
// no primeiro render (tema do sistema + "reduzir movimento"). Sem este
// substituto, QUALQUER teste que renderize uma tela pública estoura antes de
// chegar ao que se queria verificar.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  // O idioma é detectado pelo navegador e guardado em localStorage. O jsdom se
  // apresenta como `en-US`, então sem fixar isso os testes leriam o dicionário
  // em inglês — e falhariam por um motivo que não é o defeito procurado.
  localStorage.clear()
  localStorage.setItem('soluvia.lang', 'pt')
})

afterEach(() => {
  cleanup()
  // A URL é estado compartilhado entre testes: um teste que sai com
  // `#acompanhar` no endereço abre o overlay do teste seguinte.
  history.replaceState(null, '', '/')
})
