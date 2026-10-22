// Quais campos do formulário identificam QUEM RELATA.
//
// Espelha `backend/app/services/anonimato.py`. A decisão que vale é a do
// servidor — ele descarta esses campos na gravação de um relato anônimo,
// aconteça o que acontecer no navegador. Aqui a regra existe para a tela não
// PEDIR o que será jogado fora: mostrar "Seu nome" a quem escolheu anonimato
// é, ao mesmo tempo, uma promessa quebrada e um convite a digitar o que não
// devia.
//
// Mantenha os dois lados em sincronia ao mexer nas listas.

/** Identifica quem relata (casa por palavra inteira ou prefixo). */
const IDENTIFICA =
  /(?:^|\b)(nome|sobrenome|apelido|e-?mail|email|correio|telefone|celular|whatsapp|whats|contato|fone|cpf|rg|documento|identidade|matricula|matrícula|endereco|endereço|cep|cargo|setor|departamento|lotacao|lotação|linkedin|instagram|rede social)(?:$|\b)/i

/** Descreve o FATO, não quem o enviou — prefixos, sem fronteira no fim. */
const DO_FATO =
  /\b(produto|servi[çc]o|empresa|fornecedor|loja|marca|envolvid|acusad|denunciad|testemunh|respons[áa]ve|gestor|chefe|suspeit|agressor|v[íi]tima)/i

export function campoIdentifica(rotulo: string, chave: string): boolean {
  const texto = `${rotulo} ${chave}`
  if (DO_FATO.test(texto)) return false
  return IDENTIFICA.test(texto)
}
