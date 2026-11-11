#!/usr/bin/env bash
# Menyiapkan server Ubuntu 22.04/24.04 baru untuk SSCI. Jalankan sekali sebagai root:
#   bash setup-server.sh "ssh-ed25519 AAAA... kunci-publik-deploy"
# Yang dilakukan: Docker, pengguna "deploy", firewall (22, 80, 443), pembaruan keamanan otomatis,
# login SSH hanya dengan kunci, dan folder /opt/ssci.
set -euo pipefail
DEPLOY_KEY="${1:?Sertakan kunci publik SSH untuk pengguna deploy}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg ufw unattended-upgrades

# Docker dari repositori resmi
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Pengguna deploy tanpa password, hanya kunci SSH
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
echo "$DEPLOY_KEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

install -d -m 750 -o deploy -g deploy /opt/ssci /opt/ssci/backups

# SSH: tanpa password, tanpa login root
cat > /etc/ssh/sshd_config.d/90-ssci.conf <<'CONF'
PasswordAuthentication no
PermitRootLogin no
CONF
systemctl reload ssh || systemctl reload sshd

# Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Pembaruan keamanan otomatis
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF

timedatectl set-timezone Asia/Jakarta
echo "Selesai. Uji dulu: ssh deploy@<ip-server> sebelum menutup sesi root ini."
