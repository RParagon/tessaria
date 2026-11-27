# Fios de Tessária: notas para agentes

- Idioma do jogo e da documentação: português do Brasil.
- O código do jogo está em `src/game/`, montado na ordem de `src/game/manifest.json` pelo plugin em `vite.config.js`. **Migração para módulos em andamento (Fase 2):**
  - entradas `{ "module": "..." }` no manifesto são **módulos ES de verdade** (importam o que usam, com `export` no que oferecem); os nomes exportados entram no escopo único para os arquivos antigos;
  - entradas em texto simples continuam concatenadas num **escopo único**: nelas, não use `import`/`export`;
  - um módulo não pode usar nomes do escopo único (`P`, `RG`, `enemies`…); `npm run typecheck` confere isso (`tools/check-modules.mjs`). Não exporte `let` que arquivos antigos reatribuem.
- **Armadilha:** dentro de `buildWorld(key, G)` (`world/regions.js`), `G` é o parâmetro do mapa, não o estado do jogo. Para ler o save ali dentro, use `gsave()`.
- **Testes:** `npm test` (build de teste + Playwright). O gancho `window.__T` só existe em dev ou com `?debug=1`. Mudanças de combate pedem `npm run test:balance`.
- **WebGL sem GPU nos testes:** o Chromium roda com SwiftShader (ver `playwright.config.js`). Se houver um Chromium já instalado num caminho próprio, use `PW_CHROMIUM_PATH`.
- **Versão:** `package.json` → aparece no título e no menu. Registre mudanças em `CHANGELOG.md` e mantenha o `README.md` em dia (selo de versão, lista de recursos, seção online/co-op).
- **Online:** cliente em `src/net/` (TypeScript), servidor em `server/`, regras comuns em `shared/`. O jogo fala com o online só por `window.TessNet` (classe `Net`) e expõe `window.TessGame` em `src/game/net/remote.js`.
- **Itens:** o gerador (`makeItem`, `rollRar`, nomes, afixos, lendários) e as regras ficam só em `shared/items.ts`. O jogo usa via `window.TessItems` (ponte em `src/items-bridge.ts`, importada antes do jogo); o servidor usa direto. O aprimoramento e a reforja ainda estão no jogo: se mexer neles, confira `statCap`.
- **Co-op:** `src/game/net/coop.js` (anfitrião simula; ganchos marcados com `co-op:` em hurtEnemy, hurtBoss, hurtPlayer, updateTelegraphs, projéteis, gatilhos das salas e laço principal). Plano e regras em `docs/ONLINE.md`.
- **Testes do servidor:** `npm run test:server`; com `TEST_DATABASE_URL=postgres://...` também roda contra PostgreSQL. `npm test` sobe o servidor em memória na porta 2599 (ver `.env.test`). Rode `npm run typecheck` antes de commitar.
- **Segredos:** nunca no repositório. Variáveis do servidor em `docs/DEPLOY.md`; exemplo em `deploy/.env.example`.
