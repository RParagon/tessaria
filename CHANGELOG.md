# Histórico de versões

## 0.10.2 · Efeitos dos outros jogadores
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
