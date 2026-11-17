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

## Fase 1 · Fundação online (4 a 6 semanas)

- [ ] Migrar para módulos ES e separar `src/sim` (simulação) de `src/render`
- [ ] Simulação determinística em passos fixos, rodando também em Node
- [ ] Servidor Node + TypeScript + Colyseus no Easypanel, com PostgreSQL
- [ ] Contas: e-mail, Google e Apple; personagens salvos no servidor
- [ ] Migração do save local para a conta, no primeiro login
- [ ] Vila Brasa online: ver outros jogadores, chat com filtro, emotes
- [ ] Baú, casa e economia validados no servidor
- [ ] Registro de erros (Sentry ou similar) e métricas básicas

## Fase 2 · Co-op (4 a 6 semanas)

- [ ] Grupos de até 4 jogadores nas regiões e Fendas
- [ ] Combate decidido pelo servidor, com previsão e correção no cliente
- [ ] Loot individual por jogador, sem disputa
- [ ] Vida e dano dos inimigos escalando com o tamanho do grupo
- [ ] Mercado entre jogadores, com taxa como forma de tirar ouro de circulação

## Fase 3 · Mundo compartilhado e PvP (3 a 4 semanas)

- [ ] Ermos compartilhados, com cerca de 30 jogadores por sala
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
- [ ] Proteção contra trapaça:
  - validação de velocidade e cooldowns no servidor;
  - limites de requisições.
- [ ] Passe do Tear e loja de cosméticos (ver [MONETIZATION.md](MONETIZATION.md))
- [ ] Google Play: conta de desenvolvedor, APK assinado, ficha da loja, classificação etária
- [ ] Política de privacidade (LGPD), termos de uso e exclusão de conta
- [ ] Idiomas: português, inglês e espanhol
