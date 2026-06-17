import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'soluvia.theme'

// startViewTransition ainda não está nos tipos padrão do DOM.
type VTDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }

function detectTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(detectTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = (next: Theme) => {
    if (next === theme) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const doc = document as VTDocument
    const commit = () => {
      document.documentElement.dataset.theme = next
      setThemeState(next)
    }
    // Transição de tema suave via View Transitions API (com fallback)
    if (!reduce && typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(commit)
    } else {
      commit()
    }
  }

  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light')

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>')
  return ctx
}
