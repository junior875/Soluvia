// Qual permissão significa cada AÇÃO em cada módulo.
//
// Telas como Casos servem mais de um módulo (denúncia e SAC) com o mesmo
// componente, então o gating não pode ser `can('etica.triage')` fixo — senão o
// atendente de SAC abre a demanda dele e não vê botão nenhum.
//
// A ação de LEITURA não tem nome único entre os módulos (ética lê `view_cases`,
// SAC lê `view_demands`), então ninguém pode montar `${módulo}.view` no braço.
// Espelho de backend/app/seeds/permission_catalog.py::MODULE_READ_ACTION — se
// mudar lá, muda aqui.
const READ_ACTION: Record<string, string> = {
  etica: 'view_cases',
  sac: 'view_demands',
  privacidade: 'view_requests',
  incidentes: 'view',
}

/** O código de permissão de `action` no `module` — ex.: ('sac','view') → 'sac.view_demands'. */
export function modPerm(module: string, action: string): string {
  if (action === 'view') return `${module}.${READ_ACTION[module] ?? 'view'}`
  return `${module}.${action}`
}
