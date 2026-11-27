# Arquitetura

Este documento descreve como o jogo está organizado hoje (versão 0.10: aventura no aparelho + fundação online) e para onde ele vai nas próximas fases.

## Hoje

### Montagem do código

O jogo nasceu como um protótipo em arquivo único. Na Fase 0 ele foi dividido em 26 arquivos por domínio, dentro de `src/game/`. Esses arquivos **ainda compartilham um único escopo**: o plugin `tessaria-game` (em `vite.config.js`) os concatena na ordem de `src/game/manifest.json`, dentro de uma função, e gera um source map por arquivo. Na prática:

- uma função ou constante declarada num arquivo é visível em todos os outros;
- **a ordem do manifesto importa** para código que roda na hora em que é carregado (constantes e tabelas). Funções podem ser chamadas antes da posição em que foram declaradas;
- erros e o depurador apontam para o arquivo e a linha originais.

Isso permitiu separar o código sem mudar uma linha de comportamento. A troca para módulos ES independentes abre a Fase 2 (ver abaixo). O código novo da Fase 1 (`src/net/`, `shared/`, `server/`) já nasceu em módulos TypeScript.

O build define duas constantes:

| Constante | Valor |
|---|---|
| `__DEV__` | `true` no `vite dev`, `false` nos builds |
| `__VERSION__` | versão do `package.json`, mostrada no título e no menu |
| `__APP_VERSION__` | a mesma versão, para o código em `src/net/` |

O gancho de testes `window.__T` só existe em dev ou com `?debug=1`. O avaliador `__T.ev`, que executa código dentro do escopo do jogo, só entra no build de teste (`npm run build:test`). Ele é removido do build de produção, o que também permite minificar tudo.

### Mapa dos arquivos

| Pasta | Conteúdo |
|---|---|
| `boot/` | atalhos de DOM, contexto WebGL2, versão |
| `engine/` | matemática, ruído, PRNG, materiais e o gerador de splats `SplatSet` |
| `data/` | paletas por região e itens (raridades, nomes, lendários) |
| `render/` | ícones, shaders, modelos procedurais, partículas, poses e render do quadro |
| `world/` | regiões e lore, geração de mapas (salas e corredores, Fendas, Ermos) e construção do mundo em splats |
| `core/` | estado e save, jogador, inimigos, projéteis, chefes, interação, progressão e economia, loop |
| `content/` | história, diálogos e finais |
| `ui/` | HUD, menus, toasts, minimapa |
| `input/` | teclado, mouse, toque e joystick |
| `audio/` | efeitos sintetizados e música procedural |
| `net/` | ponte com o modo online: jogadores remotos, nomes e balões, correio online e a API `window.TessGame` |

### Render

1. **Modelos:** cada personagem é construído por código como um conjunto de splats (`ell`, `tube`, `cone`, `box`, `mem`) presos a ossos. A animação é feita por transformações de osso calculadas em `render/poses.js`.
2. **Passo 1:** os splats vão para um framebuffer em baixa resolução, guardando material, sombreamento, brilho e profundidade.
3. **Passo 2:** um shader de pós-processamento aplica a paleta da região (5 tons por material), o pontilhado Bayer 4×4, o contorno de 1 pixel, o fade e a vinheta de dano.
4. **O mundo** é construído uma vez por região e dividido em blocos (chunks), que são descartados quando estão fora da câmera.

### Save

O save fica em `localStorage`, com a chave `fios-de-tessaria-v1`: um JSON com personagem, nível, itens, baú, missões, feitos e configurações. No modo online, ele também vai para a nuvem e é validado pelo servidor (ver abaixo).

## Online: o que já existe (Fase 1)

```
 Navegador / app Android                         server/ (Node 22 + TypeScript)
 ┌──────────────────────────────┐   HTTPS (JSON)  ┌───────────────────────────────┐
 │ src/game/  jogo (escopo único)│ ──────────────▶ │ Fastify: contas, save, correio│
 │   net/remote.js ◀─TessGame──┐ │                 │   telemetria, /health /metrics│
 │ src/net/   online.ts (Net) ─┘ │   WebSocket /ws │ hub.ts: Vila Brasa online     │
 │            ui.ts (telas, chat)│ ◀─────────────▶ │   salas de 40, 10 snapshots/s │
 └──────────────────────────────┘                 └──────────────┬────────────────┘
          shared/ (mesmas regras dos dois lados)                │
          text.ts · items.ts · save.ts · protocol.ts      PostgreSQL (ou memória em dev)
```

### Peças

| Onde | O quê |
|---|---|
| `shared/text.ts` | filtro de palavras (com leet, letras repetidas e acentos), limpeza de chat, regras de nome |
| `shared/items.ts` | teto de cada atributo por slot, raridade, tier e aprimoramento: espelha `makeItem` do jogo |
| `shared/save.ts` | validação do save: formato, tamanho, itens, e o quanto nível e Centelhas podem subir pelo tempo passado |
| `shared/protocol.ts` | mensagens da vila (WebSocket), limites (velocidade, área, tamanho do chat) e aparência pública |
| `src/net/api.ts` | endereço do servidor (`VITE_API_URL` ou `?server=`), sessão e chamadas com timeout que nunca lançam erro |
| `src/net/online.ts` | classe `Net` (`window.TessNet`): conta, sincronização do save, correio, vila e telemetria |
| `src/net/ui.ts` | telas de conta, escolha de progresso, avisos de recusa/conflito, chip de status e chat |
| `src/game/net/remote.js` | desenha até 12 jogadores remotos (linhas 160 a 255 da paleta), emotes, nomes e balões; correio online |
| `server/src/app.ts` | rotas HTTP, limites de requisições, CORS, upgrade do WebSocket |
| `server/src/hub.ts` | salas da vila, snapshots, limite de velocidade, chat com cota e silêncio automático, emotes |
| `server/src/store/` | interface `Store` com duas implementações (PostgreSQL e memória) e migrações versionadas |

### Regras do servidor

- **Contas:** e-mail e senha (scrypt), convidado (pode virar conta depois) e Google (token verificado com as chaves públicas do Google). Sessões são tokens aleatórios de 256 bits; o banco guarda só o hash.
- **Save na nuvem:** cada gravação leva a revisão anterior (`rev`). Se outra aba ou aparelho gravou antes, o servidor responde *conflito* e o jogador escolhe o que carregar. Saves impossíveis (item acima do teto, nível que caiu, Centelhas demais para o tempo jogado) são **recusados**; casos estranhos mas possíveis só ficam registrados para auditoria.
- **Correio:** o item sai do save de quem envia e entra no correio numa transação só. O id do item vira uma *lápide*: um save antigo que ainda tenha o item é recusado. Assim não dá para duplicar item reenviando save velho.
- **Vila:** a posição vem do cliente, mas o servidor limita área e velocidade (um salto vira um passo; o cliente reenvia a posição parada 1 vez por segundo para convergir). Moradores e galinhas seguem o **relógio da vila**: a posição é uma função da hora do servidor (`TessNet.serverNow()`, sincronizada no `welcome` e com pedidos `time`), então todos veem a mesma vila. O chat tem cota (3 mensagens, +1 a cada 2 s), filtro e silêncio de 5 minutos para quem insiste em palavrão. Uma conexão por conta.

### Testes

- `npm run test:server`: regras compartilhadas, API e vila, contra memória e, com `TEST_DATABASE_URL`, contra PostgreSQL de verdade (o CI faz os dois).
- `tests/e2e/online.spec.ts`: dois navegadores na vila (se veem, conversam, emotes), progresso indo e voltando da nuvem, save adulterado recusado, correio entre jogadores sem duplicar, e itens gerados pelo próprio jogo passando nas regras do servidor.

## Online: próximas fases (2 e 3)

As regras de jogo do online (grupos, dificuldade, Fio de Elo, história em grupo, trocas, mercado, guilda e ranking) estão em [ONLINE.md](ONLINE.md). Esta seção trata só da parte técnica.

A regra principal: **o servidor decide tudo o que importa.** Dano, drops, ouro, morte, trocas e mercado são calculados no servidor. O cliente desenha e envia os comandos do jogador.

```
 Cliente (web / Android)                 Servidor (Node + TypeScript)
 ┌────────────────────────┐   WebSocket   ┌──────────────────────────────┐
 │ render (WebGL2, splats)│ ◀──estado──── │ salas (hub.ts → instâncias)  │
 │ entrada, interface     │ ───comandos─▶ │  · vila (social, até ~50)    │
 │ previsão local         │               │  · instâncias (grupo de 4)   │
 │ simulação compartilhada│               │  · Ermos (mundo, ~30 por sala)│
 └────────────────────────┘               │ simulação compartilhada      │
                                          │ (mesmo código de combate)    │
                                          └──────────────┬───────────────┘
                                                         │
                                          PostgreSQL: contas, personagens,
                                          itens, baú, mercado, passe
```

### Passos de migração

1. **Módulos ES (em andamento desde a 0.58).** O manifesto aceita `{ "module": "caminho.js" }`: o arquivo vira um módulo
   ES de verdade (importa o que usa) e o que ele exporta entra no escopo único, então os arquivos antigos continuam
   funcionando sem mudança. Já migrados: `core/game.js` (o estado `G`), `engine/math.js`, `engine/materials.js`,
   `engine/splatset.js`, `data/palettes.js`, `render/icons.js`, `audio/sfx.js` e `audio/music.js`. O `npm run typecheck`
   confere se cada módulo importa tudo o que usa. A ordem de migração segue das folhas (sem estado) para o centro;
   os próximos são os que dependem de `P`, `RG` e `enemies`, que precisam virar um objeto `world` compartilhado.
   O objetivo final continua: trocar o escopo único por módulos com exportações explícitas. O estado mutável compartilhado (`P`, `enemies`, `boss`, `RG`, `G`) passa a viver num objeto `world` passado às funções.
2. **Separar simulação de render.** O núcleo de simulação fica em `src/sim/`: movimento, colisão, IA, combate, drops e geração de mapas, sem DOM nem WebGL, rodando em passos fixos de 20 por segundo. O render lê o estado e interpola entre os passos. O simulador de equilíbrio passa a rodar direto em Node.
3. **Determinismo.** Usar PRNG com semente por sala e não chamar `Math.random()` dentro da simulação. Assim o cliente pode prever o movimento e o servidor corrigir.
4. **Servidor.** O mesmo `src/sim` roda no servidor, nas salas que hoje servem a vila (WebSocket próprio; Colyseus fica como opção se a sincronização de estado crescer), com PostgreSQL para persistência.
5. **Cliente fino.** O cliente envia comandos (mover, atacar, habilidade, esquiva, interagir) com numeração de sequência. O servidor confirma e o cliente reconcilia.

### O que muda para o jogador

| Hoje | Depois |
|---|---|
| Save no aparelho | Conta com personagens no servidor (e-mail, convidado e Google já existem; Apple na Fase 4) |
| Correio por código (offline) e pelo nome (online) | Mercado entre jogadores com taxa |
| Ermos só seus | Ermos compartilhados, com zona PvP no Ermo Profundo |
| Morte custa Centelhas | Na zona PvP, os itens da bolsa caem no chão; o equipamento vestido e o baú ficam protegidos |
