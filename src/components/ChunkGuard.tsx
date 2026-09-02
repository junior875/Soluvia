// Rede de segurança para o DEPLOY NO MEIO DO USO. Os chunks têm hash no nome
// e o deploy apaga os antigos: uma aba aberta no index anterior explode ao
// carregar uma área sob demanda (foi o "subi um PDF para assinar e a tela
// morreu"). O main.tsx já recarrega no aviso do Vite; esta boundary é o
// cinto para o que escapar por outro caminho (worker, CSS de chunk): erro de
// carregamento recarrega UMA vez; qualquer outro erro mostra o botão de
// recarregar em vez de uma tela morta.
import { Component, type ReactNode } from 'react'

const PARECE_CHUNK = /dynamically imported module|Loading chunk|Importing a module script failed|error loading dynamically imported/i

function recarregarUmaVez(): boolean {
  const marca = Number(sessionStorage.getItem('chunk_reload_at') || 0)
  if (Date.now() - marca < 60_000) return false
  sessionStorage.setItem('chunk_reload_at', String(Date.now()))
  window.location.reload()
  return true
}

export default class ChunkGuard extends Component<{ children: ReactNode }, { quebrou: boolean }> {
  state = { quebrou: false }

  static getDerivedStateFromError() {
    return { quebrou: true }
  }

  componentDidCatch(error: Error) {
    if (PARECE_CHUNK.test(String(error?.message ?? error))) recarregarUmaVez()
  }

  render() {
    if (this.state.quebrou) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface, #0b1220)', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <p style={{ color: 'var(--heading, #fff)', fontSize: 17, fontWeight: 800, margin: '0 0 8px' }}>
              O sistema foi atualizado
            </p>
            <p style={{ color: 'var(--text-muted, #9aa4b2)', fontSize: 14, lineHeight: 1.6, margin: '0 0 18px' }}>
              Recarregue a página para continuar de onde parou.
            </p>
            <button
              onClick={() => { sessionStorage.removeItem('chunk_reload_at'); window.location.reload() }}
              style={{ background: 'var(--accent, #f59e0b)', color: '#fff', border: 'none', borderRadius: 100, padding: '12px 26px', fontWeight: 800, fontSize: 14.5, cursor: 'pointer' }}
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
