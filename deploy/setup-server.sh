#!/usr/bin/env bash
# Menyiapkan server Ubuntu 22.04/24.04 baru untuk SSCI. Jalankan sekali, sebagai root atau dengan sudo:
#   sudo SERVER_IP=139.190.104.30 bash setup-server.sh
#
# Variabel opsional:
#   SERVER_IP     IP publik server (dipakai untuk domain sementara dan isian GitHub)
#   SSCI_DOMAIN   domain aplikasi; bawaan <ip-dengan-strip>.sslip.io sampai domain sendiri siap
#   ADMIN_EMAIL   email administrator awal SSCI; ditanyakan bila kosong
#   DEPLOY_PUBKEY kunci publik untuk GitHub Actions; bila kosong, dibuatkan di server ini
#
# Yang dilakukan:
#   - Docker, firewall (22, 80, 443), pembaruan keamanan otomatis, zona waktu WIB
#   - SSH hanya dengan kunci (login password dimatikan; login yang sudah ada tetap bisa)
#   - Pengguna "deploy" untuk GitHub Actions, dengan kuncinya
#   - /opt/ssci/.env berisi rahasia acak (database, JWT, backup, password admin awal)
#   - /root/ssci-setup/ berisi isian GitHub dan ringkasan; hanya bisa dibaca root
# Aman dijalankan ulang: .env dan kunci yang sudah ada tidak ditimpa.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Jalankan dengan sudo: sudo SERVER_IP=<ip-server> bash setup-server.sh" >&2
  exit 1
fi

SERVER_IP="${SERVER_IP:-$(hostname -I | awk '{print $1}')}"
SSCI_DOMAIN="${SSCI_DOMAIN:-$(echo "$SERVER_IP" | tr . -).sslip.io}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
if [ -z "$ADMIN_EMAIL" ] && [ ! -f /opt/ssci/.env ]; then
  read -r -p "Email administrator awal SSCI: " ADMIN_EMAIL
fi

SETUP_DIR=/root/ssci-setup
install -d -m 700 "$SETUP_DIR"

echo "==> Memasang paket"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg openssl ufw unattended-upgrades

echo "==> Memasang Docker"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

echo "==> Pengguna deploy"
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
if [ -z "${DEPLOY_PUBKEY:-}" ]; then
  [ -f "$SETUP_DIR/deploy_key" ] || ssh-keygen -q -t ed25519 -N "" -C "ssci-github-deploy" -f "$SETUP_DIR/deploy_key"
  DEPLOY_PUBKEY="$(cat "$SETUP_DIR/deploy_key.pub")"
fi
echo "$DEPLOY_PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

install -d -m 750 -o deploy -g deploy /opt/ssci /opt/ssci/backups

echo "==> Konfigurasi SSCI"
ADMIN_PASSWORD_NOTE="(tidak berubah, .env sudah ada sebelumnya)"
if [ ! -f /opt/ssci/.env ]; then
  ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)Aa1"
  ADMIN_PASSWORD_NOTE="$ADMIN_PASSWORD"
  BACKUP_PASSPHRASE="$(openssl rand -hex 24)"
  cat > /opt/ssci/.env <<ENV
SSCI_DOMAIN=$SSCI_DOMAIN
MYSQL_PASSWORD=$(openssl rand -hex 24)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
PILOT_ADMIN_EMAIL=$ADMIN_EMAIL
PILOT_ADMIN_PASSWORD=$ADMIN_PASSWORD
SUPERADMIN_EMAILS=$ADMIN_EMAIL
ENFORCE_TWO_FACTOR=true
# Kosong: fitur AI memakai cadangan aturan dan tidak ada data yang dikirim ke penyedia AI di luar negeri.
OPENROUTER_API_KEY=
BACKUP_PASSPHRASE=$BACKUP_PASSPHRASE
BACKUP_S3_ENDPOINT=
BACKUP_S3_BUCKET=
BACKUP_S3_ACCESS_KEY=
BACKUP_S3_SECRET_KEY=
BACKUP_KEEP_LOCAL_DAYS=7
BACKUP_KEEP_REMOTE_DAYS=30
ENV
  chown deploy:deploy /opt/ssci/.env
  chmod 600 /opt/ssci/.env
fi

echo "==> SSH hanya dengan kunci"
cat > /etc/ssh/sshd_config.d/90-ssci.conf <<'CONF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
CONF
systemctl reload ssh 2>/dev/null || systemctl reload sshd

echo "==> Firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Pembaruan keamanan otomatis dan zona waktu"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF
timedatectl set-timezone Asia/Jakarta

# Isian GitHub Actions. Kunci privat hanya ada bila dibuat oleh skrip ini.
HOST_KEY="$(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"
{
  echo "Isi di GitHub: Settings > Secrets and variables > Actions > New repository secret"
  echo
  echo "DEPLOY_HOST"
  echo "$SERVER_IP"
  echo
  echo "DEPLOY_USER"
  echo "deploy"
  echo
  echo "DEPLOY_KNOWN_HOSTS"
  echo "$SERVER_IP $HOST_KEY"
  echo
  echo "DEPLOY_SSH_KEY (salin semua baris, termasuk BEGIN dan END)"
  if [ -f "$SETUP_DIR/deploy_key" ]; then cat "$SETUP_DIR/deploy_key"; else echo "(kunci dari DEPLOY_PUBKEY, simpan sendiri)"; fi
} > "$SETUP_DIR/github-secrets.txt"
chmod 600 "$SETUP_DIR/github-secrets.txt"

cat > "$SETUP_DIR/ringkasan.txt" <<TXT
Alamat aplikasi : https://$SSCI_DOMAIN
Admin awal      : $ADMIN_EMAIL
Password admin  : $ADMIN_PASSWORD_NOTE
TXT
chmod 600 "$SETUP_DIR/ringkasan.txt"

echo
echo "Selesai."
cat "$SETUP_DIR/ringkasan.txt"
echo
echo "Simpan password admin di atas di tempat aman, lalu hapus dari layar."
echo "Isian GitHub ada di $SETUP_DIR/github-secrets.txt (lihat dengan: sudo cat $SETUP_DIR/github-secrets.txt)."
echo "Password backup ada di /opt/ssci/.env (BACKUP_PASSPHRASE). Simpan salinannya di luar server."
