/**
 * O manual dentro do sistema, para quem trabalha numa empresa.
 *
 * Três decisões sustentam a tela:
 *
 * 1. **O filtro é o mesmo da navegação.** `evaluate(requires, caps)` decide
 *    tanto o menu quanto os capítulos daqui. Documentar uma tela que a pessoa
 *    não pode abrir ensina um caminho que termina em "sem permissão".
 * 2. **Cada capítulo leva à tela de verdade.** `goScreen()` é o mesmo destino
 *    dos e-mails; o manual não é um museu de prints, é um atalho.
 * 3. **Ganhar acesso é notícia.** Marcar uma permissão nova para alguém faz o
 *    manual dessa pessoa crescer — e ela precisa saber disso, senão o capítulo
 *    novo fica esperando ser descoberto por acaso.
 *
 * O desenho em si mora em `manual/ManualView`, compartilhado com o console da
 * plataforma.
 */
import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import { Button, PageHeader } from '../ui'
import { Icon } from '../icons'
import { useCaps } from '../capabilities'
import { CAPITULOS } from '../manual/conteudo'
import { ManualView } from '../manual/ManualView'
import { useT } from '../strings'

export default function Manual() {
  const caps = useCaps()
  const t = useT()
  const tm = t.manual
  const [sumarioAberto, setSumarioAberto] = useState(true)

  // Congelado na montagem: dar baixa no servidor zera `caps.manualNovas`, e sem
  // esta cópia o aviso sumiria no mesmo instante em que apareceu.
  const [novidade] = useState<string[]>(() => caps?.manualNovas ?? [])
  const [avisoAberto, setAvisoAberto] = useState(true)
  const deuBaixa = useRef(false)

  // Abrir o manual É a leitura do aviso: o número na nav cai aqui, e não num
  // botão separado que a pessoa teria de lembrar de clicar.
  useEffect(() => {
    if (!novidade.length || deuBaixa.current) return
    deuBaixa.current = true
    void (async () => {
      try {
        await api.post('/manual/seen', {})
        await caps.reload()
      } catch { /* o aviso volta no próximo bootstrap; nada se perde */ }
    })()
  }, [novidade.length, caps])

  return (
    <div className="app-screen">
      <PageHeader
        title={tm.title}
        subtitle={tm.subtitle}
        action={
          <Button variant="ghost" leftIcon="menu" onClick={() => setSumarioAberto((v) => !v)}>
            {sumarioAberto ? tm.hideToc : tm.showToc}
          </Button>
        }
      />

      <ManualView
        capitulos={CAPITULOS}
        gate={caps}
        rotulos={tm}
        aberto={sumarioAberto}
        onAberto={setSumarioAberto}
        topo={novidade.length > 0 && avisoAberto ? (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
            border: '1px solid var(--accent)', background: 'var(--accent-soft)',
            borderRadius: 14, padding: '13px 16px', marginBottom: 16,
          }}>
            <span style={{ color: 'var(--accent)', display: 'flex', flexShrink: 0, marginTop: 2 }}>
              <Icon name="spark" size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 13.5 }}>{tm.newTitle}</div>
              <div style={{ color: 'var(--text)', fontSize: 12.8, marginTop: 2 }}>
                {tm.newBody(novidade.length)}
              </div>
            </div>
            <Button variant="ghost" onClick={() => setAvisoAberto(false)}>{tm.gotIt}</Button>
          </div>
        ) : undefined}
      />
    </div>
  )
}
