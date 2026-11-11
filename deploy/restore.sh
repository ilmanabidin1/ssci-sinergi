#!/usr/bin/env bash
# Memulihkan SSCI dari berkas backup buatan backup.sh.
#   ./restore.sh backups/db-20261111-011500.sql.gz.gpg [backups/uploads-20261111-011500.tar.gz.gpg]
# Database "ssci" DITIMPA seluruhnya. Berkas unggahan ditambahkan atau ditimpa per berkas.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

DB_FILE="${1:?Sebutkan berkas backup database (db-....sql.gz.gpg)}"
UP_FILE="${2:-}"
envval() { grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- || true; }
PASSPHRASE="$(envval BACKUP_PASSPHRASE)"
[ -n "$PASSPHRASE" ] || { echo "BACKUP_PASSPHRASE belum diisi di .env." >&2; exit 1; }
decrypt() { gpg --batch --quiet --decrypt --passphrase-fd 3 "$1" 3<<<"$PASSPHRASE"; }

if [ "${RESTORE_YES:-}" != "1" ]; then
  read -r -p "Database ssci akan ditimpa dengan isi $DB_FILE. Ketik PULIHKAN untuk lanjut: " answer
  [ "$answer" = "PULIHKAN" ] || { echo "Dibatalkan."; exit 1; }
fi

# Uji dulu bahwa berkas bisa dibuka sebelum aplikasi dihentikan.
if ! decrypt "$DB_FILE" 2>/dev/null | gzip -t 2>/dev/null; then
  echo "Berkas backup tidak bisa dibuka: BACKUP_PASSPHRASE salah atau berkas rusak. Tidak ada yang diubah." >&2
  exit 1
fi
echo "Menghentikan aplikasi..."
docker compose stop app
decrypt "$DB_FILE" | gunzip | docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root ssci'
echo "Database dipulihkan."
docker compose start app

if [ -n "$UP_FILE" ]; then
  decrypt "$UP_FILE" | docker compose exec -T app tar -C /data -xzf -
  echo "Berkas unggahan dipulihkan."
fi
echo "Selesai. Periksa aplikasi lewat browser."
