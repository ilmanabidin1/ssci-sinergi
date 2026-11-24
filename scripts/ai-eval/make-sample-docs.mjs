/**
 * Membuat dokumen rekaan untuk uji fungsi gambar, beserta nilai benarnya.
 *
 *   node scripts/ai-eval/make-sample-docs.mjs
 *
 * Hasilnya masuk ke ai-eval/data/. Semua nama, nomor, dan angka adalah rekaan,
 * dan setiap dokumen bertanda "CONTOH". Gambar dibuat sedikit miring dan
 * disimpan sebagai JPEG agar tidak sebersih tangkapan layar, tetapi tetap jauh
 * lebih mudah dibaca daripada foto ponsel. Butuh Playwright dengan Chromium.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// require, bukan import, agar Playwright yang terpasang global (NODE_PATH) ikut ditemukan.
const { chromium } = createRequire(import.meta.url)("playwright");

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "ai-eval", "data");
const rp = n => n.toLocaleString("id-ID");

const page = (width, body, tilt = 0.6) => `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#8d8a84;padding:28px;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c}
  .doc{width:${width}px;background:#fbfaf6;padding:26px 30px;transform:rotate(${tilt}deg);box-shadow:0 2px 14px rgba(0,0,0,.45);position:relative;filter:blur(.25px)}
  .mark{position:absolute;right:22px;top:16px;color:#b33;border:2px solid #b33;padding:2px 8px;font-size:12px;letter-spacing:2px;opacity:.7}
  table{border-collapse:collapse;width:100%} td,th{padding:3px 6px;font-size:13px;vertical-align:top}
  h1{font-size:19px;margin:0 0 2px} h2{font-size:14px;margin:0 0 12px;font-weight:normal}
  .num{text-align:right;font-variant-numeric:tabular-nums} .line td,.line th{border-bottom:1px solid #bbb}
  .mono{font-family:"Courier New",monospace}
</style></head><body><div class="doc"><div class="mark">CONTOH</div>${body}</div></body></html>`;

const ktp = k => page(620, `
  <div style="text-align:center;font-weight:bold;font-size:17px">PROVINSI ${k.provinsi}<br>${k.kota}</div>
  <div style="font-size:21px;font-weight:bold;margin:10px 0" class="mono">NIK : ${k.nik}</div>
  <table style="width:74%">
    ${[["Nama", k.nama], ["Tempat/Tgl Lahir", k.lahir], ["Jenis Kelamin", k.kelamin], ["Alamat", k.jalan], ["RT/RW", k.rtrw],
      ["Kel/Desa", k.kel], ["Kecamatan", k.kec], ["Agama", "ISLAM"], ["Status Perkawinan", "KAWIN"], ["Pekerjaan", k.pekerjaan],
      ["Kewarganegaraan", "WNI"], ["Berlaku Hingga", "SEUMUR HIDUP"]]
      .map(([a, b]) => `<tr><td style="width:150px">${a}</td><td>: ${b}</td></tr>`).join("")}
  </table>
  <div style="position:absolute;right:34px;top:120px;width:120px;height:150px;background:#c9c5bb"></div>`, -0.8);

const slip = s => page(640, `
  <h1>${s.perusahaan}</h1><h2>SLIP GAJI KARYAWAN - ${s.periode}</h2>
  <table><tr><td style="width:120px">Nama</td><td>: ${s.nama}</td><td>Jabatan</td><td>: ${s.jabatan}</td></tr>
  <tr><td>NIK Karyawan</td><td>: ${s.nomor}</td><td>Status</td><td>: Karyawan Tetap</td></tr></table><br>
  <table><tr class="line"><th style="text-align:left">PENERIMAAN</th><th class="num">Rp</th><th style="text-align:left">POTONGAN</th><th class="num">Rp</th></tr>
  ${s.baris.map(([a, b, c, d]) => `<tr><td>${a}</td><td class="num">${b ? rp(b) : ""}</td><td>${c}</td><td class="num">${d ? rp(d) : ""}</td></tr>`).join("")}
  <tr class="line"><td><b>Total Penerimaan</b></td><td class="num"><b>${rp(s.kotor)}</b></td><td><b>Total Potongan</b></td><td class="num"><b>${rp(s.potongan)}</b></td></tr>
  <tr><td colspan="3" style="padding-top:10px"><b>GAJI BERSIH (TAKE HOME PAY)</b></td><td class="num" style="padding-top:10px"><b>${rp(s.bersih)}</b></td></tr></table>`);

const nib = n => page(660, `
  <div style="text-align:center"><b>PEMERINTAH REPUBLIK INDONESIA</b><br>PERIZINAN BERUSAHA BERBASIS RISIKO<br>
  <b>NOMOR INDUK BERUSAHA: <span class="mono">${n.nomor}</span></b></div><br>
  <table>${[["Nama Pelaku Usaha", n.pemilik], ["Nama Usaha", n.usaha], ["Alamat", n.alamat], ["Status Penanaman Modal", "PMDN"],
    ["Kode KBLI", n.kbli], ["Skala Usaha", "Usaha Mikro"]].map(([a, b]) => `<tr><td style="width:200px">${a}</td><td>: ${b}</td></tr>`).join("")}</table>
  <p style="font-size:12px">Diterbitkan melalui Sistem OSS tanggal ${n.tanggal}. Dokumen ini adalah contoh untuk pengujian.</p>`, 0.4);

const npwp = n => page(600, `
  <div style="font-weight:bold">KEMENTERIAN KEUANGAN REPUBLIK INDONESIA<br>DIREKTORAT JENDERAL PAJAK</div>
  <div style="font-size:24px;font-weight:bold;margin:16px 0" class="mono">NPWP : ${n.nomor}</div>
  <div style="font-size:17px;font-weight:bold">${n.nama}</div><div style="margin-top:6px">${n.alamat}</div>
  <div style="margin-top:14px;font-size:12px">KPP PRATAMA ${n.kpp} &nbsp; Terdaftar ${n.tanggal}</div>`, -0.5);

const statement = (s, rows, opening, no, total) => {
  let saldo = opening;
  const body = rows.map(([tgl, ket, debit, kredit]) => {
    saldo += kredit - debit;
    return `<tr class="line"><td>${tgl}</td><td>${ket}</td><td class="num">${debit ? rp(debit) : ""}</td><td class="num">${kredit ? rp(kredit) : ""}</td><td class="num">${rp(saldo)}</td></tr>`;
  }).join("");
  return page(760, `
    <h1>${s.bank}</h1><h2>REKENING KORAN / MUTASI REKENING &nbsp; Halaman ${no} dari ${total}</h2>
    <table><tr><td style="width:130px">Nama Nasabah</td><td>: ${s.nama}</td><td>No. Rekening</td><td class="mono">: ${s.rekening}</td></tr>
    <tr><td>Periode</td><td>: ${s.periode}</td><td>Mata Uang</td><td>: IDR</td></tr></table><br>
    <table><tr class="line"><th style="text-align:left">Tanggal</th><th style="text-align:left">Keterangan</th><th class="num">Debit</th><th class="num">Kredit</th><th class="num">Saldo</th></tr>
    <tr class="line"><td></td><td>SALDO AWAL</td><td></td><td></td><td class="num">${rp(opening)}</td></tr>${body}</table>`, no === 1 ? 0.5 : -0.4);
};

async function main() {
  const browser = await chromium.launch();
  const tab = await browser.newPage({ deviceScaleFactor: 2 });
  const shot = async (file, html, expected) => {
    await mkdir(dirname(join(OUT, file)), { recursive: true });
    await tab.setContent(html);
    await tab.setViewportSize({ width: 900, height: 600 });
    await tab.screenshot({ path: join(OUT, file), fullPage: true, type: "jpeg", quality: 62 });
    if (expected) await writeFile(join(OUT, file).replace(/\.jpg$/, ".expected.json"), JSON.stringify(expected, null, 2) + "\n");
  };

  await shot("ktp/ktp-1.jpg", ktp({ provinsi: "JAWA BARAT", kota: "KOTA BANDUNG", nik: "3273051204850003", nama: "AHMAD FAUZAN HIDAYAT", lahir: "BANDUNG, 12-04-1985", kelamin: "LAKI-LAKI", jalan: "JL. CIBIRU HILIR NO. 27", rtrw: "003/008", kel: "CIPADUNG", kec: "CIBIRU", pekerjaan: "WIRASWASTA" }),
    { customerName: "Ahmad Fauzan Hidayat", customerId: "3273051204850003" });
  await shot("ktp/ktp-2.jpg", ktp({ provinsi: "JAWA BARAT", kota: "KABUPATEN BANDUNG", nik: "3204326708900005", nama: "SITI NURHALIMAH", lahir: "GARUT, 27-08-1990", kelamin: "PEREMPUAN", jalan: "KP. SUKAMAJU", rtrw: "002/005", kel: "PAKUTANDANG", kec: "CIPARAY", pekerjaan: "PEDAGANG" }),
    { customerName: "Siti Nurhalimah", customerId: "3204326708900005" });

  await shot("slip_gaji/slip-1.jpg", slip({ perusahaan: "PT SENTOSA GARMEN NUSANTARA", periode: "OKTOBER 2026", nama: "Dedi Kurniawan", jabatan: "Supervisor Produksi", nomor: "SGN-00417",
    baris: [["Gaji Pokok", 6500000, "BPJS Kesehatan", 85000], ["Tunjangan Jabatan", 1200000, "BPJS Ketenagakerjaan", 170000], ["Tunjangan Makan", 600000, "PPh 21", 215000], ["Lembur", 450000, "Angsuran Pinjaman Koperasi", 750000]],
    kotor: 8750000, potongan: 1220000, bersih: 7530000 }),
    { holderName: "Dedi Kurniawan", businessName: "PT Sentosa Garmen Nusantara", monthlyIncome: 7530000, existingInstallment: 750000 });

  await shot("nib/nib-1.jpg", nib({ nomor: "1207230045678", pemilik: "AHMAD FAUZAN HIDAYAT", usaha: "TOKO SEMBAKO BERKAH", alamat: "Jl. Cibiru Hilir No. 27, Kel. Cipadung, Kec. Cibiru, Kota Bandung, Jawa Barat", kbli: "47112 - Perdagangan Eceran Berbagai Macam Barang yang Utamanya Makanan", tanggal: "12 Juli 2023" }),
    { holderName: "Ahmad Fauzan Hidayat", businessName: "Toko Sembako Berkah", documentNumber: "1207230045678", monthlyIncome: null });
  await shot("npwp/npwp-1.jpg", npwp({ nomor: "09.254.719.3-429.000", nama: "SITI NURHALIMAH", alamat: "KP. SUKAMAJU RT 002 RW 005, PAKUTANDANG, CIPARAY, KAB. BANDUNG", kpp: "SOREANG", tanggal: "04-03-2019" }),
    { holderName: "Siti Nurhalimah", monthlyIncome: null });

  // Rekening koran tiga bulan pada dua halaman. Nilai benar dihitung dari baris yang sama.
  const months = { "2026-08": [], "2026-09": [], "2026-10": [] };
  const add = (month, day, ket, debit, kredit) => months[month].push([`${String(day).padStart(2, "0")}/${month.slice(5)}/2026`, ket, debit, kredit]);
  const plan = { "2026-08": 0, "2026-09": 350000, "2026-10": -200000 };
  for (const [month, shift] of Object.entries(plan)) {
    add(month, 2, "SETORAN TUNAI", 0, 6200000 + shift);
    add(month, 3, "TRSF KE CV SUMBER PANGAN", 9800000, 0);
    add(month, 5, "ANGSURAN PEMBIAYAAN", 1500000, 0);
    add(month, 9, "TRANSFER MASUK QRIS", 0, 7450000);
    add(month, 12, "TARIK TUNAI ATM", 2000000, 0);
    add(month, 16, "SETORAN TUNAI", 0, 8100000 - shift);
    add(month, 19, "TRSF KE UD MAJU JAYA", 7250000 + shift, 0);
    add(month, 23, "TRANSFER MASUK QRIS", 0, 6900000);
    add(month, 26, "PEMBAYARAN LISTRIK PLN", 640000, 0);
    add(month, 28, "SETORAN TUNAI", 0, 5350000);
    add(month, 30, "BIAYA ADMINISTRASI", 12500, 0);
  }
  const info = { bank: "BANK CONTOH SYARIAH", nama: "AHMAD FAUZAN HIDAYAT", rekening: "7012-3456-789", periode: "01/08/2026 s.d. 31/10/2026" };
  const opening = 4250000;
  const all = Object.values(months).flat();
  const first = all.slice(0, 17);
  const openingSecond = first.reduce((saldo, row) => saldo + row[3] - row[2], opening);
  const expected = { holderName: "Ahmad Fauzan Hidayat", accountNumber: "7012-3456-789", openingBalance: opening };
  for (const [month, rows] of Object.entries(months)) {
    expected[`${month} totalKredit`] = rows.reduce((sum, row) => sum + row[3], 0);
    expected[`${month} totalDebit`] = rows.reduce((sum, row) => sum + row[2], 0);
  }
  await shot("rekening_koran/kasus-1/hal-1.jpg", statement(info, first, opening, 1, 2));
  await shot("rekening_koran/kasus-1/hal-2.jpg", statement(info, all.slice(17), openingSecond, 2, 2));
  await writeFile(join(OUT, "rekening_koran/kasus-1/expected.json"), JSON.stringify(expected, null, 2) + "\n");
  // Halaman pertama juga dipakai untuk fungsi dokumen pendukung jenis mutasi rekening.
  await shot("mutasi_rekening/mutasi-1.jpg", statement(info, first, opening, 1, 2), { holderName: "Ahmad Fauzan Hidayat" });

  await browser.close();
  console.log(`Dokumen rekaan ditulis ke ${OUT}`);
}

main();
