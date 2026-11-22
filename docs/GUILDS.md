# Guildas, Ilha da Guilda e Guerra de Guildas (desenho)

Proposta para a próxima fase depois da Temporada 1. Nada aqui está no jogo ainda; é o plano para discutir e
implementar em etapas. A regra de ouro continua: **dinheiro compra estilo, nunca poder**. A força de uma
guilda vem de jogar junto, nunca do cartão de crédito.

## 1. A guilda

- **Fundar:** na vila, com o Arauto da Guilda (novo morador na praça norte). Custa 25.000 Centelhas e exige nível 15.
  Nome (3 a 20 letras, mesmo filtro dos nomes de conta) e emblema (forma, cor e símbolo, montados no jogo).
- **Membros:** até 30 no começo, 50 com o Salão ampliado. Cargos: **Líder**, **Oficiais** (convidam, expulsam
  e gastam o cofre até um limite por dia) e **Membros**.
- **Chat da guilda** (`/gu mensagem`), aba de guilda na lista de amigos e o emblema ao lado do nome, para os
  outros jogadores verem.
- **Sair e entrar:** quem sai espera 24 h para entrar em outra (evita pular de guilda na véspera da guerra).
- **A guilda é da conta, não do servidor:** ela acompanha o jogador em regiões e servidores futuros. A guilda,
  o cofre e a ilha ficam ligados à conta no banco central; se um dia houver servidores por região, o jogador
  continua na mesma guilda (a ilha e a guerra usam o servidor da região da guilda).

## 2. Contribuição: os Fios da Guilda

A guilda cresce com o que os membros fazem jogando:

| Atividade | Fios da Guilda |
|---|---|
| Missão diária do Passe concluída | 10 |
| Missão semanal concluída | 60 |
| Fenda concluída em grupo só de membros | 25 |
| Alfa dos Ermos derrotado | 15 |
| Doar Centelhas ao cofre | 1 a cada 100 (até 300 por dia) |
| Pesca no Torneio (pontos) | 1 a cada 50 pontos |

Os Fios da Guilda são da guilda (não do jogador) e servem para construir e melhorar a Ilha. Cada membro tem
um placar de contribuição da semana, que aparece no Salão.

## 3. A Ilha da Guilda

Cada guilda compra uma ilha no **Arquipélago do Tear**, uma região nova, acessada por um barqueiro no
Pesqueiro. A ilha é uma região própria (como a casa do jogador, mas compartilhada pela guilda), gerada
pela semente da guilda, com relevo, praia e um ancoradouro.

**Acesso só para membros e convidados.** A ilha não aparece aberta para quem passa: o barqueiro só leva
membros, e quem é de fora precisa de um **convite** (de Líder ou Oficial, válido por 24 h, ou enquanto
estiver no grupo de um membro). Convidados podem andar, pescar e conversar, mas não mexem em prédios nem no
cofre. Na guerra, a guilda atacante entra pelo cerco, não por convite.

- **Compra:** 50.000 Centelhas do cofre e 500 Fios da Guilda. Há três tamanhos de ilha (pequena, média e grande), e as maiores
  são liberadas pelo nível da guilda.
- **Lotes:** a ilha tem lotes onde a guilda ergue prédios. Cada prédio tem níveis (1 a 5), pagos com Fios da
  Guilda e Centelhas do cofre, com tempo de obra (horas reais).

| Prédio | O que dá (para os membros) |
|---|---|
| **Salão da Guilda** | mais vagas de membros, o quadro de contribuição e o mapa da guerra |
| **Forja da Guilda** | aprimorar e reforjar 5 a 25% mais barato na ilha |
| **Cofre** | um baú compartilhado com registro de quem pôs e tirou (limite por cargo) |
| **Estaleiro** | viagem rápida da vila para a ilha e, depois, para as ilhas inimigas na guerra |
| **Torres de Vigia** | defesa na guerra (veja abaixo) |
| **Muralhas e Portões** | defesa na guerra |
| **Altar do Tear** | +Fios do Tear nas Fendas da semana para os membros (pequeno, para não virar poder) |
| **Jardim e Lago** | pesca e coleta na ilha (peixes próprios do arquipélago) |

**Força da ilha = nível dos prédios de defesa.** É isso que conta na guerra.

**Monetização limpa:** a guilda pode comprar **decoração** da ilha com Fios Dourados (estandartes, estátuas,
fontes, cores dos telhados, fogos de artifício), mas nunca prédios, níveis, defesa ou recursos.

## 4. Guerra de Guildas

- **Temporada de guerra:** semanal. Inscrição até sexta; as batalhas acontecem no sábado, em janelas de
  1 hora (para quem é de fuso diferente, duas janelas).
- **Pareamento equilibrado, no estilo dos jogos de clã:**
  - **Escalação:** antes da guerra, o Líder escolhe quem luta (5, 10, 15 ou 20 membros). As duas guildas
    pareadas têm **escalações do mesmo tamanho**.
  - **Peso de guerra:** cada guilda tem um peso calculado pela escalação (nível e equipamento de cada lutador,
    sem contar cosméticos) e pela defesa da ilha (nível das Torres, Muralhas e Portões). O servidor pareia
    guildas com **peso parecido** (até ~10% de diferença; se a fila demorar, a faixa abre aos poucos), e só
    depois olha o ranking da temporada, para que uma guilda pequena e forte não caia contra uma gigante.
  - **Espelho:** cada lutador tem um "espelho" do outro lado (mesma posição no ranking de peso), e o mapa da
    guerra sugere atacar o espelho, mas qualquer alvo é permitido.
  - **Estrelas:** cada lutador tem **2 ataques** por guerra. Cada ataque vale de 0 a 3 estrelas (1 por
    derrubar 50% das defesas, 1 por quebrar o Coração da Ilha, 1 por fazer isso com tempo sobrando).
    Vence quem somar mais estrelas; empate é desempatado pela % média de destruição.
  - **Guildas pequenas** (menos de 10 ativos) entram na escalação de 5 e só pegam outras escalações de 5.
- **A batalha (cerco):** a guilda atacante desembarca na ilha da defensora. Objetivo: derrubar o **Coração da
  Ilha** (no Salão) antes de o tempo acabar. As torres atiram nos atacantes, as muralhas precisam ser
  quebradas, e os defensores ganham vantagem de terreno.
- **Regras justas:**
  - número igual de lutadores dos dois lados (até 10 contra 10);
  - o equipamento conta normalmente, mas os bônus do Altar não valem na guerra;
  - morrer na guerra não larga espólio (nada de perder itens);
  - amigos de guildas diferentes podem se enfrentar: a guerra é o único lugar sem a proteção de amizade.
- **Recompensas:** Fios da Guilda, posição no ranking da temporada de guerra e cosméticos de conquista
  (estandarte da vitória, moldura de guilda campeã, título "Conquistador do Arquipélago"), que nunca são vendidos.
- **Sem destruir o progresso:** perder a guerra não destrói prédios. A guilda derrotada só perde pontos de ranking, e a
  vitoriosa ganha um bônus temporário de Fios.

## 5. Como implementar, em etapas

1. **Guilda social (servidor):** criar, convidar, cargos, chat, emblema, contribuição. Tabelas `guilds`,
   `guild_members`, `guild_log`. Já temos amigos, grupo e chat de grupo para reaproveitar.
2. **Fios da Guilda e cofre:** contabilizar as contribuições no servidor (missões já passam por ele no Passe).
3. **Ilha (região compartilhada):** a ilha como região gerada pela semente da guilda, com os prédios guardados
   no servidor. A sala online da ilha é como a sala da vila, mas só para membros e convidados.
4. **Prédios e obras:** níveis, custos e tempo de obra no servidor; efeitos aplicados no jogo.
5. **Guerra:** precisa do **combate com autoridade do servidor** (a Fase 2 do roadmap), porque é PvP
   competitivo com recompensa. Antes disso, dá para fazer um modo de treino entre guildas sem ranking.

## 6. Decisões (0.46.0)

- **Ilha:** só membros e convidados (veja a seção 3).
- **Guerra:** pareamento equilibrado pelo peso de guerra, com escalações do mesmo tamanho, espelhos e
  estrelas, como nos jogos de clã (veja a seção 4). Guildas pequenas jogam escalação de 5 entre si.
- **Regiões e servidores:** a guilda acompanha o jogador (é da conta, não do servidor).
