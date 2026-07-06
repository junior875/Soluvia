# Soluvia — Front-end

Landing page (home) da plataforma **Soluvia**, construída em **Vite + React + TypeScript**.
O back-end (FastAPI) fica em [`../backend`](../backend); a camada de conexão já está pronta (ver abaixo).

## Conectar ao back-end (API)

A integração com a API Diagnostica vive em `src/lib`:

| Arquivo | Papel |
|---|---|
| `src/lib/api.ts` | Cliente HTTP: injeta o `Authorization: Bearer`, intercepta **401 e faz refresh automático** (single-flight), e troca o token no **switch-tenant**. Access token em memória; refresh em cookie httpOnly. |
| `src/lib/auth.tsx` | `AuthProvider` + hook `useAuth()`: `login`, `selectTenant`, `logout`, `can(code)` e `needsTenantSelection`. |
| `src/lib/types.ts` | Tipos TypeScript espelhando os schemas do back-end. |
| `src/components/TenantSelector.tsx` | Seletor de empresa (padrão "workspace do Slack"), renderizado quando há mais de um vínculo. |

**1) Configure a URL da API** em `.env` (já há um `.env.development`):

```bash
VITE_API_URL=http://localhost:8000/api/v1
```

**2) Envolva o app com o `AuthProvider`** (em `src/main.tsx`):

```tsx
import { AuthProvider } from './lib/auth'
// ...
<AuthProvider>
  <App />
</AuthProvider>
```

**3) Use em qualquer componente:**

```tsx
import { useAuth } from './lib/auth'
import TenantSelector from './components/TenantSelector'

function Area() {
  const { me, needsTenantSelection, can, login } = useAuth()
  if (!me) return <button onClick={() => login('admin@acme.com', 'senha')}>Entrar</button>
  if (needsTenantSelection) return <TenantSelector />   // seletor de empresa
  return can('etica.respond') ? <PainelOperador /> : <SemAcesso />
}
```

> A guarda por permissão no front é só **UX** — a checagem real é sempre no back-end.

### Fluxo self-service (planos → cartão → criar conta)

[`src/components/SignupFlow.tsx`](src/components/SignupFlow.tsx) é um overlay de 3 passos
(escolher plano/ciclo → empresa + admin + **cartão mockado** → conta criada e já logado).
Abre quando a URL vira `#assinar` — os botões da seção **Planos** do site já apontam
para `#assinar-mensal` / `#assinar-anual`. Conversa com `POST /api/v1/signup` real.
Cartão de teste: **4242 4242 4242 4242**, qualquer validade futura e CVC.

O formulário de contato (`src/components/ContactForm.tsx`) continua simulando o envio;
para submeter um relato real do Colaborador, use os endpoints públicos
(`POST /api/v1/public/{slug}/cases?token=...`) via `api.post(...)`.

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
