# `gridcompliance.com/tiproject` servido de outra conta da DigitalOcean

O site do tiproject vai viver em outra conta. A URL tem de continuar sendo
`gridcompliance.com/tiproject`. Este componente é a peça que falta.

## O que decide a arquitetura

A App Platform **não faz proxy para fora do app**. Ela roteia por caminho apenas
entre componentes do mesmo app — o campo do spec é literalmente
`component.name`, que só resolve dentro do app. Para um host externo, o único
recurso é `redirect`, que troca a URL na barra do navegador.

Então, para manter `/tiproject` na barra, alguém tem de proxiar. Só existem dois
lugares para pôr esse alguém.

| | Onde fica o proxy | DNS do domínio | Custo | O que arrisca |
|---|---|---|---|---|
| **Escolhido** | componente neste app | fica na DigitalOcean, intacto | US$ 5/mês | um deployment novo do app |
| Plano B | Worker da Cloudflare | **move para a Cloudflare** | US$ 0 até 100 mil req/dia | MX, SPF, DKIM e a renovação do certificado |

**Por que não o Worker, que é de graça:** mover o DNS do `gridcompliance.com`
para a Cloudflare põe em risco coisas que o Soluvia usa e que não têm nada a ver
com o tiproject — os registros de e-mail (MX, SPF, DKIM: se um se perde na
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

**O site do tiproject tem de ser construído para o subcaminho.** Se for Vite ou
Next sem isso, os assets saem como `/assets/...` absoluto, caem no SPA do
Soluvia e o visitante vê **tela branca**.

| stack | o que setar |
|---|---|
| Vite | `base: '/tiproject/'` em `vite.config.ts` |
| Next | `basePath: '/tiproject'` em `next.config.js` |
| React Router | `basename="/tiproject"` |

Teste local antes de subir: `vite build && vite preview` e abrir
`http://localhost:4173/tiproject/`. Se a tela aparece, o deploy vai funcionar.

**Segunda pegadinha: cookie e localStorage são do domínio, não do caminho.**
Dois sistemas de login no mesmo domínio brigam pela sessão. No tiproject, usar
`Path=/tiproject` no cookie e um nome próprio (não `session`, não `token`), e
prefixo próprio nas chaves de localStorage.

## Como ligar

1. **Na outra conta:** subir o app do tiproject e anotar o endereço
   `<app>.ondigitalocean.app`. Não precisa de domínio custom nele.
2. **Neste app:** adicionar um componente *service* a partir deste diretório,
   com a variável de ambiente `UPSTREAM` igual àquele endereço (com `https://`).
3. **Ingress:** a regra de `/tiproject` **antes** da regra do site estático, com
   o prefixo preservado.

O trecho do app spec:

```yaml
services:
  - name: tiproject-proxy
    dockerfile_path: proxy-tiproject/Dockerfile
    source_dir: proxy-tiproject
    instance_size_slug: basic-xxs
    instance_count: 1
    http_port: 8080
    envs:
      - key: UPSTREAM
        scope: RUN_TIME
        value: https://SEU-APP-AQUI.ondigitalocean.app
    health_check:
      http_path: /_proxy-health

ingress:
  rules:
    - match:
        path:
          prefix: /tiproject
      component:
        name: tiproject-proxy
        preserve_path_prefix: true   # sem isto a DO corta o /tiproject
```

`preserve_path_prefix: true` é obrigatório: **por padrão a App Platform corta o
prefixo** antes de encaminhar — `/tiproject/sobre` chegaria como `/sobre`, e o
site construído com `base: '/tiproject/'` quebraria.

## Já testado

O mecanismo foi validado localmente contra um app real da DigitalOcean, antes de
qualquer deploy:

```
docker build -t tiproject-proxy .
docker run -d -p 8099:8080 -e UPSTREAM=https://soluvia-ltgst.ondigitalocean.app tiproject-proxy
```

| | resultado |
|---|---|
| `GET /_proxy-health` | `200` |
| `GET /tiproject` | `200`, com `x-do-app-origin` do app de destino |
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

Rota do Worker: `gridcompliance.com/tiproject*`. SSL na Cloudflare em
**Full (strict)**, e uma regra de bypass de cache para
`/.well-known/acme-challenge/*`, senão a DO pode falhar ao renovar o
certificado.
