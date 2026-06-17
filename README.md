# Soluvia — Front-end

Landing page (home) da plataforma **Soluvia**, construída em **Vite + React + TypeScript**.
Somente front-end — sem back-end. O formulário de contato simula o envio; integre sua API em `src/components/ContactForm.tsx`.

**Recursos:**
- 🌐 **Triplo idioma** (Português, Inglês, Espanhol) — sistema genérico de i18n
- 🌗 **Tema claro/escuro** seguindo a paleta da marca
- ⚙️ **Botão de preferências** (engrenagem) acima do WhatsApp: troca idioma e tema
- Animações de scroll estilo Apple, logo Soluvia, e botão flutuante do Assistente IA

## Requisitos

- Node.js 18+ (recomendado 20+)

## Como rodar

```bash
npm install      # instala as dependências
npm run dev      # ambiente de desenvolvimento (http://localhost:5173)
npm run build    # gera a versão de produção em dist/
npm run preview  # pré-visualiza o build de produção
```

## Deploy

Após `npm run build`, suba a pasta **`dist/`** em qualquer host estático
(Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3, etc.).

## Estrutura

```
frontend/
├─ index.html              # HTML raiz (carrega a fonte Poppins)
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ public/
│  └─ soluvia-logo.png     # logo da marca (troque por outro se quiser)
└─ src/
   ├─ main.tsx             # entrada React (envolve App nos Providers)
   ├─ index.css            # reset, tokens de tema (claro/escuro), keyframes
   ├─ App.tsx              # composição da página + efeitos de scroll
   ├─ i18n/
   │  ├─ translations.ts   # 🌐 TODOS os textos (pt / en / es)
   │  └─ LanguageProvider.tsx  # contexto + hook useTranslation()
   ├─ theme/
   │  └─ ThemeProvider.tsx  # 🌗 contexto de tema + hook useTheme()
   └─ components/
      ├─ Header.tsx        # navbar + menu mobile + logo
      ├─ Reveal.tsx        # animação de entrada ao rolar (estilo Apple)
      ├─ Counter.tsx       # contador animado das estatísticas
      ├─ Faq.tsx           # acordeão de dúvidas + "ver mais"
      ├─ ContactForm.tsx   # formulário de contato (sem back-end)
      ├─ SettingsMenu.tsx  # ⚙️ engrenagem: idioma + tema
      └─ WhatsappButton.tsx# botão flutuante do assistente de IA
```

## Como adicionar texto novo (i18n)

O sistema é genérico — para qualquer texto novo:

1. Adicione a chave nas **três** línguas em `src/i18n/translations.ts`
   (ex.: `meuBloco: { titulo: '...' }` em `pt`, `en` e `es`).
2. No componente: `const { t } = useTranslation()` e use `t('meuBloco.titulo')`.
3. Para listas, use `const { dict } = useTranslation()` e acesse `dict.meuBloco.itens`.

Se faltar a tradução em algum idioma, cai automaticamente para o Português.

## Como adicionar cor / token de tema

Defina a variável em `src/index.css` dentro de `[data-theme='light']` e `[data-theme='dark']`,
e use `var(--minha-cor)` no estilo inline do componente.

## Personalização rápida

| O que | Onde |
|---|---|
| Número do WhatsApp | `App.tsx` → `<WhatsappButton phone="55..." />` |
| Foto da equipe | `App.tsx` → seção *Ambiente* (troque o placeholder por `<img src="/equipe.jpg" />`, colocando o arquivo em `public/`) |
| Logo | `public/soluvia-logo.png` |
| Idiomas / textos | `src/i18n/translations.ts` |
| Cores do tema | `src/index.css` (tokens `--accent`, `--bg`, etc.) |
| Planos e preços | `App.tsx` → `MENSAL_FEATURES` / `ANUAL_FEATURES` e seção *Planos* |
| Dúvidas (FAQ) | `Faq.tsx` → array `FAQS` |
| Envio do formulário | `ContactForm.tsx` → `handleSubmit` |

## Paleta

- Navy `#0e2c46` · Laranja `#f2921e` / `#e07b12` · Azul `#2f6fb0`
- Tipografia: **Poppins**
