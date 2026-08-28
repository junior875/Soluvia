/**
 * Dependências entre permissões — espelho de
 * backend/app/seeds/permission_catalog.py (PERMISSION_DEPENDENCIES).
 *
 * A regra é uma só: AGIR exige LER. "Responder" sem "Ver casos" seria uma
 * permissão que não abre tela nenhuma e não passa em rota nenhuma — um papel
 * nascido num beco sem saída. O servidor fecha o conjunto de qualquer jeito
 * (a garantia é dele); aqui o Role Builder mostra a regra ACONTECENDO, para a
 * pessoa entender em vez de estranhar permissões que "apareceram sozinhas".
 */
export const PERM_DEPS: Record<string, string[]> = {
  'etica.respond': ['etica.view_cases'],
  'etica.triage': ['etica.view_cases'],
  'etica.annotate': ['etica.view_cases'],
  'etica.assign': ['etica.view_cases'],
  'etica.close': ['etica.view_cases'],
  'etica.view_evidence': ['etica.view_cases'],
  'etica.download_evidence': ['etica.view_evidence'],
  'sac.respond': ['sac.view_demands'],
  'sac.triage': ['sac.view_demands'],
  'sac.annotate': ['sac.view_demands'],
  'sac.assign': ['sac.view_demands'],
  'sac.close': ['sac.view_demands'],
  'sac.view_evidence': ['sac.view_demands'],
  'sac.download_evidence': ['sac.view_evidence'],
  'privacidade.respond_lgpd': ['privacidade.view_requests'],
  'privacidade.delete_data': ['privacidade.view_requests'],
  'privacidade.export_data': ['privacidade.view_requests'],
  'incidentes.manage': ['incidentes.view'],
  'incidentes.notify_anpd': ['incidentes.view'],
  'nr1.view_individual': ['nr1.view_aggregated'],
  'nr1.export': ['nr1.view_aggregated'],
  'nr1.config_cycles': ['nr1.view_aggregated'],
  'assinatura.sign': ['assinatura.view'],
  'assinatura.manage': ['assinatura.view'],
}

/** Quem DEPENDE de `code` (o inverso do mapa). */
const dependentesDe = (code: string): string[] =>
  Object.entries(PERM_DEPS).filter(([, deps]) => deps.includes(code)).map(([c]) => c)

/**
 * Liga `code` num conjunto: entra ele + as dependências (transitivo).
 * Devolve também o que entrou de carona, para a tela avisar.
 */
export function ligarComDeps(atual: Set<string>, code: string): { proximo: Set<string>; carona: string[] } {
  const proximo = new Set(atual)
  const carona: string[] = []
  const fila = [code]
  while (fila.length) {
    const c = fila.pop()!
    if (!proximo.has(c)) {
      proximo.add(c)
      if (c !== code) carona.push(c)
    }
    for (const dep of PERM_DEPS[c] ?? []) if (!proximo.has(dep)) fila.push(dep)
  }
  return { proximo, carona }
}

/**
 * Desliga `code`: sai ele + tudo que dependia dele (transitivo).
 * Tirar "Ver casos" e deixar "Responder" ligado recriaria o beco por outro
 * caminho — o desligamento carrega os dependentes junto, visivelmente.
 */
export function desligarComDependentes(atual: Set<string>, code: string): { proximo: Set<string>; carona: string[] } {
  const proximo = new Set(atual)
  const carona: string[] = []
  const fila = [code]
  while (fila.length) {
    const c = fila.pop()!
    if (proximo.has(c)) {
      proximo.delete(c)
      if (c !== code) carona.push(c)
    }
    for (const dep of dependentesDe(c)) if (proximo.has(dep)) fila.push(dep)
  }
  return { proximo, carona }
}
