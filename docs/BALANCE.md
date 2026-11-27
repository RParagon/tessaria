# Equilíbrio: metas e como conferir

As metas abaixo vêm de práticas de design de RPG (ponto de partida, ajustadas com testes de gente real).
Toda mudança em XP, dano, vida ou dificuldade deve passar por `npm run test:progression` (tabela por região
e nível, que falha quando algo sai das metas) e por `npm run test:balance` (as três classes lado a lado).

## Metas no Normal, com equipamento típico da região

| Medida | Meta | Por quê |
|---|---|---|
| Tempo para matar um monstro comum | 0,7 a 1,8 s (2 a 4 golpes de espada) | rápido o bastante para fluir, longo o bastante para posicionar |
| Golpes de um monstro comum para cair | Lâmina 7 a 11 · Arcano e Arco 5 a 9 | errar a esquiva precisa custar; a Lâmina é o tanque |
| Minutos por nível | 3 a 5 nos níveis 1 a 5, subindo para 10 a 20 perto do nível 20 | o começo empolga, o meio pede dedicação |
| Chefe | 25 a 60 golpes | luta com fases, não um saco de pancada |

## Onde ficam os números

- XP por nível: `xpNeed` em `src/game/core/state.js`.
- Dificuldades (vida, dano, XP, Centelhas): `DIFFS` no mesmo arquivo. O dano é relativo ao Normal (que vale 2).
- Crescimento dos monstros quando o herói passa do nível da região: `monsterScale` (mesmo arquivo).
- Monstros: `DEF` em `src/game/world/regions.js`. Classes: `CLS` no mesmo arquivo.

## Histórico

- **0.56:** amigos acharam o jogo fácil demais. A tabela mostrou o herói aguentando 16 a 29 golpes (meta 5 a 8) e o
  nível 1 passando em menos de 1 minuto. Dano dos monstros ~2× (as dificuldades altas sobem menos), monstros
  acompanham o nível do herói também no Normal, primeiros níveis em 3 a 5 min, +20% de XP no meio do jogo,
  Morcego mais perigoso e Afogado com menos vida.
