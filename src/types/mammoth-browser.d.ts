// O pacote `mammoth` publica tipos só para a entrada de Node; o build de
// navegador (`mammoth.browser`) — o único que funciona no Vite — vem sem
// declaração. Este é o pedaço da API que o visualizador usa.
declare module 'mammoth/mammoth.browser' {
  export interface MammothResult {
    value: string
    messages: { type: string; message: string }[]
  }
  const mammoth: {
    convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<MammothResult>
  }
  export default mammoth
}
