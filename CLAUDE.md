# Fios de Tessária: notas para agentes

- Idioma do jogo e da documentação: português do Brasil.
- O código do jogo está em `src/game/`. Os arquivos **compartilham um único escopo**, montado na ordem de `src/game/manifest.json` pelo plugin em `vite.config.js`. Não use `import`/`export` dentro de `src/game/` até a migração para módulos (início da Fase 2, ver `docs/ARCHITECTURE.md`).
- **Armadilha:** dentro de `buildWorld(key, G)` (`world/regions.js`), `G` é o parâmetro do mapa, não o estado do jogo. Para ler o save ali dentro, use `gsave()`.
- **Testes:** `npm test` (build de teste + Playwright). O gancho `window.__T` só existe em dev ou com `?debug=1`. Mudanças de combate pedem `npm run test:balance`.
- **WebGL sem GPU nos testes:** o Chromium roda com SwiftShader (ver `playwright.config.js`). Se houver um Chromium já instalado num caminho próprio, use `PW_CHROMIUM_PATH`.
- **Versão:** `package.json` → aparece no título e no menu. Registre mudanças em `CHANGELOG.md`.
- **Online:** cliente em `src/net/` (TypeScript), servidor em `server/`, regras comuns em `shared/`. O jogo fala com o online só por `window.TessNet` (classe `Net`) e expõe `window.TessGame` em `src/game/net/remote.js`.
- **Regras duplicadas:** `shared/items.ts` espelha `makeItem`/aprimoramento do jogo. Se mexer em atributos de itens, ajuste os dois; o teste "itens gerados pelo jogo passam pelas regras do servidor" pega a diferença.
- **Testes do servidor:** `npm run test:server`; com `TEST_DATABASE_URL=postgres://...` também roda contra PostgreSQL. `npm test` sobe o servidor em memória na porta 2599 (ver `.env.test`). Rode `npm run typecheck` antes de commitar.
- **Segredos:** nunca no repositório. Variáveis do servidor em `docs/DEPLOY.md`; exemplo em `deploy/.env.example`.
