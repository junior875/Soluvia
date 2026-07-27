// Rubrica GERADA a partir do nome, para quem não quer (ou não consegue) desenhar
// com o mouse/dedo. Escolhe um estilo, o nome é rasterizado num PNG recortado e
// segue pelo mesmo caminho da rubrica desenhada — o backend não sabe a diferença.
//
// As fontes são pacotes npm auto-hospedados (licença aberta): nada de CDN, para
// não criar dependência externa nem vazar quem assinou para terceiros. Elas só
// entram na rede quando este componente é carregado (ele é lazy no SignModal).
// Subset latin + peso 400 apenas: `latin.css` puxaria também 500/600/700 das
// fontes variáveis (10 arquivos em vez de 4, ~250 kB à toa).
import '@fontsource/great-vibes/latin-400.css'
import '@fontsource/dancing-script/latin-400.css'
import '@fontsource/homemade-apple/latin-400.css'
import '@fontsource/caveat/latin-400.css'

import { useEffect, useRef, useState } from 'react'
import { SIGNATURE_STYLES, renderTypedSignature, type SignatureStyle } from '../../../lib/signatureImage'
import { Field, Input } from '../../ui'
import { useT } from '../../strings'

interface Props {
  /** Nome do usuário logado — pré-preenche o campo. */
  defaultName: string
  /** Recebe o PNG (data URL) ou null quando não há nada para assinar. */
  onChange: (dataUrl: string | null) => void
}

export default function SignatureTyped({ defaultName, onChange }: Props) {
  const t = useT()
  const [name, setName] = useState(defaultName)
  const [styleId, setStyleId] = useState(SIGNATURE_STYLES[0].id)
  const [ready, setReady] = useState(false)

  const style = SIGNATURE_STYLES.find((s) => s.id === styleId) ?? SIGNATURE_STYLES[0]

  // Gera o PNG a cada mudança de nome/estilo. `seq` descarta resultado de geração
  // antiga que voltou depois de outra mais nova (a fonte carrega async), e
  // `mounted` impede que uma geração em voo RESSUSCITE a rubrica depois que o
  // componente saiu (trocar para "Desenhar" zera a imagem — sem esta guarda ela
  // voltava sozinha e a pessoa assinaria com o que não está na tela).
  const seq = useRef(0)
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])

  useEffect(() => {
    const my = ++seq.current
    const id = window.setTimeout(async () => {
      const url = await renderTypedSignature(name, style)
      if (mounted.current && seq.current === my) onChange(url)
    }, 220)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, styleId])

  // Espera as webfonts para o PREVIEW não aparecer na fonte errada.
  useEffect(() => {
    let alive = true
    const load = SIGNATURE_STYLES.map((s) => document.fonts.load(`40px "${s.family}"`, name || 'Ab'))
    Promise.all(load).catch(() => []).then(() => { if (alive) setReady(true) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const preview = name.trim() || t.sig.typedPlaceholder

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label={t.sig.typedName}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.sig.typedPlaceholder}
          aria-label={t.sig.typedName}
          autoComplete="name"
          maxLength={60}
        />
      </Field>

      {/* Prévia do estilo escolhido. É UMA LINHA e encolhe para caber, igual ao
          PNG gerado — se quebrasse em duas linhas aqui, a pessoa veria uma coisa
          e o PDF receberia outra. */}
      <div
        style={{
          background: '#f6f8fc', border: '1px dashed #c4cede', borderRadius: 12,
          minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '10px 16px', overflow: 'hidden',
        }}
      >
        <span
          style={{
            fontFamily: `"${style.family}", cursive`,
            fontSize: `clamp(20px, ${Math.round(52 * style.scale)}px, 56px)`,
            color: '#12324e', lineHeight: 1.6, whiteSpace: 'nowrap',
            maxWidth: '100%', overflow: 'hidden',
            // Nunca some por completo: em rede lenta a área ficava em branco e
            // parecia tela quebrada. Fica esmaecida até a fonte chegar.
            opacity: ready ? (name.trim() ? 1 : 0.35) : 0.25,
            transition: 'opacity .25s ease',
          }}
        >
          {preview}
        </span>
      </div>

      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 8 }}>{t.sig.typedStyle}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
          {SIGNATURE_STYLES.map((s) => (
            <StyleChip
              key={s.id}
              style={s}
              label={t.sig.typedStyles[s.id] ?? s.id}
              text={name.trim() || t.sig.typedPlaceholder}
              selected={s.id === styleId}
              onSelect={() => setStyleId(s.id)}
            />
          ))}
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.55, margin: 0 }}>
        {t.sig.typedHint}
      </p>
    </div>
  )
}

function StyleChip({ style, label, text, selected, onSelect }: {
  style: SignatureStyle
  label: string
  text: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="app-btn"
      style={{
        cursor: 'pointer', padding: '10px 8px 8px', borderRadius: 12, background: '#f6f8fc',
        border: `1.5px solid ${selected ? 'var(--accent)' : '#c4cede'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0,
        boxShadow: selected ? '0 0 0 3px var(--accent-soft)' : 'none',
      }}
    >
      <span
        style={{
          fontFamily: `"${style.family}", cursive`,
          fontSize: Math.round(26 * style.scale), color: '#12324e',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxWidth: '100%', lineHeight: 1.6,
        }}
      >
        {text}
      </span>
      {/* #7b8a9c sobre #f6f8fc dá 3,3:1 — abaixo do mínimo AA (4,5:1) para 10,5px. */}
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: selected ? 'var(--accent)' : '#53637a' }}>
        {label}
      </span>
    </button>
  )
}
