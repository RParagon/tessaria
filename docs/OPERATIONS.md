# Operação: backup, monitoramento e o que fazer quando algo dá errado

Com dinheiro real entrando, três coisas não podem faltar: **backup que funciona**, **aviso quando o servidor cai** e
**um roteiro para os problemas comuns**. Este guia é para quem cuida do jogo no ar (Easypanel ou docker-compose).

## 1. Backup do banco

### No Easypanel (recomendado)
O Easypanel faz backup nativo do PostgreSQL ([documentação](https://easypanel.io/docs/backups/database)).

1. **Destino fora do servidor:** em *Settings → Storage Providers*, cadastre um armazenamento compatível com S3
   (Backblaze B2, Cloudflare R2, AWS S3, Wasabi…). Backup no mesmo disco não protege se você perder o servidor.
2. No serviço do **Postgres** do projeto, abra a aba **Backups** e crie uma configuração:
   - banco: o nome do banco do jogo (o mesmo da `DATABASE_URL`);
   - destino: o Storage Provider do passo 1;
   - horário: **todo dia**, de madrugada (ex.: 4h);
   - retenção: **14 backups** ou mais.
   O agendamento automático pode exigir uma licença do Easypanel que inclua backups agendados.
3. **Teste a restauração uma vez por mês** (backup que nunca foi restaurado não é backup):
   crie um Postgres de teste no Easypanel, use *Backups → Restore* apontando para o arquivo mais recente e confira
   se as contas estão lá (`SELECT count(*) FROM accounts;`).

### No docker-compose (`deploy/`)
- `deploy/backup.sh`: gera `deploy/backups/tessaria-AAAAMMDD-HHMM.sql.gz`, confere se o arquivo é válido e apaga os
  mais velhos que 14 dias. Agende no cron (instruções no topo do arquivo) e **copie a pasta para fora do servidor**.
- `deploy/restore.sh arquivo.sql.gz`: restaura (pede para digitar RESTAURAR). Pare o servidor do jogo antes.

## 2. Monitoramento

### Servidor no ar (5 minutos, de graça)
Use um monitor externo, como o [UptimeRobot](https://uptimerobot.com) ou o [Better Stack](https://betterstack.com):
- tipo HTTP(S), URL `https://SUA-API/health`, a cada 1 a 5 minutos;
- alerta por e-mail e, se quiser, Telegram ou WhatsApp.

O `/health` responde **503** quando o banco não responde e 200 quando está tudo bem, com a versão, o tempo no ar e
quantos jogadores estão online. Monitore também o site (`https://SEU-SITE/`).

### Painel rápido (`/admin/status`, com o `ADMIN_TOKEN`)
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://SUA-API/admin/status
```
Mostra: versão e desde quando está no ar, banco, jogadores online, memória, **pagamentos** (creditados, estornados,
falhas no webhook e no checkout, assinaturas inválidas), saves aceitos e recusados, suspeitas de trapaça e reportes
novos. Os contadores zeram quando o servidor reinicia.

### Métricas com histórico (opcional)
Com `METRICS_TOKEN`, a rota `/metrics` (formato Prometheus) pode ser lida pelo Grafana Cloud (plano grátis) para ter
gráficos e alertas, como "falhas no webhook do Mercado Pago > 0 na última hora".

## 3. Quando algo dá errado

**O servidor caiu (o monitor avisou)**
1. Easypanel → serviço do servidor → *Logs*: procure o erro.
2. Se foi depois de um deploy, volte para a versão anterior (*Deployments* → redeploy do commit anterior).
3. `/health` com `"db":"erro"`: veja se o Postgres está rodando e se a `DATABASE_URL` está certa.
4. Os jogadores reconectam sozinhos quando o servidor volta; o progresso fica salvo na nuvem a cada poucos segundos.

**Alguém pagou e não recebeu os Fios Dourados**
1. `/admin/status`: olhe `falhasWebhook` e `assinaturasInvalidas`.
2. No Mercado Pago, em *Suas integrações → Webhooks*, veja se as notificações chegaram (status 200).
3. Assinatura inválida: o `MP_WEBHOOK_SECRET` no Easypanel não bate com o do painel do Mercado Pago.
4. O Mercado Pago reenvia notificações com falha por alguns dias; depois de corrigir, o crédito costuma chegar sozinho.
   Cada pagamento credita uma vez só, então não há risco de crédito duplicado.

**Um segredo vazou** (token do Mercado Pago, `ADMIN_TOKEN`, senha do banco)
Gere um novo na origem, troque no Easypanel e reinicie o serviço. Nunca coloque segredos no repositório nem em conversa.

**Atualização com o jogo cheio**
O servidor avisa os jogadores ("reiniciando para uma atualização") antes de fechar e todos reconectam sozinhos.
Prefira fazer deploy em horários de pouco movimento.

## 4. Rotina

| Quando | O quê |
|---|---|
| Todo dia (automático) | backup do banco; monitor do `/health` |
| Toda semana | olhar `/admin/status`, os reportes novos e as contas suspeitas (`/admin/suspects`) |
| Todo mês | testar a restauração de um backup |
| A cada deploy | conferir o `/health` (versão nova) e jogar 2 minutos online |
