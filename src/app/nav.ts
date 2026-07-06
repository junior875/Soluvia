// Navegação interna do painel por hash: #painel/<screenId>.
export function goScreen(id: string): void {
  window.location.hash = id && id !== 'overview' ? `painel/${id}` : 'painel'
}

export function currentScreenId(): string {
  const h = window.location.hash.replace(/^#/, '')
  const seg = h.split('/')
  return seg[0] === 'painel' ? seg[1] || 'overview' : 'overview'
}
