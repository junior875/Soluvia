// Localiza nomes de entidades SEMEADAS pelo sistema (papéis de sistema), que vêm
// do backend em português. Papéis CUSTOM (criados pelo tenant) são dados do usuário
// e passam intactos. Segue o idioma persistido em 'soluvia.lang'.
import { currentLang } from './api'

type Tr = { en: string; es: string }

const SYSTEM_ROLES: Record<string, Tr> = {
  'Admin da empresa': { en: 'Company Admin', es: 'Admin de la empresa' },
  Gestor: { en: 'Manager', es: 'Gestor' },
  'RH / Compliance': { en: 'HR / Compliance', es: 'RR. HH. / Compliance' },
  DPO: { en: 'DPO', es: 'DPO' },
  'Em branco': { en: 'Blank', es: 'En blanco' },
}

/** Traduz o nome de um papel de SISTEMA; papéis custom voltam iguais. */
export function localizeRole(name: string | null | undefined): string {
  const n = name ?? ''
  const lang = currentLang()
  if (lang === 'pt' || lang === 'pt-BR') return n
  const tr = SYSTEM_ROLES[n]
  return tr ? tr[lang as 'en' | 'es'] ?? n : n
}
