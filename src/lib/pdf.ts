// Configuração única do pdf.js para o módulo de Assinatura Digital.
// Importa o worker como URL (Vite resolve o asset final no build) e o aponta em
// GlobalWorkerOptions. Reexporta getDocument já pronto para uso nos componentes.
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
// O sufixo ?url faz o Vite devolver a URL final do worker (com hash) no build.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export const getDocument = pdfjs.getDocument
export type PdfDocument = PDFDocumentProxy
export type PdfPage = PDFPageProxy
/** A task de carregamento — é ela quem expõe destroy() para liberar o worker. */
export type PdfLoadingTask = ReturnType<typeof pdfjs.getDocument>
