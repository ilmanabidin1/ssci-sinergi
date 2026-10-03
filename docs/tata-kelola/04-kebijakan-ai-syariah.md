# Kebijakan Penggunaan AI dan Kepatuhan Syariah (DRAF)

Menjawab pertanyaan FGD: "Bagaimana caranya AI itu syariah?" (Dr. Agus), "Harus diantisipasi kerugian yang ditimbulkan AI" (Dr. Agus), dan "Index harus tetap human in the loop" (Prof Tasya).

## 1. Posisi AI dalam SSCI

AI dalam SSCI adalah **alat bantu administratif dan analitis**, bukan pengambil keputusan.

| Komponen | Pengambil hasil | Peran AI |
|----------|-----------------|----------|
| Skor SSCI (0-100) dan klasifikasi | Aturan deterministik versi `ssci-rules-1.1.0` | Tidak ada |
| Pemeriksaan data | Aturan pasti, ditambah catatan AI | Menambah catatan; tidak memengaruhi skor |
| Narasi rekomendasi | AI, dengan cadangan berbasis aturan | Menyusun kalimat dari skor yang sudah final |
| Kesesuaian syariah akad | Analis dan DPS | Catatan pendukung berdasarkan teks fatwa DSN-MUI |
| Ringkasan komite | Komite | Menyiapkan poin diskusi |
| Keputusan pembiayaan | Pejabat pemutus BPRS | Tidak ada |

## 2. Prinsip syariah dalam penggunaan AI (usulan untuk ditinjau DPS)

1. **Amanah dan tanggung jawab.** Akuntabilitas keputusan tetap pada manusia yang berwenang (lihat Matriks RACI). AI tidak boleh dijadikan alasan pengalihan tanggung jawab.
2. **Menghindari gharar (ketidakjelasan).** Skor dihitung dengan aturan yang dapat ditelusuri dan dijelaskan kepada nasabah. Hasil AI selalu diberi label sebagai catatan pendukung.
3. **Keadilan ('adl).** Nasabah mendapat penjelasan hasil penilaian dan hak meminta peninjauan ulang. Uji sensitivitas memastikan klasifikasi tidak bergantung pada selisih data yang kecil.
4. **Menjaga harta dan kehormatan (hifzh al-mal, hifzh al-'ird).** Data pribadi diminimalkan, disamarkan, dan diaudit.
5. **Rujukan yang sahih.** Pemeriksaan kesesuaian syariah oleh AI wajib merujuk teks fatwa DSN-MUI yang tersedia di sistem dan tidak boleh mengutip fatwa yang tidak ada dalam teks tersebut.
6. **Keterlibatan DPS.** Perubahan fitur AI yang menyentuh aspek syariah sebaiknya ditinjau DPS sebelum digunakan.

## 3. Risiko AI dan mitigasinya

| Risiko | Contoh | Mitigasi yang berjalan | Rencana |
|--------|--------|------------------------|---------|
| Halusinasi atau jawaban keliru | AI menyebut fatwa yang tidak ada | Rujukan dibatasi pada teks fatwa; label "catatan pendukung" | Evaluasi berkala sampel jawaban oleh DPS |
| Ketidakcocokan antara laporan AI dan skor | Temuan AI tidak tercermin di hasil akhir | Temuan pemeriksaan aturan masuk ke faktor risiko dan PDF, plus konfirmasi analis | |
| Bias data | Pola usaha tertentu selalu dinilai rendah | Skor tidak memakai AI; uji sensitivitas; override dengan alasan | Analisis distribusi keputusan per jenis usaha |
| Kebocoran data ke penyedia AI | Gambar KTP dikirim ke luar negeri | Teks tanpa nama dan NIK | Model lokal untuk dokumen identitas (lihat dokumen 3) |
| Ketergantungan pada layanan AI | Layanan AI tidak tersedia | Skor dan pemeriksaan aturan tetap berjalan tanpa AI | |
| Perubahan perilaku model | Pembaruan model mengubah kualitas jawaban | Versi model tercatat di setiap penilaian | Uji regresi sebelum mengganti model |

## 4. Human in the loop: titik keputusan manusia

1. Analis memverifikasi hasil OCR dan baca dokumen sebelum dipakai.
2. Analis mengonfirmasi temuan pemeriksaan data dengan catatan.
3. Checker memverifikasi dokumen dan membaca uji sensitivitas.
4. Checker atau pejabat berwenang dapat meninjau klasifikasi dengan alasan tertulis.
5. Pejabat pemutus mengambil keputusan, dan syarat jalur pemeriksaan wajib terpenuhi sebelum persetujuan.
6. Nasabah dapat meminta peninjauan ulang, dan tanggapan diberikan oleh petugas.

## 5. Hal yang perlu diputuskan tim
- Apakah Maqasid Syariah dimasukkan sebagai indikator skor (perubahan versi metodologi) atau sebagai penilaian kualitatif terpisah?
- Besaran dan pemegang wewenang *allowance factor* (penyesuaian skor terbatas dengan alasan).
- Penyedia AI yang diizinkan (luar negeri, lokal, atau dihosting sendiri).
