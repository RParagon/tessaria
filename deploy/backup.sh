#!/usr/bin/env bash
# Backup do banco (docker-compose de deploy/): gera deploy/backups/tessaria-AAAAMMDD-HHMM.sql.gz
# e apaga os mais velhos que KEEP_DAYS (padrão 14). Agende com cron, por exemplo todo dia às 4h:
#   0 4 * * * cd /caminho/do/repo/deploy && ./backup.sh >> backups/backup.log 2>&1
# Copie a pasta backups/ para fora do servidor (S3, Backblaze B2, Cloudflare R2, Google Drive):
# backup no mesmo disco não protege contra perder o servidor.
set -euo pipefail
cd "$(dirname "$0")"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p backups
f="backups/tessaria-$(date +%Y%m%d-%H%M).sql.gz"
docker compose exec -T db pg_dump -U tessaria --no-owner --clean --if-exists tessaria | gzip -9 > "$f.part"
# um backup vazio ou quebrado não pode substituir os bons
[ "$(gzip -cd "$f.part" | head -c 2000 | grep -c 'PostgreSQL database dump' || true)" -ge 1 ] || { echo "backup inválido"; rm -f "$f.part"; exit 1; }
mv "$f.part" "$f"
find backups -name 'tessaria-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "ok: $f ($(du -h "$f" | cut -f1))"
