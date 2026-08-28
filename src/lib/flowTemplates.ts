/**
 * Modelos de fluxo prontos.
 *
 * Montar um fluxo do zero exige saber de antemão o que uma apuração precisa ter
 * — e quem abre o construtor pela primeira vez não sabe. O modelo entrega o
 * desenho pronto e deixa a parte que só a empresa sabe responder: QUEM faz cada
 * bloco. Por isso nenhum modelo traz responsável preenchido.
 *
 * Ficam em código, e não no banco: é conteúdo curado do produto (como os textos
 * das telas), não dado de cliente. Guardá-los por empresa criaria dez cópias
 * divergentes do mesmo modelo no dia em que um deles precisasse de correção.
 *
 * Os rótulos são traduzidos — aqui ficam só as CHAVES, que `t.flow.templates`
 * resolve. Sem isso o modelo em espanhol nasceria com etapas em português.
 */
import type { StageKind } from './types'

export type TemplateStage = {
  /** Chave do nome traduzido em `t.flow.templates.<id>.stages`. */
  key: string
  kind: StageKind
  /** Bloco de execução: mesmo número = acionados juntos. */
  group_index: number
  sla_days: number
}

export type FlowTemplate = {
  id: string
  /** Em qual módulo o modelo faz sentido. `both` aparece nos dois. */
  module: 'etica' | 'sac' | 'both'
  stages: TemplateStage[]
  /** O modelo prevê um encerrador (quem dá a palavra final). */
  closer: boolean
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    // O caso clássico de assédio: duas áreas olham AO MESMO TEMPO (grupo 0) e
    // só depois a diretoria decide. É o desenho que o modelo antigo de
    // "sequencial OU paralelo" não conseguia representar — e a razão de os
    // grupos existirem.
    id: 'assedio',
    module: 'etica',
    closer: true,
    stages: [
      { key: 'juridico', kind: 'investigacao', group_index: 0, sla_days: 7 },
      { key: 'rh', kind: 'avaliacao', group_index: 0, sla_days: 7 },
      { key: 'diretoria', kind: 'decisao', group_index: 1, sla_days: 5 },
    ],
  },
  {
    // Triagem por urgência antes de gastar apuração: o que é grave sobe, e o
    // resto segue o rito normal.
    id: 'triagem',
    module: 'both',
    closer: true,
    stages: [
      { key: 'prioriza', kind: 'urgencia', group_index: 0, sla_days: 2 },
      { key: 'apura', kind: 'investigacao', group_index: 1, sla_days: 10 },
    ],
  },
  {
    // SAC: o decreto dá 7 dias corridos para responder. Um bloco só, porque
    // demanda de consumidor que passa por comitê não é atendimento — é
    // processo, e vira outro fluxo.
    id: 'sacSimples',
    module: 'sac',
    closer: true,
    stages: [
      { key: 'atende', kind: 'decisao', group_index: 0, sla_days: 5 },
    ],
  },
  {
    // Apuração com prova: alguém junta o material, alguém analisa o que foi
    // juntado, alguém decide. Os três passos em sequência, porque cada um
    // depende do anterior.
    id: 'provas',
    module: 'etica',
    closer: true,
    stages: [
      { key: 'coleta', kind: 'avaliacao', group_index: 0, sla_days: 5 },
      { key: 'analisa', kind: 'investigacao', group_index: 1, sla_days: 7 },
      { key: 'decide', kind: 'decisao', group_index: 2, sla_days: 3 },
    ],
  },
]

/** Os modelos que fazem sentido para este módulo. */
export function templatesDoModulo(module: string): FlowTemplate[] {
  const m = module === 'sac' ? 'sac' : 'etica'
  return FLOW_TEMPLATES.filter((t) => t.module === 'both' || t.module === m)
}
