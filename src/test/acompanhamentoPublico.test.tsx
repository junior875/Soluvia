// Item 10 — o "×" do acompanhamento público fecha DE VERDADE.
//
// O defeito original: o "×" limpava o endereço (tirava o `#acompanhar`) mas o
// overlay continuava cobrindo a página inteira. Quem clicava no "×" ficava
// preso numa tela que, pela URL, já não existia — só o F5 tirava.
//
// E o defeito gêmeo, pior: fechar com um caso aberto não zerava o estado, de
// modo que reabrir `#acompanhar` na mesma aba (colando o endereço, sem
// recarregar) mostrava o relato do anterior a quem não digitou protocolo nem
// código. Tela pública, anônima, usada em computador compartilhado.
//
// Os testes falam do que a PESSOA vê — texto na tela e endereço no navegador —
// para continuarem valendo depois de qualquer reescrita honesta da tela.
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import PublicTracker from '../components/PublicTracker'
import { renderPublico, respostaJson } from './telaPublica'

const RELATO_DO_ANTERIOR = 'Confidencial: o relato de quem usou antes'

const CASO = {
  protocol: 'DG-7K3F-9QX2',
  status: 'triage',
  title: 'Assédio no setor de cargas',
  created_at: '2026-10-20T12:00:00Z',
  module: 'etica',
  events: [
    { type: 'created', content: RELATO_DO_ANTERIOR, created_at: '2026-10-20T12:00:00Z', from_reporter: true },
  ],
}

function abrirAcompanhamento() {
  window.location.hash = '#acompanhar'
  renderPublico(<PublicTracker />)
}

function fecharNoX() {
  fireEvent.click(screen.getByRole('button', { name: '×' }))
}

/** Reabre a tela como quem cola de novo o endereço, sem recarregar a aba. */
function reabrirPeloEndereco() {
  act(() => {
    window.location.hash = '#acompanhar'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

async function consultarUmCaso() {
  vi.stubGlobal('fetch', vi.fn(async () => respostaJson(CASO)))
  fireEvent.change(screen.getByPlaceholderText('DG-XXXX-XXXX'), { target: { value: 'DG-7K3F-9QX2' } })
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'codigo-secreto' } })
  fireEvent.click(screen.getByRole('button', { name: 'Acompanhar' }))
  await screen.findByText(CASO.title)
}

describe('acompanhamento público — fechar no "×"', () => {
  it('tira a tela da frente da pessoa, e não só da URL', async () => {
    abrirAcompanhamento()
    expect(screen.getByRole('heading', { name: 'Acompanhar protocolo' })).toBeInTheDocument()

    fecharNoX()

    // O que a pessoa vê: a tela saiu NA HORA do clique.
    //
    // A verificação é feita sem esperar de propósito. O defeito antigo era
    // justamente depender de um aviso do navegador que nunca chegava: o
    // endereço era reescrito por um caminho que não dispara `hashchange`, e o
    // overlay ficava. Esperar aqui mascararia isso — o jsdom é mais generoso
    // que o navegador de verdade e acaba mandando o aviso mesmo assim.
    expect(screen.queryByRole('heading', { name: 'Acompanhar protocolo' })).not.toBeInTheDocument()
    // E o endereço acompanha: não sobra `#acompanhar` para reabrir sozinho.
    expect(window.location.hash).toBe('')
  })

  it('não devolve o caso do anterior a quem reabre a tela na mesma aba', async () => {
    abrirAcompanhamento()
    await consultarUmCaso()
    expect(screen.getByText(RELATO_DO_ANTERIOR)).toBeInTheDocument()

    fecharNoX()
    expect(screen.queryByText(RELATO_DO_ANTERIOR)).not.toBeInTheDocument()
    reabrirPeloEndereco()

    // Reabriu na tela de busca, em branco — não no caso de quem passou antes.
    expect(await screen.findByRole('heading', { name: 'Acompanhar protocolo' })).toBeInTheDocument()
    expect(screen.queryByText(RELATO_DO_ANTERIOR)).not.toBeInTheDocument()
    expect(screen.queryByText(CASO.title)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('DG-XXXX-XXXX')).toHaveValue('')
    expect(screen.getByPlaceholderText('••••••••')).toHaveValue('')
  })

  it('ignora a resposta que chega depois do fechamento', async () => {
    abrirAcompanhamento()

    // Conexão lenta: a busca só responde DEPOIS de a pessoa ter fechado.
    let responder: (() => void) | null = null
    const espera = new Promise<void>((r) => { responder = r })
    vi.stubGlobal('fetch', vi.fn(async () => { await espera; return respostaJson(CASO) }))

    fireEvent.change(screen.getByPlaceholderText('DG-XXXX-XXXX'), { target: { value: 'DG-7K3F-9QX2' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'codigo-secreto' } })
    fireEvent.click(screen.getByRole('button', { name: 'Acompanhar' }))

    fecharNoX()
    expect(screen.queryByRole('heading', { name: 'Acompanhar protocolo' })).not.toBeInTheDocument()
    await act(async () => { responder?.(); await espera })

    reabrirPeloEndereco()
    expect(await screen.findByRole('heading', { name: 'Acompanhar protocolo' })).toBeInTheDocument()
    expect(screen.queryByText(RELATO_DO_ANTERIOR)).not.toBeInTheDocument()
  })
})
