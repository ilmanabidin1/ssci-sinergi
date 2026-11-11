#!/usr/bin/env bash
# Menyalin data SSCI dari Railway ke server ini: database lengkap dan berkas unggahan.
# Jalankan dari akun admin server:
#   sudo -u deploy /opt/ssci/migrate-from-railway.sh https://ssci-sinergi-production.up.railway.app
#
# Ditanyakan saat berjalan (tidak disimpan dan tidak tampil di layar):
#   - MYSQL_PUBLIC_URL dari layanan MySQL di Railway (tab Variables)
#   - JWT_SECRET dari layanan aplikasi di Railway. Dibutuhkan agar 2FA pengguna tetap berlaku,
#     karena rahasia 2FA dienkripsi dengan kunci turunan JWT_SECRET.
#
# Yang dilakukan:
#   1. Backup database server ini dulu (backup.sh).
#   2. Menyalin seluruh database Railway dan MENIMPA database ssci di server ini.
#   3. Mengunduh berkas unggahan lewat /uploads/<nama> di alamat aplikasi Railway.
#   4. Membandingkan jumlah baris tiap tabel dan jumlah berkas.
# Aman dijalankan ulang, misalnya sekali untuk uji coba dan sekali lagi saat pindah sungguhan.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
umask 077

APP_URL="${1:?Sebutkan alamat aplikasi Railway, misalnya https://ssci-sinergi-production.up.railway.app}"
APP_URL="${APP_URL%/}"

read -rsp "MYSQL_PUBLIC_URL dari Railway: " DB_URL; echo
read -rsp "JWT_SECRET dari Railway: " RAILWAY_JWT; echo

if [[ ! "$DB_URL" =~ ^mysql://([^:]+):([^@]+)@([^:/]+):([0-9]+)/([^?]+) ]]; then
  echo "Alamat tidak dikenali. Bentuknya harus mysql://pengguna:password@host:port/database" >&2
  exit 1
fi
R_USER="${BASH_REMATCH[1]}"; R_PASS="${BASH_REMATCH[2]}"; R_HOST="${BASH_REMATCH[3]}"
R_PORT="${BASH_REMATCH[4]}"; R_DB="${BASH_REMATCH[5]}"
if [ "${#RAILWAY_JWT}" -lt 32 ]; then
  echo "JWT_SECRET terlalu pendek atau kosong (minimal 32 karakter)." >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
WORK="backups/railway-$STAMP"
mkdir -p "$WORK/uploads"
# Salinan database Railway berisi data pribadi tanpa enkripsi: selalu dihapus di akhir.
trap 'rm -rf "$WORK"' EXIT

railway_sql() {
  docker compose exec -T -e MYSQL_PWD="$R_PASS" db \
    mysql --connect-timeout=15 -h "$R_HOST" -P "$R_PORT" -u "$R_USER" -N "$R_DB" -e "$1"
}
local_sql() {
  docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root -N ssci -e "$0"' "$1"
}
count_rows() {
  local runner="$1" table
  for table in $($runner "SHOW TABLES" | sort); do
    printf '%s %s\n' "$table" "$($runner "SELECT COUNT(*) FROM \`$table\`")"
  done
}

echo "==> Memeriksa sambungan ke database Railway"
railway_sql "SELECT 1" >/dev/null
count_rows railway_sql > "$WORK/counts-railway.txt"
echo "    $(wc -l < "$WORK/counts-railway.txt") tabel ditemukan."

echo "==> Backup database server ini sebelum ditimpa"
./backup.sh

echo "==> Menyalin database Railway"
docker compose exec -T -e MYSQL_PWD="$R_PASS" db \
  mysqldump -h "$R_HOST" -P "$R_PORT" -u "$R_USER" \
    --single-transaction --routines --no-tablespaces --set-gtid-purged=OFF --column-statistics=0 \
    "$R_DB" > "$WORK/railway.sql"
[ -s "$WORK/railway.sql" ] || { echo "Salinan database kosong, dibatalkan." >&2; exit 1; }
echo "    $(du -h "$WORK/railway.sql" | cut -f1)"

echo "==> Menghentikan aplikasi dan menimpa database"
docker compose stop app
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root ssci' < "$WORK/railway.sql"
count_rows local_sql > "$WORK/counts-local.txt"

echo "==> Memakai JWT_SECRET Railway"
NEW_JWT="$RAILWAY_JWT" awk 'BEGIN{FS=OFS="="} $1=="JWT_SECRET"{print "JWT_SECRET=" ENVIRON["NEW_JWT"]; next} {print}' .env > .env.tmp
mv .env.tmp .env
chmod 600 .env
unset R_PASS DB_URL RAILWAY_JWT

echo "==> Menyalakan aplikasi"
docker compose up -d --force-recreate app

echo "==> Mengunduh berkas unggahan dari Railway"
local_sql "SELECT storedName FROM documentFiles UNION SELECT storedName FROM surveyPhotos UNION SELECT REPLACE(logoUrl, '/uploads/', '') FROM organizations WHERE logoUrl LIKE '/uploads/%'" \
  | sort -u > "$WORK/files.txt"
total=0; ok=0; missing=0
: > "$WORK/missing.txt"
while IFS= read -r name; do
  [ -n "$name" ] || continue
  total=$((total + 1))
  case "$name" in */*|*..*) echo "$name (nama tidak wajar, dilewati)" >> "$WORK/missing.txt"; missing=$((missing + 1)); continue;; esac
  if curl -fsS --retry 2 --max-time 120 -o "$WORK/uploads/$name" "$APP_URL/uploads/$name"; then
    ok=$((ok + 1))
  else
    echo "$name" >> "$WORK/missing.txt"; missing=$((missing + 1)); rm -f "$WORK/uploads/$name"
  fi
done < "$WORK/files.txt"
if [ "$ok" -gt 0 ]; then
  tar -C "$WORK/uploads" -cf - . | docker compose exec -T app tar -C /data/uploads -xf -
fi

echo
echo "==== Hasil ===="
if diff -q "$WORK/counts-railway.txt" "$WORK/counts-local.txt" >/dev/null; then
  echo "Database: semua tabel sama jumlah barisnya dengan Railway."
else
  echo "Database: ADA PERBEDAAN jumlah baris (Railway | server ini):"
  diff -y --suppress-common-lines "$WORK/counts-railway.txt" "$WORK/counts-local.txt" || true
fi
for table in users applications assessments documentFiles surveyPhotos; do
  printf '  %-15s %s\n' "$table" "$(awk -v t="$table" '$1==t{print $2}' "$WORK/counts-local.txt")"
done
echo "Berkas: $ok dari $total berhasil disalin, $missing gagal."
if [ "$missing" -gt 0 ]; then
  echo "Berkas yang gagal:"; sed 's/^/  /' "$WORK/missing.txt"
fi
echo
echo "Login di server ini memakai email dan password yang sama dengan di Railway."
