// A barrinha de consumo — a mesma no menu do painel e no do console.
//
// Ela existe para responder UMA pergunta: quanto já foi usado do que se tem.
// A resposta é a PORCENTAGEM, e é ela que fica em destaque; os valores
// absolutos vão embaixo, menores, para quem quiser conferir.
//
// Sem limite (∞) não há porcentagem que exista: a versão anterior desenhava a
// barra CHEIA e apagada nesse caso, o que se lê como "no limite" — o oposto do
// que acontece. Aqui, sem teto, a barra não é desenhada; entra "sem limite".
import type { CSSProperties } from 'react'

/** Verde folgado, âmbar apertando, vermelho no fim. */
function cor(pct: number): string {
  if (pct >= 90) return '#e11d48'
  if (pct >= 70) return '#f59e0b'
  return '#16a34a'
}

export default function UsageBar({ rotulo, usado, limite, formatar, semLimiteTexto, style }: {
  rotulo: string
  usado: number
  /** 0 (ou negativo) = sem teto. */
  limite: number
  formatar: (n: number) => string
  semLimiteTexto: string
  style?: CSSProperties
}) {
  const temLimite = limite > 0
  const pct = temLimite ? (usado / limite) * 100 : 0
  // Arredondar 0,04% para "0%" faz sumir o consumo que existe; e 99,6% virar
  // "100%" anuncia um estouro que ainda não houve. Uma casa quando o número é
  // pequeno, e teto de 99% enquanto não estourou de verdade.
  const rotuloPct = !temLimite
    ? semLimiteTexto
    : pct > 0 && pct < 1
      ? `${pct.toFixed(1)}%`
      : `${Math.min(pct >= 100 ? 100 : 99, Math.round(pct))}%`

  return (
    <div style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ color: 'var(--heading)', fontWeight: 700, fontSize: 12 }}>{rotulo}</span>
        <span style={{ color: temLimite ? cor(pct) : 'var(--text-muted)', fontWeight: 800, fontSize: 12 }}>
          {rotuloPct}
        </span>
      </div>
      {temLimite && (
        <div style={{ height: 6, borderRadius: 100, background: 'var(--surface)', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, Math.max(pct > 0 ? 2 : 0, pct))}%`,  // um fio visível quando há consumo
            height: '100%', borderRadius: 100, background: cor(pct), transition: 'width .3s',
          }} />
        </div>
      )}
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: temLimite ? 4 : 0 }}>
        {formatar(usado)}{temLimite ? ` / ${formatar(limite)}` : ''}
      </div>
    </div>
  )
}
