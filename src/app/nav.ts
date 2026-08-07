// Navegação interna do painel por hash: #painel/<screenId>.
export function goScreen(id: string): void {
  window.location.hash = id && id !== 'overview' ? `painel/${id}` : 'painel'
}

export function currentScreenId(): string {
  const h = window.location.hash.replace(/^#/, '')
  const seg = h.split('/')
  // A query depois do id não faz parte do nome da tela. Os e-mails de cobrança
  // de parecer apontam para `#painel/cases?protocolo=ABC123`; sem tirar o
  // `?...` aqui, o id lido vira "cases?protocolo=ABC123", não casa com tela
  // nenhuma e o link cai no painel inicial — o destinatário clica no botão
  // "abrir e dar meu parecer" e chega em qualquer lugar menos no caso.
  const id = (seg[1] || '').split('?')[0]
  return seg[0] === 'painel' ? id || 'overview' : 'overview'
}
