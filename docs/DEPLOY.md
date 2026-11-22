# Deploy

## Web na Netlify (gratuito, recomendado para começar)

1. Acesse [app.netlify.com](https://app.netlify.com) e entre com a conta do GitHub.
2. **Add new site → Import an existing project → GitHub** e escolha `RParagon/tessaria`.
3. A Netlify lê o `netlify.toml` sozinha:
   - **build:** `npm ci && npm run build`;
   - **pasta publicada:** `dist`;
   - **Node:** 22.
4. Clique em **Deploy**. Em cerca de 1 minuto o jogo fica em `https://<nome>.netlify.app`.
5. **Domínio próprio (opcional):** Site configuration → Domain management.

Cada envio para `main` publica sozinho. Pull requests ganham uma prévia com link próprio.

O plano gratuito cobre 100 GB de tráfego por mês. O jogo tem cerca de 150 KB comprimidos por visita, o que dá centenas de milhares de acessos.

## VPS com Easypanel

O projeto tem três peças: **banco** (PostgreSQL), **servidor online** (`server/Dockerfile`, porta 2567) e **versão web** (`Dockerfile` da raiz, porta 80). A web também pode ficar na Netlify, e na VPS ficam só o banco e o servidor.

### 1. Banco

No projeto do Easypanel (por exemplo `tessaria`), crie um serviço **Postgres**. Copie a *Internal connection URL*, algo como `postgres://postgres:SENHA@tessaria_db:5432/tessaria`.

### 2. Servidor online

1. Crie um serviço **App** chamado `server`.
2. **Source → GitHub:** `RParagon/tessaria`, branch `main`.
3. **Build → Dockerfile**, arquivo `server/Dockerfile`. O contexto é a raiz do repositório.
4. **Environment:**

   | Variável | Obrigatória | Para quê |
   |---|---|---|
   | `DATABASE_URL` | sim | URL do Postgres do passo 1. As tabelas são criadas sozinhas na primeira subida. |
   | `CORS_ORIGINS` | sim | Endereços que podem abrir o jogo, separados por vírgula. Ex.: `https://jogo.seu-dominio.com,https://seu-site.netlify.app,https://localhost`. O `https://localhost` é o app Android. |
   | `TRUST_PROXY` | recomendada | `1` atrás do proxy do Easypanel, para os limites por IP usarem o IP real. Já é o padrão em produção. |
   | `GOOGLE_CLIENT_ID` | não | Liga o botão "Entrar com Google" (ID de cliente OAuth do tipo *Web* no Google Cloud). |
   | `METRICS_TOKEN` | não | Libera `GET /metrics` (Prometheus) com `Authorization: Bearer <token>`. Sem ele, a rota não existe. |
   | `MP_ACCESS_TOKEN` | para vender | **Access Token de produção** do Mercado Pago (Suas integrações → sua aplicação → Credenciais de produção). Liga a compra de Fios Dourados por Pix e cartão. **Segredo:** só no painel, nunca no repositório nem em conversa. |
   | `MP_WEBHOOK_SECRET` | recomendada | Assinatura secreta dos webhooks (Suas integrações → Webhooks). Com ela, o servidor recusa notificações sem `x-signature` válida. |
   | `PUBLIC_API_URL` | recomendada | Endereço público desta API, ex.: `https://api.seu-dominio.com`. O Mercado Pago chama `PUBLIC_API_URL/payments/mp/webhook`. Sem ela, é deduzido da requisição. |
   | `SITE_URL` | recomendada | Endereço do site do jogo, para onde o checkout volta (`?pagamento=ok`). Sem ela, usa a primeira origem de `CORS_ORIGINS` que não seja localhost. |
   | `DEV_PAYMENTS` | **nunca em produção** | `1` credita pacotes de Fios Dourados sem pagamento (só desenvolvimento e testes). Em produção é ignorado. |
   | `SESSION_DAYS` | não | Validade das sessões (padrão 30). |
   | `AUTH_PER_MINUTE` | não | Tentativas de login/cadastro por IP por minuto (padrão 12). |
   | `LOG_LEVEL` | não | `info` (padrão), `warn`, `debug`. |

5. **Domains:** um subdomínio (por exemplo `api.seu-dominio.com`) com HTTPS, apontando para a porta **2567**. O WebSocket da vila (`/ws`) passa pelo mesmo domínio.
6. Teste: `https://api.seu-dominio.com/health` deve responder `{"ok":true,...,"db":"ok"}`.

> Segredos (senha do banco, tokens) ficam só no painel do Easypanel. Nunca no repositório.

#### Mercado Pago (venda de Fios Dourados)

1. No [painel de desenvolvedor do Mercado Pago](https://www.mercadopago.com.br/developers/panel/app), crie uma aplicação do tipo **Checkout Pro** (pagamentos online).
2. Em **Credenciais de produção**, copie o **Access Token** e coloque em `MP_ACCESS_TOKEN` no Easypanel. A Public Key não é necessária (o checkout abre na página do Mercado Pago).
3. Em **Webhooks → Configurar notificações**, use a URL `https://SUA-API/payments/mp/webhook`, marque o evento **Pagamentos** e salve. Copie a **assinatura secreta** para `MP_WEBHOOK_SECRET`.
4. Defina `PUBLIC_API_URL` e `SITE_URL` e reinicie o serviço. `GET /season` passa a dizer `"payments":"mp"` e a loja do jogo mostra o botão **Comprar**.
5. Teste com um pacote pequeno. O servidor só credita depois de consultar o pagamento na API do Mercado Pago: aprovado, em reais e com o valor exato do pacote, uma única vez por pagamento (tabela `payments`). Estorno e chargeback tiram os Fios Dourados de volta (até zerar). Tudo fica no registro de auditoria (`mp_checkout`, `mp_credito`, `mp_estorno`).
6. Se um token vazar (por exemplo, colado num chat ou num commit), **renove-o** no painel do Mercado Pago na hora e troque no Easypanel.

No app Android a compra fica escondida: a Google Play exige o Google Play Billing para itens digitais. O jogador pode comprar pelo site com a mesma conta.

### 3. Versão web na VPS (opcional)

1. Outro **App**, Dockerfile da raiz, porta **80**.
2. Em **Build args**, defina `VITE_API_URL=https://api.seu-dominio.com`. O endereço do servidor entra no build.
3. Domínio com HTTPS e **Auto Deploy** ligado.

O nginx já vem configurado com compressão, cache longo para os arquivos com hash e revalidação do `index.html` (assim, atualizações chegam na hora).

### Tudo de uma vez com Docker Compose

Em qualquer VPS com Docker:

```bash
cp deploy/.env.example deploy/.env      # preencha senhas e endereços
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

### Netlify + servidor na VPS

Na Netlify, em **Site configuration → Environment variables**, crie `VITE_API_URL` com o endereço do servidor e faça um novo deploy. Inclua o endereço `https://<nome>.netlify.app` em `CORS_ORIGINS` do servidor.

O endereço padrão do servidor fica em `.env.production` e vale para o APK, a Netlify e o Docker quando `VITE_API_URL` não é definida. Sem nenhum dos dois, o jogo funciona normalmente, só que offline (o botão "Jogar online" não aparece).

### Backup do banco

No Easypanel, ative os backups do serviço Postgres. Ou, manualmente:

```bash
docker exec <container-do-postgres> pg_dump -U postgres tessaria | gzip > tessaria-$(date +%F).sql.gz
```

## Android

### APK de teste (sem instalar nada)

A cada envio para `main`, o GitHub Actions gera um APK:

1. **Actions → Android APK →** execução mais recente.
2. Baixe o artefato `fios-de-tessaria-debug-apk`.
3. Instale no celular. É preciso permitir a instalação de fontes desconhecidas.

### Compilar na sua máquina

Requer Android Studio, com JDK 21 e Android SDK 36.

```bash
npm install
npm run android:sync     # build web + copia para o projeto Android
npm run android:open     # abre no Android Studio → Run
```

O app abre em paisagem, em tela cheia imersiva, e não deixa a tela apagar durante o jogo. Isso está configurado em `android/app/src/main/AndroidManifest.xml` e em `MainActivity.java`.

### Versão para a Google Play

1. **Conta:** crie uma conta de desenvolvedor no [Google Play Console](https://play.google.com/console) (taxa única de US$ 25).
2. **Chave de assinatura:** gere uma chave e **guarde fora do repositório**:
   ```bash
   keytool -genkey -v -keystore tessaria-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias tessaria
   ```
3. **Assinatura no Gradle:** configure `signingConfigs` em `android/app/build.gradle`, lendo a senha de variáveis de ambiente. No CI, use *secrets* do GitHub.
4. **Pacote:** gere o pacote com `./gradlew bundleRelease` (arquivo `.aab`) e envie para um teste interno no Play Console.
5. **Versão:** a cada lançamento, suba `versionCode` e `versionName` em `android/app/build.gradle`.

## Checklist antes de publicar uma versão

- [ ] `npm test` e `npm run test:server` passando (e `npm run test:balance`, se mexeu em combate)
- [ ] `npm run typecheck` sem erros
- [ ] `version` atualizada no `package.json` e entrada nova no `CHANGELOG.md`
- [ ] Testado no celular na horizontal (toque, menus, bolsa)
- [ ] Online: `/health` do servidor ok, login de convidado e vila funcionando no endereço publicado
