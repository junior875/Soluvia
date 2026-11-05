# `gridcompliance.com/tiprojects` servido de outra conta da DigitalOcean

O site do TI Projects vai viver em outra conta. A URL tem de continuar sendo
`gridcompliance.com/tiprojects`. Este componente é a peça que falta.

> **O plano de execução** — as duas fases, o que cabe a cada time, a ordem de
> implantação, o rollback e os testes de aceitação — está em
> [`PLANO-DE-CONEXAO.md`](PLANO-DE-CONEXAO.md). Este arquivo explica **por que**
> a arquitetura é esta; o plano diz **o que fazer**.

## O que decide a arquitetura

A App Platform **não faz proxy para fora do app**. Ela roteia por caminho apenas
entre componentes do mesmo app — o campo do spec é literalmente
`component.name`, que só resolve dentro do app. Para um host externo, o único
recurso é `redirect`, que troca a URL na barra do navegador.

Então, para manter `/tiprojects` na barra, alguém tem de proxiar. Só existem dois
lugares para pôr esse alguém.

| | Onde fica o proxy | DNS do domínio | Custo | O que arrisca |
|---|---|---|---|---|
| **Escolhido** | componente neste app | fica na DigitalOcean, intacto | US$ 5/mês | um deployment novo do app |
| Plano B | Worker da Cloudflare | **move para a Cloudflare** | US$ 0 até 100 mil req/dia | MX, SPF, DKIM e a renovação do certificado |

**Por que não o Worker, que é de graça:** mover o DNS do `gridcompliance.com`
para a Cloudflare põe em risco coisas que o Soluvia usa e que não têm nada a ver
com o TI Projects — os registros de e-mail (MX, SPF, DKIM: se um se perde na
importação, o sistema para de mandar e-mail e ninguém percebe na hora) e a
renovação automática do certificado, que hoje a DO faz sozinha. US$ 5/mês compra
a ausência desse risco. O plano B está escrito no fim, caso o custo pese.

**O que não funciona, e por quê** (já verificado, para ninguém tentar de novo):

- *Origin Rules* da Cloudflare fariam isso em duas linhas, mas o override de
  origem (DNS record / Host header) é **só plano Enterprise**.
- Rota do App Platform apontando para outro app: `component.name` não alcança
  fora do app.
- `redirect` do App Platform: muda a URL, que é justamente o que não pode.

## A pegadinha que derruba isso — resolver antes de construir o site

**O site do TI Projects tem de ser construído para o subcaminho.** Se for Vite ou
Next sem isso, os assets saem como `/assets/...` absoluto, caem no SPA do
Soluvia e o visitante vê **tela branca**.

| stack | o que setar |
|---|---|
| Vite | `base: '/tiprojects/'` em `vite.config.ts` |
| Next | `basePath: '/tiprojects'` em `next.config.js` |
| React Router | `basename="/tiprojects"` |

Teste local antes de subir: `vite build && vite preview` e abrir
`http://localhost:4173/tiprojects/`. Se a tela aparece, o deploy vai funcionar.

**Segunda pegadinha: cookie e localStorage são do domínio, não do caminho.**
Dois sistemas de login no mesmo domínio brigam pela sessão. No TI Projects, usar
`Path=/tiprojects` no cookie e um nome próprio (não `session`, não `token`), e
prefixo próprio nas chaves de localStorage.

## Como ligar

1. **Na outra conta:** subir o app do TI Projects e anotar o endereço
   `<app>.ondigitalocean.app`. Não precisa de domínio custom nele.
2. **Neste app:** adicionar um componente *service* a partir deste diretório,
   com a variável de ambiente `UPSTREAM` igual àquele endereço (com `https://`).
3. **Ingress:** a regra de `/tiprojects` **antes** da regra do site estático, com
   o prefixo preservado.

O trecho do app spec:

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
        value: https://SEU-APP-AQUI.ondigitalocean.app
      - key: PROXY_SECRET
        scope: RUN_TIME
        type: SECRET
    health_check:
      http_path: /_proxy-health

ingress:
  rules:
    - match:
        path:
          prefix: /tiprojects
      component:
        name: tiprojects-proxy
        preserve_path_prefix: true   # sem isto a DO corta o /tiprojects
```

`preserve_path_prefix: true` é obrigatório: **por padrão a App Platform corta o
prefixo** antes de encaminhar — `/tiprojects/sobre` chegaria como `/sobre`, e o
site construído com `base: '/tiprojects/'` quebraria.

## Já testado

O mecanismo foi validado localmente contra um app real da DigitalOcean, antes de
qualquer deploy:

```
docker build -t tiprojects-proxy .
docker run -d -p 8099:8080 -e UPSTREAM=https://soluvia-ltgst.ondigitalocean.app tiprojects-proxy
```

| | resultado |
|---|---|
| `GET /_proxy-health` | `200` |
| `GET /tiprojects` | `200`, com `x-do-app-origin` do app de destino |
| `GET /outra-coisa` | `404` |

O `Caddyfile` passa em `caddy validate`.

## Plano B: Worker da Cloudflare

Se os US$ 5/mês pesarem. **Antes de trocar os nameservers, exportar a zona atual
da DO e conferir registro por registro na Cloudflare** — em especial MX, SPF e
DKIM. É aí que o e-mail do sistema morre em silêncio.

```js
export default {
  async fetch(request) {
    const url = new URL(request.url)
    url.hostname = 'SEU-APP-AQUI.ondigitalocean.app'
    return fetch(new Request(url, request))
  },
}
```

Rota do Worker: `gridcompliance.com/tiprojects*`. SSL na Cloudflare em
**Full (strict)**, e uma regra de bypass de cache para
`/.well-known/acme-challenge/*`, senão a DO pode falhar ao renovar o
certificado.
