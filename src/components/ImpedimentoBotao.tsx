import { useState } from 'react'
import { api } from '../lib/api'
import type { ApiError } from '../lib/types'
import { Button, Field, Modal } from '../app/ui'
import { useTranslation } from '../i18n/LanguageProvider'
import type { Lang } from '../i18n/translations'

/** "Declarar impedimento" — o botão do item 17(b) para quem está no caso.
 *
 *  Por que um componente solto, e não um trecho dentro da tela de Casos: a
 *  mesma ação precisa aparecer em DOIS lugares (a gaveta do caso e a ficha de
 *  parecer em "Meus atendimentos"), e quem declara impedimento perde o acesso
 *  ao caso no mesmo instante — então o dono da tela só precisa saber o que
 *  fazer DEPOIS (`onDone`: fechar a gaveta e recarregar a lista).
 *
 *  Textos locais, como em `AccessReport`/`FormBuilder`: o dicionário anda junto
 *  do componente e não disputa linha em `strings.ts` com os outros módulos.
 *
 *  Uso:
 *    <ImpedimentoBotao caseId={detail.id} protocol={detail.protocol}
 *                      onDone={() => { setOpen(false); load() }} onError={flash} />
 */

const I18N: Record<Lang, {
  action: string; kicker: string; title: string
  intro: string; warn: string
  reason: string; reasonPh: string; min: string
  cancel: string; confirm: string
  fail: string
}> = {
  pt: {
    action: 'Declarar impedimento',
    kicker: 'Conflito de interesse',
    title: 'Declarar impedimento neste caso',
    intro: 'Use isto quando você não puder apurar este caso — por exemplo, se o relato cita você, ou se você tem relação pessoal com quem é citado.',
    warn: 'Ao confirmar, você deixa de ver este caso (lista, dossiê e anexos) e as suas etapas passam para outra pessoa. O motivo fica registrado na trilha de auditoria e os administradores são avisados. Não dá para desfazer sozinho.',
    reason: 'Motivo do impedimento',
    reasonPh: 'Ex.: o relato cita o meu nome; sou chefe direto da pessoa citada.',
    min: 'Escreva o motivo (pelo menos 3 letras).',
    cancel: 'Cancelar',
    confirm: 'Confirmar impedimento',
    fail: 'Não foi possível declarar o impedimento.',
  },
  en: {
    action: 'Declare a conflict of interest',
    kicker: 'Conflict of interest',
    title: 'Declare a conflict of interest in this case',
    intro: 'Use this when you cannot investigate this case — for example, if the report names you, or you have a personal relationship with someone named in it.',
    warn: 'Once confirmed, you lose access to this case (list, dossier and attachments) and your stages move to someone else. The reason is recorded in the audit trail and the administrators are notified. You cannot undo this on your own.',
    reason: 'Reason',
    reasonPh: 'E.g. the report names me; I am the direct manager of the person named.',
    min: 'Write the reason (at least 3 characters).',
    cancel: 'Cancel',
    confirm: 'Confirm',
    fail: 'Could not declare the conflict of interest.',
  },
  es: {
    action: 'Declarar impedimento',
    kicker: 'Conflicto de interés',
    title: 'Declarar impedimento en este caso',
    intro: 'Úselo cuando no pueda investigar este caso — por ejemplo, si el relato lo menciona o si tiene relación personal con alguien mencionado.',
    warn: 'Al confirmar, deja de ver este caso (lista, expediente y adjuntos) y sus etapas pasan a otra persona. El motivo queda registrado en la auditoría y se avisa a los administradores. No puede deshacerlo por su cuenta.',
    reason: 'Motivo del impedimento',
    reasonPh: 'Ej.: el relato menciona mi nombre; soy jefe directo de la persona mencionada.',
    min: 'Escriba el motivo (al menos 3 letras).',
    cancel: 'Cancelar',
    confirm: 'Confirmar impedimento',
    fail: 'No se pudo declarar el impedimento.',
  },
}

const ta: React.CSSProperties = {
  width: '100%', minHeight: 110, resize: 'vertical',
  background: 'var(--surface-2)', color: 'var(--heading)',
  border: '1px solid var(--border)', borderRadius: 12,
  padding: '10px 12px', fontSize: 14.5, fontFamily: 'inherit',
}

export default function ImpedimentoBotao({
  caseId, protocol, onDone, onError, compact,
}: {
  caseId: string
  protocol?: string
  onDone?: () => void
  onError?: (msg: string) => void
  compact?: boolean
}) {
  const { lang } = useTranslation()
  const tx = I18N[lang] ?? I18N.pt
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  const curto = motivo.trim().length < 3

  const declarar = async () => {
    if (curto) { setErro(tx.min); return }
    setBusy(true); setErro('')
    try {
      await api.post(`/cases/${caseId}/impedimento`, { motivo: motivo.trim() })
      setOpen(false); setMotivo('')
      // Quem declarou JÁ não alcança o caso: recarregar a gaveta daria 403.
      // Quem chama decide o destino (fechar e voltar para a lista).
      onDone?.()
    } catch (e) {
      const msg = (e as ApiError).detail ?? tx.fail
      setErro(msg)
      onError?.(msg)
    } finally { setBusy(false) }
  }

  return (
    <>
      <Button
        variant="ghost"
        leftIcon="shield"
        onClick={() => { setErro(''); setOpen(true) }}
        style={compact ? { fontSize: 13, padding: '6px 10px' } : undefined}
      >
        {tx.action}
      </Button>

      <Modal
        open={open}
        onClose={() => { if (!busy) setOpen(false) }}
        kicker={protocol ? `${tx.kicker} · ${protocol}` : tx.kicker}
        title={tx.title}
        maxWidth={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{tx.intro}</p>
          <p style={{
            color: 'var(--heading)', fontSize: 13.5, lineHeight: 1.5,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '10px 12px',
          }}>{tx.warn}</p>
          <Field label={tx.reason}>
            <textarea
              style={ta}
              value={motivo}
              onChange={(e) => { setMotivo(e.target.value); if (erro) setErro('') }}
              placeholder={tx.reasonPh}
              maxLength={2000}
              autoFocus
            />
          </Field>
          {erro && <p style={{ color: 'var(--danger, #f87171)', fontSize: 13 }}>{erro}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>{tx.cancel}</Button>
            {/* O botão fica desabilitado enquanto o motivo é curto: o servidor
                recusa com 422, e descobrir isso depois do clique é pior. */}
            <Button onClick={declarar} loading={busy} disabled={curto}>{tx.confirm}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
