# Histórico de versões

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
