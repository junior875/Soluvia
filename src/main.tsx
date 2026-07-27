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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
