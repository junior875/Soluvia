/// <reference types="vitest/config" />
// Configuração do runner de teste do front.
//
// É um arquivo SEPARADO do `vite.config.ts` de propósito: o de lá serve o
// aplicativo (porta fixa, proxy do /api, CSP de desenvolvimento) e nada disso
// vale dentro do teste, que não sobe servidor nenhum. Misturar os dois faria
// uma mudança de infra de teste mexer no arquivo que atende quem desenvolve.
//
// O plugin do React precisa estar aqui porque o Vitest NÃO herda o
// `vite.config.ts` quando existe um `vitest.config.ts`: sem ele, o JSX dos
// testes não compila.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // As telas públicas são DOM: o que se testa aqui é o que a pessoa vê.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Cada teste começa com os espiões/stubs da rodada anterior desfeitos —
    // senão um `fetch` fingido vaza para o teste seguinte e o resultado passa
    // a depender da ORDEM dos arquivos.
    restoreMocks: true,
    unstubGlobals: true,
    css: false,
  },
})
