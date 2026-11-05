# Resposta às respostas do time do TI Projects

Fechado nos pontos 1 a 4. Um item do 5 precisa mudar antes de vocês começarem, e
há dois alertas que podem deixar a tela branca no dia do deploy.

**Podem iniciar o desenvolvimento.** Nada do que está abaixo bloqueia vocês — o
que muda está do nosso lado.

---

## O que está fechado

| | |
|---|---|
| **1. Plural** | `/tiprojects` em tudo. Nosso lado já foi renomeado. |
| **2. String canônica** | confirmada para a Fase 2, como escrita |
| **3. Fase 1 com segredo compartilhado** | combinado. Confirmamos do nosso lado: o proxy **define** `X-Client-IP` e `X-Proxy-Secret`, sobrescrevendo o que o visitante mandar — testado com um cliente tentando falsificar os dois |
| **4. Replay de 60 s** | aceito, com a justificativa de vocês |

## A correção de vocês no Caddyfile: aceita, e era bug mesmo

A sugestão de `handle_path /tiprojects/*` em vez de `/tiprojects*` está certa.
Corrigido e testado:

| pedido | antes | agora |
|---|---|---|
| `/tiprojects/` | repassado | repassado ✅ |
| `/tiprojects/api/x` | repassado como `/api/x` | igual ✅ |
| `/tiprojectsMALICIOSO` | **repassado com caminho torto** | **404, não repassa** ✅ |
| `/tiprojects-outro` | **repassado** | **404, não repassa** ✅ |
| `/tiprojects` | 308 → `/tiprojects/` | igual ✅ |

Obrigado — isso só aparece lendo o arquivo de verdade.

---

## O que precisa mudar na CSP que vocês propuseram

### `connect-src 'self'` anula a proteção inteira

`'self'` é a **origem toda**, e na origem compartilhada isso inclui
`/api/v1/*` do Soluvia.

O problema concreto, medido no código do Soluvia: `POST /api/v1/auth/refresh`
aceita **só o cookie httpOnly**, sem token de CSRF e sem checar origem.
`httpOnly` impede *ler* o cookie, mas não impede *usá-lo*. Com `connect-src
'self'`, qualquer script no documento de vocês pode fazer

```js
await fetch('/api/v1/auth/refresh', { credentials: 'include' })
```

e **ler a resposta**, que traz um access token válido do Soluvia — canal de
denúncias, LGPD, auditoria, assinatura digital. Não precisa de XSS: basta uma
dependência npm comprometida no build de vocês.

**`connect-src` aceita caminho, não só origem.** Trocando `'self'` pelo prefixo,
o fetch de vocês continua passando e o do Soluvia é barrado. Verificado em
navegador real, não presumido:

| fetch do documento do TI Projects | resultado |
|---|---|
| `/api/v1/auth/refresh` | **bloqueado** — *"Refused to connect because it violates the document's Content Security Policy"* |
| `/tiprojects/api/health` | passou, 200 |

### A CSP final

É a de vocês, com duas diretivas trocadas por caminho:

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob:;
connect-src https://gridcompliance.com/tiprojects/;
frame-ancestors 'self';
base-uri 'self';
object-src 'none';
form-action https://gridcompliance.com/tiprojects/
```

Ela é **somada** à que vocês mandarem, não substitui — se um dia o App B passar a
enviar CSP própria, as duas valem pela interseção. E vem inteira de uma variável:
esvaziar desliga em segundos, se quebrar alguma coisa.

Uma observação honesta: isso **reduz o vetor principal, não elimina a classe**.
`'self'` nunca isola nada em origem compartilhada — `script-src 'self'` também
deixa os dois documentos carregarem scripts um do outro. O isolamento completo só
vem com `tiprojects.gridcompliance.com`, que a documentação da DigitalOcean diz
ser possível abrindo ticket no suporte para liberar o domínio entre as contas.

---

## Dois alertas que podem deixar a tela branca

### 1. `script-src 'self'` bloqueia script inline

Descobri testando: a página que usei para validar tinha um `<script>` inline e
**foi bloqueada**, com a mensagem pedindo `'unsafe-inline'`, um hash ou um nonce.

Build Vite normalmente gera `<script type="module" src="/assets/…">`, externo e
sem problema — mas **confiram o `index.html` de vocês**. Qualquer `<script>`
inline (analytics, flag de ambiente, polyfill de preload, tema inicial) morre em
silêncio: a página carrega e não faz nada.

Se houver e não der para tirar, nos digam — a saída é hash ou nonce, não
`'unsafe-inline'`, que devolveria a brecha.

### 2. Worker com `blob:` não está coberto

A lista de vocês não tem `worker-src`, então vale o `default-src 'self'` — e
worker criado a partir de `blob:` **é bloqueado**. Se o build usa web worker
(alguns plugins do Vite usam), precisamos de `worker-src 'self' blob:`.

O Soluvia precisou exatamente disso por causa do pdf.js. Vale conferir antes.

---

## Dois pontos menores

**Google Fonts.** Aceito, está na CSP. Só registrando: o Soluvia auto-hospeda as
fontes de propósito (`@fontsource`), porque o canal de denúncias não pode buscar
recurso de terceiro — um denunciante anônimo entregaria IP e User-Agent ao
Google. Isso **não** acontece com vocês, porque são documentos diferentes e
ninguém chega ao canal por `/tiprojects`. Mas, com o domínio compartilhado, o
Google passa a ver `gridcompliance.com` nos logs dele. Se for fácil migrar para
`@fontsource`, some uma dependência externa e a página fica mais rápida. Não
bloqueia nada.

**`.mpp`/`.pod` sem Java em produção.** Anotado, usaremos `.xml` no teste de
aceitação. Mas isso é um bug de produção de vocês que vale resolver antes da
divulgação: quem tentar importar um `.mpp` vai achar que o problema é o endereço
novo, e o chamado cai na conta do proxy.

---

## O que ainda falta de vocês

1. **`PROXY_SECRET`**, por canal seguro — não repositório, não chat, não ticket.
2. **Confirmação** de que o front não conecta em nada fora de `/tiprojects/`
   (telemetria, websocket, CDN de dados). A CSP de vocês dizia `connect-src
   'self'`, o que não revela os destinos.
3. **Resposta aos dois alertas** acima: há script inline? há web worker?

## O que está pronto do nosso lado

O proxy, testado em container contra um app real da DigitalOcean e contra um
servidor de eco, antes de qualquer deploy: o mapeamento dos cinco caminhos com
query preservada, o 308, o descarte de `/tiprojectsQUALQUERCOISA`, a sobrescrita
do IP e do segredo contra um cliente falsificando ambos, o cookie do Soluvia
barrado, o `Authorization` atravessando, `POST` com corpo atravessando, o log sem
segredo e a CSP de isolamento verificada em navegador.

Falta aplicar o componente e a regra de ingress no painel da DigitalOcean — e o
`PROXY_SECRET` de vocês para ligar.
