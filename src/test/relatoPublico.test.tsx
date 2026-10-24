// Item 18 — o formulário público pergunta PRIMEIRO como a pessoa quer relatar.
//
// Essa escolha decide quais perguntas existem: marcar "Anônimo" faz sumirem os
// campos que identificam quem relata. Quando o bloco ficava no fim, a pessoa
// digitava nome, telefone e e-mail e via tudo isso desaparecer depois — ou
// pior, digitava dados que o canal prometeu não guardar.
//
// E o vocabulário: no SAC quem escreve é CONSUMIDOR e o que ele abre é uma
// DEMANDA. Perguntar "Como você quer relatar?" a quem veio reclamar de um
// produto — num canal que exige identificação, onde escolha nem existe — é
// falar com a pessoa errada.
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import PublicReport from '../components/PublicReport'
import { renderPublico, respostaJson, vemAntes } from './telaPublica'

const TIPOS = { extensions: ['png'], groups: { image: ['png'] }, max_bytes: 10_000_000, max_files: 5 }

function campo(key: string, label: string) {
  return { key, type: 'long_text', label, help: '', required: false, options: [] as string[], sensitive: false }
}

const CANAL_ETICA = {
  tenant_slug: 'acme', tenant_name: 'Acme', channel_name: 'Canal de Ética', module: 'etica',
  title: 'Relatar uma situação', intro: '', identification: 'optional',
  fields: [campo('o_que', 'O que aconteceu?'), campo('quando', 'Quando aconteceu?')],
  published: true,
}

const CANAL_SAC = {
  ...CANAL_ETICA, module: 'sac', channel_name: 'SAC', identification: 'required',
  title: 'Abrir uma demanda',
  fields: [campo('descricao', 'Descreva sua demanda')],
}

function servir(form: unknown) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('accepted-types')) return respostaJson(TIPOS)
    return respostaJson(form)
  }))
}

async function abrirCanal(form: unknown) {
  history.replaceState(null, '', '/c/acme/tok123')
  servir(form)
  renderPublico(<PublicReport />)
  return screen.findByRole('heading', { name: (form as { title: string }).title })
}

describe('formulário público de relato', () => {
  it('pergunta como a pessoa quer relatar ANTES das perguntas do formulário', async () => {
    await abrirCanal(CANAL_ETICA)

    const escolha = screen.getByText('Como você quer relatar?')
    const anonimo = screen.getByText('Anônimo')
    const primeiraPergunta = screen.getByText('O que aconteceu?')

    expect(vemAntes(escolha, primeiraPergunta)).toBe(true)
    expect(vemAntes(anonimo, primeiraPergunta)).toBe(true)
  })

  it('no SAC, chama o bloco pelo que ele é: dados de contato', async () => {
    await abrirCanal(CANAL_SAC)

    expect(screen.getByText('Seus dados de contato')).toBeInTheDocument()
    // Nada de vocabulário de denúncia para quem veio ao atendimento ao
    // consumidor — e nem faria sentido: o SAC exige identificação.
    expect(screen.queryByText('Como você quer relatar?')).not.toBeInTheDocument()
    expect(screen.queryByText('Anônimo')).not.toBeInTheDocument()

    expect(vemAntes(screen.getByText('Seus dados de contato'), screen.getByText('Descreva sua demanda'))).toBe(true)
  })
})
