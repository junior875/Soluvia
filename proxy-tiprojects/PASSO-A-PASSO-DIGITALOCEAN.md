# Passo a passo no painel da DigitalOcean

O que fazer no app **soluvia** (conta X) para criar o proxy. ~10 minutos.

**Antes de começar:** ter o `PROXY_SECRET` que o time do TI Projects vai mandar.
Dá para criar o componente sem ele e preencher depois, mas aí o TI Projects
recusa o IP que o proxy manda, e o rate limit deles fica errado.

A branch `tiprojects` **já está no GitHub** — é de lá que a DigitalOcean vai
construir.

---

## Caminho recomendado: editar o App Spec direto

Prefira este ao de telas. Motivo: a interface de componentes **não deixa
controlar a ordem das regras de rota**, e a ordem é exatamente o que garante que
`/tiprojects` não seja engolido pelo catchall do site do Soluvia. No YAML você vê
e controla.

1. `cloud.digitalocean.com` → **Apps** → **soluvia**
2. Aba **Settings** → role até **App Spec** → **Edit**
3. Acrescente este bloco na lista `services:` (se já existir `services:`, é só
   mais um item; se não existir, crie a chave):

```yaml
services:
  - name: tiprojects-proxy
    github:
      repo: junior875/Soluvia
      branch: tiprojects
      deploy_on_push: true
    dockerfile_path: proxy-tiprojects/Dockerfile
    source_dir: proxy-tiprojects
    instance_size_slug: basic-xxs
    instance_count: 1
    http_port: 8080
    health_check:
      http_path: /_proxy-health
    envs:
      - key: UPSTREAM
        scope: RUN_TIME
        value: https://tiprojects-prod-nplrt.ondigitalocean.app
      - key: ISOLATION_CSP
        scope: RUN_TIME
        value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src https://gridcompliance.com/tiprojects/; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action https://gridcompliance.com/tiprojects/"
      - key: PROXY_SECRET
        scope: RUN_TIME
        type: SECRET
        value: COLE-O-SEGREDO-AQUI
```

4. Na seção `ingress:`, acrescente a regra **antes** da regra que serve `/`:

```yaml
ingress:
  rules:
    - match:
        path:
          prefix: /tiprojects
      component:
        name: tiprojects-proxy
        preserve_path_prefix: true

    # ... aqui continuam as regras que já existiam, com a de "/" por último
```

5. **Save**. A DigitalOcean valida o YAML e mostra o que vai mudar — **leia o
   diff antes de confirmar**. O único componente afetado deve ser o novo.
6. Confirme o deploy.

### Se a DigitalOcean recusar `basic-xxs`

Ela renomeou os planos. Troque pelo slug que a interface mostrar para o menor
plano **Basic** (512 MB / 1 vCPU compartilhado, US$ 5/mês).

---

## Caminho pelas telas, se preferir

Os rótulos mudam de tempos em tempos; o que importa é o valor.

| campo | valor |
|---|---|
| Create → **Create/Attach Component** | **Service** |
| Source | GitHub → `junior875/Soluvia` |
| **Branch** | **`tiprojects`** ← não é a `main` |
| Source Directory | `/proxy-tiprojects` |
| Autodeploy | pode deixar ligado |
| Build | a DO detecta o **Dockerfile** sozinho |
| Plan | **Basic**, 512 MB / 1 vCPU — US$ 5/mês |
| Instance count | 1 |
| HTTP Port | `8080` |
| HTTP Routes | `/tiprojects` |
| Health check | HTTP, path `/_proxy-health` |
| Environment variables | as três abaixo |

**As três variáveis** (todas RUN_TIME):

```
UPSTREAM
https://tiprojects-prod-nplrt.ondigitalocean.app
```

```
ISOLATION_CSP
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src https://gridcompliance.com/tiprojects/; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action https://gridcompliance.com/tiprojects/
```

```
PROXY_SECRET
(o segredo deles — marque Encrypt)
```

**Depois de criar pela interface**, volte em Settings → App Spec e **confirme que
a regra `/tiprojects` está antes da regra `/`**. Se não estiver, mova — é o item
que a interface não controla.

---

## O que conferir quando o deploy terminar

| comando | esperado |
|---|---|
| `curl -s -o /dev/null -w "%{http_code}" https://gridcompliance.com/tiprojects/api/health` | `200` |
| `curl -s https://gridcompliance.com/tiprojects/api/health` | JSON com `"status":"ok"` |
| `curl -s -o /dev/null -w "%{http_code}" https://gridcompliance.com/tiprojects` | `308` |
| `curl -sI https://gridcompliance.com/ \| grep -i last-modified` | **a mesma data de antes** — o site do Soluvia não pode ter sido tocado |
| abrir `https://gridcompliance.com` no navegador | tudo normal |

**`https://gridcompliance.com/tiprojects/` vai dar tela branca** nesta etapa, e
está certo: o TI Projects ainda está construído para a raiz. Some quando eles
fizerem o passo 3 (trocar as variáveis e rebuildar). A API já responde porque não
depende do `base`.

## Se algo der errado

Remova a regra de ingress `/tiprojects` do App Spec e salve. `/tiprojects` volta
a cair no catchall do Soluvia em segundos, como hoje. O componente pode ficar
parado ali sem atrapalhar — ele só recebe o que a regra mandar.

Nada do que está aqui altera o site do Soluvia: o static site continua na `main`,
com o mesmo build, e nenhuma variável existente é tocada.
