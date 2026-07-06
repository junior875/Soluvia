// Monta a área autenticada (#painel): CapabilityProvider faz o boot e gateia os
// estados; o Shell renderiza a sidebar por papel + a tela ativa.
import { useEffect, useState } from 'react'
import { CapabilityProvider } from '../app/capabilities'
import Shell from '../app/Shell'

export default function Panel() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const sync = () => setOpen(window.location.hash.toLowerCase().startsWith('#painel'))
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  if (!open) return null
  return (
    <CapabilityProvider>
      <Shell />
    </CapabilityProvider>
  )
}
