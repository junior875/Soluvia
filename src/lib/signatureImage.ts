// Geração da imagem da rubrica (PNG) — usada tanto pelo pad de desenho quanto
// pela rubrica gerada a partir do nome.
//
// REGRA DO MÓDULO: o PNG enviado ao backend contém SÓ a tinta, sem moldura
// transparente em volta. O carimbo no PDF desenha a imagem centrada na caixa
// marcada (preservando proporção), então qualquer margem vazia empurra a
// assinatura para longe do ponto apontado — foi exatamente o bug de "a
// assinatura foi parar muito para baixo". Por isso todo caminho passa por
// `trimToInk`.

/** Tinta escura fixa: precisa contrastar com o papel claro do PDF. */
export const SIGNATURE_INK = '#12324e'

/**
 * Recorta o canvas na bounding box do que tem tinta e devolve um data URL PNG.
 * Devolve `null` quando não há nenhum pixel opaco.
 */
export function trimToInk(canvas: HTMLCanvasElement, padding = 6): string | null {
  const ctx = canvas.getContext('2d')
  if (!ctx || !canvas.width || !canvas.height) return null
  // getImageData ignora transformações do contexto — opera em px de dispositivo.
  const { data, width: w, height: h } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {   // alpha > 8 → tem tinta
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return null
  x0 = Math.max(0, x0 - padding); y0 = Math.max(0, y0 - padding)
  x1 = Math.min(w - 1, x1 + padding); y1 = Math.min(h - 1, y1 + padding)

  const out = document.createElement('canvas')
  out.width = x1 - x0 + 1
  out.height = y1 - y0 + 1
  const octx = out.getContext('2d')
  if (!octx) return null
  octx.drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
  return out.toDataURL('image/png')
}

/** Ids fechados: assim o TypeScript acusa se um estilo novo entrar aqui sem
 *  rótulo correspondente em strings.ts (chip apareceria sem nome). */
export type SignatureStyleId = 'classica' | 'fluida' | 'caneta' | 'marcador'

/** Estilos de rubrica gerada. `family` tem que bater com o @font-face carregado. */
export interface SignatureStyle {
  id: SignatureStyleId
  family: string
  /** Compensa a diferença de altura visual entre as fontes na hora de renderizar. */
  scale: number
}

export const SIGNATURE_STYLES: SignatureStyle[] = [
  { id: 'classica', family: 'Great Vibes', scale: 1.0 },
  { id: 'fluida', family: 'Dancing Script', scale: 0.86 },
  { id: 'caneta', family: 'Homemade Apple', scale: 0.68 },
  { id: 'marcador', family: 'Caveat', scale: 0.95 },
]

/**
 * Desenha o nome com uma fonte manuscrita e devolve o PNG já recortado.
 *
 * Espera a fonte estar carregada antes de desenhar: o canvas NÃO espera por
 * webfont e cairia calado numa fonte qualquer do sistema, gerando uma rubrica
 * diferente da que a pessoa viu na tela.
 */
export async function renderTypedSignature(
  text: string,
  style: SignatureStyle,
  ink: string = SIGNATURE_INK,
): Promise<string | null> {
  const name = text.trim().replace(/\s+/g, ' ')
  if (!name) return null

  const size = Math.round(150 * style.scale)
  const font = `${size}px "${style.family}", cursive`
  try {
    await document.fonts.load(font, name)
    await document.fonts.ready
  } catch {
    /* sem a API de fontes o navegador usa o que tiver — segue mesmo assim */
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Dimensiona pela CAIXA REAL da tinta (actualBoundingBox), não por
  // measureText().width: em fonte de script o floreio do "J", do "g" ou o traço
  // final passam da largura de avanço e seriam cortados pela borda do canvas.
  // Mede com o MESMO align/baseline do desenho: a caixa vem relativa ao ponto de
  // alinhamento, então medir com um e desenhar com outro desloca tudo.
  ctx.font = font
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const m = ctx.measureText(name)

  const hasMetrics = typeof m.actualBoundingBoxLeft === 'number'
    && typeof m.actualBoundingBoxAscent === 'number'
  // actualBoundingBoxLeft é POSITIVO quando a tinta invade a ESQUERDA da origem
  // (comum em script: o 'S' da Homemade Apple começa ~0,53em antes). As contas
  // abaixo valem para os dois sinais. Sem as métricas (navegador antigo), cai numa
  // folga generosa — o trim depois corta a sobra.
  const left = hasMetrics ? m.actualBoundingBoxLeft : size * 0.6
  const right = hasMetrics ? m.actualBoundingBoxRight : m.width + size * 0.6
  const ascent = hasMetrics ? m.actualBoundingBoxAscent : size
  const descent = hasMetrics ? m.actualBoundingBoxDescent : size * 0.8
  const w = Math.ceil(left + right)
  const h = Math.ceil(ascent + descent)
  if (w <= 0 || h <= 0) return null

  const PAD = Math.ceil(size * 0.12)   // respiro para antialiasing
  canvas.width = w + PAD * 2
  canvas.height = h + PAD * 2

  // Redimensionar o canvas zera o estado do contexto — reconfigura tudo.
  ctx.font = font
  ctx.fillStyle = ink
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(name, PAD + left, PAD + ascent)

  return trimToInk(canvas)
}
