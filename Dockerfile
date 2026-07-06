# ── Build do SPA (Vite) ───────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Instala deps primeiro (cache de camada). Precisa das devDeps (tsc/vite).
COPY package*.json ./
RUN npm ci

COPY . .
# NÃO definimos VITE_API_URL → o app usa '/api/v1' relativo e o Caddy (abaixo)
# repassa /api p/ o backend. Assim o navegador só vê ESTE domínio: sem CORS e
# sem cookie cross-site. (Se preferir API em domínio separado, passe
# --build-arg VITE_API_URL=https://api.seu-dominio e ajuste o CORS do backend.)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Serve: Caddy (estático + proxy /api + fallback SPA) ────────────────
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# O Railway injeta $PORT; o Caddyfile escuta nela. Sem EXPOSE fixo de propósito.
