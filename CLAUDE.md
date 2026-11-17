# Fios de Tessária: notas para agentes

- Idioma do jogo e da documentação: português do Brasil.
- O código do jogo está em `src/game/`. Os arquivos **compartilham um único escopo**, montado na ordem de `src/game/manifest.json` pelo plugin em `vite.config.js`. Não use `import`/`export` dentro de `src/game/` até a migração da Fase 1 (ver `docs/ARCHITECTURE.md`).
- **Armadilha:** dentro de `buildWorld(key, G)` (`world/regions.js`), `G` é o parâmetro do mapa, não o estado do jogo. Para ler o save ali dentro, use `gsave()`.
- **Testes:** `npm test` (build de teste + Playwright). O gancho `window.__T` só existe em dev ou com `?debug=1`. Mudanças de combate pedem `npm run test:balance`.
- **WebGL sem GPU nos testes:** o Chromium roda com SwiftShader (ver `playwright.config.js`). Se houver um Chromium já instalado num caminho próprio, use `PW_CHROMIUM_PATH`.
- **Versão:** `package.json` → aparece no título e no menu. Registre mudanças em `CHANGELOG.md`.
