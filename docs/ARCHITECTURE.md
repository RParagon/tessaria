# Arquitetura

Este documento descreve como o jogo está organizado hoje (versão 0.9, single-player) e para onde ele vai na versão online.

## Hoje

### Montagem do código

O jogo nasceu como um protótipo em arquivo único. Na Fase 0 ele foi dividido em 26 arquivos por domínio, dentro de `src/game/`. Esses arquivos **ainda compartilham um único escopo**: o plugin `tessaria-game` (em `vite.config.js`) os concatena na ordem de `src/game/manifest.json`, dentro de uma função, e gera um source map por arquivo. Na prática:

- uma função ou constante declarada num arquivo é visível em todos os outros;
- **a ordem do manifesto importa** para código que roda na hora em que é carregado (constantes e tabelas). Funções podem ser chamadas antes da posição em que foram declaradas;
- erros e o depurador apontam para o arquivo e a linha originais.

Isso permitiu separar o código sem mudar uma linha de comportamento. A troca para módulos ES independentes é a primeira tarefa da Fase 1 (ver abaixo).

O build define duas constantes:

| Constante | Valor |
|---|---|
| `__DEV__` | `true` no `vite dev`, `false` nos builds |
| `__VERSION__` | versão do `package.json`, mostrada no título e no menu |

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

### Render

1. **Modelos:** cada personagem é construído por código como um conjunto de splats (`ell`, `tube`, `cone`, `box`, `mem`) presos a ossos. A animação é feita por transformações de osso calculadas em `render/poses.js`.
2. **Passo 1:** os splats vão para um framebuffer em baixa resolução, guardando material, sombreamento, brilho e profundidade.
3. **Passo 2:** um shader de pós-processamento aplica a paleta da região (5 tons por material), o pontilhado Bayer 4×4, o contorno de 1 pixel, o fade e a vinheta de dano.
4. **O mundo** é construído uma vez por região e dividido em blocos (chunks), que são descartados quando estão fora da câmera.

### Save

O save fica em `localStorage`, com a chave `fios-de-tessaria-v1`: um JSON com personagem, nível, itens, baú, missões, feitos e configurações. Por estar no aparelho, **pode ser editado pelo jogador**. Isso é aceitável no single-player, mas não serve para o online.

## Online (Fases 1 a 3)

A regra principal: **o servidor decide tudo o que importa.** Dano, drops, ouro, morte, trocas e mercado são calculados no servidor. O cliente desenha e envia os comandos do jogador.

```
 Cliente (web / Android)                 Servidor (Node + TypeScript)
 ┌────────────────────────┐   WebSocket   ┌──────────────────────────────┐
 │ render (WebGL2, splats)│ ◀──estado──── │ salas Colyseus               │
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

1. **Módulos ES.** Trocar o escopo único por módulos com exportações explícitas. O estado mutável compartilhado (`P`, `enemies`, `boss`, `RG`, `G`) passa a viver num objeto `world` passado às funções.
2. **Separar simulação de render.** O núcleo de simulação fica em `src/sim/`: movimento, colisão, IA, combate, drops e geração de mapas, sem DOM nem WebGL, rodando em passos fixos de 20 por segundo. O render lê o estado e interpola entre os passos. O simulador de equilíbrio passa a rodar direto em Node.
3. **Determinismo.** Usar PRNG com semente por sala e não chamar `Math.random()` dentro da simulação. Assim o cliente pode prever o movimento e o servidor corrigir.
4. **Servidor.** O mesmo `src/sim` roda no servidor, com Colyseus para salas e sincronização de estado, e PostgreSQL para persistência.
5. **Cliente fino.** O cliente envia comandos (mover, atacar, habilidade, esquiva, interagir) com numeração de sequência. O servidor confirma e o cliente reconcilia.

### O que muda para o jogador

| Hoje | Online |
|---|---|
| Save no aparelho | Conta (e-mail, Google ou Apple) com personagens no servidor |
| Correio por código | Mercado entre jogadores com taxa |
| Ermos só seus | Ermos compartilhados, com zona PvP no Ermo Profundo |
| Morte custa Centelhas | Na zona PvP, os itens da bolsa caem no chão; o equipamento vestido e o baú ficam protegidos |
