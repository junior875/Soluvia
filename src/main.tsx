import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
// Poppins auto-hospedada (@fontsource) — NUNCA via CDN do Google. O canal de
// relato (/c/:tenant/:canal) promete anonimato: o navegador do denunciante não
// pode contatar terceiro nenhum (IP + User-Agent) antes de ele sequer digitar.
// Mesmo padrão das fontes manuscritas em screens/signature/SignatureTyped.tsx.
// Um arquivo por peso (latin-<peso>) — 'latin.css' traria os 9 pesos × itálico.
import '@fontsource/poppins/latin-300.css'
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'
import '@fontsource/poppins/latin-800.css'
import '@fontsource/poppins/latin-900.css'
import './index.css'
import { LanguageProvider } from './i18n/LanguageProvider.tsx'
import { ThemeProvider } from './theme/ThemeProvider.tsx'
import { initPrefsEarly } from './lib/prefs.ts'

// Aplica tamanho de fonte + tema 'sistema' antes do primeiro paint.
initPrefsEarly()

// ── Deploy no meio do uso ────────────────────────────────────────
// As telas pesadas (pdf.js do visualizador de assinatura, Word) são chunks
// carregados SOB DEMANDA, com hash no nome. Um deploy apaga os arquivos
// antigos; quem estava com a aba aberta no index anterior e clicava numa
// dessas áreas levava 404 no chunk → o import dinâmico explodia → a tela
// inteira morria (foi exatamente o "subi um PDF para assinar e morreu").
// A correção canônica: detectar a falha e recarregar UMA vez — o reload
// busca o index novo, com os nomes novos. O carimbo em sessionStorage
// impede loop se o reload não resolver (aí o problema é outro).
function recarregarUmaVez() {
  const marca = Number(sessionStorage.getItem('chunk_reload_at') || 0)
  if (Date.now() - marca < 60_000) return false
  sessionStorage.setItem('chunk_reload_at', String(Date.now()))
  window.location.reload()
  return true
}
window.addEventListener('vite:preloadError', (e) => {
  if (recarregarUmaVez()) e.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
