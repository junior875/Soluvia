import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
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
