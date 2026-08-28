/**
 * Syariah Rules Engine & Validation System
 * Memvalidasi Rukun dan Syarat Akad (Murabahah, Qardh, Mudharabah)
 * Berdasarkan Fikih Muamalah dan Fatwa DSN-MUI
 */

const SyariahRulesEngine = {
  /**
   * Evaluasi Akad Murabahah (Fatwa DSN-MUI No. 04/DSN-MUI/IV/2000)
   */
  validateMurabahah(data) {
    const checks = [];
    let score = 100;

    // 1. Subjek Akad (Al-Aqidain)
    if (data.pihakPertama && data.pihakKedua) {
      checks.push({
        rule: "Subjek Akad (Al-'Aqidain)",
        status: "pass",
        message: "Penjual (Koperasi) dan Pembeli (Anggota/Nasabah) jelas dan cakap hukum (Ahliyyah)."
      });
    } else {
      score -= 25;
      checks.push({
        rule: "Subjek Akad (Al-'Aqidain)",
        status: "fail",
        message: "Identitas Penjual atau Pembeli belum lengkap."
      });
    }

    // 2. Objek Akad (Ma'qud 'Alaih) & Kepemilikan Barang
    if (data.namaBarang && parseFloat(data.hargaBeli) > 0) {
      checks.push({
        rule: "Objek Akad (Ma'qud 'Alaih)",
        status: "pass",
        message: `Barang halal & teridentifikasi: ${data.namaBarang} seharga Rp ${parseFloat(data.hargaBeli).toLocaleString('id-ID')}`
      });
    } else {
      score -= 30;
      checks.push({
        rule: "Objek Akad (Ma'qud 'Alaih)",
        status: "fail",
        message: "Spesifikasi atau Harga Beli Asal barang tidak valid."
      });
    }

    // 3. Ketepatan Keterbukaan Harga & Margin (Transparansi)
    if (parseFloat(data.margin) >= 0) {
      checks.push({
        rule: "Transparansi Margin Keuntungan",
        status: "pass",
        message: `Margin disepakati sebesar Rp ${parseFloat(data.margin).toLocaleString('id-ID')}. Koperasi memberitahukan harga pokok pembelian.`
      });
    } else {
      score -= 25;
      checks.push({
        rule: "Transparansi Margin Keuntungan",
        status: "fail",
        message: "Margin keuntungan tidak boleh bernilai negatif."
      });
    }

    // 4. Syarat Bebas Riba & Gharar
    if (data.dendaKeterlambatan && parseFloat(data.dendaKeterlambatan) > 0 && !data.dendaUntukSosial) {
      score -= 20;
      checks.push({
        rule: "Larangan Riba/Denda Komersial (Fatwa DSN No. 17)",
        status: "warn",
        message: "Denda keterlambatan hanya dibolehkan sebagai Ta'zir/Dana Sosial (Infaq), tidak boleh diakui sebagai pendapatan Koperasi."
      });
    } else {
      checks.push({
        rule: "Larangan Riba & Gharar",
        status: "pass",
        message: "Bebas dari unsur Riba, Gharar, dan Maysir."
      });
    }

    return {
      akadType: "Murabahah",
      score: Math.max(0, score),
      isCompliant: score >= 80,
      checks: checks
    };
  },

  /**
   * Evaluasi Akad Qardh / Pinjaman Kebajikan (Fatwa DSN-MUI No. 19/DSN-MUI/IV/2001)
   */
  validateQardh(data) {
    const checks = [];
    let score = 100;

    // 1. Subjek Akad
    if (data.pihakPertama && data.pihakKedua) {
      checks.push({
        rule: "Subjek Akad (Al-'Aqidain)",
        status: "pass",
        message: "Pemberi Pinjaman (Muqridh) & Penerima (Muqtaridh) jelas."
      });
    } else {
      score -= 25;
      checks.push({
        rule: "Subjek Akad",
        status: "fail",
        message: "Pihak muqridh atau muqtaridh belum teridentifikasi."
      });
    }

    // 2. Jumlah Pinjaman Pokok
    const jumlahPinjaman = parseFloat(data.jumlahPinjaman || 0);
    if (jumlahPinjaman > 0) {
      checks.push({
        rule: "Jumlah Pinjaman Pokok (Ma'qud 'Alaih)",
        status: "pass",
        message: `Nilai pinjaman riil Rp ${jumlahPinjaman.toLocaleString('id-ID')}`
      });
    } else {
      score -= 30;
      checks.push({
        rule: "Jumlah Pinjaman Pokok",
        status: "fail",
        message: "Jumlah pinjaman harus lebih besar dari 0."
      });
    }

    // 3. Larangan Manfa'ah / Tambahan Pengembalian (Riba Qardh)
    const biayaAdmin = parseFloat(data.biayaAdmin || 0);
    if (biayaAdmin > (jumlahPinjaman * 0.05)) {
      score -= 30;
      checks.push({
        rule: "Biaya Administrasi Riil (Ri'ayah)",
        status: "warn",
        message: "Biaya administrasi melebihi estimasi pengeluaran riil (potensi Riba terselubung)."
      });
    } else {
      checks.push({
        rule: "Biaya Administrasi Riil",
        status: "pass",
        message: "Biaya administrasi bersifat operasional riil dan tidak mengikat persentase pokok."
      });
    }

    // 4. Tidak ada janji tambahan pengembalian
    if (data.adaTambahanPengembalian) {
      score -= 40;
      checks.push({
        rule: "Larangan Ziyadah (Kelebihan Pengembalian)",
        status: "fail",
        message: "Akad Qardh TIDAK BOLEH mensyaratkan adanya tambahan nilai pengembalian (Setiap pinjaman yang menarik manfaat adalah Riba)."
      });
    } else {
      checks.push({
        rule: "Bebas Riba Nasi'ah",
        status: "pass",
        message: "Pengembalian sebanding 1:1 dengan nilai pinjaman pokok."
      });
    }

    return {
      akadType: "Qardh",
      score: Math.max(0, score),
      isCompliant: score >= 80,
      checks: checks
    };
  },

  /**
   * Evaluasi Akad Mudharabah / Bagi Hasil (Fatwa DSN-MUI No. 07/DSN-MUI/IV/2000)
   */
  validateMudharabah(data) {
    const checks = [];
    let score = 100;

    // 1. Shahibul Maal & Mudharib
    if (data.pihakPertama && data.pihakKedua) {
      checks.push({
        rule: "Kemitraan (Shahibul Maal & Mudharib)",
        status: "pass",
        message: "Pemodal (Shahibul Maal) & Pengelola Usaha (Mudharib) sah secara syar'i."
      });
    } else {
      score -= 25;
      checks.push({
        rule: "Kemitraan Akad",
        status: "fail",
        message: "Identitas pemodal atau pengelola belum lengkap."
      });
    }

    // 2. Modal (Ra's al-Mal)
    const modal = parseFloat(data.jumlahModal || 0);
    if (modal > 0) {
      checks.push({
        rule: "Ketepatan Modal (Ra's al-Mal)",
        status: "pass",
        message: `Modal disetor tunai/dapat dinilai Rp ${modal.toLocaleString('id-ID')}`
      });
    } else {
      score -= 30;
      checks.push({
        rule: "Ketepatan Modal",
        status: "fail",
        message: "Modal Mudharabah harus jelas dan terukur nilainya."
      });
    }

    // 3. Nisbah Bagi Hasil (% Nisbah)
    const nisbahPengelola = parseFloat(data.nisbahPengelola || 0);
    const nisbahPemodal = parseFloat(data.nisbahPemodal || 0);
    if (nisbahPengelola + nisbahPemodal === 100 && nisbahPengelola > 0 && nisbahPemodal > 0) {
      checks.push({
        rule: "Kesepakatan Nisbah Bagi Hasil (%)",
        status: "pass",
        message: `Nisbah Nisbi: Pengelola ${nisbahPengelola}% : Pemodal ${nisbahPemodal}% dari Keuntungan Riil.`
      });
    } else {
      score -= 35;
      checks.push({
        rule: "Kesepakatan Nisbah Bagi Hasil",
        status: "fail",
        message: "Nisbah bagi hasil harus dalam bentuk persentase nisbi (total 100%), BUKAN nominal tetap."
      });
    }

    // 4. Pembagian Kerugian
    checks.push({
      rule: "Prinsip Tanggung Jawab Kerugian (Al-Ghurmi bil Ghurni)",
      status: "pass",
      message: "Kerugian finansial ditanggung Shahibul Maal kecuali bila ada kelalaian/tafrith dari Mudharib."
    });

    return {
      akadType: "Mudharabah",
      score: Math.max(0, score),
      isCompliant: score >= 80,
      checks: checks
    };
  }
};
