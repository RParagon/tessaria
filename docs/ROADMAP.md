# Roadmap

Prazos estimados para uma pessoa desenvolvendo com apoio de IA. Podem variar bastante.

## Fase 0 · Base de produção (concluída)

- [x] Projeto Vite com o jogo dividido em 26 arquivos por domínio e source maps
- [x] Build de produção minificado (314 KB, 114 KB comprimido), com versão no título
- [x] Gancho de testes só em dev ou com `?debug=1`
- [x] Testes de ponta a ponta: abertura, todas as regiões, Fendas aleatórias, colisão, casa, aprimoramento, correio, Ato II e a missão da maçã
- [x] Simulador de equilíbrio das classes, com teste de faixas
- [x] CI no GitHub Actions: build e testes a cada envio
- [x] Android com Capacitor: paisagem, tela cheia imersiva, ícones; APK de teste gerado pelo CI
- [x] PWA: manifesto, ícones, instalação em paisagem
- [x] Deploy: Netlify (gratuito) e Docker com nginx para a VPS (Easypanel)
- [x] Documentação: arquitetura, roadmap, monetização e deploy

## Fase 1 · Fundação online (concluída na versão 0.10)

- [x] Servidor Node 22 + TypeScript (Fastify + WebSocket), pronto para o Easypanel (`server/Dockerfile`)
- [x] PostgreSQL com migrações versionadas, e armazenamento em memória para desenvolvimento
- [x] Contas: e-mail e senha, convidado (que vira conta depois) e Google
- [x] Save na nuvem com revisão (sem perder progresso entre aparelhos) e escolha nuvem × aparelho no primeiro login
- [x] Validação no servidor: tetos de itens, nível e Centelhas pelo tempo jogado, tamanho e formato do save
- [x] Correio online pelo nome do Tecelão, sem duplicar itens (lápides)
- [x] Vila Brasa online: ver outros jogadores, chat com filtro, emotes, títulos
- [x] Proteções: limites de requisições, cota de chat, silêncio automático, limite de velocidade na vila
- [x] Registro de erros do cliente, auditoria de saves estranhos e métricas (Prometheus)
- [x] Testes do servidor (memória + PostgreSQL no CI) e de ponta a ponta com dois navegadores

Ficou para a Fase 2, porque só é necessário quando o combate for online:

- Migrar para módulos ES e separar `src/sim` (simulação) de `src/render`
- Simulação determinística em passos fixos, rodando também em Node
- Baú, casa e economia calculados pelo servidor (hoje ele valida limites; na Fase 2 ele passa a decidir)

## Fase 2 · Co-op e social (10 a 14 semanas)

As regras de cada sistema estão em [ONLINE.md](ONLINE.md). O combate em grupo começa pelo caminho A (o jogo do líder simula, o servidor sorteia o loot), que serve para jogar com amigos por convite. O caminho B (o servidor simula) vem no fim da fase, para o conteúdo com desconhecidos.

- [ ] **2.1 Amigos e grupo:** pedidos de amizade, lista com presença (online e onde), bloqueio, convite de grupo na vila (até 4), líder, chat do grupo (`/g`), painel do grupo
- [ ] **2.2 Nível de item (NI):** NI visível nos itens, teto de NI de quem recebe no correio, correio com Centelhas (taxa de 5%) e bloqueio
- [ ] **2.3 Casa:** Armário do Tecelão (3.000 Centelhas, troca de aparência grátis, 3 visuais salvos) e Espelho da vila (250 Centelhas por troca)
- [ ] **2.4 Instâncias (caminho A):** "Pronto?" ao entrar no portal, entrar junto e depois, inimigos sincronizados pelo líder, vida e dano dos inimigos por tamanho do grupo (175/250/325% e 110/115/120%), loot individual sorteado pelo servidor, morte em grupo com costura
- [ ] **2.5 Dificuldade do grupo e Fio de Elo:** a dificuldade do líder entre as que todos liberaram, o mais fraco sobe até 3 níveis abaixo, o mais forte fica limitado a 5 acima, bônus de mentor
- [ ] **2.6 História em grupo:** na etapa, Eco e Antes (com aviso de spoiler), escolhas e finais pessoais, Reflexo com uma cópia por jogador, Hidra com cabeças extras, Marca do Tear
- [ ] **2.7 Fendas em grupo:** semente do servidor, nível escolhido entre os que todos liberaram, entrar no meio, ranking entre amigos
- [ ] **2.8 Social no celular:** chat rápido em botões e marcador no minimapa
- [ ] **2.9 Troca direta** na vila, com duas confirmações e teto de NI
- [ ] **2.10 Guilda:** sigla, cargos, chat (`/gu`), recado do dia, pontos e nível da guilda (só estilo)
- [ ] **2.11 Mercado da vila:** anúncios de 48 h, filtros, taxa de 2% ao anunciar e 8% na venda
- [ ] **2.12 Caminho B:** módulos ES, `src/sim` separado do render e simulação determinística (vindo da Fase 1), combate decidido pelo servidor com previsão e correção no cliente, Procurar grupo nas Fendas e ranking público

## Fase 3 · Mundo compartilhado e PvP (3 a 4 semanas)

- [ ] Ermos compartilhados, com cerca de 30 jogadores por sala, separados por faixa (Normal e Difícil, Expert e Mestre, Tormento)
- [ ] **Zona PvP no Ermo Profundo:**
  - quem entra é marcado como hostil;
  - lá está o melhor loot e os Alfas.
- [ ] **Perdas ao morrer, por zona:**
  - zona segura: como hoje;
  - zona difícil: perde Centelhas e o equipamento desgasta;
  - zona PvP: os itens da bolsa caem para quem matou;
  - sempre protegidos: equipamento vestido e baú.
- [ ] Duelos na vila e arena com ranking
- [ ] Equilíbrio de PvP:
  - dano entre jogadores reduzido;
  - limite de atordoamento e lentidão;
  - simulador estendido para duelos.
- [ ] Personagem hardcore, com morte permanente (opcional)

## Fase 4 · Lançamento (4 semanas ou mais)

- [ ] Beta fechado
- [ ] Proteção contra trapaça: velocidade e cooldowns validados no servidor durante o combate
- [ ] Login com Apple (exigido pela App Store, se houver versão iOS)
- [ ] Passe do Tear e loja de cosméticos (ver [MONETIZATION.md](MONETIZATION.md))
- [ ] Google Play: conta de desenvolvedor, APK assinado, ficha da loja, classificação etária
- [ ] Política de privacidade (LGPD), termos de uso e exclusão de conta
- [ ] Idiomas: português, inglês e espanhol
