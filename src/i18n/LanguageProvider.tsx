import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { translations, type Dict, type Lang } from './translations'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  /** Resolve uma chave em ponto (ex.: 'hero.subtitle'). Cai para PT, depois para a própria chave. */
  t: (path: string) => string
  /** Dicionário do idioma atual — use para arrays (ex.: dict.faq.items). */
  dict: Dict
}

const LanguageContext = createContext<LanguageContextValue | null>(null)
const STORAGE_KEY = 'soluvia.lang'

function resolve(obj: Dict, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'pt'
  const code = (navigator.language || 'pt').slice(0, 2).toLowerCase()
  return code === 'en' || code === 'es' ? (code as Lang) : 'pt'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
    return stored ?? detectLang()
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang
  }, [lang])

  const dict = translations[lang]

  const t = (path: string): string => {
    const value = resolve(dict, path)
    if (typeof value === 'string') return value
    const fallback = resolve(translations.pt, path)
    return typeof fallback === 'string' ? fallback : path
  }

  return <LanguageContext.Provider value={{ lang, setLang, t, dict }}>{children}</LanguageContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation precisa estar dentro de <LanguageProvider>')
  return ctx
}
