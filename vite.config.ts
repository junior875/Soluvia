import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
/**
 * A CSP do index.html é a de PRODUÇÃO: `connect-src 'self'`, porque lá o front
 * e a API vivem na mesma origem (o Caddy/estático repassa /api).
 *
 * Em desenvolvimento nem sempre é assim — quem define `VITE_API_URL` aponta
 * para outra porta, e aí a mesma diretiva bloqueia TODA chamada à API e a tela
 * fica em "canal indisponível" sem dizer por quê. Este plugin acrescenta as
 * origens locais à diretiva, e só no servidor de dev: o arquivo que o build
 * gera não passa por aqui.
 */
function cspDeDesenvolvimento() {
  return {
    name: 'csp-dev',
    apply: 'serve' as const,
    transformIndexHtml(html: string) {
      return html.replace(
        "connect-src 'self' https://*.digitaloceanspaces.com",
        "connect-src 'self' https://*.digitaloceanspaces.com http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*",
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), cspDeDesenvolvimento()],
  server: {
    host: true,          // escuta em todas as interfaces (localhost E 127.0.0.1)
    port: 5991,          // porta fixa e incomum (não colide com nada)
    strictPort: true,
    // O front chama /api/... (mesma origem da página) e o Vite REPASSA para o
    // backend. Assim não há CORS, cookie cross-site nem problema de IPv6
    // (localhost vs 127.0.0.1) — funciona igual em qualquer host.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8791',
        changeOrigin: true,
      },
    },
  },
  // `vite preview` serve o BUILD com o mesmo proxy: é o jeito de reproduzir
  // localmente um bug que só aparece no bundle minificado de produção.
  preview: {
    port: 5992,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8791',
        changeOrigin: true,
      },
    },
  },
})
