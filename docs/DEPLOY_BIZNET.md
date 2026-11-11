# Panduan Deploy SSCI di Server Sendiri (Biznet Gio)

Panduan ini melengkapi `docs/RENCANA_MIGRASI_HOSTING.md`. Semua berkas yang disebut ada di folder `deploy/`.

## Isi paket

| Berkas | Fungsi |
|---|---|
| `deploy/Dockerfile` | Membangun image aplikasi (API dan halaman web dalam satu layanan). Aplikasi berjalan sebagai pengguna non-root. |
| `deploy/docker-compose.yml` | Menjalankan tiga layanan: aplikasi, MySQL 8, dan Caddy (HTTPS otomatis). Database tidak dibuka ke internet. |
| `deploy/Caddyfile` | Proxy HTTPS dengan sertifikat Let's Encrypt otomatis. |
| `deploy/.env.example` | Daftar variabel yang harus diisi di server. |
| `deploy/setup-server.sh` | Menyiapkan server baru: Docker, pengguna `deploy` dan kuncinya, firewall, SSH hanya dengan kunci, pembaruan keamanan otomatis, serta `.env` berisi rahasia acak. |
| `deploy/backup.sh` | Backup harian database dan berkas unggahan, dienkripsi, lalu disalin ke object storage. |
| `deploy/restore.sh` | Memulihkan dari berkas backup. |
| `.github/workflows/deploy.yml` | Deploy otomatis setiap push ke `main`. Tidak aktif sampai dinyalakan (lihat langkah 6). |

## Yang sudah dan belum diuji

Sudah diuji di lingkungan pengembangan dengan Docker:
- Image berhasil dibangun (sekitar 1 GB; 180 MB saat dikirim).
- Ketiga layanan menyala, migrasi database berjalan, aplikasi sehat, login berhasil lewat HTTPS, dan HTTP dialihkan ke HTTPS.
- Backup terenkripsi dibuat dan disalin ke penyimpanan kompatibel S3. Setelah data sengaja dirusak (isi tabel pengguna dihapus, satu tabel dibuang, berkas unggahan dihapus), pemulihan mengembalikan semuanya.
- Pemulihan dengan kata sandi yang salah berhenti tanpa mengubah apa pun.

Belum diuji, karena butuh server dan akun sungguhan:
- `setup-server.sh` di server Ubuntu nyata. Bagian pengguna, kunci, `.env`, isian GitHub, dan konfigurasi SSH sudah diuji di container Ubuntu 24.04, termasuk dijalankan dua kali tanpa menimpa rahasia. Pemasangan paket (apt dan Docker) belum, karena server cermin Ubuntu tidak bisa dijangkau dari lingkungan pengujian.
- Alur GitHub Actions dari awal sampai akhir.
- Sertifikat Let's Encrypt untuk domain nyata (uji lokal memakai sertifikat internal Caddy).
- NEO Object Storage milik Biznet Gio (uji memakai server S3 lokal).
- Pemindahan data dari Railway (langkah 7).

## Langkah

### 1. Pesan server

Biznet Gio, Ubuntu 24.04, minimal 2 vCPU dan 4 GB RAM. Catat alamat IP-nya. Buat juga satu bucket NEO Object Storage di lokasi yang berbeda dari server, berikut access key dan secret key-nya.

### 2. Masuk ke server

Pakai berkas kunci SSH yang diunduh saat memesan server (misalnya `ssci-admin.pem`).

- Mac: buka Terminal, lalu `chmod 600 ~/Downloads/ssci-admin.pem` dan `ssh -i ~/Downloads/ssci-admin.pem sscisinergi@<ip-server>`.
- Windows 10/11: buka PowerShell, lalu `ssh -i $HOME\Downloads\ssci-admin.pem sscisinergi@<ip-server>`.

Biznet Gio memakai nama layanan sebagai nama pengguna (untuk server SSCI: `sscisinergi`); `ubuntu` dan `root` ditolak. Saat pertama kali, ketik `yes` untuk mempercayai server.

### 3. Jalankan skrip penyiapan

Di dalam server:

```bash
curl -fsSL https://raw.githubusercontent.com/ilmanabidin1/ssci-sinergi/main/deploy/setup-server.sh -o setup-server.sh
sudo SERVER_IP=<ip-server> bash setup-server.sh
```

Skrip menanyakan email administrator awal, lalu:
- memasang Docker, firewall, dan pembaruan keamanan otomatis, serta mematikan login SSH dengan password;
- membuat pengguna `deploy` beserta kunci SSH khusus untuk GitHub Actions;
- membuat `/opt/ssci/.env` berisi password database, `JWT_SECRET`, kata sandi backup, dan password admin awal, semuanya acak;
- menampilkan alamat aplikasi dan password admin awal, serta menyimpan isian GitHub di `/root/ssci-setup/github-secrets.txt`.

Selama domain sendiri belum siap, alamat aplikasi memakai `<ip-dengan-strip>.sslip.io`, misalnya `139-190-104-30.sslip.io`, yang otomatis menunjuk ke IP server. Untuk memakai domain sendiri, ubah `SSCI_DOMAIN` di `/opt/ssci/.env` lalu jalankan `docker compose up -d` di `/opt/ssci`.

Simpan dua hal di luar server: password admin awal dan `BACKUP_PASSPHRASE` dari `/opt/ssci/.env`. Tanpa `BACKUP_PASSPHRASE`, backup tidak bisa dibuka.

Isian object storage (`BACKUP_S3_*`) dibiarkan kosong dulu dan diisi setelah bucket dibuat.

### 4. Pindahkan isian ke GitHub

`sudo cat /root/ssci-setup/github-secrets.txt` menampilkan empat isian untuk langkah 6. Setelah semuanya tersimpan di GitHub, hapus berkas itu: `sudo rm /root/ssci-setup/github-secrets.txt /root/ssci-setup/deploy_key`.

### 5. Arahkan domain (bila memakai domain sendiri)

Buat record A untuk domain di `SSCI_DOMAIN` ke IP server. Turunkan TTL ke 300 detik beberapa hari sebelum pindah supaya peralihan cepat.

### 6. Nyalakan deploy otomatis

Di GitHub, buka Settings, lalu Secrets and variables, lalu Actions.

Secrets:

| Nama | Isi |
|---|---|
| `DEPLOY_HOST` | Dari `github-secrets.txt` |
| `DEPLOY_USER` | Dari `github-secrets.txt` (`deploy`) |
| `DEPLOY_SSH_KEY` | Dari `github-secrets.txt`, semua baris termasuk `BEGIN` dan `END` |
| `DEPLOY_KNOWN_HOSTS` | Dari `github-secrets.txt` |

Variables:

| Nama | Isi |
|---|---|
| `DEPLOY_ENABLED` | `true` |
| `VITE_DEMO_MODE` | `false` untuk menyembunyikan tombol "Isi contoh data" |

Lalu jalankan workflow "Deploy" secara manual sekali (tab Actions, Run workflow). Workflow menjalankan typecheck dan tes, membangun image, mengirimnya ke server, menjalankan migrasi database, lalu menyalakan layanan dan memeriksa kesehatannya.

Selama Railway masih terhubung ke repositori, push ke `main` men-deploy ke dua tempat. Putuskan sambungan Railway setelah pindah (langkah 8).

### 7. Pindahkan data dari Railway

Lakukan di luar jam kerja dan umumkan jeda layanan sekitar 30 menit.

1. Hentikan layanan di Railway supaya tidak ada data baru yang masuk.
2. Ekspor database Railway dengan `mysqldump` memakai alamat koneksi publiknya, lalu impor ke server baru:

   ```bash
   mysqldump --single-transaction --routines --no-tablespaces -h <host> -P <port> -u <user> -p <database> | gzip > railway.sql.gz
   scp -i ssci-admin.pem railway.sql.gz sscisinergi@<ip-server>:/tmp/ && ssh -i ssci-admin.pem sscisinergi@<ip-server> "sudo mv /tmp/railway.sql.gz /opt/ssci/"
   ssh -i ssci-admin.pem sscisinergi@<ip-server>
   cd /opt/ssci && sudo docker compose stop app
   sudo gunzip -c railway.sql.gz | sudo docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -u root ssci'
   ```

3. Salin isi volume unggahan Railway (`/data/uploads`) ke server baru, lalu masukkan ke volume aplikasi:

   ```bash
   docker compose start app
   docker compose exec -T app tar -C /data -xzf - < uploads.tar.gz
   ```

   Cara mengambil `uploads.tar.gz` dari volume Railway bergantung pada akses yang tersedia (misalnya `railway ssh`). Bagian ini belum saya uji.

4. Hapus `railway.sql.gz` dan `uploads.tar.gz` dari server dan komputer setelah impor selesai.
5. Arahkan DNS ke server baru, lalu periksa: login, daftar pengajuan, membuka dokumen lama, unduh Excel dan PDF.

### Catatan NEO Object Storage

- Endpoint yang dipakai: `https://nos.wjv-1.neo.id` (Primary). Paket Multi Region 2 menyalin isi bucket ke `https://nos.jkt-1.neo.id`.
- Bucket `ssci-backup` dengan ACL Private.
- Access key dan secret key diisi langsung di `/opt/ssci/.env` lewat `read -s`, tidak lewat chat atau berkas lain. Bila backup gagal dengan `InvalidAccessKeyId`, periksa bahwa access key dan secret key tidak tertukar.

### 8. Setelah pindah

- Pasang backup harian pukul 01.15 WIB:

  ```bash
  echo '15 1 * * * /opt/ssci/backup.sh >> /opt/ssci/backups/backup.log 2>&1' | sudo crontab -u deploy -
  ```

- Jalankan `sudo -u deploy /opt/ssci/backup.sh` sekali dengan tangan dan pastikan berkasnya muncul di bucket.
- Uji pemulihan sekali di server percobaan sebelum mengandalkannya.
- Setelah satu sampai dua minggu stabil, putuskan sambungan repositori di Railway dan hapus database, volume, serta variabelnya, supaya tidak ada salinan data di Singapura.

## Operasional sehari-hari

Folder `/opt/ssci` milik pengguna `deploy`. Dari akun admin (`sscisinergi`), jalankan perintah sebagai `deploy`, misalnya `sudo -u deploy bash -c 'cd /opt/ssci && docker compose ps'`, atau masuk dulu dengan `sudo -iu deploy` lalu `cd /opt/ssci`.

| Kebutuhan | Perintah (sebagai `deploy`, di `/opt/ssci`) |
|---|---|
| Status layanan | `docker compose ps` |
| Log aplikasi | `docker compose logs -f --tail 100 app` |
| Mulai ulang aplikasi | `docker compose restart app` |
| Backup sekarang | `./backup.sh` |
| Log backup harian | `tail -n 30 backups/backup.log` |
| Pulihkan | `./restore.sh backups/db-<tanggal>.sql.gz.gpg backups/uploads-<tanggal>.tar.gz.gpg` |
| Kembali ke versi sebelumnya | `SSCI_IMAGE=ssci-sinergi:<12 huruf commit> docker compose up -d app` |

Backup disimpan 7 hari di server dan 30 hari di object storage; keduanya bisa diubah di `.env`.

## Yang perlu diketahui

- **Akun demo:** saat pertama kali dijalankan, aplikasi membuat tiga akun demo (`analis@bprs.id`, `komite@bprs.id`, `admin@bprs.id`) dengan password yang tertulis di kode sumber. Di server produksi baru, akun ini harus dinonaktifkan atau diganti passwordnya, atau pembuatannya dimatikan di kode sebelum pindah.
- **Berkas unggahan dapat dibuka tanpa login** bila alamatnya diketahui (`/uploads/...`). Ini masalah yang sudah ada sebelumnya dan tidak berubah dengan pindah hosting.
- **Pemantauan belum ada.** Bila server mati, tidak ada yang memberi tahu. Pasang pemantau uptime ke `https://<domain>/api/health`.
- **Pembaruan MySQL dan Caddy** tidak otomatis: jalankan `docker compose pull && docker compose up -d` secara berkala.
