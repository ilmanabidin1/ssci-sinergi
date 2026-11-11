#!/usr/bin/env bash
# Backup harian SSCI: database MySQL dan folder unggahan (KTP, NPWP, foto survei).
# Berkas dienkripsi sebelum meninggalkan server, lalu disalin ke object storage di pusat data kedua.
# Jalankan dari cron sebagai pengguna yang boleh memakai docker:
#   15 1 * * * /opt/ssci/backup.sh >> /opt/ssci/backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
umask 077

# .env memakai format docker compose, bukan shell, jadi dibaca per kunci.
envval() { grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- || true; }

PASSPHRASE="$(envval BACKUP_PASSPHRASE)"
ENDPOINT="$(envval BACKUP_S3_ENDPOINT)"
BUCKET="$(envval BACKUP_S3_BUCKET)"
KEEP_LOCAL="$(envval BACKUP_KEEP_LOCAL_DAYS)"; KEEP_LOCAL="${KEEP_LOCAL:-7}"
KEEP_REMOTE="$(envval BACKUP_KEEP_REMOTE_DAYS)"; KEEP_REMOTE="${KEEP_REMOTE:-30}"

if [ -z "$PASSPHRASE" ]; then
  echo "BACKUP_PASSPHRASE belum diisi di .env. Backup berisi data pribadi nasabah dan tidak dibuat tanpa enkripsi." >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
DIR="backups"
mkdir -p "$DIR"
DB_FILE="$DIR/db-$STAMP.sql.gz.gpg"
UP_FILE="$DIR/uploads-$STAMP.tar.gz.gpg"

encrypt() { gpg --batch --yes --quiet --symmetric --cipher-algo AES256 --passphrase-fd 3 3<<<"$PASSPHRASE"; }

echo "[$(date '+%F %T')] Mulai backup $STAMP"

docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -u root --single-transaction --routines --no-tablespaces ssci' \
  | gzip | encrypt > "$DB_FILE"
docker compose exec -T app tar -C /data -czf - uploads | encrypt > "$UP_FILE"

for file in "$DB_FILE" "$UP_FILE"; do
  [ -s "$file" ] || { echo "Berkas backup kosong: $file" >&2; exit 1; }
done
echo "Tersimpan: $DB_FILE ($(du -h "$DB_FILE" | cut -f1)), $UP_FILE ($(du -h "$UP_FILE" | cut -f1))"

if [ -n "$ENDPOINT" ] && [ -n "$BUCKET" ]; then
  rclone_s3() {
    docker run --rm -v "$PWD/$DIR:/backups:ro" \
      -e RCLONE_CONFIG_BK_TYPE=s3 -e RCLONE_CONFIG_BK_PROVIDER=Other \
      -e RCLONE_CONFIG_BK_ENDPOINT="$ENDPOINT" \
      -e RCLONE_CONFIG_BK_ACCESS_KEY_ID="$(envval BACKUP_S3_ACCESS_KEY)" \
      -e RCLONE_CONFIG_BK_SECRET_ACCESS_KEY="$(envval BACKUP_S3_SECRET_KEY)" \
      rclone/rclone:1 --contimeout 15s --timeout 2m --retries 2 --low-level-retries 3 "$@"
  }
  if ! rclone_s3 copy /backups "bk:$BUCKET/ssci" --include "*-$STAMP.*"; then
    echo "GAGAL menyalin backup ke $BUCKET. Backup hari ini hanya ada di server ini." >&2
    exit 1
  fi
  rclone_s3 delete "bk:$BUCKET/ssci" --min-age "${KEEP_REMOTE}d"
  echo "Disalin ke $BUCKET/ssci; salinan di sana yang lebih tua dari $KEEP_REMOTE hari dihapus."
else
  echo "PERINGATAN: BACKUP_S3_ENDPOINT atau BACKUP_S3_BUCKET kosong, backup hanya ada di server ini." >&2
fi

find "$DIR" -name '*.gpg' -mtime +"$KEEP_LOCAL" -delete
echo "[$(date '+%F %T')] Selesai"
