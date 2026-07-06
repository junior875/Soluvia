import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
