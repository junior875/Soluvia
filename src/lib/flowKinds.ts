/**
 * Os quatro tipos de bloco do fluxo, e o que cada um significa na tela.
 *
 * Uma fonte só para os três lugares que precisam disso: o construtor (escolher
 * o tipo), o canvas (desenhar o bloco) e "Meus atendimentos" (abrir o modal
 * certo). Antes o mesmo mapa vivia espalhado, e um tipo novo exigia lembrar de
 * três arquivos — o que é a forma clássica de a cor bater e o ícone não.
 *
 * O rótulo NÃO mora aqui: ele é traduzido, e vem de `t.flow.kinds`.
 */
import type { IconName } from '../app/icons'
import type { ParecerConfig, StageKind } from './types'

export type KindVisual = {
  icon: IconName
  /** Cor da borda/ícone do bloco no canvas. */
  cor: string
}

export const KIND_VISUAL: Record<StageKind, KindVisual> = {
  // Decidir: o carimbo. Verde porque é o que fecha.
  decisao: { icon: 'check', cor: '#16a34a' },
  // Priorizar: o alerta. Âmbar, que é como urgência se lê em qualquer lugar.
  urgencia: { icon: 'bell', cor: '#d97706' },
  // Avaliar: trazer material. Azul, a cor de anexo do resto do sistema.
  avaliacao: { icon: 'download', cor: '#2563eb' },
  // Investigar: olhar o que já veio. Roxo, para não se confundir com avaliar.
  investigacao: { icon: 'eye', cor: '#7c3aed' },
}

/** Tipos em que o parecer aceita anexo — espelha `KINDS_COM_ANEXO` do servidor. */
export function aceitaAnexo(kind: StageKind | undefined): boolean {
  return kind === 'avaliacao' || kind === 'investigacao'
}

/**
 * Traduz o `parecer_config` antigo para o tipo equivalente.
 *
 * Mesma regra do servidor (`app.models.flow.kind_do_config`). Existe aqui
 * porque um fluxo salvo antes dos tipos chega sem `kind`, e o construtor
 * precisa mostrar ALGUMA coisa selecionada — mostrar "decisão" para uma etapa
 * que pedia urgência faria a pessoa salvar por cima sem perceber a troca.
 */
export function kindDoConfig(cfg: ParecerConfig | undefined): StageKind {
  if (cfg?.rating) return 'avaliacao'
  if (cfg?.urgency) return 'urgencia'
  return 'decisao'
}
