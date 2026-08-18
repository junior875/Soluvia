/**
 * Aba PESSOAS do console de suporte.
 *
 * O console inteiro girava em torno de EMPRESA, mas um chamado começa com uma
 * pessoa: "não consigo entrar", "não recebi o código". Sem busca por e-mail,
 * atender exigia abrir empresa por empresa procurando.
 *
 * Duas decisões de conduta, porque quem opera aqui mexe em conta de cliente:
 *
 * 1. **A busca não dispara sozinha a cada tecla.** Ela precisa de 2 caracteres e
 *    de uma pausa. Consultar a base inteira de usuários a cada letra digitada é
 *    barulho no servidor e no log de auditoria de quem lê depois.
 * 2. **As ações destrutivas pedem confirmação no próprio lugar**, sem modal —
 *    o botão vira "Confirmar?" e volta sozinho em 4 segundos. Modal para tudo
 *    treina a pessoa a clicar em OK sem ler.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { api } from '../../lib/api'
import type { ApiError } from '../../lib/types'

export type PlatformUserMembership = {
  membership_id: string
  tenant_id: string
  tenant_name: string
  status: string
}

export type PlatformUser = {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  email_verified: boolean
  is_platform_admin: boolean
  has_password: boolean
  created_at: string
  memberships: PlatformUserMembership[]
}

export type UsersTextos = {
  searchPh: string
  hint: string
  none: string
  searching: string
  noCompany: string
  verifyEmail: string
  verified: string
  resetPassword: string
  newPassword: string
  deactivate: string
  activate: string
  inactive: string
  suspendLink: string
  reactivateLink: string
  removeLink: string
  confirm: string
  done: string
  platformAdmin: string
}

const ESTADO: Record<string, { rotulo: string; cor: string }> = {
  active: { rotulo: 'ativo', cor: 'var(--green,#2bb673)' },
  invited: { rotulo: 'convidado', cor: 'var(--accent)' },
  suspended: { rotulo: 'suspenso', cor: '#e08585' },
}

export default function PlatformUsers({
  textos,
  onToast,
  card,
}: {
  textos: UsersTextos
  onToast: (msg: string) => void
  card: CSSProperties
}) {
  const [termo, setTermo] = useState('')
  const [lista, setLista] = useState<PlatformUser[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [senhaDe, setSenhaDe] = useState<string | null>(null)
  const [senha, setSenha] = useState('')
  const timer = useRef<number | undefined>(undefined)

  // Busca com pausa: sem isto, cada tecla varreria a base inteira de usuários.
  useEffect(() => {
    window.clearTimeout(timer.current)
    if (termo.trim().length < 2) { setLista(null); return }
    timer.current = window.setTimeout(() => {
      setBuscando(true)
      api
        .get<PlatformUser[]>(`/platform/users?q=${encodeURIComponent(termo.trim())}`)
        .then(setLista)
        .catch((e) => onToast((e as ApiError).detail ?? 'Erro'))
        .finally(() => setBuscando(false))
    }, 400)
    return () => window.clearTimeout(timer.current)
  }, [termo, onToast])

  async function agir(chave: string, fn: () => Promise<unknown>, msg: string) {
    setOcupado(chave)
    try {
      await fn()
      onToast(msg)
      // Recarrega para a tela refletir o que acabou de mudar — o suporte
      // costuma encadear duas ações na mesma pessoa.
      const r = await api.get<PlatformUser[]>(`/platform/users?q=${encodeURIComponent(termo.trim())}`)
      setLista(r)
    } catch (e) {
      onToast((e as ApiError).detail ?? 'Erro')
    } finally {
      setOcupado(null)
      setConfirmando(null)
    }
  }

  /** Botão que exige um segundo clique. Volta sozinho: um "Confirmar?" esquecido
   *  na tela é um clique acidental esperando acontecer. */
  function confirmar(chave: string, aoConfirmar: () => void) {
    if (confirmando === chave) { aoConfirmar(); return }
    setConfirmando(chave)
    window.setTimeout(() => setConfirmando((c) => (c === chave ? null : c)), 4000)
  }

  const botao: CSSProperties = {
    background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 100, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  }
  const perigo: CSSProperties = { ...botao, color: '#e08585', borderColor: 'rgba(224,133,133,.4)' }

  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder={textos.searchPh}
          autoFocus
          style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--heading)', fontSize: 14.5, boxSizing: 'border-box' }}
        />
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: '8px 2px 0' }}>{textos.hint}</p>
      </div>

      {buscando && <div style={{ padding: 18, color: 'var(--text-muted)', fontSize: 13.5 }}>{textos.searching}</div>}
      {!buscando && lista?.length === 0 && (
        <div style={{ padding: 18, color: 'var(--text-muted)', fontSize: 13.5 }}>{textos.none}</div>
      )}

      {lista?.map((u) => (
        <div key={u.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 14.5 }}>
                {u.full_name || u.email}
                {u.is_platform_admin && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {textos.platformAdmin}
                  </span>
                )}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{u.email}</div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {!u.is_active && (
                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#e08585', textTransform: 'uppercase' }}>
                  {textos.inactive}
                </span>
              )}
              {u.email_verified ? (
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>✓ {textos.verified}</span>
              ) : (
                <button
                  style={botao}
                  disabled={ocupado === u.id}
                  onClick={() => void agir(u.id, () => api.post(`/platform/users/${u.id}/verify-email`, {}), textos.done)}
                >
                  {textos.verifyEmail}
                </button>
              )}
              <button style={botao} onClick={() => { setSenhaDe(senhaDe === u.id ? null : u.id); setSenha('') }}>
                {textos.resetPassword}
              </button>
              {!u.is_platform_admin && (
                <button
                  style={u.is_active ? perigo : botao}
                  disabled={ocupado === u.id}
                  onClick={() =>
                    confirmar(`ativo:${u.id}`, () =>
                      void agir(u.id, () => api.post(`/platform/users/${u.id}/active`, { active: !u.is_active }), textos.done),
                    )
                  }
                >
                  {confirmando === `ativo:${u.id}` ? textos.confirm : u.is_active ? textos.deactivate : textos.activate}
                </button>
              )}
            </div>
          </div>

          {senhaDe === u.id && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={textos.newPassword}
                style={{ flex: '1 1 220px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--heading)', fontSize: 13.5 }}
              />
              <button
                style={{ ...botao, background: 'var(--accent)', color: '#fff', borderColor: 'transparent' }}
                disabled={senha.length < 8 || ocupado === u.id}
                onClick={() =>
                  void agir(u.id, () => api.post(`/platform/users/${u.id}/password`, { new_password: senha }), textos.done)
                    .then(() => { setSenhaDe(null); setSenha('') })
                }
              >
                {textos.resetPassword}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {u.memberships.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{textos.noCompany}</div>
            ) : (
              u.memberships.map((m) => {
                const est = ESTADO[m.status] ?? { rotulo: m.status, cor: 'var(--text-muted)' }
                return (
                  <div key={m.membership_id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', borderRadius: 10, padding: '8px 11px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--heading)', fontWeight: 600, fontSize: 13 }}>{m.tenant_name}</span>
                    <span style={{ color: est.cor, fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase' }}>{est.rotulo}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      {m.status !== 'invited' && (
                        <button
                          style={botao}
                          disabled={ocupado === m.membership_id}
                          onClick={() =>
                            void agir(
                              m.membership_id,
                              () => api.post(`/platform/memberships/${m.membership_id}/status`, {
                                status: m.status === 'suspended' ? 'active' : 'suspended',
                              }),
                              textos.done,
                            )
                          }
                        >
                          {m.status === 'suspended' ? textos.reactivateLink : textos.suspendLink}
                        </button>
                      )}
                      <button
                        style={perigo}
                        disabled={ocupado === m.membership_id}
                        onClick={() =>
                          confirmar(`rm:${m.membership_id}`, () =>
                            void agir(m.membership_id, () => api.delete(`/platform/memberships/${m.membership_id}`), textos.done),
                          )
                        }
                      >
                        {confirmando === `rm:${m.membership_id}` ? textos.confirm : textos.removeLink}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
