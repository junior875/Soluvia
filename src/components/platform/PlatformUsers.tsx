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
import { Avatar, Button, Card, Chip, EmptyState, Field, Input, Modal, Select, Skeleton } from '../../app/ui'

export type PlatformUserMembership = {
  membership_id: string
  tenant_id: string
  tenant_name: string
  status: string
}

export type PlatformUser = {
  /** `null` em convite pendente: a conta só nasce no aceite. */
  id: string | null
  email: string
  full_name: string | null
  is_active: boolean
  email_verified: boolean
  is_platform_admin: boolean
  has_password: boolean
  created_at: string
  memberships: PlatformUserMembership[]
  /** Convidado que ainda não virou conta (Membership sem user_id). */
  pending?: boolean
  /** Convite fora do prazo de 7 dias — explica sozinho o "não consigo entrar". */
  invite_expired?: boolean
}

export type UsersTextos = {
  searchPh: string
  hint: string
  none: string
  noneBody: string
  noCompany: string
  verifyEmail: string
  sendAccess: string
  accessSent: string
  sendVerification: string
  verificationSent: string
  markVerified: string
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
  createdInvited: string
  createdAttached: string
  passwordOptional: string
  passwordOptionalHint: string
  role: string
  noRole: string
  pendingInvite: string
  inviteExpired: string
  resendInvite: string
  pendingHint: string
  deleteUser: string
  deleteTitle: string
  deleteHard: string
  deleteAnon: string
  deleteFrees: (email: string) => string
  deleteMemberships: (n: number) => string
  deletePending: (n: number) => string
  deleteConfirm: string
  deleteDone: (email: string) => string
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
  const vazio = { tenant_id: '', full_name: '', email: '', password: '', role_id: '' }
  const [novo, setNovo] = useState(vazio)
  const [criando, setCriando] = useState(false)
  // Papéis da empresa ESCOLHIDA. Cada empresa tem os seus (os de sistema mais
  // os que ela criou), então a lista só faz sentido depois da escolha — e
  // precisa ser recarregada a cada troca, senão oferece papel de outra empresa.
  const [papeis, setPapeis] = useState<{ id: string; name: string }[]>([])
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!novo.tenant_id) { setPapeis([]); return }
    let vivo = true
    api.get<{ roles: { id: string; name: string }[] }>(`/platform/tenants/${novo.tenant_id}`)
      .then((d) => { if (vivo) setPapeis(d.roles ?? []) })
      .catch(() => { if (vivo) setPapeis([]) })
    return () => { vivo = false }
  }, [novo.tenant_id])

  // Exclusão: a prévia do impacto vem ANTES do botão de confirmar. Apagar
  // gente não pode ser um clique só, e o que acontece muda conforme a pessoa
  // tenha assinado alguma coisa.
  type Previa = {
    user_id: string; email: string; full_name: string | null
    memberships: number; signatures: number
    pending_assignments: { case_id: string; stage: string }[]
    mode: 'hard' | 'anonymize'
  }
  const [previa, setPrevia] = useState<Previa | null>(null)

  async function abrirExclusao(userId: string) {
    setOcupado(userId)
    try {
      setPrevia(await api.get<Previa>(`/platform/users/${userId}/deletion-preview`))
    } catch (e) {
      onToast((e as ApiError).detail ?? 'Erro')
    } finally { setOcupado(null) }
  }

  async function confirmarExclusao() {
    if (!previa) return
    setOcupado(previa.user_id)
    try {
      await api.delete(`/platform/users/${previa.user_id}`)
      onToast(textos.deleteDone(previa.email))
      setPrevia(null)
      await buscar(termo.trim())
    } catch (e) {
      onToast((e as ApiError).detail ?? 'Erro')
    } finally { setOcupado(null) }
  }

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

  async function agir(chave: string, fn: () => Promise<unknown>, msg?: string) {
    setOcupado(chave)
    try {
      await fn()
      // Mensagem específica quando a ação tem uma ("código enviado") — o
      // "feito" genérico não conta o que aconteceu.
      onToast(msg ?? textos.done)
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
      const r = await api.post<{ mode: string }>(`/platform/tenants/${novo.tenant_id}/members`, {
        full_name: novo.full_name.trim() || novo.email.trim(),
        email: novo.email.trim(),
        // Sem senha: o servidor manda o convite por e-mail e a pessoa escolhe
        // a dela. O campo só é preenchido no caso raro de entregar o acesso
        // pronto — por isso vai `null` em vez de string vazia.
        password: novo.password.trim() ? novo.password : null,
        role_id: novo.role_id || null,
      })
      onToast(
        r.mode === 'invited' ? textos.createdInvited
          : r.mode === 'attached' ? textos.createdAttached
            : textos.created,
      )
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

  // A senha deixou de ser exigência: sem ela o convite vai por e-mail e quem
  // entra escolhe a própria. Se o superadmin digitar alguma, aí sim ela precisa
  // ser válida — meia senha não serve para ninguém.
  const podeCriar =
    !!novo.tenant_id
    && !!novo.email.trim()
    && (novo.password.trim() === '' || novo.password.length >= 8)

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
              {/* Trocar de empresa zera o papel: o id escolhido pertence à
                  empresa anterior e o servidor recusaria com 404. */}
              <Select value={novo.tenant_id} onChange={(e) => setNovo({ ...novo, tenant_id: e.target.value, role_id: '' })}>
                <option value="">—</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </Field>
            <Field label={textos.role}>
              <Select
                value={novo.role_id}
                disabled={!novo.tenant_id || papeis.length === 0}
                onChange={(e) => setNovo({ ...novo, role_id: e.target.value })}
              >
                <option value="">{novo.tenant_id ? textos.noRole : '—'}</option>
                {papeis.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label={textos.name}>
              <Input value={novo.full_name} onChange={(e) => setNovo({ ...novo, full_name: e.target.value })} />
            </Field>
            <Field label={textos.email}>
              <Input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
            </Field>
            <Field label={textos.passwordOptional}>
              <Input value={novo.password} onChange={(e) => setNovo({ ...novo, password: e.target.value })} />
            </Field>
            <Button disabled={!podeCriar} loading={ocupado === 'novo'} onClick={() => void criarPessoa()}>
              {textos.create}
            </Button>
            {/* A regra do campo vazio dita em voz alta: sem senha, o convite
                vai por e-mail e a pessoa escolhe a dela. Deixar isso implícito
                fazia o superadmin inventar senha por precaução — e passar a
                conhecer a senha de um cliente. */}
            <p style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: 12.5, margin: 0 }}>
              {textos.passwordOptionalHint}
            </p>
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

      {lista?.map((u) => {
        // Convite pendente não tem conta por trás: `id` é null e o vínculo é o
        // único identificador que existe. Toda ação de USUÁRIO (verificar
        // e-mail, definir senha, desativar) apontaria para o nada — o que essa
        // linha oferece é reenviar o convite ou cancelá-lo.
        const vinculo = u.memberships[0]
        const chave = u.id ?? vinculo?.membership_id ?? u.email
        // Const local, e não `u.id` direto: o narrowing de PROPRIEDADE não
        // sobrevive dentro dos callbacks do JSX, e sem isso cada onClick volta
        // a enxergar `string | null`.
        const contaId = u.id
        return (
        <Card key={chave}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Avatar name={u.full_name || u.email} />
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <div style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {u.full_name || u.email}
                {u.is_platform_admin && <Chip tone="navy">{textos.platformAdmin}</Chip>}
                {u.pending && <Chip tone="accent">{textos.pendingInvite}</Chip>}
                {u.invite_expired && <Chip tone="muted">{textos.inviteExpired}</Chip>}
                {!u.pending && !u.is_active && <Chip tone="muted">{textos.inactive}</Chip>}
              </div>
              {/* Convidado não tem nome ainda, então o título JÁ é o e-mail —
                  repeti-lo embaixo só empilha a mesma informação duas vezes. */}
              {u.pending ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: 2 }}>{textos.pendingHint}</div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.email}</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {u.pending || !contaId ? (
                vinculo && (
                  <Button variant="ghost" style={{ padding: '8px 14px', fontSize: 13 }} loading={ocupado === chave}
                    onClick={() => void agir(chave, () => api.post(`/platform/tenants/${vinculo.tenant_id}/members/${vinculo.membership_id}/resend-invite`, {}))}>
                    {textos.resendInvite}
                  </Button>
                )
              ) : (
              <>
              {/* REENVIAR ACESSO — sempre disponível, inclusive para quem já
                  está verificado e ativo: o chamado real é "perdi o e-mail".
                  Convite não volta depois do aceite (a conta já existe), então
                  o que resolve é o código de redefinição de senha. */}
              <Button variant="ghost" style={{ padding: '8px 14px', fontSize: 13 }} loading={ocupado === contaId}
                onClick={() => void agir(
                  contaId,
                  () => api.post(`/platform/users/${contaId}/send-access`, {}),
                  textos.accessSent,
                )}>
                {textos.sendAccess}
              </Button>
              {u.email_verified ? (
                <Chip tone="green">{textos.verified}</Chip>
              ) : (
                <>
                  {/* Duas ações DIFERENTES que um botão só escondia: enviar o
                      código para a pessoa verificar (o caminho normal) e
                      carimbar na mão (suporte, quando o código não chega).
                      O botão antigo dizia "verificar" e só carimbava — sem
                      disparar e-mail nenhum. */}
                  <Button variant="ghost" style={{ padding: '8px 14px', fontSize: 13 }} loading={ocupado === contaId}
                    onClick={() => void agir(
                      contaId,
                      () => api.post(`/platform/users/${contaId}/send-verification`, {}),
                      textos.verificationSent,
                    )}>
                    {textos.sendVerification}
                  </Button>
                  <Button variant="outline" style={{ padding: '8px 14px', fontSize: 13 }} loading={ocupado === contaId}
                    onClick={() => confirmar(`verif:${contaId}`, () => void agir(contaId, () => api.post(`/platform/users/${contaId}/verify-email`, {})))}>
                    {confirmando === `verif:${contaId}` ? textos.confirm : textos.markVerified}
                  </Button>
                </>
              )}
              <Button variant="outline" style={{ padding: '8px 14px', fontSize: 13 }}
                onClick={() => { setSenhaDe(senhaDe === contaId ? null : contaId); setSenha('') }}>
                {textos.resetPassword}
              </Button>
              {!u.is_platform_admin && (
                <Button variant="outline"
                  style={{ padding: '8px 14px', fontSize: 13 }}
                  loading={ocupado === contaId}
                  onClick={() => confirmar(`ativo:${contaId}`, () => void agir(contaId, () => api.post(`/platform/users/${contaId}/active`, { active: !u.is_active })))}>
                  {confirmando === `ativo:${contaId}` ? textos.confirm : u.is_active ? textos.deactivate : textos.activate}
                </Button>
              )}
              {/* EXCLUIR — a única ação que LIBERA o e-mail para um cadastro
                  novo em outra empresa. Abre a prévia primeiro: excluir gente
                  não pode ser um clique só, e o impacto muda conforme a pessoa
                  tenha assinado alguma coisa. */}
              {!u.is_platform_admin && (
                <Button variant="outline"
                  style={{ padding: '8px 14px', fontSize: 13, borderColor: '#e11d48', color: '#e11d48' }}
                  loading={ocupado === contaId}
                  onClick={() => void abrirExclusao(contaId)}>
                  {textos.deleteUser}
                </Button>
              )}
              </>
              )}
            </div>
          </div>

          {!u.pending && contaId && senhaDe === contaId && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px' }}>
                <Field label={textos.newPassword}>
                  <Input value={senha} onChange={(e) => setSenha(e.target.value)} />
                </Field>
              </div>
              <Button disabled={senha.length < 8} loading={ocupado === contaId}
                onClick={() => { void agir(contaId, () => api.post(`/platform/users/${contaId}/password`, { new_password: senha })); setSenhaDe(null); setSenha('') }}>
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
        )
      })}

      {/* PRÉVIA DA EXCLUSÃO — o que vai acontecer, antes de acontecer.
          Dois desfechos possíveis, e a diferença não é detalhe: quem nunca
          assinou some de verdade; quem assinou tem o e-mail liberado, mas os
          registros ficam — apagá-los faria as assinaturas dela passarem a
          exibir "adulterado" no verificador público. */}
      <Modal
        open={previa !== null}
        onClose={() => setPrevia(null)}
        title={textos.deleteTitle}
        kicker={previa?.email ?? ''}
        maxWidth={560}
      >
        {previa && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {previa.mode === 'hard' ? textos.deleteHard : textos.deleteAnon}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
              <span style={{ color: 'var(--heading)', fontSize: 13, fontWeight: 700 }}>
                {textos.deleteFrees(previa.email)}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                {textos.deleteMemberships(previa.memberships)}
              </span>
              {previa.pending_assignments.length > 0 && (
                <span style={{ color: '#d97706', fontSize: 12.5, fontWeight: 700 }}>
                  {textos.deletePending(previa.pending_assignments.length)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setPrevia(null)}>{textos.cancel}</Button>
              <Button
                loading={ocupado === previa.user_id}
                onClick={() => void confirmarExclusao()}
                style={{ background: '#e11d48', borderColor: '#e11d48' }}
              >
                {textos.deleteConfirm}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
