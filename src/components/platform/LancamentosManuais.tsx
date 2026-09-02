/**
 * Lançamentos manuais — o que as fontes automáticas não veem.
 *
 * A central de custos lia três fontes automáticas e nada mais; o mundo real
 * tem o resto (servidor no cartão, reembolso, consultoria avulsa). Três
 * decisões de desenho:
 *
 * · O filtro de período (presets + intervalo livre) escreve num estado só, e
 *   os TOTAIS saem do mesmo recorte da lista — total que não bate com as
 *   linhas à vista é o defeito clássico de painel financeiro.
 * · Campos personalizados existem mas ficam RECOLHIDOS atrás de "mais campos":
 *   o pedido foi CRUD completo sem poluir quem só lança o básico.
 * · Apagar apaga de verdade — e só existe aqui, no manual. O automático nunca
 *   passa por esta tela: lá o gesto é "ignorar da soma", reversível.
 */
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { api } from '../../lib/api'
import type { ApiError } from '../../lib/types'
import { Card } from '../../app/ui'

type Lanc = {
  id: string
  kind: 'entrada' | 'saida'
  amount_cents: number
  date: string
  description: string
  category: string
  custom: Record<string, string>
}
type CampoDef = { id: string; name: string }
type Totais = { entradas_cents: number; saidas_cents: number; saldo_cents: number }

const L10N = {
  pt: {
    titulo: 'Lançamentos manuais',
    sub: 'Entradas e saídas que as fontes automáticas não veem — servidor no cartão, reembolso, consultoria.',
    lancar: 'Lançar', salvar: 'Salvar', cancelar: 'Cancelar', editar: 'Editar', apagar: 'Apagar',
    confirmarApagar: 'Apagar este lançamento? Não dá para desfazer.',
    tipo: 'Tipo', entrada: 'Entrada', saida: 'Saída', valor: 'Valor (R$)', data: 'Data',
    descricao: 'Descrição', categoria: 'Categoria', maisCampos: 'Mais campos',
    gerirCampos: 'Gerenciar campos', novoCampo: 'Nome do campo novo', adicionar: 'Adicionar',
    vazio: 'Nenhum lançamento no período.', entradas: 'Entradas', saidas: 'Saídas', saldo: 'Saldo',
    preset30: '30 dias', preset90: '90 dias', presetAno: '12 meses', presetTudo: 'Tudo',
    de: 'De', ate: 'Até', valorInvalido: 'Informe um valor maior que zero.',
  },
  en: {
    titulo: 'Manual entries',
    sub: 'Money the automatic sources never see — servers on the card, refunds, one-off work.',
    lancar: 'Add entry', salvar: 'Save', cancelar: 'Cancel', editar: 'Edit', apagar: 'Delete',
    confirmarApagar: 'Delete this entry? This cannot be undone.',
    tipo: 'Type', entrada: 'Income', saida: 'Expense', valor: 'Amount (R$)', data: 'Date',
    descricao: 'Description', categoria: 'Category', maisCampos: 'More fields',
    gerirCampos: 'Manage fields', novoCampo: 'New field name', adicionar: 'Add',
    vazio: 'No entries in this period.', entradas: 'Income', saidas: 'Expenses', saldo: 'Balance',
    preset30: '30 days', preset90: '90 days', presetAno: '12 months', presetTudo: 'All',
    de: 'From', ate: 'To', valorInvalido: 'Enter an amount above zero.',
  },
  es: {
    titulo: 'Registros manuales',
    sub: 'Dinero que las fuentes automáticas no ven — servidor en la tarjeta, reembolsos, trabajos sueltos.',
    lancar: 'Registrar', salvar: 'Guardar', cancelar: 'Cancelar', editar: 'Editar', apagar: 'Eliminar',
    confirmarApagar: '¿Eliminar este registro? No se puede deshacer.',
    tipo: 'Tipo', entrada: 'Ingreso', saida: 'Egreso', valor: 'Monto (R$)', data: 'Fecha',
    descricao: 'Descripción', categoria: 'Categoría', maisCampos: 'Más campos',
    gerirCampos: 'Gestionar campos', novoCampo: 'Nombre del campo nuevo', adicionar: 'Agregar',
    vazio: 'Sin registros en el período.', entradas: 'Ingresos', saidas: 'Egresos', saldo: 'Saldo',
    preset30: '30 días', preset90: '90 días', presetAno: '12 meses', presetTudo: 'Todo',
    de: 'Desde', ate: 'Hasta', valorInvalido: 'Indica un monto mayor que cero.',
  },
} as const

const FORM_VAZIO = {
  kind: 'saida' as 'entrada' | 'saida',
  valor: '',
  date: '',
  description: '',
  category: '',
  custom: {} as Record<string, string>,
}

export default function LancamentosManuais({ lang, onToast, dinheiro }: {
  lang: string
  onToast: (m: string) => void
  dinheiro: (n: number) => string
}) {
  const tx = L10N[lang as keyof typeof L10N] ?? L10N.pt
  const [linhas, setLinhas] = useState<Lanc[]>([])
  const [campos, setCampos] = useState<CampoDef[]>([])
  const [totais, setTotais] = useState<Totais>({ entradas_cents: 0, saidas_cents: 0, saldo_cents: 0 })
  const [desde, setDesde] = useState('')
  const [ate, setAte] = useState('')
  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState({ ...FORM_VAZIO })
  const [maisCampos, setMaisCampos] = useState(false)
  const [gerindo, setGerindo] = useState(false)
  const [campoNovo, setCampoNovo] = useState('')

  const carregar = useCallback(async () => {
    try {
      const q = new URLSearchParams()
      if (desde) q.set('desde', desde)
      if (ate) q.set('ate', ate)
      const sufixo = q.toString() ? `?${q.toString()}` : ''
      const r = await api.get<{ entries: Lanc[]; fields: CampoDef[]; totals: Totais }>(
        `/platform/finance/entries${sufixo}`,
      )
      setLinhas(r.entries)
      setCampos(r.fields)
      setTotais(r.totals)
    } catch (e) {
      onToast((e as ApiError).detail ?? 'Erro ao carregar lançamentos.')
    }
  }, [desde, ate, onToast])

  useEffect(() => { void carregar() }, [carregar])

  // Presets escrevem nas MESMAS datas do intervalo livre: um estado só, sem
  // "modo preset" escondido brigando com o que os campos mostram.
  const preset = (dias: number | null) => {
    if (dias === null) { setDesde(''); setAte(''); return }
    const fim = new Date()
    const inicio = new Date(fim.getTime() - dias * 864e5)
    setDesde(inicio.toISOString().slice(0, 10))
    setAte(fim.toISOString().slice(0, 10))
  }

  const salvar = async () => {
    const cents = Math.round(parseFloat(form.valor.replace(',', '.')) * 100)
    if (!cents || cents <= 0 || Number.isNaN(cents)) { onToast(tx.valorInvalido); return }
    const corpo = {
      kind: form.kind,
      amount_cents: cents,
      date: form.date || new Date().toISOString().slice(0, 10),
      description: form.description,
      category: form.category,
      custom: form.custom,
    }
    try {
      if (editando) await api.put(`/platform/finance/entries/${editando}`, corpo)
      else await api.post('/platform/finance/entries', corpo)
      setForm({ ...FORM_VAZIO })
      setAberto(false)
      setEditando(null)
      await carregar()
    } catch (e) {
      onToast((e as ApiError).detail ?? 'Erro ao salvar.')
    }
  }

  const editar = (l: Lanc) => {
    setEditando(l.id)
    setForm({
      kind: l.kind,
      valor: (l.amount_cents / 100).toFixed(2),
      date: l.date,
      description: l.description,
      category: l.category,
      custom: { ...l.custom },
    })
    setMaisCampos(Object.keys(l.custom).length > 0)
    setAberto(true)
  }

  const apagar = async (id: string) => {
    if (!window.confirm(tx.confirmarApagar)) return
    try {
      await api.delete(`/platform/finance/entries/${id}`)
      await carregar()
    } catch (e) {
      onToast((e as ApiError).detail ?? 'Erro ao apagar.')
    }
  }

  const criarCampo = async () => {
    const nome = campoNovo.trim()
    if (!nome) return
    try {
      await api.post('/platform/finance/fields', { name: nome })
      setCampoNovo('')
      await carregar()
    } catch (e) {
      onToast((e as ApiError).detail ?? 'Erro.')
    }
  }

  const inputS: CSSProperties = {
    background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '8px 10px', color: 'var(--heading)', fontSize: 13, fontFamily: 'inherit', minWidth: 0,
  }
  const botaoFino: CSSProperties = {
    border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
    borderRadius: 100, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  }
  const rotuloS: CSSProperties = { display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-muted)' }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ color: 'var(--heading)', fontWeight: 800, fontSize: 15 }}>{tx.titulo}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 2 }}>{tx.sub}</div>
        </div>
        <button
          type="button" className="app-btn"
          style={{ ...botaoFino, background: 'var(--accent)', color: '#fff', border: 'none', padding: '8px 16px', fontSize: 13 }}
          onClick={() => { setAberto((v) => !v); setEditando(null); setForm({ ...FORM_VAZIO }) }}
        >
          {aberto ? tx.cancelar : `+ ${tx.lancar}`}
        </button>
      </div>

      {/* Filtro de período: presets + intervalo livre. */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
        <button type="button" className="app-btn" style={botaoFino} onClick={() => preset(30)}>{tx.preset30}</button>
        <button type="button" className="app-btn" style={botaoFino} onClick={() => preset(90)}>{tx.preset90}</button>
        <button type="button" className="app-btn" style={botaoFino} onClick={() => preset(365)}>{tx.presetAno}</button>
        <button type="button" className="app-btn" style={botaoFino} onClick={() => preset(null)}>{tx.presetTudo}</button>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{tx.de}</span>
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={inputS} />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{tx.ate}</span>
        <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={inputS} />
      </div>

      {/* Totais DO RECORTE — os mesmos números da lista abaixo. */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: 13 }}>
        <span style={{ color: 'var(--green,#2bb673)', fontWeight: 700 }}>
          {tx.entradas}: {dinheiro(totais.entradas_cents / 100)}
        </span>
        <span style={{ color: '#e08585', fontWeight: 700 }}>
          {tx.saidas}: {dinheiro(totais.saidas_cents / 100)}
        </span>
        <span style={{ color: 'var(--heading)', fontWeight: 800 }}>
          {tx.saldo}: {dinheiro(totais.saldo_cents / 100)}
        </span>
      </div>

      {aberto && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginTop: 12, display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
            <label style={rotuloS}>{tx.tipo}
              <select
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as 'entrada' | 'saida' }))}
                style={inputS}
              >
                <option value="entrada">{tx.entrada}</option>
                <option value="saida">{tx.saida}</option>
              </select>
            </label>
            <label style={rotuloS}>{tx.valor}
              <input inputMode="decimal" placeholder="0,00" value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} style={inputS} />
            </label>
            <label style={rotuloS}>{tx.data}
              <input type="date" value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputS} />
            </label>
            <label style={rotuloS}>{tx.categoria}
              <input value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={inputS} />
            </label>
          </div>
          <label style={rotuloS}>{tx.descricao}
            <input value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={inputS} />
          </label>

          {/* Campos personalizados: recolhidos por padrão. */}
          <div>
            <button type="button" className="app-btn" style={botaoFino} onClick={() => setMaisCampos((v) => !v)}>
              {maisCampos ? '−' : '+'} {tx.maisCampos}{campos.length ? ` (${campos.length})` : ''}
            </button>
            {maisCampos && (
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {campos.map((c) => (
                  <label key={c.id} style={rotuloS}>{c.name}
                    <input
                      value={form.custom[c.name] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, custom: { ...f.custom, [c.name]: e.target.value } }))}
                      style={inputS}
                    />
                  </label>
                ))}
                <div>
                  <button type="button" className="app-btn" style={botaoFino} onClick={() => setGerindo((v) => !v)}>
                    {tx.gerirCampos}
                  </button>
                  {gerindo && (
                    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                      {campos.map((c) => (
                        <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
                          <span style={{ flex: 1, color: 'var(--text)' }}>{c.name}</span>
                          <button
                            type="button" className="app-btn" style={{ ...botaoFino, color: '#e08585' }}
                            onClick={async () => {
                              try { await api.delete(`/platform/finance/fields/${c.id}`); await carregar() }
                              catch (e) { onToast((e as ApiError).detail ?? 'Erro.') }
                            }}
                          >
                            {tx.apagar}
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input placeholder={tx.novoCampo} value={campoNovo}
                          onChange={(e) => setCampoNovo(e.target.value)} style={{ ...inputS, flex: 1 }} />
                        <button type="button" className="app-btn" style={botaoFino} onClick={() => void criarCampo()}>
                          {tx.adicionar}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="button" className="app-btn"
              style={{ ...botaoFino, background: 'var(--accent)', color: '#fff', border: 'none', padding: '8px 18px', fontSize: 13 }}
              onClick={() => void salvar()}
            >
              {tx.salvar}
            </button>
          </div>
        </div>
      )}

      <div className="app-scroll" style={{ overflowX: 'auto', marginTop: 12 }}>
        {linhas.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{tx.vazio}</p>
        ) : (
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 12.8 }}>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{l.date}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 800, color: l.kind === 'entrada' ? 'var(--green,#2bb673)' : '#e08585', whiteSpace: 'nowrap' }}>
                    {l.kind === 'entrada' ? '+' : '−'} {dinheiro(l.amount_cents / 100)}
                  </td>
                  <td style={{ padding: '8px 10px', color: 'var(--text)' }}>
                    {l.description || '—'}
                    {l.category && (
                      <span style={{ marginLeft: 8, fontSize: 10.5, background: 'var(--surface-2)', borderRadius: 100, padding: '2px 8px', color: 'var(--text-muted)' }}>
                        {l.category}
                      </span>
                    )}
                    {Object.entries(l.custom).map(([k, v]) => (
                      <span key={k} style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--text-muted)' }}>{k}: {v}</span>
                    ))}
                  </td>
                  <td style={{ padding: '8px 6px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    <button type="button" className="app-btn" style={botaoFino} onClick={() => editar(l)}>{tx.editar}</button>{' '}
                    <button type="button" className="app-btn" style={{ ...botaoFino, color: '#e08585' }} onClick={() => void apagar(l.id)}>{tx.apagar}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}
