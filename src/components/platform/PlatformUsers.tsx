/**
 * Aba PESSOAS do console de suporte.
 *
 * Um chamado começa com uma pessoa — "não consigo entrar", "não recebi o
 * código" — e o console só sabia falar de empresa. Aqui se acha alguém pelo
 * e-mail em toda a plataforma e se resolve a conta dela.
 *
 * **Usa o mesmo kit do painel** (`Card`, `Button`, `Chip`, `Field`, `Input`,
 * `Avatar`, `EmptyState`, `Skeleton`). A primeira versão era estilo inline
 * escrito à mão e por isso parecia outro produto: os botões tinham outro raio,
 * os cartões outra sombra e os espaçamentos outra régua. Reusar o kit é o que
 * faz a tela pertencer ao sistema — e faz o tema claro funcionar, porque as
 * cores param de ser cravadas aqui.
 *
 * Duas decisões de conduta, porque quem opera mexe em conta de cliente:
 *
 * 1. A busca não dispara a cada tecla — espera uma pausa. Sem termo, mostra os
 *    mais recentes: tela em branco ao abrir parece defeito, não "vazio".
 * 2. Ação destrutiva confirma no próprio botão, que volta sozinho em 4s. Modal
 *    para tudo treina a pessoa a clicar em OK sem ler; e um "Confirmar?"
 *    esquecido na tela é um clique acidental esperando acontecer.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import type { ApiError } from '../../lib/types'
import { Avatar, Button, Card, Chip, EmptyState, Field, Input, Select, Skeleton } from '../../app/ui'

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
  noneBody: string
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
  newUser: string
  company: string
  name: string
  email: string
  create: string
  cancel: string
  created: string
}

/** Tom do Chip por estado do vínculo — os mesmos tons que o painel usa. */
const TOM: Record<string, 'green' | 'accent' | 'muted'> = {
  active: 'green',
  invited: 'accent',
  suspended: 'muted',
}

export default function PlatformUsers({
  textos,
  onToast,
  empresas,
}: {
  textos: UsersTextos
  onToast: (msg: string) => void
  /** Para o seletor de empresa: pessoa sem vínculo não entra em lugar nenhum. */
  empresas: { id: string; name: string }[]
}) {
  const [termo, setTermo] = useState('')
  const [lista, setLista] = useState<PlatformUser[] | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [senhaDe, setSenhaDe] = useState<string | null>(null)
  const [senha, setSenha] = useState('')
  const vazio = { tenant_id: '', full_name: '', email: '', password: '' }
  const [novo, setNovo] = useState(vazio)
  const [criando, setCriando] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  const buscar = useCallback(
    (q: string) =>
      api
        .get<PlatformUser[]>(`/platform/users?q=${encodeURIComponent(q)}`)
        .then(setLista)
        .catch((e) => onToast((e as ApiError).detail ?? 'Erro')),
    [onToast],
  )

  // Pausa antes de consultar: a cada tecla varreria a base inteira, e isso é
  // barulho no servidor e no log de quem lê a auditoria depois.
  useEffect(() => {
    window.clearTimeout(timer.current)
    const q = termo.trim()
    if (q.length === 1) return
    setLista(null)
    timer.current = window.setTimeout(() => void buscar(q), q ? 400 : 0)
    return () => window.clearTimeout(timer.current)
  }, [termo, buscar])

  async function agir(chave: string, fn: () => Promise<unknown>) {
    setOcupado(chave)
    try {
      await fn()
      onToast(textos.done)
      await buscar(termo.trim())
    } catch (e) {
      onToast((e as ApiError).detail ?? 'Erro')
    } finally {
      setOcupado(null)
      setConfirmando(null)
    }
  }

  async function criarPessoa() {
    setOcupado('novo')
    try {
      await api.post(`/platform/tenants/${novo.tenant_id}/members`, {
        full_name: novo.full_name.trim() || novo.email.trim(),
        email: novo.email.trim(),
        password: novo.password,
        role_id: null,
      })
      onToast(textos.created)
      setNovo(vazio)
      setCriando(false)
      setTermo('')
      await buscar('')
    } catch (e) {
      onToast((e as ApiError).detail ?? 'Erro')
    } finally {
      setOcupado(null)
    }
  }

  /** Exige um segundo clique, e volta sozinho. */
  function confirmar(chave: string, aoConfirmar: () => void) {
    if (confirmando === chave) { aoConfirmar(); return }
    setConfirmando(chave)
    window.setTimeout(() => setConfirmando((c) => (c === chave ? null : c)), 4000)
  }

  const podeCriar = !!novo.tenant_id && !!novo.email.trim() && novo.password.length >= 8

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Card>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px' }}>
            <Field label={textos.searchPh}>
              <Input value={termo} onChange={(e) => setTermo(e.target.value)} autoFocus />
            </Field>
          </div>
          <Button
            variant={criando ? 'ghost' : 'primary'}
            leftIcon={criando ? undefined : 'plus'}
            onClick={() => setCriando((v) => !v)}
          >
            {criando ? textos.cancel : textos.newUser}
          </Button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 10 }}>{textos.hint}</p>

        {criando && (
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, alignItems: 'end' }}>
            <Field label={textos.company}>
              <Select value={novo.tenant_id} onChange={(e) => setNovo({ ...novo, tenant_id: e.target.value })}>
                <option value="">—</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </Field>
            <Field label={textos.name}>
              <Input value={novo.full_name} onChange={(e) => setNovo({ ...novo, full_name: e.target.value })} />
            </Field>
            <Field label={textos.email}>
              <Input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
            </Field>
            <Field label={textos.newPassword}>
              <Input value={novo.password} onChange={(e) => setNovo({ ...novo, password: e.target.value })} />
            </Field>
            <Button disabled={!podeCriar} loading={ocupado === 'novo'} onClick={() => void criarPessoa()}>
              {textos.create}
            </Button>
          </div>
        )}
      </Card>

      {lista === null && (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} h={54} r={12} />)}
          </div>
        </Card>
      )}

      {lista?.length === 0 && (
        <Card>
          <EmptyState icon="people" title={textos.none} body={textos.noneBody} />
        </Card>
      )}

      {lista?.map((u) => (
        <Card key={u.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Avatar name={u.full_name || u.email} />
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {u.full_name || u.email}
                {u.is_platform_admin && <Chip tone="navy">{textos.platformAdmin}</Chip>}
                {!u.is_active && <Chip tone="muted">{textos.inactive}</Chip>}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.email}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {u.email_verified ? (
                <Chip tone="green">{textos.verified}</Chip>
              ) : (
                <Button variant="ghost" style={{ padding: '8px 14px', fontSize: 13 }} loading={ocupado === u.id}
                  onClick={() => void agir(u.id, () => api.post(`/platform/users/${u.id}/verify-email`, {}))}>
                  {textos.verifyEmail}
                </Button>
              )}
              <Button variant="outline" style={{ padding: '8px 14px', fontSize: 13 }}
                onClick={() => { setSenhaDe(senhaDe === u.id ? null : u.id); setSenha('') }}>
                {textos.resetPassword}
              </Button>
              {!u.is_platform_admin && (
                <Button variant="outline"
                  style={{ padding: '8px 14px', fontSize: 13 }}
                  loading={ocupado === u.id}
                  onClick={() => confirmar(`ativo:${u.id}`, () => void agir(u.id, () => api.post(`/platform/users/${u.id}/active`, { active: !u.is_active })))}>
                  {confirmando === `ativo:${u.id}` ? textos.confirm : u.is_active ? textos.deactivate : textos.activate}
                </Button>
              )}
            </div>
          </div>

          {senhaDe === u.id && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px' }}>
                <Field label={textos.newPassword}>
                  <Input value={senha} onChange={(e) => setSenha(e.target.value)} />
                </Field>
              </div>
              <Button disabled={senha.length < 8} loading={ocupado === u.id}
                onClick={() => { void agir(u.id, () => api.post(`/platform/users/${u.id}/password`, { new_password: senha })); setSenhaDe(null); setSenha('') }}>
                {textos.resetPassword}
              </Button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {u.memberships.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{textos.noCompany}</p>
            ) : (
              u.memberships.map((m) => (
                <div key={m.membership_id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', borderRadius: 12, padding: '10px 13px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--heading)', fontWeight: 600, fontSize: 14 }}>{m.tenant_name}</span>
                  <Chip tone={TOM[m.status] ?? 'muted'}>{m.status}</Chip>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    {m.status !== 'invited' && (
                      <Button variant="ghost" style={{ padding: '6px 13px', fontSize: 12.5 }} loading={ocupado === m.membership_id}
                        onClick={() => void agir(m.membership_id, () => api.post(`/platform/memberships/${m.membership_id}/status`, { status: m.status === 'suspended' ? 'active' : 'suspended' }))}>
                        {m.status === 'suspended' ? textos.reactivateLink : textos.suspendLink}
                      </Button>
                    )}
                    <Button variant="outline"
                      style={{ padding: '6px 13px', fontSize: 12.5 }}
                      loading={ocupado === m.membership_id}
                      onClick={() => confirmar(`rm:${m.membership_id}`, () => void agir(m.membership_id, () => api.delete(`/platform/memberships/${m.membership_id}`)))}>
                      {confirmando === `rm:${m.membership_id}` ? textos.confirm : textos.removeLink}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
