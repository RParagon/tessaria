# Monetização

## Princípio

**Dinheiro compra estilo, nunca poder.** Nada que se compra com dinheiro real dá dano, vida, chance de item, XP ou vantagem em PvP. Num jogo com PvP e perdas ao morrer, qualquer vantagem paga destrói a confiança dos jogadores.

## Passe do Tear (passe de batalha)

| Item | Proposta |
|---|---|
| Duração da temporada | 8 semanas, com tema ligado a uma Fenda ou região nova |
| Níveis | 50 níveis de passe, ganhos com XP de passe |
| Trilha gratuita | cerca de 1 recompensa a cada 3 níveis: tags, partículas simples, decoração da casa |
| Trilha premium | recompensa em todos os níveis e o conjunto completo da temporada |
| Preço premium (Brasil) | R$ 19,90, ou 950 Fios Dourados |
| Premium + 10 níveis | R$ 34,90 |
| Devolução | o premium devolve cerca de 600 Fios Dourados ao longo da temporada, para incentivar a compra do próximo |

**Como se ganha XP de passe** (sempre jogando, nunca comprando):
- **Desafios diários:** 3 por dia, como "derrote 2 Alfas", "conclua uma Fenda nível 5" ou "aprimore um item".
- **Desafios semanais:** maiores e com mais XP.
- **XP comum de jogo:** uma parte do XP normal também conta para o passe.

Um jogador casual deve chegar ao nível 50 em cerca de 6 semanas jogando 30 minutos por dia.

## Cosméticos

O visual do jogo é feito de splats e partículas, então a maioria dos cosméticos é procedural: **custo baixo de produção e muita variedade.**

| Categoria | Exemplos | Onde aparece |
|---|---|---|
| Rastro de esquiva | brasas, pétalas, fios de luz, vidro estilhaçado | dash |
| Aura | anel de runas, névoa, vagalumes | em volta do herói, na vila e no PvP |
| Impacto | faíscas coloridas, números com estilo, flash de crítico | golpes |
| Efeito de teleporte | portal de fios, coluna de luz | viagens e retorno à vila |
| Efeito de morte | desfazer em pétalas, estilhaço de vidro | ao cair (visível no PvP) |
| Paleta do herói | tons especiais de roupa e brilho (5 tons por material) | personagem |
| Tag e título | "Tecelão do Sol", "Caçador de Alfas", moldura do nome | acima do nome, no chat e no ranking |
| Emote | acenar, dançar, sentar na fogueira | vila |
| Casa | tapetes, estandartes, luzes, troféus animados | Casa do Tecelão |

**Regras:**
- **Raridades** para mostrar prestígio: comum, raro, épico e lendário.
- **Cosmético vindo de conquista** (feitos, ranking, Tormento) nunca é vendido. Isso mantém o valor para quem joga de verdade.
- **Prévia antes de comprar:** a loja mostra o cosmético no seu personagem, girando como na bolsa.

## Moedas

| Moeda | Como ganha | Para que serve |
|---|---|---|
| **Centelhas** | jogando | tudo de jogo: casa, aprimorar, embrulhos, mercado |
| **Fios Dourados** | compra com dinheiro real (e um pouco no passe) | passe premium e cosméticos |

As duas moedas não se convertem uma na outra. Isso evita que dinheiro real vire poder através do mercado.

## Pagamentos e regras das lojas

- **Android (Google Play):** bens digitais vendidos dentro do app precisam usar o **Google Play Billing**. Comissão de 15% para receitas de até US$ 1 milhão por ano.
- **Web:** Pix e cartão via Mercado Pago ou Stripe, com confirmação no servidor (webhook) antes de liberar o item.
- **Servidor como fonte de verdade:** toda compra é validada no servidor, e os cosméticos ficam ligados à conta, não ao aparelho.
- **Menores de idade e LGPD:**
  - nada de caixas de prêmio pagas com resultado aleatório;
  - preços claros em reais;
  - consentimento para dados;
  - exclusão de conta pelo próprio jogo.

## Modelo de dados (rascunho)

```json
{
  "cosmetic": { "id": "trail_ember", "slot": "trail", "rarity": "epic", "source": "pass_s1_premium_24", "fx": { "particle": "ember", "rate": 40, "palette": [14, 21] } },
  "pass": { "season": 1, "theme": "A Fenda de Vidro", "levels": 50, "xpPerLevel": 1000, "premiumPriceBRL": 19.9 },
  "owned": { "accountId": "…", "cosmetics": ["trail_ember"], "equipped": { "trail": "trail_ember", "title": "titulo_tecelao" } }
}
```

## Ordem de implementação

1. **Fase 1:** contas e cosméticos ligados à conta. Começar só com cosméticos de conquista, sem venda.
2. **Fase 3:** os cosméticos aparecem para outros jogadores na vila e no PvP. É quando passam a ter valor social.
3. **Fase 4:** Passe do Tear, loja e pagamentos.
