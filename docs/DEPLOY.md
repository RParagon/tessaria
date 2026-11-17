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

Use quando quiser tudo na sua máquina. Na Fase 1, o servidor do jogo entra no mesmo projeto.

1. No Easypanel, crie um projeto (por exemplo `tessaria`) e dentro dele um serviço **App**.
2. **Source → GitHub:** repositório `RParagon/tessaria`, branch `main`.
3. **Build → Dockerfile.** O `Dockerfile` da raiz compila o jogo e serve com nginx (`deploy/nginx.conf`).
4. **Domains:** aponte um domínio ou subdomínio e ative o HTTPS automático. A porta do container é **80**.
5. Ative **Auto Deploy** para publicar a cada envio para `main`.

O nginx já vem configurado com compressão, cache longo para os arquivos com hash e revalidação do `index.html` (assim, atualizações chegam na hora).

**Na Fase 1:**
- **Servidor do jogo:** um segundo App (Node, porta 2567) no mesmo projeto.
- **Banco:** um serviço PostgreSQL do próprio Easypanel.
- **Ligação entre eles:** o cliente web aponta para o servidor por uma variável de ambiente no build.

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

- [ ] `npm test` passando (e `npm run test:balance`, se mexeu em combate)
- [ ] `version` atualizada no `package.json` e entrada nova no `CHANGELOG.md`
- [ ] Testado no celular na horizontal (toque, menus, bolsa)
