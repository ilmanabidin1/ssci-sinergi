# Matriks RACI SSCI (DRAF)

**R** = Responsible (mengerjakan) · **A** = Accountable (bertanggung jawab akhir, satu pihak per baris) · **C** = Consulted (dimintai pendapat) · **I** = Informed (diberi tahu)

Peran:
- **AO**: Maker/Analis/Account Officer
- **KMT**: Checker/Komite pembiayaan
- **DIR**: Direksi pemutus sesuai batas kewenangan
- **KPT**: Direktur/Pejabat Kepatuhan & Manajemen Risiko
- **DPS**: Dewan Pengawas Syariah
- **ADM**: Admin BPRS
- **SA**: SuperAdmin platform
- **NSB**: Nasabah
- **SYS**: Sistem SSCI dan AI, alat bantu yang tidak memikul akuntabilitas

## A. Proses pembiayaan

| Aktivitas | AO | KMT | DIR | KPT | DPS | ADM | SA | NSB | SYS |
|-----------|----|-----|-----|-----|-----|-----|----|-----|-----|
| Pengumpulan data dan dokumen nasabah | R/A | I | | | | | | C | |
| Pembacaan dokumen otomatis (OCR, AI) | A | | | | | | | | R |
| Verifikasi kebenaran data input | R/A | C | | | | | | C | |
| Pemeriksaan konsistensi data | A | I | | | | | | | R |
| Konfirmasi temuan pemeriksaan data | R/A | I | | C | | | | | |
| Perhitungan skor SSCI | A | I | | | | | | | R |
| Narasi rekomendasi dan ringkasan komite (AI) | A | C | | | | | | | R |
| Cek kesesuaian syariah akad | R | C | | | A | | | | R (pendukung) |
| Verifikasi dokumen yang diunggah | | R/A | | | | | | | |
| Uji sensitivitas skor | | R/A | I | C | | | | | R |
| Peninjauan (override) klasifikasi | | R | A | C | | | | | |
| Keputusan pembiayaan dalam batas kewenangan | | R | A | C | C | | | I | |
| Opini kepatuhan & MR (plafon wajib opini) | | C | I | R/A | | | | | |
| Komunikasi hasil dan penjelasan ke nasabah | R | A | | | | | | I | R (penjelasan otomatis) |
| Tanggapan permintaan pembaruan data atau peninjauan ulang | R | A | | C | | | | I | |

## B. Tata kelola sistem dan data

| Aktivitas | AO | KMT | DIR | KPT | DPS | ADM | SA | NSB | SYS |
|-----------|----|-----|-----|-----|-----|-----|----|-----|-----|
| Pengelolaan akun tim dan peran | | | A | C | | R | | | |
| Reset 2FA anggota | | | | I | | R/A | | | |
| Persetujuan pendaftaran BPRS di platform | | | I | | | C | R/A | | |
| Review log audit BPRS | | | I | R/A | | R | | | |
| Review log audit lintas BPRS | | | | | | | R/A | | |
| Pembukaan NIK lengkap dan ekspor data | R | R | | A (pemantauan) | | | | | |
| Perubahan metodologi skor atau bobot | | C | A | C | C | | R (implementasi) | | |
| Perubahan prompt, model, atau penyedia AI | | | A | C | C | | R | | |
| Penanganan insiden kebocoran data | | | A | R | | R | R | I | |

## Catatan untuk dibahas
1. Siapa pihak **A** untuk perubahan metodologi: Direksi BPRS, tim riset, atau keduanya bila dipakai lintas BPRS?
2. Apakah DPS perlu menyetujui setiap perubahan fitur AI yang menyentuh aspek syariah?
3. Batas plafon wajib opini kepatuhan dan legal mengikuti kebijakan pembiayaan masing-masing BPRS **[verifikasi dengan KPB BPRS]**.
