# Histórico de versões

## 0.53.0 · Duelos e ranking
- **Desafie para um duelo** tocando no nome de outro jogador na vila (opção "Desafiar para duelo") ou com `/duelo Nome`. Os dois precisam estar perto (até 15 m)
- O desafiado recebe um cartão com **Aceitar** e **Recusar** (vale 20 s). Aceito, começa uma **contagem de 3 s** e o duelo dura até 90 s, com um marcador no topo da tela
- **PvP só entre os dois** (as mesmas regras de dano do Ermo Profundo, 30% do golpe e até 20% da vida por acerto). **Ninguém morre:** quem cair primeiro perde e volta com a vida cheia. Sem perda de itens nem de Centelhas
- Sair da sala no meio do duelo (por exemplo, entrar na taverna) conta como desistência; no fim do tempo, empate
- **Ranking de duelos (Elo):** todo mundo começa com 1000. A mesma dupla conta no ranking no máximo 3 vezes por dia (contra vitórias combinadas). Veja na conta online, em "Ranking de duelos"
- A vila inteira vê o começo e o resultado de cada duelo no chat
- Servidor: mensagens `duel`, `dans`, `dlost`, `dinv`, `dstart` e `dend`, rota `GET /duels` e tabelas `duel_ratings` e `duel_pairs` (migração 011). O teto de dano PvP e a contagem de suspeitas valem também nos duelos

## 0.52.0 · Decoração da casa
- **Decoração com Fios Dourados**, sempre à venda (não depende da vitrine da semana), no catálogo da sua casa: 13 peças em 6 lugares fixos
  - **Tapete da sala:** Tapete Real, Tapete do Mar e Tapete de Fios Vivos (que brilha)
  - **Parede:** Quadro da Fenda de Vidro, Tapeçaria do Tear e Estandarte da Vila Brasa
  - **Teto:** Lustre de Vidro (ilumina a sala) e Lanternas Flutuantes
  - **Chão (3 lugares):** Aquário com Peixe-Lua, Fonte de Pedra, Árvore de Lanternas, Vaso de Cristais e Estátua do Dragão Dourado
- Trocar de lugar, tirar e recolocar é de graça; cada peça comprada é da conta para sempre
- **Só estilo:** decoração não dá bônus. A posse fica no servidor, que recusa o save com peça que a conta não tem, no lugar errado ou repetida
- A loja do Passe lembra que a decoração fica no catálogo da casa
- Servidor: `POST /shop/deco` e a conferência de `deco` no `PUT /save`

## 0.51.0 · Guildas (etapa social)
- **Painel Guilda** (botão ao lado de Amigos e na conta online): funde a sua guilda com **nome, sigla e emblema** (forma, cor e símbolo, com prévia). Custa 25.000 Centelhas e pede nível 15
- **Convites e cargos:** Líder e Oficiais convidam pelo nome (o convidado recebe o aviso e entra pelo painel); o Líder promove até 5 Oficiais, rebaixa e passa a liderança; Oficiais expulsam membros. Quem sai ou é expulso espera 24 h para entrar em outra guilda
- **Sigla no nome:** os outros jogadores veem `[SIGLA]` antes do seu título, na hora em que você entra
- **Chat da guilda:** `/gu mensagem` fala com toda a guilda, em qualquer lugar; avisos da guilda (entradas, saídas, cargos, recado do dia) também chegam no chat
- **Recado do dia** (com o filtro de palavras) e **registro** das últimas ações
- **Fios da Guilda:** cada missão do Passe vale 10 (diária) ou 60 (semanal) para a sua guilda, e dá para doar Centelhas (1 Fio a cada 100, até 300 por dia). O total sobe o **nível da guilda** (1 a 20), e o painel mostra a contribuição de cada membro na semana
- Se o Líder sair (ou excluir a conta), a liderança passa para o Oficial mais antigo (ou o membro mais antigo); o último a sair desfaz a guilda
- Fechar um painel do online não deixa mais o foco num botão (antes, o Enter reabria o painel em vez de abrir o chat)
- Servidor: rotas `/guild` (ver, fundar, convidar, aceitar, recusar, sair, expulsar, cargo, recado, emblema, doar) e tabelas `guilds`, `guild_members`, `guild_invites`, `guild_leaves`, `guild_log` (migração 010)

## 0.50.0 · Chat em todo lugar, por local
- **O chat não some mais:** ele fica disponível em qualquer lugar do jogo online (vila, taverna, casas, Pesqueiro, Ermos, Fendas e regiões da história)
- **Cada ambiente com o seu bate-papo:** na vila, nos Ermos e na Fenda do grupo, a mensagem chega a quem está **perto** (até 30 m); na taverna, em cada casa e nas regiões, a quem está **no mesmo lugar**. Cada casa tem o seu chat
- Cada mensagem mostra o **rótulo do lugar** (Vila, Ermos, Taverna da Mel…), e o campo de texto diz onde você está falando
- Se ninguém estiver perto, o jogo avisa ("Ninguém por perto ouviu") e lembra do `/g`, que fala com o grupo de qualquer lugar
- Emotes funcionam em qualquer sala com outros jogadores (vila, Ermos e Fenda do grupo)
- Dentro da taverna e das casas, você sai da sala da vila (cada interior é um ambiente próprio), e os amigos veem "Taverna da Mel" ou "Casa na vila" na lista

## 0.49.0 · Proteção contra trapaça e moderação
- **Velocidade impossível** na vila e nos Ermos: o servidor já segurava o personagem; agora também conta. Muitos saltos seguidos ficam registrados e, se continuarem, a conexão é encerrada
- **Teto de dano no PvP** do Ermo Profundo, calculado pelo nível, pelos pontos de Poder e pelo equipamento de quem bate (com folga para crítico e para o meteoro do Arcano). Acerto acima do teto não chega à vítima e conta como suspeita
- **Save:** peixes demais (mais de ~12 por minuto) ou Fios do Tear demais para o tempo jogado são recusados; ritmos altos, mas possíveis, ficam só como alerta
- **Alertas por conta:** com 6 alertas em 8 dias, o prêmio do Torneio de Pesca fica retido para análise
- **Moderação** com `ADMIN_TOKEN`: ver e marcar reportes, ver as contas com mais alertas, suspender e reativar contas (quem é suspenso cai na hora). Exemplos em `docs/DEPLOY.md`

## 0.48.0 · Privacidade, termos, excluir conta e reportar problema
- **Termos de Uso** (`termos.html`): regras de convivência, o que são os itens e as moedas do jogo, compras pelo Mercado Pago e **reembolso em até 7 dias** se os Fios Dourados do pacote não foram usados (Código de Defesa do Consumidor)
- **Política de Privacidade atualizada:** compras (os dados do pagamento ficam no Mercado Pago, nunca no nosso servidor), reportes e por quanto tempo guardamos cada coisa
- **Baixar meus dados:** na conta online, um arquivo com tudo o que o servidor guarda (conta, save, Fios Dourados, cosméticos, correio, pagamentos e histórico), sem senha
- **Excluir conta:** na conta online, apaga a conta e tudo ligado a ela na hora (pede o nome do Tecelão e a senha, se houver). Os registros de pagamento ficam guardados pelo prazo da lei, sem a ligação com a conta
- **Reportar problema:** no menu (Esc) e na conta: erro no jogo, jogador, pagamento ou outro assunto, com a versão, a região e a tela anexadas para ajudar a corrigir. Funciona até sem conta
- Links para os Termos e a Privacidade no menu e na tela de entrar
- Servidor: `GET /account/export`, `POST /account/delete`, `POST /report`, tabela `reports` e pagamentos que sobrevivem à exclusão da conta (migração 009)
- `docs/ROADMAP.md` posto em dia com o que já foi feito e o plano das próximas versões

## 0.47.0 · Notificações organizadas e missões do Passe no HUD
- **Menos poluição no meio da tela:** só os marcos (nível, chefe, item lendário, peixe raro, anoitecer…) aparecem no centro, **um por vez**, em fila. O resto (itens coletados, Centelhas, pesca comum, avisos) vai para um **feed no canto direito, logo abaixo do minimapa**
- **Repetidas se juntam:** pegar o mesmo item várias vezes mostra uma linha só, com contador (×2, ×3…), em vez de empilhar avisos
- **Pesca mais limpa:** "Peixe mordeu!", "Ele está brigando!" e o resultado aparecem na hora e o aviso da mordida some quando você puxa; os pontos de torneio não aparecem mais duas vezes (só quando você sobe no ranking)
- **Missões do Passe no rastreador do HUD:** as concluídas aparecem para resgatar ("pronta · resgate (P)") e, com espaço, as que estão andando com o progresso (ex.: "Pesque 6 peixes: 4/6")
- **Painel de objetivo minimizável:** clique para recolher (fica só "▸ OBJETIVO"; o jogo lembra a escolha). Depois de terminar a história, o painel some e o espaço vai para as missões do Passe e os contratos

## 0.46.0 · Fios Dourados pelo Mercado Pago e as decisões das guildas
- **Compra de Fios Dourados com Pix ou cartão** pelo Mercado Pago (Checkout Pro). Na loja do Passe, o botão **Comprar** abre a página de pagamento numa aba nova; quando o pagamento é aprovado, os Fios Dourados chegam sozinhos (o jogo confere o saldo e avisa). Pix pendente é creditado assim que o Mercado Pago confirmar
- **Seguro do lado do servidor:** o crédito só acontece no webhook, depois de o servidor consultar o pagamento direto na API do Mercado Pago (aprovado, em reais e com o valor exato do pacote), e uma única vez por pagamento. Webhook com assinatura conferida (`x-signature`), estorno e chargeback tiram os Fios Dourados de volta, e tudo fica no registro de auditoria
- No app Android a compra fica escondida (a Google Play exige o Billing dela); dá para comprar pelo site com a mesma conta
- **Guildas:** decisões registradas em `docs/GUILDS.md`. A ilha é só para membros e convidados, a guerra pareia as guildas pelo peso de guerra (como nos jogos de clã, com escalações do mesmo tamanho e estrelas por ataque) e a guilda acompanha o jogador em regiões e servidores futuros
- Servidor: `POST /payments/mp/webhook`, `POST /shop/dourados` devolve o link do checkout, tabela `payments` (migração 008), variáveis `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `PUBLIC_API_URL` e `SITE_URL` (veja `docs/DEPLOY.md`)

## 0.45.0 · Prévia na loja, cosméticos novos e o plano das guildas
- **Prévia na loja:** o botão Prévia mostra o seu herói girando no pedestal com o cosmético em loop (o rastro numa esquiva, o teleporte e a morte a cada 2,5 s) e o seu nome com a cor, o título e a moldura, antes de comprar
- **Efeito de teleporte** (4): Coluna de Luz, Portal de Fios, Redemoinho de Folhas e Rasgo do Vazio. Toca quando você chega por portal, obelisco ou ao renascer, e os outros jogadores veem quando você aparece
- **Efeito de morte** (3): Desfazer em Pétalas, Estilhaço de Vidro e Cinzas e Brasas. Toca quando você cai (os outros veem no grupo)
- **Moldura do nome** (4): Dourada, de Luar, de Espinhos e de Fios Vivos (animada), no nome acima do herói
- Tudo no Guarda-Roupa da casa, só com o que a conta tem; a vitrine semanal da loja passa a sortear também entre esses
- **Plano das guildas** em `docs/GUILDS.md`: guilda com cargos e contribuição (Fios da Guilda), a Ilha da Guilda no Arquipélago do Tear com prédios que deixam a ilha mais forte e a Guerra de Guildas semanal em cerco, sempre sem vantagem paga

## 0.44.0 · Temporada 1: Passe do Tear, cosméticos e equilíbrio das classes
- **Passe do Tear (tecla P ou botão Passe):** Temporada 1 · A Fenda de Vidro, 8 semanas e 40 níveis. Trilha grátis a cada 2 níveis (Centelhas, Fios do Tear, títulos e Fios Dourados) e trilha premium em todos os níveis, com 8 cosméticos exclusivos e 660 Fios Dourados de volta. O premium custa 950 Fios Dourados
- **Missões:** 3 diárias e 3 semanais, iguais para todos, cumpridas jogando: matar monstros, elites e Alfas, Fendas, chefes, pescar, cozinhar, vender peixe, abrir baús, aprimorar, comer na taverna, obeliscos, caçar nos Ermos à noite. Quando uma termina, chega um aviso e um ponto vermelho no botão do passe
- **Entrada diária:** 7 dias seguidos com recompensas crescentes (o 7º dá Fios Dourados); perdeu um dia, recomeça
- **Loja de cosméticos:** vitrine de 4 itens que muda toda segunda, com Fios Dourados. Cosmético de conquista nunca é vendido (o 1º lugar do Torneio de Pesca ganha o título "Campeão do Torneio")
- **Cosméticos novos, visíveis para os outros:** 8 rastros de esquiva (brasas, pétalas, gelo, vidro estilhaçado, fios de luz, sombra, poeira de estrelas, folhas), 5 cores de nome (inclusive a Aurora, animada) e 6 títulos. Escolha no Guarda-Roupa da casa
- **Fios Dourados** ficam no servidor (não no save) e o servidor recusa equipar o que a conta não tem. A compra com dinheiro real ainda não está ligada ("em breve"); por enquanto eles vêm do passe e da entrada diária
- **Equilíbrio das classes** (pelo simulador): o Arcano era o mais fraco em tudo; agora tem mais dano (12 → 13,5), ataque mais rápido (0,38 → 0,34 s), Nova a cada 6 s e explosão maior (60% num raio de 1,8 m) e virou o melhor em área. O Arco ganhou +7% de dano. As três classes ficaram a menos de 12% uma da outra num alvo, cada uma com o seu forte
- Servidor: `GET /season`, `POST /season/mission`, `POST /season/claim`, `POST /season/premium`, `POST /login/claim`, `POST /shop/buy`, `POST /shop/dourados`; tabelas `wallet`, `cosmetics_owned`, `season_progress` e `login_streak` (migração 007); `DEV_PAYMENTS` só para testes

## 0.43.0 · Acabamento: interiores, clima, torneio, mercado e histórico
- **Interiores mais vivos:** mesas com tampo de tábuas e borda escura (que se leem bem de cima), toalhas xadrez, cadeiras com encosto viradas para a mesa, pratos, canecas e velas, quadros e ervas secando nas paredes. Na taverna, a Mel circula entre o balcão e as mesas levando a caneca, e o alaúde do Lio solta notas no ar. De dia também tem gente: o Otto almoça lá do meio-dia à 13h30 e o Vovô Brann joga cartas das 12h às 15h
- **Som do clima:** chuva contínua (forte na tempestade, abafada dentro de casa) e trovão de verdade, com estalo e ronco longo
- **Poças:** com a chuva, o chão andável junta poças que enchem em 20 s e secam devagar depois que para; durante a chuva, as gotas fazem anéis na água
- **Torneio de Pesca:** cada pesca online mostra os pontos ganhos, o total da semana e a sua posição, com um aviso grande quando você sobe no ranking. A taverna ganhou o **Quadro do Torneio**, com o ranking e os campeões
- **Mercado da Vila:** busca pelo nome, filtro por tipo e por raridade, ordem (mais novos, menor e maior preço, mais poder) e "só o que eu posso usar" (classe e nível); agora mostra até 200 anúncios
- **Histórico:** nova aba no mercado com as suas trocas diretas (com quem, o que deu, o que recebeu e as Centelhas) e as compras e vendas no mercado
- Rotina: morador com missão para oferecer ou em andamento fica sempre na rua, a qualquer hora (a história nunca trava porque alguém foi para a taverna ou dormir)
- Servidor: `GET /history`, posição no torneio na resposta de cada pesca, tabela `trade_log` (migração 006)

## 0.42.0 · Morro do Mirante
- **Relevo de verdade:** ao sul do Pesqueiro, de frente para o Remanso, um morro em que dá para subir por qualquer lado. O chão, as pedras e tudo o que está nele acompanham a encosta, com a luz inclinada; o herói, os outros jogadores e a câmera sobem junto
- **Mirante:** no topo há um banco, uma bandeira e uma luneta de latão. Olhar pela luneta afasta a câmera e mostra o rio, o Remanso e a vila lá embaixo; a primeira vez dá +150 de XP

## 0.41.0 · Mercado da Vila e troca direta
- **Mercado da Vila (online):** nas bancas da praça norte. Anuncie um item da bolsa pelo preço que quiser (até 8 anúncios): ele sai da sua bolsa e fica à venda até alguém comprar ou você cancelar. Compre o que os outros anunciaram com as suas Centelhas. As vendas ficam guardadas até você receber, com 5% de taxa da vila
- **Troca direta (online):** toque no nome de alguém na sua sala e escolha **Propor troca**. Cada um escolhe itens da bolsa (até 8) e Centelhas; mudar a oferta desfaz as confirmações; quando os dois confirmam, o servidor troca tudo de uma vez, nos dois saves
- Segurança: tudo passa pelo save da nuvem (o jogo sincroniza antes), de forma atômica; o item que sai da sua conta ganha lápide e não volta pelo save; o servidor só aceita na oferta o que está mesmo na sua bolsa e as Centelhas que você tem
- Servidor: `GET /market`, `POST /market/list`, `POST /market/:id/buy`, `POST /market/:id/cancel`, `POST /market/collect`; mensagens `tprop`, `tans`, `toffer`, `tready`, `tcancel`; tabela `market_listings` (migração 005)

## 0.40.0 · Torneio de Pesca
- **Peso dos peixes:** cada pesca tem peso em kg (os grandes são raros), aparece no aviso e vira recorde por espécie na coleção
- **Torneio semanal (online):** toda pesca soma pontos pelo peso, comparado aos da mesma espécie, e pela raridade (um Rei-do-Rio grande vale muito). A semana vira toda segunda-feira às 00:00 UTC. Na banca do Pesqueiro, a aba **Torneio** mostra o ranking (20 primeiros, com a melhor pesca de cada um), a sua posição, o tempo que falta e os campeões da semana passada
- **Prêmios:** os 10 primeiros da semana passada resgatam Centelhas uma vez (6000, 4000, 2500, 1500, 1200, 1000, 800, 600, 500 e 400)
- Servidor: `POST /fish/catch` (confere a espécie, a faixa de peso e o ritmo), `GET /fish/tournament`, `POST /fish/tournament/claim`; tabela `fish_scores` (migração 004)

## 0.39.0 · Clima
- **Chuva, neblina e tempestade:** a cada 6 horas do jogo (6 min reais) o tempo muda, pela hora do servidor (todos veem o mesmo céu): céu limpo (metade das vezes), chuva, neblina ou tempestade, com entrada e saída suaves. Dentro de casa, na Fenda e nos covis o tempo não muda
- **Chuva:** gotas e respingos, céu acinzentado. O peixe morde 35% mais rápido e o raro aparece mais; os monstros só percebem você de mais perto (os passos ficam abafados)
- **Neblina:** o longe some na névoa (de noite, escura). Os monstros enxergam pouco (percebem você bem mais perto) e os Ermos dão +15% de XP
- **Tempestade:** chuva forte com vento, relâmpagos (clarão e trovão) e, nos Ermos, raios que caem perto de você (círculo no chão; fora dos acampamentos)
- O relógio do HUD mostra o tempo (☂ chuva, ≋ neblina, ⚡ tempestade) e um aviso chega quando o tempo muda

## 0.38.0 · Taverna, casas dos moradores e rotina
- **Entrar nas casas:** a Taverna da Mel e as casas de dez moradores têm porta: aproxime-se e entre. Cada casa tem a mobília do dono (as armas da Tarsa, os livros e o cristal da Ysolde, os caixotes do Otto, as caminhas do Kiko e da Nina, a cadeira de balanço do Brann, as lanternas da Lúcia, os cestos da Dora, os alaúdes dos bardos, as varas do Ivo). Ao sair, você volta na porta por onde entrou (inclusive da sua casa)
- **Rotina de dia e de noite:** a Mel vai para o balcão da taverna às 17h; o Lio toca lá das 19h à 1h e o Otto bebe das 20h à meia-noite; o Brann passa na taverna e vai dormir às 21h; as crianças ficam na porta da taverna até as 22h e vão para a cama; a Ysolde dorme das 23h às 5h; a Dora fecha a banca (coberta com lona) das 19h às 7h; a Tarsa faz a ronda à noite com lanterna e dorme de dia; a Lúcia volta para casa depois de acender os postes. Quem está em casa atende lá dentro, e quem dorme acorda resmungando
- Morador com missão em andamento ou que você precisa encontrar para a história fica na rua
- **Comida:** a Mel vende Sopa da Mel (40 ✦, +10% de vida) e Torta de Maçã (90 ✦, +10% de dano e +25% de Centelhas), por 8 minutos
- **Cozinhar peixe:** na fogueira do Bairro Leste ou no fogareiro da taverna. Peixe Assado (2 Lambaris, +12% de vida), Truta na Brasa (2 Trutas, +12% de dano), Ensopado do Rio (Bagre + Tilápia, +20% de vida e −8% de dano recebido) e Banquete do Rei (1 Rei-do-Rio, +20% de vida e dano, mais velocidade e +25% de XP). Cozinhar também cura 30%

## 0.37.0 · A ronda da Lúcia e postes nas ruas
- **A Acendedora Lúcia acende a vila:** às 17h12 ela sai de casa e corre pelas ruas de poste em poste, para, ergue a vara e acende cada lanterna (com faíscas); a ronda leva cerca de 3 minutos e termina quando a noite fecha. Às 4h24 ela refaz o caminho apagando, e os postes ficam apagados de dia. Fora da ronda, ela passeia como antes
- **Todos veem a mesma ronda:** sai da hora do servidor, então a Lúcia está no mesmo lugar e os mesmos postes estão acesos para todos os jogadores
- **Postes organizados:** 27 postes nas beiras das ruas: dos dois lados da rua principal (alternando a cada 12 m), em volta da fonte e da fogueira, nas ruas norte-sul, na praça dos portais e na trilha do Pesqueiro. As lanternas viraram gaiolas de ferro com vidro, e só têm chama quando acesas
- A luz da noite agora vem dos postes que a Lúcia acendeu (antes todos brilhavam sempre)

## 0.36.0 · Dia e noite e vila mais completa
- **Ciclo de dia e noite:** 1 minuto real = 1 hora na Tessária (o dia dura 24 min), pela hora do servidor, então todos veem a mesma hora. Noite das 20h às 5h, com entardecer alaranjado e amanhecer. Vale ao ar livre (vila, Ermos, bosque, pântano e picos); Fendas e covis não mudam
- **Luz da noite:** onde a luz não chega fica azul-escuro; lampiões, janelas, lanternas, a forja, a fogueira e os acampamentos dos Ermos iluminam em volta, e o herói carrega uma luz (maior nos Ermos). Vaga-lumes aparecem muito mais à noite
- **A noite muda o jogo:** nos Ermos, monstros com +15% de dano, mais elites, +25% de XP e +40% de chance de item; a Lua de Sangue só nasce à noite. No Pesqueiro, a Enguia-de-Fio, o Peixe-Lua e o Rei-do-Rio aparecem muito mais. Na vila, Kiko e Nina ficam na porta da taverna ouvindo histórias
- **Relógio no HUD:** ☀ ou ☾ com a hora, ao lado do nome, e avisos quando anoitece e amanhece
- **Casas por dentro:** quem passa por trás de uma casa vê pelo recorte o assoalho, o tapete, a cama, a mesa com banquetas, o baú e a lareira acesa (na taverna, balcão, mesas e barris; na ferraria, bigorna, barras de ferro e tina). O recorte agora se desfaz em pontilhado na borda, em vez de abrir um buraco seco
- **Banco do Tear:** o teto não fica mais vazado (laje de mármore em volta da cúpula, cornija e pináculos dourados) e as janelas viraram vitrais com moldura dourada
- **Vila mais completa:** floreiras nas janelas, lenha empilhada, arbustos floridos, carroças de feira com abóboras e maçãs, placas nos caminhos, cercas e lanternas no Pesqueiro

## 0.35.0 · Pesqueiro e Ermos por faixa
- **Pesqueiro do Ivo:** a vila cresceu para o leste. Uma passagem ao sul da rua principal leva a um rio que desce do lago (o riacho tem ponte de tábuas), com a casa do Ivo, a banca de peixes e quatro píeres: do Norte, da Corredeira, do Salgueiro e o Remanso Fundo. O Ivo agora pesca no rio
- **Dez peixes:** Lambari, Tilápia-de-Brasa, Truta-Prateada, Bagre-Velho, Carpa Dourada, Dourado-do-Rio, Enguia-de-Fio, Salmão-Brasa, Peixe-Lua e o Rei-do-Rio, que vive no Remanso e só sobe para a Isca de Fio. Cada água tem os seus
- **Briga e varas:** peixe pesado briga e pede 2 a 4 puxões seguidos; se a vara for fraca para ele, a linha arrebenta. Cinco varas (Bambu, Reforçada, Carvalho, Brasa e Tear) aguentam mais peso e dão mais tempo para puxar
- **Iscas:** Minhoca (morde mais rápido), Grilo-de-Brasa (Pescador 4) e Isca de Fio (Pescador 9), em pacotes. Cada lançamento gasta uma; dá para pescar sem isca
- **Pescador:** XP própria e nível de 1 a 30 (mais peixe raro e mais tempo para puxar); peixe novo na coleção dá XP em dobro. A aba Pescador mostra a coleção e as pistas dos que faltam
- **Mercado de peixes:** o peixe vai para o cesto e é vendido na banca. Cada peixe vendido baixa o preço daquele peixe, que se recupera com o tempo (metade da queda some em 40 min), e a tendência de cada peixe muda a cada hora (▲▼). **Online, o mercado é um só para todos**: se muita gente vende truta, a truta barateia para todo mundo
- **Ermos abertos por faixa:** as salas públicas dos Ermos se separam por dificuldade (Normal e Difícil · Expert e Mestre · Tormento), e quem está em grupo cai na sala do líder
- Servidor: mercado de peixes (`GET /fish/market`, `POST /fish/sell`), validação do cesto, iscas, vara e XP de Pescador no save, limites da vila ampliados

## 0.34.0 · Ermos abertos e PvP no Ermo Profundo
- **Ermos abertos:** quem entra nos Ermos sem estar nos Ermos do grupo cai numa sala pública (`Ermos #1`, até 30 jogadores) e vê os outros Tecelões andando, lutando, com emotes, auras e chat. Cada jogo continua com os próprios monstros; para caçar os mesmos, abram os Ermos do grupo
- **PvP no Ermo Profundo:** no anel de fora os jogadores podem se atacar com golpes, giros, projéteis e o Golpe do Tear. O nome de quem pode ser atacado fica vermelho com ⚔, e ao entrar chega o aviso **PVP ATIVO**. O dano entre jogadores é 30% do golpe, no máximo 20% da vida de quem leva
- **Sem fogo amigo:** amigos e membros do grupo nunca se acertam. O servidor confere cada acerto (sala, Ermo Profundo, distância, amizade, grupo e ritmo)
- **Espólio para qualquer um:** online, quem cai nos Ermos larga Centelhas e bolsa no chão da sala por 5 minutos e o primeiro que chegar leva, inclusive o dono. O espólio dos outros aparece com feixe laranja. Se pegarem o seu, você é avisado (até ao voltar), e os itens não voltam pelo seu save
- **Sentar melhor:** o manto do Arcano acompanha as coxas (sem o buraco na perna) e o cajado fica de pé ao lado, apoiado no chão; as armas não somem mais
- **Auras no espelho:** as partículas da aura aparecem no Guarda-Roupa, na criação e no inventário
- **Novo padrão de imagem:** pixel 3 e pontilhado 0,5 (quem já jogava passa para o novo padrão uma vez; dá para mudar no menu)
- Servidor: salas públicas dos Ermos, PvP validado, espólio da sala com lápide, teleporte aceito (obelisco e renascer); a sala do grupo nos Ermos agora se chama "Ermos do grupo"

## 0.33.0 · Ermos maiores
- **Ermos 1,8× maiores (400×350):** os biomas do meio ficaram bem mais largos (anéis maiores), com mais estradas e mais acampamentos de monstros (até 760). O Ermo Profundo continua envolvendo tudo e fica mais forte a cada passo para fora
- **Acampamentos espaçados:** os dois acampamentos com obelisco de cada bioma ficam no meio da faixa do bioma (não colados na vila) e longe um do outro (no mínimo ~55 ladrilhos)
- Quem já tinha explorado os Ermos recomeça o mapa explorado deles (o mapa mudou de tamanho); os obeliscos acesos continuam acesos. Checkpoints que caíram em parede voltam para o portão da vila
- Servidor: limites da instância dos Ermos do grupo ampliados para o mapa novo

## 0.32.0 · Tear do Destino e auras
- **Tear do Destino:** tecer itens com Fios do Tear (no menu do portal da Fenda, no Santuário) agora é um espetáculo: fios violeta giram em espiral em volta do portal, convergem, ganham a cor da raridade e o item nasce num clarão (com tremor e som nos Épicos e Lendários)
- **Tecer ao acaso (8 Fios):** a "caixa-surpresa" do Tear: raridade sorteada com sorte aumentada, de Mágico a Lendário (respeitando o teto da sua Fenda máxima). Continua dando para tecer Épico (15) e Lendário (45) direto
- **Auras (Guarda-Roupa):** efeitos de partículas caros, comprados uma vez: Brasas (3000), Vaga-lumes (3500), Pétalas (4500), Cristais de gelo (6000), Sombra violeta (8000) e Fios dourados (12000). Os outros jogadores veem a sua aura

## 0.31.0 · Golpe do Tear, banco no lugar certo e ferraria nova
- **Golpe do Tear (tecla R):** um especial por classe que carrega com o dano que você causa (cerca de 40 golpes; os bonecos de treino não contam). Quando a barra enche, o botão brilha e um aviso aparece:
  - **Lâmina, Fúria do Tear:** 4 s girando em chamas com dano em área contínuo e metade do dano recebido;
  - **Arcano, Estrela Cadente:** um meteoro cai onde você mira (explosão enorme e chão em brasa) e mais três menores em volta;
  - **Arco, Flecha do Céu:** uma flecha gigante atravessa tudo numa linha de 22 metros, com dano altíssimo, e deixa lento
- **Banco do Tear no lugar certo:** saiu do aperto entre a forja e a casa e ocupou o lugar de uma casa que só preenchia espaço, no lado norte da praça, de frente para a rua principal
- **Ferraria nova:** paredes de pedra em blocos, telhado de ardósia cinza, chaminé de pedra larga com fumaça, fornalha em arco com brasa, bigorna no toco, barril de têmpera, parede de ferramentas, armeiro com espadas, ferradura dourada e uma pérgola de vigas no lugar da lona (a frente fica à vista)

## 0.30.0 · Itens com peso, Banco do Tear e bolsa prática
- **Teto de raridade pela área:** o nível do item (tier) agora limita a raridade. Começo do jogo (Campina, Fendas 1 e 2): até **Raro**; meio (Mata, Teia, Fenda 3): até **Épico**; **Lendário** só a partir do Brejo, da Fenda 4 ou dos Tormentos. Chefes ganham um degrau a mais. Vale nos drops do jogo, no loot do servidor (Fenda do grupo) e no Mercador Suspeito
- **Raridade um pouco mais rara:** 40% dos drops são Mágicos ou melhores, 3,7% Épicos ou melhores e 0,7% Lendários (antes 45%, 5% e 1%). O covil dá Lendário em 8% (antes 25%)
- **Nível exigido para equipar:** cada item mostra "Nv X" e itens de áreas fundas pedem nível (o botão vira "Requer nível X"). Itens que você ainda não pode usar não são equipados sozinhos
- **Banco do Tear:** o baú virou um prédio de mármore na praça (entre a forja e a casa), com colunas, frontão com uma moeda dourada, cúpula dourada e a porta do cofre no alto da escada
- **Vender tudo no Otto:** um botão vende a bolsa inteira (dois toques para confirmar; os Lendários ficam)
- **Bolsa e lojas mais práticas:** o painel do item fica grudado embaixo, com os botões sempre à vista (sem rolar). Toque duas vezes num item da bolsa para equipar e, no Otto, para vender

## 0.29.0 · Cofre, espólio, bolsa maior e mapa com zoom
- **Cofre do Tear (banco):** na praça da vila. Guarde e saque Centelhas; o que está no cofre nunca se perde
- **Espólio nos Ermos:** morrer nos Ermos deixa no chão todas as Centelhas que você carrega e os itens da bolsa (os equipados e o cofre ficam). O espólio tem feixe dourado e a seta aponta para ele; você tem **5 minutos** para voltar e pegar, senão ele se desfaz. (Na próxima etapa, com os Ermos abertos para todos, outros jogadores também poderão pegar)
- **Bolsa maior:** o Otto vende +5 espaços de cada vez, até 40
- **Mais acampamentos e torres:** 2 acampamentos com obelisco em cada bioma do meio (1 na Campina, nenhum no Ermo Profundo), 13 no total, cada um com o seu Mercador Suspeito e estoque próprio. Obeliscos despertos antes continuam acesos
- **Mapa grande:** sem rolagem lateral, com **zoom** (roda do mouse e botões + e −), **arrastar para mover** e um botão para centralizar em você; abre perto de onde você está
- **Trilha que some:** os pontos dourados por onde você passou vão desbotando e somem em 8 minutos
- **Emotes refeitos para o esqueleto novo:** acenar usa a mão livre (a direita no arqueiro), com a mão balançando e o cotovelo dobrado; sentado, a capa desce reta e a arma fica guardada

## 0.28.0 · Perfil do herói e grupo equilibrado
- **HUD:** o nível agora fica num selo no canto do retrato e o nome tem a linha toda (nomes longos e a dificuldade não se sobrepõem mais)
- **Perfil:** clique no retrato do HUD para ver o seu herói em tamanho grande, atributos, XP, equipamento e a jornada (tempo de jogo, monstros, quedas, feitos, Fenda máxima, peixes)
- **Ícone do cajado** redesenhado: madeira com anéis dourados e uma meia-lua segurando a esfera brilhante
- **Faixa de nível do grupo:** só entra na Fenda e nos Ermos do grupo quem está a até **10 níveis** do líder; quem está fora recebe o aviso, e o líder também (regra no servidor)
- **XP de quem é carregado:** quando os monstros estão mais de 5 níveis acima do seu, o XP por abate fica limitado a uma fatia pequena do nível (menor quanto maior a diferença). Acabou o "nível 1 ao 14 numa Fenda"

## 0.27.0 · Mapa do Cartógrafo
- **O mapa agora é um item:** o **Mapa do Cartógrafo** é vendido pelo Mercador Otto (250 ✦) e, mais caro, pelo Mercador Suspeito dos Ermos (400 ✦). Sem ele não há minimapa; quem já explorava os Ermos ganhou o mapa
- **Com o mapa:** minimapa em todos os lugares (agora também na vila) e a **tecla M abre o mapa grande** de onde você estiver, com os portais que você já viu
- **Trilha e explorado salvos em cada região:** o mapa guarda por onde você passou (pontos dourados, os últimos 300 de cada região) e tudo o que você já viu, na vila, nas regiões da história e nos Ermos. A Fenda fica de fora, porque muda a cada vez
- Os obeliscos dos Ermos continuam levando aos outros obeliscos acesos mesmo sem o mapa (pela lista)

## 0.26.0 · Ermos: acampamentos, mercador e mapa de viagem
- **Acampamentos:** cada obelisco dos Ermos virou um acampamento com tendas, fogueira, estandarte e lanternas. É **zona segura**: monstros não entram, ninguém leva dano e a vida volta aos poucos. O minimapa mostra "SEGURO"
- **Mercador Suspeito:** em cada acampamento, um vendedor encapuzado com 5 itens do nível do bioma e uma poção "de procedência duvidosa". O **estoque e os preços mudam a cada hora** (iguais para todos os jogadores), de pechincha a caro; o que você compra sai do estoque da hora
- **Mapa dos Ermos (tecla M):** mostra o que você já explorou, os obeliscos e os acampamentos. Num obelisco, o mapa abre em modo viagem: toque num obelisco aceso para ir até ele (ou no portão da vila)
- **Minimapa com memória:** o que você explorou nos Ermos fica salvo e não some mais ao sair e voltar
- **Ermo Profundo:** sem acampamentos nem santuários, e os monstros ficam mais fortes quanto mais fundo você vai (até +30 níveis). O minimapa mostra o nível real do ponto em que você está

## 0.25.0 · Portais com estilo
- **Cada portal da vila tem a cara do destino:** Bosque Sussurrante (arco de galhos e raízes, copa de folhas e flores, faíscas verdes), Ossuário Real (pedra e ossos com caveiras e velas), Picos de Cinza (basalto pontiagudo com rachaduras de lava e brasas), Pântano (madeira afogada com musgo pendurado e juncos), Ermos (arco de pedra em blocos com bandeira e lampião) e Cidadela de Vidro (prismas de cristal)

## 0.24.2 · Sem morros decorativos
- Os morros decorativos da 0.24.0 saíram da vila: eram só montes de grama sem subida. Lagos orgânicos e bordas irregulares continuam

## 0.24.1 · Galinheiro livre
- **Correção:** um dos morros novos caiu bem na frente da porteira do galinheiro da praça e impedia a entrada. Agora o galinheiro e a frente da porteira ficam reservados e nenhum morro ou recuo de borda nasce ali

## 0.24.0 · Vila mais orgânica
- **Lagos de contorno natural:** o lago do Bairro Leste e a lagoa da praça perderam os degraus quadrados. A margem segue uma forma irregular desenhada ponto a ponto, com faixa de areia, juncos, pedras e vitórias-régias
- **Bordas irregulares:** a linha de árvores que cerca a vila avança e recua em vez de formar retângulos. Caminhos, portais, casas e tudo que é usado em missões ficam livres
- **Morros:** sete morros gramados espalhados pelos espaços abertos, com pedras, flores e às vezes uma árvore, longe dos caminhos, da arena, da fogueira, das minhocas e da rota da Acendedora

## 0.23.0 · HUD novo, Bairro Leste vivo e coleta visível
- **Retrato do herói no HUD:** um busto do seu personagem, desenhado pelo próprio motor, com as suas cores, cabelo, acessório e armadura; atualiza quando você troca o visual ou o equipamento
- **Ícones 3D:** os ícones da barra de ações, das poções, das Centelhas, das Memórias e dos botões do topo agora são modelos de splats desenhados no estilo do jogo (espada, cajado, arco, esquiva, giro, nova, chuva de flechas, poção, bolsa, coração, gema, livro, engrenagem). Barra com cantos dourados e fundo próprio
- **Coleta visível:** todo item de missão no chão tem um feixe de luz que se vê de longe e um anel no chão, as minhocas-de-brasa aparecem se mexendo, e uma **seta dourada no chão** aponta para o item mais perto
- **Bairro Leste mais vivo:** a Acendedora Lúcia anda de lampião em lampião e acende com a vara; a Feirante Dora cuida da feira nova (duas barracas, caixotes e barris); patos nadam no lago; vaga-lumes no lago e na fogueira; poço, canteiros de flores, fardos de feno e um varal com roupas

## 0.22.0 · Estilos de armadura
- **Estilo da armadura no Guarda-Roupa:** Clássica e Couro (grátis), Placas (1200 ✦), Escamas (1500 ✦) e Tabardo real (1800 ✦), comprados uma vez. A raridade da peça continua dando a cor do metal e do brilho e os enfeites a mais (braçadeiras, grevas, gorjal, espinhos, diadema):
  - **Couro:** gibão com tiras cruzadas e fivelas, gola de pele e ombreiras leves;
  - **Placas:** peito com nervuras e placa saliente, ombreiras em três camadas, gorjal e saiote de placas;
  - **Escamas:** cota de escamas desencontradas com sulcos escuros, ombreiras de escama e crista nas costas nas lendárias;
  - **Tabardo real:** túnica por cima da armadura, com barra, brasão no peito e pano nos ombros
- Os outros jogadores veem o seu estilo (o servidor repassa o estilo no visual)

## 0.21.0 · Santuário da Fenda, pesca do Ivo e sentar de verdade
- **Santuário da Fenda:** a Fenda do Tear ganhou uma praça própria ao sul do Bairro Leste, com entrada pelo oeste sob um arco de obsidiana, piso de pedra, dois círculos de runas violeta, pilares com garras e chama violeta e um estrado. O **portal novo é sombrio**: anel de pedra escura e irregular, garras, um redemoinho violeta com braços pretos girando, estilhaços em órbita e centelhas subindo. Ao voltar da Fenda, você chega no santuário
- **Missão "A Vara do Ivo":** o Pescador Ivo se mudou para o lago do Bairro Leste. Ache 4 minhocas-de-brasa (brilham no chão perto das casas, do lago e da arena) e ele te dá a vara. Sem a vara não dá para pescar; quem já tinha pescado antes fica com ela
- **Pesca animada:** o herói guarda a arma, lança a linha, segura a vara com as duas mãos e ela verga na mordida; a boia balança e afunda; ao puxar, o peixe salta em arco até a mão (na cor do peixe) e o herói comemora
- **Sentar de verdade:** o herói desce suave, apoia as mãos nos joelhos, dobra os joelhos, a capa cai por trás do banco, fica de frente para a fogueira e não levanta sozinho depois de 6 segundos (os outros jogadores veem igual)
- **Correção:** no Guarda-Roupa, a armadura e a arma apareciam com a cor da raridade comum (o peitoral de ouro ficava prata)
- **Correção:** as cores do Bardo Tomé eram trocadas pelas do Reflexo

## 0.20.2 · Correção do Guarda-Roupa
- **Correção:** comprar o Guarda-Roupa fazia o servidor recusar o progresso ("mobília desconhecida: guarda"). O servidor agora conhece o Guarda-Roupa e os estilos raros, e um teste confere que toda mobília e todo estilo do jogo passam na validação

## 0.20.1 · Rosto refeito
- **Olhos no estilo chibi:** oval escuro, íris na cor do brilho na parte de baixo e um brilho em cima. Sai o anel brilhante enorme, que parecia um óculos de luz
- **Sobrancelhas suaves** (antes pareciam bravas), **nariz pequeno** e **sorriso fino** em vez de um borrão
- Olhos e boca usam a cor escura fixa da paleta, que não se confunde com nenhum tom de pele

## 0.20.0 · Herói articulado e Guarda-Roupa
- **Cotovelos e joelhos:** o herói, os outros jogadores e os moradores ganharam antebraços e canelas com articulação. Os braços dobram ao andar, no golpe, no tiro e no lançamento; os joelhos dobram ao correr, na esquiva, ao aterrissar e para sentar de verdade
- **Mão no cajado:** o Arcano segura o cajado com a mão fechada (dedos em volta do cabo) e o cotovelo dobrado; a Lâmina fecha a mão no cabo da espada. O escudo acompanha o antebraço
- **Fim do aspecto de "bolinhas":** o seu herói e os outros jogadores são desenhados com splats menores e mais densos, sem o brilho no centro de cada um, então a superfície fica lisa. Pernas e quadril não vazam mais pelo manto do Arcano
- **Olhos refeitos:** sem o branco; íris brilhante na cor escolhida, pupila escura e um brilhinho
- **Guarda-Roupa** (mobília da casa, 900 ✦): troque o visual quando quiser no mesmo espelho da criação, com o equipamento vestido. "Cancelar" desfaz, "Vestir" salva e os outros jogadores veem na hora
- **Estilos raros** (só no Guarda-Roupa, comprados uma vez): Flor no cabelo, Óculos redondos, Orelhas de elfo, Auréola, Cartola e o cabelo Tranças
- **Online mais arrumado:** o painel do grupo fica abaixo do objetivo e do status (antes cobria os dois); Chat e Amigos ficam lado a lado (o Amigos cobria o Chat); o balão de fala usa a fonte de leitura e fica menor no celular; nomes de jogadores lado a lado não se encavalam mais

## 0.19.0 · Herói em destaque
- **Personagem mais nítido:** o herói (e os outros jogadores e moradores) tem quase o dobro de splats, e o espelho da bolsa e da criação desenha na metade do tamanho de pixel, com o dobro de definição
- **Rosto de verdade:** olhos com branco, íris na cor do brilho e pupila, sobrancelhas na cor do cabelo e boca. Corrigido um buraco na testa que a touca de cabelo, o capuz e o elmo abriam no rosto
- **Cabelo com volume:** franja em mechas na testa e mechas laterais nos cortes Curto, Longo, Rabo e Coque
- **Roupa com acabamento:** gola e punhos na cor do detalhe, botões no peito (a armadura cobre), bolsinha no cinto, botas com cano, dobra e sola
- **Capa viva:** a capa ganhou dois ossos e esvoaça para trás ao correr, na esquiva e no giro; parada, balança com a respiração. Presilha e broches nos ombros
- **Zoom da câmera:** roda do mouse ou **+ / −** aproxima e afasta durante o jogo; a escolha fica salva (também no menu, "Zoom da câmera"). A câmera começa um pouco mais perto do que antes
- **Espelho com poses:** na bolsa e na criação, uma barra de poses (Parado, Ataque, Acenar, Comemorar, Dançar, Sentar) e aproximação com a roda do mouse ou os botões + e −
- **Destacar meu herói:** um anel discreto no chão marca o seu personagem no meio do grupo (pode desligar no menu)
- O Bardo Tomé agora carrega o alaúde

## 0.18.0 · HUD e controles (onda 1)
- **Interface em escala no PC:** o HUD, os avisos, o diálogo e os menus crescem com a janela (cerca de 1,1× em 1280×720 e 1,7× em 1920×1080). No celular nada muda
- **Barra de ações mais clara:** o mouse aparece desenhado nas teclas (botão esquerdo no ataque, **botão direito na habilidade**), a esquiva aceita Espaço e Shift, e cada botão mostra uma dica ao passar o mouse (a da habilidade traz a runa ativa)
- **Controles:** Shift direito também esquiva; a linha de controles some sozinha depois de um tempo e volta com **H**; a mira vira uma cruz durante o jogo
- **Menu de pausa:** controles em grade legível, com o mouse desenhado
- **Título:** texto de abertura legível sobre a vila ao fundo

## 0.17.0 · Vila 2.0: Bairro Leste
- **A vila quase dobrou:** um bairro novo a leste, ligado à praça por um caminho de pedra, com casas, lampiões e árvores
- **Praça da fogueira:** fogueira acesa com quatro bancos. Sentar perto dela recupera a vida aos poucos, e os outros jogadores veem você sentado
- **Bardo Tomé:** morador novo junto à fogueira, com canções e rumores sobre os biomas, os covis, a Lua de Sangue, os obeliscos e o co-op
- **Arena de treino:** três bonecos de palha que nunca caem, balançam quando apanham e mostram o seu **dano por segundo**
- **Lago de pesca:** lance a linha, espere o peixe morder e aperte na hora certa. Quatro peixes (Lambari, Tilápia-de-Brasa, Carpa Dourada e o raro Peixe-Lua) e o feito "Paciência de Tecelão"
- O portal da Cidadela de Vidro foi para a nova borda leste da vila

## 0.16.0 · Ermos em grupo, dificuldade do grupo e Fio de Elo
- **Ermos do grupo:** em grupo, o líder que entra no portal dos Ermos abre os Ermos para todos (aviso **Pronto?**). Mesmo mapa, mesmos monstros, Costurar, escala por jogador e loot sorteado pelo servidor no nível de cada bioma. A Lua de Sangue do líder vale para todos
- **Dificuldade do grupo:** vale a do líder, limitada à maior que todos já desbloquearam; o líder recebe o motivo quando ela cai ("Lume ainda não desbloqueou o Expert"). Cada um volta para a própria ao sair
- **Fio de Elo** (Fenda do grupo): quem está mais de 3 níveis abaixo do líder conta como "líder − 3" na vida e no dano; quem está mais de 5 acima conta como "líder + 5" e tem o equipamento limitado. O HUD mostra "1 → 9 ELO" ou "MENTOR"
- **Bônus de mentor:** quem está limitado ganha +25% de Centelhas e +10% de chance de item
- Correção: o nível de item nos Ermos passou a seguir o nível do bioma (até 5 no Ermo Profundo); antes, os biomas novos podiam gerar itens acima do teto aceito pelo servidor

## 0.15.0 · Ermos 2.0
- **Ermos cerca de 10× maiores** (300×260), montados em blocos sob demanda: cada pedaço do mapa é criado quando você chega perto e descartado quando fica longe, então o mapa grande não pesa no celular (entrar leva cerca de 1 s)
- **Oito biomas**, por distância e direção da vila, com cores, monstros e perigos próprios:
  - Campina Brasa (Nv 2) e Mata dos Uivos (Nv 8);
  - **Teia Funda** (Nv 12): aranhas, teias no chão que deixam lento, casulos e a Rainha da Teia;
  - **Brejo Cinzento** (Nv 15): muita água, juncos, névoa, sapos e afogados;
  - **Colinas Partidas** (Nv 17): pedras desabando (círculos no chão antes de cair);
  - **Cemitério Esquecido** (Nv 20): lápides, velas, esqueletos e fantasmas;
  - **Planalto de Cinzas** (Nv 24): chuva de brasas e fendas que brilham;
  - **Ermo Profundo** (Nv 28): mais Alfas e mais elites.
- **Covis com Alfa nomeado** em cada bioma (Rainha da Teia, Uivo Velho, Rei-Sapo, Besouro Couraça, O Lamento, Tirano de Cinzas, Urso Antigo, Javali-Rei): maiores, bem mais fortes, com loot melhor
- **Obeliscos**: desperte um em cada bioma e viaje entre eles (ou até o portão da vila)
- **Cavernas (covis)**: entradas nos Ermos levam a uma caverna fixa no nível do bioma, com guardião; a saída devolve na boca da caverna
- **Eventos**: Lua de Sangue (75 s com muito mais elites e +50% de XP) e emboscadas na estrada com recompensa
- **Minimapa** nos Ermos vira uma janela em volta do herói, com obeliscos e cavernas marcados
- Correções: o feito "Até o Fim do Mapa" voltou a exigir o Ermo Profundo; portais de saída de caverna nunca ficam trancados

## 0.14.0 · Loot pelo servidor e gerador de itens único
- **Gerador de itens único:** o jogo e o servidor usam o mesmo código para criar itens (`shared/items.ts`). Acabaram as regras duplicadas que podiam divergir
- **Loot da Fenda do grupo pelo servidor:** cada monstro derrotado é conferido pelo servidor (o mesmo monstro não paga duas vezes, há limite de ritmo e de total), que sorteia os itens de cada jogador perto, com o nível, a classe, a dificuldade e a Sorte de cada um
- **Registro de itens:** todo item sorteado pelo servidor fica registrado; um item marcado como "do servidor" que não esteja no registro é recusado no save. É a base para troca e mercado

## 0.13.0 · Fenda do grupo (co-op, parte 3): escala, Caído e Costurar
- **Monstros mais fortes com mais gente:** vida 1,75× em dupla, 2,5× com 3 e 3,25× com 4; dano +10%, +15% e +20%. Vale para o chefe também
- **Caído:** com algum companheiro de pé, quem perde toda a vida fica caído por 15 segundos em vez de morrer (os monstros ignoram quem está caído)
- **Costurar:** chegue perto do companheiro caído e aperte E (ou toque no botão de ação); fique 3 segundos perto e ele volta com 30% da vida, sem perder Centelhas. Afastar ou levar dano interrompe
- **Grupo inteiro caído:** todos voltam ao início da Fenda e o guardião recomeça com a vida cheia
- **XP e loot por proximidade:** ganha a recompensa de um monstro quem estava a até 30 de distância ou acertou ele; o progresso da Fenda conta sempre

## 0.12.0 · Fenda do grupo (co-op, parte 2): monstros compartilhados
- **Os mesmos monstros para todos:** o jogo do líder comanda inimigos e chefe e envia o estado deles 10 vezes por segundo; os outros veem as mesmas criaturas, no mesmo lugar, com as mesmas animações
- **Todo golpe vale:** acertos de qualquer jogador vão para o líder e tiram vida de verdade; cada um ganha o próprio XP, Centelhas e chance de item quando um inimigo cai
- **Os monstros escolhem quem está perto:** a IA persegue e ataca o jogador mais próximo, inclusive projéteis e áreas marcadas no chão; as salas acordam quando qualquer jogador chega
- **Chefe em grupo:** aparece para todos, os golpes de todos contam, e a Fenda termina para todos (cada um com o próprio rank e Fios do Tear)
- Se o líder sair da Fenda, quem está lá há mais tempo passa a comandar os monstros, sem a luta parar

## 0.11.0 · Fenda do grupo (co-op, parte 1)
- **Fenda do grupo:** em grupo, o líder abre a Fenda pelo menu de sempre e todos recebem o aviso **Pronto?** (20 s). Quem entra cai **no mesmo mapa**, com a mesma semente sorteada pelo servidor, e todos se veem lá dentro, com animações, chat e emotes
- Quem recusou ou chegou depois entra pelo botão **Entrar na Fenda do grupo**, no painel do grupo. A Fenda vazia fecha sozinha depois de 1 minuto; sair do grupo tira da Fenda do grupo
- Por enquanto cada um enfrenta os próprios monstros; os monstros compartilhados chegam na próxima parte (2.2b)
- Correção: ao entrar numa sala, o jogo reenviava a região sem a instância e tirava o jogador da Fenda do grupo

## 0.10.4 · Versão certa no servidor
- O `/health` e o `/config` do servidor sempre diziam "0.10.0", qualquer que fosse a versão publicada (o build não substituía a leitura da versão). Agora mostram a versão real, e dá para conferir no navegador se o Easypanel publicou a última

## 0.10.3 · Vila sincronizada
- **Relógio da vila:** moradores e galinhas andam por uma rota calculada a partir da hora do servidor, medida com ida e volta (mini-NTP). Todos os jogadores veem a mesma vila, sem trocar mensagens. Depois de conversar com você, o morador volta caminhando para a rota; ao entrar na vila, ele já aparece no lugar certo
- Fugir das galinhas continua sendo só na sua tela, e elas voltam à rota comum logo depois

## 0.10.2 · Amigos, grupo e efeitos dos outros jogadores
- **Design do online** em `docs/ONLINE.md` (grupos, dificuldade, Fio de Elo, história em grupo, trocas, mercado, guilda, ranking) e roadmap da Fase 2 em 12 passos
- **Amigos** (Fase 2.1): pedir pelo nome, pelo comando `/amigo` ou tocando no nome na vila; lista com quem está online e onde; aviso quando um amigo entra ou sai; bloquear (some o chat da pessoa e ela não pede amizade nem convida)
- **Grupo** (Fase 2.1): até 4 jogadores; convite tocando no nome na vila, por `/convidar` ou pela lista de amigos (amigos de qualquer lugar); cartão de convite de 60 s; líder (★), `/lider`, `/tirar`, `/sair`; painel do grupo no HUD com classe, nível e onde cada um está; chat do grupo com `/g`, e fora da vila o chat vai direto para o grupo; quem cai da conexão continua no grupo por 2 minutos
- A conexão online continua aberta fora da vila (só para amigos e grupo)
- Na vila online, quem assiste agora vê os projéteis e as partículas das ações dos outros jogadores: o rastro dos golpes da Lâmina e do Giro, o raio e a Nova do Arcano (com as runas de gelo, cometa e Nova dupla), as flechas e a Chuva de Flechas do Arco, o círculo do poder Desfiado na esquiva e a poeira dos passos na corrida. São só visuais: não causam dano nem lentidão.
- A mensagem `act` passa a dizer também a runa da habilidade e o poder da esquiva, e ganhou a ação `volley` (Chuva de Flechas).

## 0.10.1 · Animações dos outros jogadores
- **Correção:** na vila online, o ataque, as habilidades e a esquiva dos outros jogadores apareciam tremidos ou nem apareciam. A ação agora vai como mensagem própria (`act`), no quadro exato em que começa, e o servidor repassa na hora, com cota de 6 por segundo. Quem assiste vê a animação desde o início: o combo da Lâmina, a postura de mira do Arco e do Arcano, e a esquiva com o rastro.
- Uma ação interrompe o emote do outro jogador, como já acontecia com o seu.
- O APK do Android e os builds de produção já vêm apontando para o servidor online (`.env.production`). No Docker do site, um `VITE_API_URL` vazio não apaga mais esse endereço.
- Página de Política de Privacidade em `/privacidade.html` (exigida pelo Google para o login com Google)
- `/metrics` responde 401 (em vez de 404) quando o token falta ou está errado, como o Metrics Endpoint do Grafana Cloud exige; comparação do token em tempo constante
- Arcano: o cajado não atravessa mais o corpo do mago, parado ou nas animações (mira, conjuração, Nova, esquiva); a mão desfaz por completo a rotação do braço e o cajado fica em pé, com o pé afastado do manto e a ponta para a frente ao conjurar

## 0.10.0 · Fase 1: fundação online
- **Servidor online** (`server/`): Node 22 + TypeScript, Fastify e WebSocket, PostgreSQL com migrações (ou memória em dev), Docker para o Easypanel
- **Contas:** e-mail e senha, Google e convidado; o convidado vira conta sem perder o progresso; troca de nome com filtro
- **Save na nuvem:** sincroniza sozinho, avisa quando outro aparelho gravou antes e deixa escolher entre nuvem e aparelho
- **Servidor que confere:** recusa itens acima do teto, nível que diminui e Centelhas demais para o tempo jogado; casos estranhos ficam registrados
- **Correio online:** envio pelo nome do Tecelão, com recado; o item não pode ser duplicado com save antigo
- **Vila Brasa online:**
  - outros jogadores aparecem com a própria aparência, nome e título (nível, classe e dificuldade);
  - chat (Enter) com filtro de palavrões, cota de mensagens e silêncio automático; comandos `/quem` e `/sala`;
  - emotes: acenar, comemorar, dançar e sentar.
- **Operação:** `/health`, métricas Prometheus, registro de erros do cliente, limites de requisições, desligamento gracioso
- **Testes:** 50 testes do servidor (memória e PostgreSQL) e testes de ponta a ponta com dois navegadores; CI com PostgreSQL

## 0.9.1 · Fase 0
- Projeto de produção: Vite, jogo dividido em 26 arquivos, source maps, build minificado
- Testes de ponta a ponta com Playwright e CI no GitHub Actions
- Android (Capacitor) em paisagem e tela cheia, com APK de teste gerado pelo CI
- PWA (instalável), deploy na Netlify e Docker com nginx para a VPS
- Equilíbrio das classes medido em simulação:
  - **Arcano:** a Nova acerta no máximo 4 vezes o mesmo alvo; os raios explodem em área;
  - **Arco:** mais dano e mais vida.

## 0.9 · Casa do Tecelão
- **Casa:** compra na vila, interior próprio, baú permanente (20 a 70 espaços), mobília com bônus, cama com bônus de XP e estátua dourada
- **Bruma:** aprimorar itens de +1 até +10
- **Otto:** embrulhos misteriosos
- **Correio do Tear:** troca de itens entre jogadores por código

## 0.8 · Celular, Ermos e Fendas aleatórias
- **Celular:** jogado na horizontal, com HUD compacto, botões grandes, ação contextual e vibração
- **Ermos de Tessária:** mapa aberto com 4 zonas de nível, javalis, lobos, ursos e Alfas
- **Fendas:** mapa novo a cada abertura
- **Minimapa** com névoa de exploração
- **Correções:**
  - colisão: dash e empurrões não atravessam mais paredes;
  - missão "A Maçã do Vovô" clara e concluível.

## 0.7 · Dificuldade e Ato II
- **Dificuldades:** sete níveis, de Normal a Tormento III; monstros acompanham o nível do jogador
- **Ato II:**
  - Pântano Afogado, com a Hidra do Lodo;
  - Cidadela de Vidro, com O Reflexo;
- **Revanche:** altar para enfrentar os chefes de novo, com bônus de primeira vitória por dificuldade

## 0.6 · Novos chefes e Fendas
- Aranha Tecelã, Cavaleiro Desfiado e Olho do Vazio
- Fendas do Tear com afixos e ranking por tempo

## 0.5 · Ritmo de jogo
- Sequências de abates, ladrões de Centelhas, pilares de bônus e animações refinadas

## 0.4 · Final e personagens
- Finais da história, memórias e epílogos
- Armas seguradas corretamente por magos e arqueiros

## 0.3 · Progressão
- Armadura visível no personagem
- Música procedural
- Moradores e vila maior
- Progressão estilo ARPG: runas, talentos e lendários

## 0.2 · Interface e loot
- HUD com ícones, inventário, loot e animações de combate

## 0.1 · Protótipo
- Renderizador de splats em pixel art, criação de personagem e Ato I
