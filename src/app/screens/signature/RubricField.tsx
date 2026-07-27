// Campo da rubrica: desenhar à mão OU gerar a partir do nome.
//
// Usado nos três lugares onde alguém assina — documento (SignModal), parecer da
// apuração (ParecerSignModal) e relato público de quem se identifica. Por isso
// NÃO lê o usuário do contexto: recebe `defaultName` por prop. O relato público
// roda fora do CapabilityProvider e um useCaps() aqui derrubaria aquela página.
import { Suspense, forwardRef, lazy, useImperativeHandle, useRef, useState } from 'react'
import { Field } from '../../ui'
import { useT } from '../../strings'
import SignaturePad, { type SignaturePadHandle } from './SignaturePad'

// As fontes manuscritas (~164 kB) só entram na rede quando abrem "Gerar do nome".
const SignatureTyped = lazy(() => import('./SignatureTyped'))

export interface RubricFieldHandle {
  clear: () => void
  /** Pré-preenche o pad com uma rubrica salva (perfil do signatário). */
  load: (dataUrl: string) => void
}

interface Props {
  /** Nome que pré-preenche o modo "gerar". Vazio = a pessoa digita. */
  defaultName?: string
  onChange: (dataUrl: string | null) => void
}

const RubricField = forwardRef<RubricFieldHandle, Props>(function RubricField(
  { defaultName = '', onChange }, ref,
) {
  const t = useT()
  const padRef = useRef<SignaturePadHandle>(null)
  const [mode, setMode] = useState<'draw' | 'type'>('draw')

  useImperativeHandle(ref, () => ({
    clear: () => { padRef.current?.clear(); onChange(null) },
    // Só faz sentido no modo desenho; garante estar nele antes de carregar.
    load: (dataUrl: string) => {
      setMode('draw')
      setTimeout(() => padRef.current?.load(dataUrl), 0)
    },
  }))

  // Trocar de modo zera a rubrica: senão "Assinar" enviaria a imagem do modo
  // anterior, que não é a que está na tela.
  const switchMode = (m: 'draw' | 'type') => {
    if (m === mode) return
    padRef.current?.clear()
    onChange(null)
    setMode(m)
  }

  return (
    <Field label={t.sig.rubric}>
      <div style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 100, padding: 3, marginBottom: 10 }}>
        {(['draw', 'type'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            aria-pressed={mode === m}
            className="app-btn"
            style={{
              border: 'none', cursor: 'pointer', padding: '7px 16px', borderRadius: 100,
              fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap',
              background: mode === m ? 'var(--accent)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--text-muted)',
            }}
          >
            {m === 'draw' ? t.sig.rubricDraw : t.sig.rubricType}
          </button>
        ))}
      </div>

      {mode === 'draw' ? (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: -2, marginBottom: 8 }}>{t.sig.rubricHint}</p>
          <SignaturePad ref={padRef} onChange={onChange} />
          <button
            type="button"
            onClick={() => { padRef.current?.clear() }}
            className="app-btn"
            style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}
          >
            {t.sig.clear}
          </button>
        </>
      ) : (
        <Suspense fallback={
          <div style={{ minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {t.sig.typedLoading}
          </div>
        }>
          <SignatureTyped defaultName={defaultName} onChange={onChange} />
        </Suspense>
      )}
    </Field>
  )
})

export default RubricField
