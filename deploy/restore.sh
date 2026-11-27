#!/usr/bin/env bash
# Restaura um backup gerado por backup.sh. APAGA os dados atuais do banco e põe os do arquivo no lugar.
# Uso: ./restore.sh backups/tessaria-20261127-0400.sql.gz
# Antes: pare o servidor do jogo (docker compose stop server) para ninguém salvar no meio.
set -euo pipefail
cd "$(dirname "$0")"
f="${1:?informe o arquivo do backup}"
[ -f "$f" ] || { echo "arquivo não encontrado: $f"; exit 1; }
read -r -p "Isto substitui TODOS os dados do banco pelos de $f. Digite RESTAURAR para continuar: " ok
[ "$ok" = "RESTAURAR" ] || { echo "cancelado"; exit 1; }
gzip -cd "$f" | docker compose exec -T db psql -U tessaria -d tessaria -v ON_ERROR_STOP=1 -q
echo "restaurado. Suba o servidor de novo: docker compose start server"
