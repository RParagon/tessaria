# Online: regras de cada sistema

Este é o design oficial do modo online do Fios de Tessária, aprovado pelo Rafael em 17/11/2026. Ele cobre grupos, dificuldade, o Fio de Elo, a história em grupo, chefes, Fendas, Ermos, morte, social, casa e armário, guilda, ranking, trocas, correio e mercado.

Os números saem do código atual (`src/game/core/state.js`, `data/items.js`, `core/progression.js`, `core/bosses.js`) para que tudo encaixe no jogo que já existe. Onde uma regra depende de uma tabela do jogo, ela aparece aqui com o nome da tabela.

A ordem de implementação está no fim do documento e no [ROADMAP.md](ROADMAP.md).

## Princípios

1. **Jogar sozinho continua igual.** Nenhuma regra deste documento muda o jogo de quem não está em grupo. A escala de inimigos, o Fio de Elo e a morte em grupo só valem com 2 ou mais jogadores.
2. **A vila é o único lugar aberto a todos.** Fora dela, cada portal abre uma *instância* só sua ou do seu grupo. Os Ermos compartilhados chegam na Fase 3.
3. **Cada um tem o próprio progresso.** História, finais, itens, baú e Centelhas são de cada jogador. Jogar junto nunca apaga ou adianta a história de ninguém sem que a pessoa queira.
4. **Ninguém disputa loot.** Cada jogador vê só os próprios drops.
5. **Ajudar compensa.** Quem é mais forte e ajuda um amigo ganha um bônus por isso (o bônus de mentor).
6. **Dinheiro real nunca compra poder** (ver [MONETIZATION.md](MONETIZATION.md)). Isso vale também para guilda, ranking e mercado: nada disso dá atributos.
7. **O servidor confere tudo o que envolve itens e Centelhas** entre jogadores: correio, troca, mercado e loot.

## Nível de item (NI)

Hoje cada item guarda um `tier` interno (um número com casas decimais, calculado em `regionTier()` no momento do drop). O jogador nunca vê esse número. O online precisa de um número legível para as trocas e para o mercado, então o tier ganha uma tradução: o **nível de item**.

```
NI = max(1, arredondar(4 × tier − 3))
```

A fórmula foi escolhida para que o NI bata com o nível dos monstros de cada região no Normal (`REGBASE`):

| Onde cai | tier no Normal | NI no Normal | Nível base da região |
|---|---|---|---|
| Vila e Bosque Sussurrante | 1 | 1 | 1 |
| Ossuário Real | 2 | 5 | 4 |
| Picos de Cinza | 3 | 9 | 8 |
| Pântano Afogado | 4 | 13 | 13 |
| Cidadela de Vidro | 5 | 17 | 16 |

A dificuldade soma ao tier (`DIFFS[i].tier`), e por isso soma ao NI:

| Dificuldade | tier extra | NI extra |
|---|---|---|
| Normal | 0 | +0 |
| Difícil | 0,3 | +1 |
| Expert | 0,65 | +3 |
| Mestre | 1 | +4 |
| Tormento I | 1,5 | +6 |
| Tormento II | 2 | +8 |
| Tormento III | 2,5 | +10 |

Cada nível de Fenda soma 0,5 ao tier, ou seja, **+2 de NI por nível de Fenda**. O nível do jogador acima da região também soma um pouco (0,05 de tier por nível, cerca de +1 de NI a cada 5 níveis).

Exemplos:
- Cidadela de Vidro no Tormento III, jogador nível 24: tier 7,8, **NI 28**.
- Fenda 10 no Pântano, Tormento III, nível 30: tier 12,25, **NI 46**.

**Onde o NI aparece:** na ficha do item ("Nível de item 17"), na bolsa, no baú, no correio, na janela de troca e no mercado. O NI não muda nada no item: é só uma forma de ler o tier. Itens antigos ganham NI automaticamente, pela mesma fórmula.

### Teto de NI de cada jogador

O **teto de NI** é o maior NI que um jogador pode receber de outra pessoa. Ele existe para que ninguém "carregue" um personagem novo com itens de fim de jogo. Ele vale para correio, troca direta, mercado e loot em grupo.

```
teto = max(nível + 5, NI_alcançável)
```

O `NI_alcançável` é o NI do melhor conteúdo que o próprio jogador já pode fazer sozinho, pela mesma conta de `regionTier`:

```
tier_alcançável = tier da região mais alta liberada
                + tier da maior dificuldade liberada
                + 0,5 × maior Fenda concluída (riftMax)
                + 0,05 × max(0, nível − nível base da região − 2)
```

- **região mais alta liberada** pela história (as mesmas travas de `portalState`): Bosque 1, Ossuário 2, Picos 3, Pântano 4, Cidadela 5;
- **maior dificuldade liberada** pelas regras de `diffOk` (nível mínimo e Ato II para os Tormentos), com o tier da tabela acima.

Exemplos:
- Nível 7, acabou de vencer o Guardião de Musgo, Normal: teto **12** (nível + 5).
- Nível 16, Ato I concluído, Mestre liberado: Picos no Mestre dão NI 14, então o teto é **21** (nível + 5).
- Nível 30, Ato II concluído, Tormento III, Fenda 10 concluída: Cidadela no Tormento III com a Fenda dá tier 13,1, então o teto é **49**.

Quem tenta receber um item acima do teto vê: "Nível de item 34. Lume pode receber até NI 21." O item não sai de quem enviou.

## Amigos

- **Adicionar:** tocando no nome de alguém na vila → "Adicionar amigo", ou digitando `/amigo Nome`. A outra pessoa recebe um pedido e aceita ou recusa.
- **Limite:** 100 amigos por conta. Até 50 pedidos pendentes.
- **Pedidos:** valem 7 dias. Se os dois pedirem um ao outro, a amizade é aceita na hora.
- **A lista mostra:** nome, nível, classe, e se a pessoa está online e onde ("Vila Brasa #2", "Bosque Sussurrante", "Fenda 7", "Ermos"). Quem está offline aparece com "visto há 3 h".
- **Remover:** some das duas listas, sem aviso para a outra pessoa.
- **Bloquear:** a pessoa bloqueada não consegue pedir amizade, convidar para grupo, propor troca nem enviar correio para quem a bloqueou. As mensagens de chat dela somem da sua tela. Bloquear também desfaz a amizade.
- **Convidado:** quem joga como convidado também tem lista de amigos. Ela fica salva na conta e continua quando a conta vira completa.
- A lista fica salva **na conta**, no servidor, e aparece em qualquer aparelho.

## Grupo

### Formar o grupo

- **Até 4 jogadores.**
- **Convidar:** tocando no nome de alguém na vila → "Convidar para o grupo", digitando `/convidar Nome`, ou pela lista de amigos (no caso de amigos, de qualquer lugar).
- O convite aparece como um cartão com "Aceitar" e "Recusar" e **expira em 60 segundos**.
- Quem convida primeiro vira o **líder**. Se não houver grupo, o convite cria um. Depois disso, **só o líder convida**.
- Quem não é amigo só pode ser convidado na mesma sala da vila. Amigos podem ser convidados de qualquer lugar.
- Cada jogador está em **um grupo por vez**. Para aceitar outro convite, é preciso sair do atual.
- **Sair:** botão no painel do grupo ou `/sair`.
- **Líder:** pode passar a liderança (`/lider Nome`) e tirar alguém do grupo (`/tirar Nome`). Se o líder sai, a liderança passa para quem entrou no grupo há mais tempo.
- **Queda de conexão:** quem cai tem 2 minutos para voltar e continua no grupo. Depois disso, sai.
- **Grupo de 1:** se todos saírem, o grupo acaba.

### Chat do grupo

- Mensagens começadas por `/g` vão só para o grupo, onde quer que cada um esteja.
- O chat rápido (ver "Social no celular") também vai para o grupo.
- Valem o mesmo filtro, a mesma cota e o mesmo silêncio automático do chat da vila.

### Entrar num portal junto

1. O líder entra num portal (região da história, Fenda ou Ermos).
2. Todos do grupo recebem o aviso **"Pronto?"** com o destino, a dificuldade do grupo e o nível sugerido. O aviso dura **20 segundos**.
3. Quem confirma entra junto, na mesma instância. Quem recusa ou deixa o tempo passar fica na vila e continua no grupo.
4. Quem ficou pode entrar depois pelo painel do grupo ("Entrar com o grupo"), enquanto a instância estiver aberta. Ele aparece no início da região ou da Fenda.
5. Só o líder abre portais para o grupo. Os outros, se entrarem num portal sozinhos, saem da instância do grupo e jogam a própria instância (continuam no grupo para o chat).

**Nível sugerido** no aviso: o nível base da região (`REGBASE`), ou o nível do líder mais o nível da Fenda. Se alguém estiver mais de 3 níveis abaixo, o aviso mostra em amarelo: "Nível sugerido 12 · Lume é Nv 7". Com o Fio de Elo (abaixo), a pessoa entra mesmo assim.

## Dificuldade em grupo

**Regra:** vale a dificuldade do líder, mas ele só pode escolher uma que **todos do grupo já desbloquearam**.

- "Desbloquear" segue a regra que já existe (`diffOk`): ter o nível mínimo da tabela `DIFFS` e, para os Tormentos, ter concluído o Ato II.
- No menu do grupo, cada dificuldade travada mostra o motivo: "Difícil · Lume ainda não desbloqueou", "Tormento I · Kai não concluiu o Ato II".
- Se alguém entra no grupo e não tem a dificuldade atual, a dificuldade do grupo cai para a maior que todos têm, e o grupo vê o aviso.
- **A dificuldade de cada jogador não muda.** Ao sair do grupo, cada um volta para a própria.
- **Dentro da instância, vale a do grupo** para tudo: vida e dano dos inimigos, XP, Centelhas, chance de item, tier dos drops e o custo de cair.
- **Primeira vitória por dificuldade** (`diffFirst`): cada jogador ganha o próprio bônus, se for a primeira vez dele naquele chefe naquela dificuldade.

## Fio de Elo: amigos com níveis diferentes

O Fio de Elo deixa dois amigos com qualquer diferença de nível jogarem juntos. Ele só vale em instâncias de grupo (regiões e Fendas). Nos Ermos e no PvP, não vale.

### Nível da instância

- **Regiões da história:** `max(REGBASE da região, nível do líder)`. É a mesma conta que o jogo faz hoje para o nível dos monstros (`monLevel`), só que com o nível do líder.
- **Fendas:** nível do líder + nível da Fenda, como hoje.

### O mais fraco sobe

Se um jogador está **mais de 3 níveis abaixo** do nível da instância, ele passa a contar como **nível da instância − 3** enquanto estiver no grupo.

- Sobe só o que vem do nível em `stats()`: a vida (+10 por nível) e o dano (+7% por nível).
- **Não muda:** equipamento, melhorias da forja, talentos, mobília e bênçãos.
- O HUD mostra um fio dourado ao lado do nível: "Nv 7 → 13 (Fio de Elo)".
- O XP que ele ganha é o XP normal do monstro, calculado pelo nível real dele. Ele sobe de nível mais rápido, mas sem saltos.
- Os drops dele respeitam o próprio teto de NI.

### O mais forte fica limitado

Se um jogador está **mais de 5 níveis acima** do nível da instância, ele passa a contar como **nível da instância + 5**.

- Cai o que vem do nível em `stats()`, como acima.
- O equipamento também é limitado: itens com NI acima de **NI da instância + 8** contam como se tivessem esse NI. Os atributos são reduzidos na mesma proporção que o `makeItem` usaria para aquele tier.
- Isso acontece, por exemplo, quando o líder é o amigo mais novo. Se o veterano for o líder, o nível da instância já é o dele e ninguém é limitado.

### Bônus de mentor

Quem está limitado pelo Fio de Elo ganha, enquanto estiver limitado:

- **+25% de Centelhas;**
- **+10% de chance de item;**
- **10% de chance**, a cada chefe vencido, de um item extra de raridade +1 em relação ao normal do chefe;
- 1 ponto de **Mentor** por chefe vencido. Os pontos aparecem no perfil e no ranking de Mentores.

O HUD mostra "Mentor" com o mesmo fio dourado.

## Inimigos com mais gente

| Jogadores na instância | Vida dos inimigos | Dano dos inimigos |
|---|---|---|
| 1 | 100% | 100% |
| 2 | 175% | 110% |
| 3 | 250% | 115% |
| 4 | 325% | 120% |

- A escala multiplica a que já existe (dificuldade, região, nível e Fenda em `monsterScale`).
- **Conta quem está na instância**, não quem está no grupo. Quem sai ou cai da conexão deixa de contar no próximo inimigo que surgir. Inimigos já vivos não mudam, para não curar ninguém do nada.
- Chefes seguem a mesma tabela.
- O número de inimigos não muda. Mais gente significa inimigos mais resistentes, não mais inimigos.
- **XP:** cada jogador recebe o XP inteiro de cada inimigo derrotado pelo grupo (não é dividido), desde que esteja a até 30 unidades de distância ou tenha causado dano.

## Loot individual

- Quando um inimigo cai, **o servidor sorteia o drop de cada jogador separadamente**. Cada um vê só o próprio.
- O sorteio usa a dificuldade do grupo, a sorte de cada um (talento Sorte, Mapa de Tessária, bênção da Fortuna) e o nível de cada um.
- O NI de cada drop é calculado como hoje (`regionTier`) e depois **limitado ao teto de NI do jogador**. Assim ninguém sai de uma Fenda de nível alto com um item que não poderia usar.
- Orbes de vida e Centelhas também são individuais.
- Baús da história (`chests`) e memórias (`frags`) são de cada um: cada jogador vê os baús e memórias que ainda não pegou.

## Portais da história

**A regra:** a história é de cada um, mas dá para jogar acompanhado.

A instância segue a etapa da história **do líder**. Cada jogador tem uma de três situações em relação àquela região, calculada pelas mesmas travas de `portalState` e pelos chefes vencidos (`bosses`):

| Situação | Quando | O que ganha | O que acontece com a história |
|---|---|---|---|
| **Na etapa** | o portal está liberado para ele e o chefe ainda não foi vencido | tudo: XP, loot, memórias, o Fio Mestre | avança normalmente |
| **Eco** | já venceu o chefe daquela região | XP e loot | não muda. Os diálogos aparecem resumidos, com "Pular" |
| **Antes** | o portal ainda está apagado para ele | só loot | não muda. Ele continua de onde estava |

- Quem está **Antes** é avisado antes de confirmar o "Pronto?": "Isso tem spoilers do Ato II. Entrar mesmo assim?".
- **Diálogos e cenas:** cada jogador vê na própria tela e pode pular. A luta começa quando o líder termina a cena ou depois de 20 segundos.
- **Escolhas e finais são pessoais.** O jogo tem finais diferentes (`dragonEnd`: "O Sol Reaceso", "O Sol que Lembra" ou "Ainda não"). Na hora da escolha, cada jogador na etapa escolhe sozinho, na própria tela, e guarda o próprio final. Quem é Eco ou Antes só assiste.
- A instância espera até **60 segundos** pelas escolhas. Depois disso, quem não escolheu fica com "Ainda não" (que não fecha nada e pode ser refeito depois).
- **Missões dos moradores** (Brann, Ivo, Nina) e contratos do quadro: cada um progride só os próprios.

## Chefes que mudam com o grupo

- **O Reflexo** cria uma cópia sombria de **cada jogador** do grupo. Cada reflexo tem o visual e a classe do companheiro que copia e prefere atacar o próprio original. A vida total dos reflexos segue a tabela de escala, dividida entre eles. O Reflexo é vencido quando todos os reflexos caem.
- **A Hidra do Lodo** ganha **uma cabeça a mais por jogador além do primeiro** (3 cabeças sozinho, até 6 com quatro jogadores). Cada cabeça tem o próprio alvo.
- **Marca do Tear (todos os chefes, só em grupo):** aos 66% e aos 33% da vida, o chefe marca um jogador com um círculo que explode depois de 3 segundos e machuca quem estiver perto dele. O grupo precisa se separar. Com um jogador, a marca não aparece.
- Os outros ataques de cada chefe escolhem alvos entre os jogadores vivos, alternando.

## Morte em grupo

- Quem cai fica **caído por 15 segundos**, desenhado como um novelo de fios no chão.
- Um companheiro pode **costurar a pessoa de volta** segurando o botão de interação ao lado dela por **3 segundos**. Ela volta com 30% da vida. Levar dano interrompe a costura.
- Quem é costurado de volta **não perde Centelhas**.
- Se ninguém ajudar nos 15 segundos, a pessoa volta no último ponto seguro da instância e paga o custo de cair da dificuldade do grupo (como hoje: 4% das Centelhas por nível de dificuldade, até 20%).
- Se **o grupo todo cair**, todos voltam para a entrada da região ou da Fenda, e o chefe recupera toda a vida.
- No modo solo, nada muda.

## Fendas do Tear em grupo

- **O mapa é gerado pelo servidor** a partir de uma semente, e é o mesmo para todos. Os afixos também.
- **Nível da Fenda:** o líder escolhe até o **menor "maior nível liberado"** do grupo (cada um libera até `riftMax + 1`), pela mesma lógica da dificuldade.
- **Entrar no meio:** amigos do grupo podem entrar enquanto o chefe da Fenda não apareceu. Quem chega aparece no início da Fenda.
- **Rank e tempo:** o tempo é do grupo. Cada jogador guarda o próprio melhor tempo (`riftBest`) e o próprio `riftMax`.
- **Fios do Tear:** cada um ganha os próprios, pela mesma conta de hoje (incluindo o Altar do Tear de cada um).
- **Procurar grupo:** um botão no menu da Fenda que entra numa fila pública por nível de Fenda e dificuldade. A fila forma grupos de 2 a 4. Como junta desconhecidos, ela só abre quando o servidor simular o combate (caminho B, ver abaixo).
- **Ranking semanal de Fendas:** ver "Ranking".

## Ermos: mundo compartilhado (Fase 3)

- **Até 30 jogadores por sala.** Ali você encontra desconhecidos sem precisar de grupo.
- **A dificuldade do menu não vale nos Ermos.** O perigo vem da zona, como hoje (`WZ`: Campina Brasa nível 2, Mata dos Uivos 7, Colinas Partidas 13, Ermo Profundo 20).
- **Salas por faixa**, para não misturar novatos com veteranos. A faixa vem da dificuldade que cada jogador está usando: **Normal e Difícil**, **Expert e Mestre**, e **Tormento** (I a III).
- O grupo entra na sala do líder.
- **Ermo Profundo:** zona PvP. Quem entra fica marcado como hostil. Lá estão os Alfas e o melhor loot. As perdas maiores ao morrer valem só lá, como já está no roadmap: os itens da bolsa caem para quem matou, e o equipamento vestido e o baú ficam sempre protegidos.
- Fio de Elo e escala por grupo não valem nos Ermos.

## Social no celular

- **Painel do grupo** no HUD, no canto esquerdo: nome, classe, nível e barra de vida de cada um. Tocar num nome abre as opções (passar liderança, tirar do grupo, adicionar amigo).
- **Chat rápido em botões**, para quem joga no toque: "Vem!", "Cuidado!", "Obrigado!", "Bora pra Fenda?", "Espera!", "Pronto". Vai para o grupo, ou para a vila se a pessoa não tiver grupo. Tem o mesmo limite do chat.
- **Marcador no minimapa:** tocar no minimapa põe uma marca que o grupo vê por 5 segundos, com um som curto. No máximo uma marca a cada 2 segundos.
- **Lista de amigos** no menu, com quem está online e onde (ver "Amigos").

## Casa e armário

A Casa do Tecelão já existe (custa 1.500 Centelhas; mobília em `HOUSE_F`). O online acrescenta:

### Armário do Tecelão (mobília nova)

- **Preço:** 3.000 Centelhas, entre a Bancada (3.500) e o Jardim (2.000).
- **O que faz:** abre o editor de aparência do começo do jogo, dentro da casa, **de graça e quantas vezes quiser**.
- **Dá para mudar:** corpo, pele, cabelo, cor do cabelo, roupa, detalhe, brilho, acessório, capa e barba.
- **Não dá para mudar:** a classe e o nome (o nome é o da conta e muda pelo perfil, com as regras que já existem).
- **Visuais salvos:** o armário guarda até 3 visuais prontos, para trocar com um toque.
- No modo online, a nova aparência aparece para os outros na hora (a vila já recebe a mensagem `look`).
- Mais tarde, os cosméticos da conta (ver [MONETIZATION.md](MONETIZATION.md)) também são vestidos no armário.

### Sem armário: Espelho da vila

- Um espelho na Vila Brasa, ao lado da casa, faz a mesma troca de aparência por **250 Centelhas cada vez**. Assim quem ainda não tem casa também pode mudar o visual. Os visuais salvos ficam só no armário.

## Guilda

Uma guilda junta amigos num grupo maior e permanente.

- **Criar:** 5.000 Centelhas (sai de circulação), nível 10 ou mais, e não estar em outra guilda.
- **Nome:** 3 a 20 letras, com as mesmas regras e o mesmo filtro dos nomes de Tecelão, único no servidor.
- **Sigla:** 2 a 4 letras, aparece ao lado do nome na vila: "Lume [TEAR]".
- **Até 30 membros.**
- **Cargos:** Líder (1), Oficiais e Membros.
  - Líder: tudo, inclusive passar a liderança e desfazer a guilda (só quando estiver sozinho).
  - Oficiais: convidar, tirar Membros, editar o recado do dia.
  - Membros: conversar e sair.
- **Convite:** por nome ou tocando no nome na vila. Vale 7 dias.
- **Chat da guilda:** mensagens começadas por `/gu`. Valem o filtro e o silêncio do chat.
- **Recado do dia:** até 140 letras, aparece ao entrar.
- **Lista da guilda:** quem está online e onde, como na lista de amigos.
- **Pontos da guilda:** cada membro gera pontos jogando (1 por chefe da história, 2 por Fenda concluída, +1 se for em grupo com outro membro). Eles servem para o ranking semanal de guildas e para subir o **nível da guilda** (1 a 10).
- **Nível da guilda:** libera só coisas de estilo: cor da sigla, estandarte da guilda para pendurar na casa, moldura do nome. **Nenhum bônus de atributo**, para que ninguém se sinta obrigado a entrar numa guilda grande.
- **Sair:** a qualquer hora. Quem sai só pode entrar em outra guilda depois de 24 horas.

## Ranking

Todos os rankings são semanais (de segunda 00:00 a domingo 23:59, horário de Brasília) e têm também um placar de sempre.

| Ranking | Critério | Separado por |
|---|---|---|
| Fendas | menor tempo para concluir | nível de Fenda (faixas de 5 níveis), solo ou grupo |
| Maior Fenda | maior nível de Fenda concluído | dificuldade |
| Mentores | pontos de Mentor | só o semanal |
| Guildas | pontos da guilda | só o semanal |
| Arena (Fase 3) | duelos | já previsto no roadmap |

- Cada ranking mostra os 100 primeiros e a sua posição, e tem a aba **"Entre amigos"**.
- **Prêmios:** só títulos e molduras de nome que duram uma semana ("Top 10 das Fendas"). Nada de poder.
- **Confiança:** enquanto o combate for decidido no aparelho (caminho A), os tempos de Fenda são conferidos por plausibilidade (tempo mínimo por nível, número de inimigos derrotados) e o ranking público mostra só a aba "Entre amigos". O ranking público completo abre com o caminho B.

## Dar e trocar itens

Três formas, todas com o **teto de NI de quem recebe** e todas conferidas pelo servidor, que tira o item do save de quem dá e grava uma lápide (como o correio de hoje), para não duplicar.

### Correio do Tear (já existe)

- Continua como hoje: enviar um item da bolsa para um Tecelão pelo nome, com um bilhete.
- **Novo:** respeita o teto de NI de quem recebe e o bloqueio (quem bloqueou não recebe).
- **Novo:** dá para enviar **Centelhas** pelo correio, até 10.000 por carta, com taxa de 5% (mínimo 10) que sai de circulação.
- Cartas não abertas ficam guardadas por 30 dias. Depois, voltam para quem enviou.

### Troca direta

- Só na vila, com alguém a até 6 unidades de distância, tocando no nome → "Propor troca", ou `/trocar Nome`.
- A janela de troca tem dois lados. Cada um coloca **até 6 itens da bolsa** e **Centelhas**.
- **Duas confirmações:** primeiro cada um aperta "Travar" (a oferta não pode mais mudar). Depois os dois apertam "Trocar". Qualquer mudança destrava os dois.
- Cada item mostra o NI. Um item acima do teto do outro aparece travado em vermelho: "Acima do NI de Kai (21)".
- A troca é atômica no servidor: ou tudo troca, ou nada troca. Itens vestidos não entram.
- Sem taxa.
- Afastar-se, sair da vila ou cair da conexão cancela a troca.

### Mercado da vila

Um quadro de anúncios na Vila Brasa onde qualquer jogador pode vender itens por Centelhas para qualquer outro, mesmo offline.

- **Anunciar:** escolher um item da bolsa e o preço. O item sai da bolsa na hora e fica no mercado.
  - Até **10 anúncios** por jogador.
  - Cada anúncio dura **48 horas**.
  - **Preço mínimo:** o valor de desmanche do item (`scrapVal`). **Máximo:** 10 milhões.
  - **Taxa de anúncio:** 2% do preço (mínimo 10 Centelhas), paga ao anunciar e não devolvida.
- **Comprar:** busca com filtros por tipo (arma, armadura, amuleto), classe, raridade, faixa de NI, atributo e preço, ordenada por preço ou por novidade. Itens acima do seu teto aparecem com cadeado.
- **Venda:** o comprador paga o preço. O vendedor recebe o preço menos **8% de taxa**, pelo correio, com o bilhete "Vendido no mercado". As duas taxas são a forma de tirar Centelhas de circulação prevista no roadmap.
- **Não vendeu:** o item volta pelo correio depois das 48 horas. O vendedor pode cancelar antes; a taxa de anúncio não volta.
- **Histórico:** o vendedor vê as últimas vendas dele; o mercado mostra o preço médio recente de itens parecidos (mesmo tipo, raridade e faixa de NI).
- Compra e venda são atômicas no servidor e ficam na auditoria.
- Os Fios Dourados (moeda paga) **nunca** entram no mercado.

## Caminho técnico

As regras deste documento valem nos dois caminhos. Só muda quem calcula o combate.

### Caminho A: o líder simula (primeiro)

- Uma **instância** é uma sala no servidor, como as salas da vila. Ela guarda quem está dentro, a semente do mapa e a dificuldade do grupo.
- O jogo do **líder** calcula inimigos, chefes e projéteis e envia o estado deles pelo servidor (cerca de 10 vezes por segundo, como os snapshots da vila).
- Os outros jogadores calculam o próprio movimento, os próprios ataques e enviam o dano que causaram. O líder aplica esse dano aos inimigos.
- **O servidor sorteia o loot** de cada jogador quando o líder informa que um inimigo caiu, e confere se isso é plausível (quantos inimigos, de que tipo, em quanto tempo). Assim o líder pode, no pior caso, trapacear na dificuldade do próprio grupo, mas não consegue criar itens.
- Se o líder cair da conexão, a liderança da simulação passa para o próximo do grupo.
- Ideal para jogar **com amigos por convite**.

### Como a 2.2 funciona por dentro

- **Mesmo mapa:** o líder escolhe nível, base, afixos e chefe (o sorteio do menu da Fenda). O servidor cria a instância e sorteia a **semente**. Cada jogo roda `startRift` com `Math.random` trocado por um sorteio com essa semente (`withSeed` em `src/game/net/remote.js`), então todos geram as mesmas salas, ligações e afixos.
- **Mensagens:** `iopen` (líder abre), `iready` (aviso "Pronto?", 20 s), `ijoin` (aceitar), `ienter` (dados + semente), `where` com `i` (entrar na sala da instância), `iclosed`. A sala da instância reaproveita as salas da vila: snapshots, ações, chat e emotes funcionam lá dentro.
- **Anfitrião:** quem simula é o líder, se estiver na Fenda; senão quem está lá há mais tempo. O servidor avisa (`ihost`) e repassa o combate sem ler o conteúdo: `hx` (anfitrião → todos), `gx` (jogador → anfitrião), `hto` (anfitrião → um jogador), com limite de ritmo e tamanho. Código em `src/game/net/coop.js`.
- **Inimigos (2.2b):** o líder simula; antes de cada inimigo pensar, o `P` aponta por um instante para o jogador mais próximo (alvo substituto), então a IA atual persegue quem estiver perto sem ser reescrita. Nos outros jogos os inimigos são cópias desenhadas a partir dos snapshots do líder; `hurtEnemy` e `hurtBoss` repassam o acerto ao líder. Projéteis e áreas marcadas viram eventos e cada jogo confere só o próprio herói.

### Caminho B: o servidor simula (depois)

- Exige a migração para módulos ES e a separação de `src/sim` (ver [ARCHITECTURE.md](ARCHITECTURE.md)).
- O servidor calcula tudo; os jogadores só enviam comandos.
- Necessário para o **Procurar grupo** com desconhecidos, os **Ermos compartilhados**, o **PvP** e o **ranking público**.

## Ordem de implementação

| Passo | O que entra | Estado |
|---|---|---|
| 2.1 | Amigos e grupo: pedidos de amizade, lista com presença, bloqueio, convite de grupo na vila, líder, chat do grupo, painel do grupo | feito (0.10.2) |
| 2.2 | **Fendas em grupo** (instâncias, caminho A), em três partes: | |
| 2.2a | instância da Fenda: o líder abre, "Pronto?" para o grupo, semente do servidor (mesmo mapa para todos), sala da instância (todos se veem), "Entrar na Fenda do grupo" pelo painel | feito (0.11.0) |
| 2.2b | inimigos e chefe simulados pelo líder: cópias nos outros, acertos repassados ao líder, alvo substituto na IA, projéteis e áreas marcadas como eventos, mortes repassadas | feito (0.12.0) |
| 2.2c | escala por número de jogadores, Caído/Costurar, grupo inteiro caído, XP por proximidade | feito (0.13.0) |
| 2.2d | gerador de itens único em `shared/` (jogo e servidor); na Fenda do grupo, loot sorteado pelo servidor com conferência de plausibilidade e registro | próximo |
| 2.3 | Dificuldade do grupo e Fio de Elo | |
| 2.4 | Portais da história em grupo (na etapa, Eco, Antes), escolhas pessoais, Reflexo e Hidra em grupo, Marca do Tear | |
| 2.5 | Nível de item visível e teto de NI no correio; correio com Centelhas e bloqueio | |
| 2.6 | Armário do Tecelão e Espelho da vila | |
| 2.7 | Ranking entre amigos | |
| 2.8 | Social no celular: chat rápido e marcador no minimapa | |
| 2.9 | Troca direta | |
| 2.10 | Guilda | |
| 2.11 | Mercado da vila | |
| 2.12 | Módulos ES, `src/sim` e caminho B; Procurar grupo; ranking público | |
| Fase 3 | Ermos compartilhados, Ermo Profundo com PvP, arena | |
