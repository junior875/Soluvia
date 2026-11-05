# Plano de conexão — TI Projects em `gridcompliance.com/tiprojects`

Para o time do App B (TI Projects). Responde à proposta recebida, corrige o que
estava errado nela, e divide o trabalho em duas fases para a conexão subir sem
código novo.

**Nome fechado: `/tiprojects`, plural** — como já está no build de vocês. O lado
A foi renomeado para acompanhar.

> **Estado em 05/11/2026 — tudo acordado.** As cinco perguntas do fim deste
> documento foram respondidas e estão fechadas: plural confirmado, string
> canônica aceita, Fase 1 com segredo compartilhado, replay de 60 s aceito, e a
> CSP final acertada. O App B confirmou que **não tem script inline, não usa web
> worker nem `blob:`, e só conecta em `/tiprojects/api/*`** — e removeu o Google
> Fonts, que por isso saiu da política. O histórico dessa troca está em
> [`RESPOSTA-AO-APP-B.md`](RESPOSTA-AO-APP-B.md).
>
> Falta só o `PROXY_SECRET`, que vem por canal seguro, e aplicar o componente no
> painel da DigitalOcean.

---

## Resposta curta: é só mexer em variável?

Não, mas quase. São três tipos de mudança, e na Fase 1 **nenhuma delas é código**:

| | App A (Grid Compliance) | App B (TI Projects) |
|---|---|---|
| **Variável de ambiente** | `UPSTREAM`, `PROXY_SECRET` | `VITE_BASE_PATH`, `VITE_API_URL`, `FRONTEND_URL`, `PROXY_SECRET` |
| **App spec** | componente proxy novo + regra de ingress `/tiprojects` + headers de segurança | nada |
| **Código** | nada (Fase 1) | nada (Fase 1) |
| **Rebuild** | deploy do app | **sim** — `VITE_*` é build-time |

O que torna a Fase 1 livre de código é que o App B **já tem** a leitura de
`X-Client-IP` + `X-Proxy-Secret` implementada. A assinatura Ed25519 da proposta
original vira Fase 2.

---

## O que mudou em relação à proposta original, e por quê

### 1. O proxy NÃO vai dentro do Web Service do App A

A proposta assumia Express e `http-proxy-middleware`. **O Web Service do App A é
FastAPI (Python)**, e é a produção do Soluvia: 1 vCPU, instância única, pool de
5+5 conexões, atendendo canal de denúncias, LGPD, auditoria e assinatura
digital.

Passar o tráfego do TI Projects — inclusive uploads de cronograma — por esse
processo significaria dividir CPU, memória, logs e janela de deploy entre os dois
produtos.

**Em vez disso:** um **componente dedicado** no mesmo app (US$ 5/mês, shared
1 vCPU / 512 MiB). Processo separado, deploy separado. Se ele cair, só
`/tiprojects` cai.

### 2. O fallback de `X-Forwarded-For` tem de sair

A proposta dizia: *"`do-connecting-ip`, ou o 1º item de `X-Forwarded-For`"*.

A documentação da DigitalOcean é explícita: no App Platform o `x-forwarded-for`
carrega **o IP do servidor de ingress da DO**, não o do cliente. Quem tem o IP do
cliente é `do-connecting-ip`.

Com esse fallback ativo, **todos os usuários cairiam no mesmo balde de rate
limit** e a auditoria registraria o IP do ingress — exatamente o problema que o
header existe para resolver. Se `do-connecting-ip` não vier, é erro, não é hora
de adivinhar.

### 3. `301` virou `308`

`301` é permanente e fica no cache do navegador do cliente para sempre. `308`
preserva o método e não fica gravado. Em arquitetura nova, 301 é uma decisão
irreversível pela janela errada.

### 4. Não confiar em "prefixo mais longo"

A proposta dizia que o catchall do static site não intercepta `/tiprojects`
porque "vale o prefixo mais longo". **A DigitalOcean não documenta precedência
de rotas.** E hoje, medido, `gridcompliance.com/tiprojects` já devolve **200** —
o catchall do Soluvia engole o caminho.

O que vamos fazer: colocar a regra `/tiprojects` **antes** da regra `/` no spec e
testar antes de apontar tráfego real.

### 5. A ordem de implantação estava invertida

Na proposta, o passo 3 (rota no App A) vinha antes do passo 4 (base no App B).
Entre os dois, `gridcompliance.com/tiprojects` serviria um App B construído para
a raiz: o HTML pediria `/assets/*`, que no nosso domínio cai no static site do
Soluvia → **tela branca em produção**.

A ordem corrigida está abaixo.

### 6. O motivo para descartar segredo compartilhado estava errado

A proposta descartou segredo compartilhado porque "trafega em toda requisição".
Um HMAC **não trafega o segredo** — trafega o MAC. O argumento legítimo a favor
do Ed25519 é outro, e vale: com segredo simétrico, **quem tem a chave no App B
também pode forjar requisições que parecem vir do App A** — e são dois times em
duas contas. Por isso a Fase 2 mantém Ed25519, com o motivo certo.

### 7. "Mesma região" não procede

O App A serve de **NYC3** (visível no `x-amz-request-id`); vocês dizem NYC1. E o
tráfego vai pela internet pública nos dois casos.

---

## Fase 1 — subir a conexão (sem código novo)

### O que o App A faz

1. Componente `tiprojects-proxy` no app, a partir de `proxy-tiprojects/`.
2. Regra de ingress `/tiprojects` → esse componente, **antes** da regra `/`, com
   `preserve_path_prefix: true`.
3. Variáveis cifradas: `UPSTREAM`, `PROXY_SECRET`.
4. Variável `ISOLATION_CSP` — o isolamento da origem compartilhada, explicado na
   seção seguinte. É o item desta lista que não deveria ir para produção sem.

Sobre CSP no App A, para o registro: o Soluvia **tem** uma política, servida por
`<meta http-equiv>` no próprio documento, com `script-src 'self'`,
`object-src 'none'` e `connect-src` restrito. Ela não está em cabeçalho HTTP
porque **static site na App Platform não permite cabeçalho de resposta
customizado**. A consequência que importa aqui: `frame-ancestors` é ignorado
quando a CSP vem por `<meta>`, então `X-Frame-Options`/`frame-ancestors` do
Soluvia só serão possíveis se o SPA passar a ser servido por um componente de
serviço em vez do CDN — decisão separada desta.

O spec:

```yaml
services:
  - name: tiprojects-proxy
    dockerfile_path: proxy-tiprojects/Dockerfile
    source_dir: proxy-tiprojects
    instance_size_slug: basic-xxs
    instance_count: 1
    http_port: 8080
    envs:
      - key: UPSTREAM
        scope: RUN_TIME
        value: https://tiprojects-prod-nplrt.ondigitalocean.app
      - key: PROXY_SECRET
        scope: RUN_TIME
        type: SECRET
      - key: ISOLATION_CSP
        scope: RUN_TIME
        # A lista que o time do App B confirmou, com connect-src e form-action
        # por CAMINHO em vez de 'self' — ver RESPOSTA-AO-APP-B.md.
        value: >-
          default-src 'self'; script-src 'self';
          style-src 'self' 'unsafe-inline';
          font-src 'self' data:;
          img-src 'self' data: blob:;
          connect-src https://gridcompliance.com/tiprojects/;
          frame-ancestors 'self'; base-uri 'self'; object-src 'none';
          form-action https://gridcompliance.com/tiprojects/
    health_check:
      http_path: /_proxy-health

ingress:
  rules:
    - match:
        path:
          prefix: /tiprojects      # ANTES da regra "/"
      component:
        name: tiprojects-proxy
        preserve_path_prefix: true
```

### O que o App B faz

Só variáveis. Nenhuma linha de código.

| variável | valor | onde |
|---|---|---|
| `VITE_BASE_PATH` | `/tiprojects` | build time — **exige rebuild** |
| `VITE_API_URL` | `/tiprojects/api` | build time — **exige rebuild** |
| `FRONTEND_URL` | `https://gridcompliance.com/tiprojects` | runtime |
| `PROXY_SECRET` | o mesmo segredo | runtime, cifrada |

E confirmar duas coisas que já existem no commit `3a6879d`:

- a leitura de `X-Client-IP` continua ligada, usada no rate limit e na auditoria;
- o `X-Proxy-Secret` é exigido para que o `X-Client-IP` seja aceito.

**Não mexer nas regras de ingress do App B.** O proxy remove o prefixo antes de
repassar, então `/api` e o catchall de vocês continuam valendo como hoje.

### O que trocamos

| | de quem para quem | como |
|---|---|---|
| `PROXY_SECRET` | gerado por vocês | canal seguro — **nunca** repositório, chat ou ticket |
| URL do App B | vocês → nós | já temos: `tiprojects-prod-nplrt.ondigitalocean.app` |

---

---

## O risco da origem compartilhada é maior do que a proposta descreve — e tem conserto

A proposta diz, no item 7: *"um XSS em qualquer um dos dois expõe a sessão do
outro"*. **Não precisa de XSS.**

Medido no código do Soluvia: `POST /api/v1/auth/refresh` aceita **só o cookie
httpOnly**, sem token de CSRF e sem checar origem. `httpOnly` impede *ler* o
cookie, mas não impede *usá-lo*: qualquer script rodando no documento do TI
Projects está na **mesma origem** e pode chamar

```js
await fetch('/api/v1/auth/refresh', { credentials: 'include' })
```

e **ler a resposta**, que traz um access token válido do Soluvia — com acesso a
canal de denúncias, LGPD, auditoria e assinatura digital. Basta uma dependência
npm comprometida no build de vocês. Sem mitigação, toda a árvore de pacotes do
TI Projects aponta para a sessão do Soluvia, e o contrário também vale: um XSS no
Soluvia lê `ti-projects-auth` do localStorage.

### A mitigação, já implementada e testada

O proxy injeta uma CSP no documento do TI Projects restringindo `connect-src`
**por caminho**:

```
connect-src https://gridcompliance.com/tiprojects/; form-action https://gridcompliance.com/tiprojects/
```

`connect-src` aceita caminho, não só origem — isso costuma surpreender, então foi
verificado em navegador real, não presumido:

| fetch, a partir do documento do TI Projects | resultado |
|---|---|
| `/api/v1/auth/refresh` (API do Soluvia) | **bloqueado** pelo navegador |
| `/tiprojects/api/health` (API de vocês) | passou, 200 |

Mensagem do console no caso bloqueado: *"Connecting to '…/api/v1/auth/refresh'
violates the following Content Security Policy directive: `connect-src
…/tiprojects/`. The action has been blocked."*

A política é somada (`+`) à que o App B mandar, não substitui — duas CSPs valem
pela interseção. E a política **inteira** vem da variável de propósito: esvaziar
`ISOLATION_CSP` no painel desliga em segundos. Se fosse só a origem, esvaziar
geraria `connect-src ;`, que não desliga — **bloqueia tudo**.

### O que precisamos de vocês para isso

**A lista de todos os destinos que o front do TI Projects conecta** — API,
telemetria, CDN, websocket, mapa, qualquer coisa. Se algum estiver fora de
`/tiprojects/`, essa diretiva quebra o sistema de vocês em silêncio na tela (o
console acusa). Com a lista, incluímos os destinos na política.

**E isso não torna a origem compartilhada equivalente a um subdomínio.** Reduz o
vetor principal; não elimina a classe. O isolamento completo só vem com
`tiprojects.gridcompliance.com` — que, segundo a documentação da DigitalOcean, é
viável abrindo ticket no suporte para liberar o domínio entre as contas.

---

## Fase 2 — endurecer com Ed25519 (depois, opcional)

Vale, e o motivo é o do item 6 acima. Mas tem um custo que a proposta original
não previa: **Caddy não assina Ed25519.** Se a Fase 2 for adiante, o componente
proxy passa a ser um proxy em Node — e aí a seção 5.2 original de vocês
(`http-proxy-middleware` v3, `pathFilter`, `pathRewrite`, `changeOrigin`,
`on.proxyReq`) passa a valer literalmente, só que dentro de um componente
dedicado, não dentro do backend do Soluvia.

### A string canônica (a proposta chegou truncada aqui)

O texto que recebemos cortou exatamente nela. Sem definir o que a assinatura
cobre, o desenho não fecha: **se método e caminho ficarem fora, uma assinatura
capturada vale para qualquer rota pelos 60 s da janela** — e aí o `PROXY_ONLY`
não vale o que promete.

Nossa proposta, unida por `\n`, sem `\n` final:

```
X-TIP-v1
<MÉTODO em maiúsculas>
<caminho + query string, exatamente como chega no App B>
<key-id>
<timestamp unix em segundos>
<client-ip>
```

- **Método e caminho entram** — é o que impede reaproveitar uma assinatura em
  outra rota.
- **Corpo fica fora**, de propósito: é o que permite o upload passar em
  streaming. Integridade e sigilo ficam com o TLS; o usuário é autenticado pelo
  JWT.
- **Replay residual:** mesma rota, dentro de 60 s. Eliminar isso exigiria cache
  de nonce no App B. Na nossa leitura não compensa — mas é decisão de vocês, e
  queremos a resposta por escrito.

O resto do item 4 da proposta (rotação com chave atual + anterior, janela de
60 s, `PROXY_ONLY` com exceção para `GET /api/health`) está correto e não temos
objeção.

---

## Ordem de implantação corrigida

| # | lado | passo | por que nesta ordem |
|---|---|---|---|
| 0 | B | mandar a lista de destinos que o front conecta | sem ela a CSP de isolamento quebra o sistema de vocês |
| 2 | A | componente proxy + regra de ingress, **com `UPSTREAM` apontando para o App B** | `/tiprojects` ainda não é divulgado; dá para testar à vontade |
| 3 | B | trocar as 4 variáveis e **rebuildar** | aqui o App B quebra na URL `.ondigitalocean.app` dele — por minutos, e é a URL interna, não a pública |
| 4 | — | bateria de testes abaixo | |
| 5 | B | `PROXY_ONLY=true` | só depois de 4 passar inteiro |

O passo 3 vem **depois** do 2, e não antes: assim a janela de inconsistência cai
na URL interna de vocês, não em `gridcompliance.com`.

## Rollback

Na ordem inversa, e começando pelo lado A:

1. **A:** remover a regra de ingress `/tiprojects`. Isso já devolve
   `gridcompliance.com/tiprojects` ao catchall do Soluvia.
2. **B:** `PROXY_ONLY=false`.
3. **B:** remover `VITE_BASE_PATH`/`VITE_API_URL`, restaurar `FRONTEND_URL`,
   **rebuildar**. O App B volta a atender na própria URL.

A proposta original começava pelo lado B, o que deixaria a rota do App A
apontando para um App B em modo raiz — justamente a combinação que dá tela
branca.

## Testes de aceitação

| | o que tem de acontecer |
|---|---|
| `GET /tiprojects/api/health` | 200 do App B |
| `GET /tiprojects` | **308** para `/tiprojects/` |
| login | token salvo, dashboard abre |
| recarregar em `/tiprojects/dashboard` | abre a rota, não 404 nem tela branca |
| upload de cronograma `.mpp` | sobe e processa |
| "Esqueci minha senha" | o e-mail chega com link em `/tiprojects` |
| link do Portal do Cliente | abre dentro da base |
| rate limit | dispara por usuário, não para todos juntos |
| auditoria | registra o IP real do visitante, não o do ingress |
| cookie do Soluvia | **não** aparece nas requisições que chegam ao App B |
| console do TI Projects, navegando o sistema inteiro | **nenhuma** violação de CSP — se houver, falta um destino na lista |
| `fetch('/api/v1/auth/refresh')` do console do TI Projects | bloqueado pela CSP |

## O que já está provado do lado A

Testado em container antes de qualquer deploy, contra um servidor de eco e
contra um app real da DigitalOcean:

| | resultado |
|---|---|
| `caddy validate` | Valid configuration |
| `/tiprojects/` → App B | `/` |
| `/tiprojects/assets/index-a1b2c3.js` → App B | `/assets/index-a1b2c3.js` |
| `/tiprojects/dashboard` → App B | `/dashboard` |
| `/tiprojects/api/projects?page=2` → App B | `/api/projects?page=2` (query preservada) |
| `/tiprojects` | 308 |
| `/_proxy-health` | 200 |
| visitante mandando `X-Client-IP: 66.66.66.66` | chegou `203.0.113.7`, o valor real de `Do-Connecting-IP` |
| visitante mandando `X-Proxy-Secret: FALSIFICADO` | chegou o segredo do ambiente |
| visitante mandando `Cookie: soluvia_session=...` | chegou vazio |
| `Authorization: Bearer ...` | atravessou íntegro |
| `POST` com corpo | atravessou, 200 |
| log do proxy | sem segredo, sem cookie, sem Authorization |

## Perguntas que precisamos respondidas por escrito

1. Confirmam `/tiprojects` no plural em tudo — build, API, links de e-mail?
2. Confirmam a string canônica proposta acima, para a Fase 2?
3. Querem a Fase 1 com segredo compartilhado, ou preferem esperar o Ed25519 e
   subir tudo de uma vez?
4. O replay de 60 s na mesma rota é aceitável, ou exigem cache de nonce?
5. O App B tem CSP próprio? Se tiver, o `frame-ancestors` e o `connect-src`
   precisam considerar `gridcompliance.com`.
