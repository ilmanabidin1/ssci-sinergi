import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AKAD_TO_BPRS,
  MAX_STATEMENT_ROWS,
  bankFacilities,
  fixSideBusiness,
  fluktuatifFinancials,
  lamaUsahaFromMonths,
  monthlyFlatRate,
  type BankFacilityRow,
  type BprsApplicationData,
  type BprsProfile,
  type BprsTemplateKind,
} from "@shared/bprsTemplate";
import { XlsxWorkbook, splitAddress, type CellValue } from "./xlsxPatch";

export const FLUKTUATIF_TEMPLATE_PATH = join(process.cwd(), "templates", "bprs", "fluktuatif-umkm.xlsx");

export const SHEET = {
  info: "Informasi Pokok",
  nonKeuangan: "Aspek Non Keuangan",
  rekening: "Rekening Koran & Aset ", // spasi di akhir memang bagian dari nama sheet
  keuangan: "Aspek Keuangan",
  usulan: "Usulan Pembiayaan",
  keputusan: "Keputusan Pembiayaan",
  jadang: "Jadang",
} as const;

export type BprsExportApplication = BprsApplicationData & {
  customerName: string;
  customerId: string;
  address: string;
  phone: string;
  businessName: string;
  businessType: string;
  loanPurpose: string;
};

const range = (cols: string[], from: number, to: number) => {
  const out: string[] = [];
  for (let r = from; r <= to; r++) for (const c of cols) out.push(`${c}${r}`);
  return out;
};

/**
 * Sel isian dari template contoh BPRS yang harus dikosongkan agar data
 * nasabah contoh tidak ikut terbawa. Label dan opsi bawaan tidak disentuh.
 */
export const FLUKTUATIF_INPUT_CELLS: Record<string, string[]> = {
  [SHEET.info]: [
    "D3", "D4", "D5", "D6", "D7", "D11", "H11", "D12", "D13", "D14", "I14", "D15", "D16", "F18", "I18", "F19", "I19",
    "D20", "D21", "D22", "D23", "D24", "D25", "D26", "D27", "D28", "D29", "D30", "D32", "D36", "D37", "D38", "D39",
    "D43", "D44", "D45", "D47", "D48", "D49", "D50", "D51", "D52", "D56", "D57", "D62", "D63", "D64", "D65", "D66",
    "E66", "D67", "D68", "D69", "D70", "D71", "B76", "D77",
  ],
  [SHEET.nonKeuangan]: [
    "B5", "K13", "K18", "K19", "K23", "K27", "K31", "K35", "K41", "K42", "K44", "K46", "K52",
    "G111", "G117", "G122", "H142",
    ...range(["F", "M", "S"], 56, 61), "B59", "B60", "B61",
    ...range(["B", "G", "H", "L", "M", "N", "P", "Q", "V", "X"], 69, 75),
    ...range(["B", "E", "H", "I", "L", "N", "O", "Q", "R"], 81, 85), "Z81",
    ...range(["E", "H", "L", "Q"], 91, 94),
  ],
  [SHEET.rekening]: [
    "C1", "C2", "E2", "A6",
    ...range(["B", "C", "F", "G", "J", "K"], 6, 53),
    ...range(["C", "D"], 62, 66),
    ...[87, 90, 93, 96, 99, 103, 106, 109, 113].flatMap(t => [`D${t + 1}`, `D${t + 2}`]),
    ...[90, 93, 96, 99, 103, 106, 109, 113].flatMap(t => [`H${t + 1}`, `H${t + 2}`]),
  ],
  [SHEET.keuangan]: [
    "G5", "E26", "E39", "E50", "E63", "E74", "E65", "P80", "P81", "L88", "O100", "O101",
    "M110", "M111", "M113", "M114", "M116", "M117",
    ...range(["B", "H", "K", "T"], 19, 23),
    ...range(["B", "H", "K", "N"], 32, 36),
    ...range(["B", "H", "K", "T"], 45, 47),
    ...range(["B", "F", "L", "Q", "T", "W", "Z"], 56, 60),
    ...range(["B", "F", "L", "Q", "T", "W", "Z"], 67, 71),
    "C92", "H92", "I92", "O92", "P92", "V92", "W92", "C93", "H93", "I93", "O93", "P93", "V93", "W93",
    ...range(["C", "M"], 123, 128),
    "M133", "M134", "M135", "M136", "C137", "M137", "C138", "M138",
    "J145", "T145", "J150", "T150", "J151", "T151",
    "H164", "H172",
  ],
  [SHEET.usulan]: ["N36", "J76", "J77", "J78", "J79", "J81", "J82", "M82", "B107", "K109", "B136"],
  [SHEET.jadang]: ["A131"],
};

function jakartaToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

function isoDate(value: Date | string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : jakartaToday(date);
}

const nonCashShare: Record<string, number> = {
  Tunai: 0,
  "Non Tunai & Tunai": 0.5,
  "Non Tunai": 1,
  "Konsinyasi & Bagi Hasil": 1,
};

export type FilledSheets = Record<string, Record<string, CellValue>>;

/** Nilai kosong ("" atau undefined) ditulis sebagai sel kosong. */
const v = <T,>(value: T | undefined | null): T | null => (value === undefined || value === "" ? null : value);

/**
 * Menambahkan sel hanya bila nilainya ada. Dipakai untuk sel yang di template
 * sudah berisi teks bawaan BPRS (jabatan, mitigasi), agar teks bawaan tidak terhapus.
 */
function setIfPresent(target: Record<string, CellValue>, address: string, value: CellValue | undefined) {
  if (value === undefined || value === null || value === "") return;
  target[address] = value;
}

function idDateLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** Baris tempat dan tanggal tanda tangan, misalnya "Banjaran, 7 Oktober 2026". */
function placeAndDate(profile: BprsProfile, today: string): string | null {
  const place = profile.kotaTandaTangan || profile.kabupaten;
  return place ? `${place}, ${idDateLabel(today)}` : null;
}

/** Ringkasan jenis pengikatan dari rincian agunan, contoh "(SKMHT, Fidusia)". */
function pengikatanSummary(profile: BprsProfile): string | null {
  if (profile.cakupanPengikatan) return profile.cakupanPengikatan;
  const kinds = new Set<string>();
  for (const row of profile.agunanTanah ?? []) if (row.pengikatan) kinds.add(row.pengikatan);
  if ((profile.agunanKendaraan ?? []).length > 0) kinds.add("Fidusia");
  return kinds.size > 0 ? `(${Array.from(kinds).join(", ")})` : null;
}

/** Cakupan asuransi agunan: kebakaran untuk tanah/bangunan, TLO untuk kendaraan. */
function asuransiAgunanSummary(profile: BprsProfile): string | null | undefined {
  if (profile.cakupanAsuransiAgunan) return profile.cakupanAsuransiAgunan;
  if (profile.asuransiAgunan === "Tidak Diasuransikan") return "";
  if (profile.asuransiAgunan !== "Asuransi Kerugian Syariah") return undefined;
  const parts: string[] = [];
  if ((profile.agunanTanah ?? []).length > 0) parts.push("Kebakaran");
  if ((profile.agunanKendaraan ?? []).length > 0) parts.push("TLO");
  return parts.length > 0 ? `(${parts.join(", ")})` : undefined;
}

/** Memecah teks panjang menjadi baris untuk sel yang tidak digabung (satu baris per sel). */
export function wrapLines(text: string, width: number, maxLines: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && line.length + 1 + word.length > width) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) lines.push(line);
  }
  if (lines.length <= maxLines) return lines;
  // Sisa teks digabung ke baris terakhir agar tidak ada isi yang hilang.
  return [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(" ")];
}

const facilityCells = (row: BankFacilityRow): Record<string, CellValue> => ({
  B: v(row.namaBank),
  F: row.plafond ?? 0,
  L: row.marginTahunan ?? 0,
  Q: row.tanggalMulai ? { date: row.tanggalMulai } : null,
  T: row.tanggalAkhir ? { date: row.tanggalAkhir } : null,
  W: v(row.pangsa),
  Y: row.jenisMargin ?? "Flat",
  Z: row.kol ?? null,
  AA: row.dilunasi ?? "Tidak",
});

function writeRow(target: Record<string, CellValue>, row: number, cells: Record<string, CellValue>) {
  for (const [col, value] of Object.entries(cells)) target[`${col}${row}`] = value;
}

/** Slot aset template Fluktuatif: kolom D lalu H, tiap slot = baris jenis; tahun dan nilai di dua baris berikutnya. */
const FLUK_ASSET_SLOTS: Record<string, string[]> = {
  "Tanah&Bangunan": ["D87", "D90", "D93", "D96", "D99", "H90", "H93", "H96", "H99"],
  Kendaraan: ["D103", "D106", "D109", "H103", "H106", "H109"],
  Peralatan: ["D113", "H113"],
};

const PERIZINAN_FIXED_ROWS: Record<string, number> = { nib: 56, "sertifikat halal": 57, halal: 57, sku: 58 };

/** Menyusun nilai sel per sheet dari data pengajuan SSCI dan profil format BPRS. */
export function buildFluktuatifCells(app: BprsExportApplication, profile: BprsProfile, now = new Date()): FilledSheets {
  const today = jakartaToday(now);
  const signLine = placeAndDate(profile, today);
  const mengetahui = profile.mengetahuiNama || profile.kepalaCabangNama;
  const info: Record<string, CellValue> = {
    D3: v(profile.kantor),
    D4: v(profile.nomorRegister ?? profile.nomorProposal),
    D5: v(profile.nomorProposal),
    D6: v(profile.namaAo),
    D7: { date: today },
    D11: v(profile.kategoriNasabah),
    H11: profile.kategoriNasabah === "Referral" ? v(profile.namaReferral) : null,
    D12: app.customerName,
    D13: v(profile.jenisKelamin),
    D14: v(profile.tempatLahir),
    I14: profile.tanggalLahir ? { date: profile.tanggalLahir } : null,
    D15: app.customerId,
    D16: app.address,
    F18: v(profile.desa),
    I18: v(profile.kecamatan),
    F19: v(profile.kabupaten),
    I19: v(profile.kodePos),
    D20: v(profile.telponRumah),
    D21: app.phone,
    D22: v(profile.statusPerkawinan),
    D23: v(profile.tanggungan),
    D24: v(profile.pendidikan),
    D25: v(profile.ibuKandung),
    D26: v(profile.namaPasangan),
    D27: v(profile.ttlPasangan),
    D28: v(profile.ktpPasangan),
    D29: v(profile.pekerjaanPasangan),
    D30: v(profile.namaSaudara),
    D32: v(profile.hpSaudara),
    D36: v(profile.statusTempatTinggal),
    D37: v(profile.lamaMenetap),
    D38: v(profile.reputasi),
    D39: v(profile.indikatorReputasi),
    D43: v(profile.laporanKeuangan),
    D44: lamaUsahaFromMonths(app.businessAge),
    D45: v(profile.sistemPenjualan),
    D47: v(profile.kepemilikanTempatUsaha),
    D48: v(profile.lokasiUsaha),
    D49: v(profile.daerahPemasaran),
    D50: v(profile.tenagaKerja),
    D51: v(profile.pengelolaanKeuangan),
    D52: v(profile.hutangDagang),
    D56: v(profile.hubunganBank),
    D57: v(profile.riwayatSlik),
    D62: profile.pembiayaanKe ?? 1,
    D63: v(profile.buktiPenggunaanDana),
    D64: app.requestedAmount,
    D65: app.financingTenor,
    D66: monthlyFlatRate(app),
    E66: profile.jenisMargin ?? "Flat",
    D67: app.financingAkad ? AKAD_TO_BPRS[app.financingAkad] ?? null : null,
    D68: v(profile.sektorEkonomi),
    D69: v(profile.jenisPenggunaan),
    D70: app.loanPurpose,
    D71: { date: isoDate(app.createdAt, today) },
    B76: v(mengetahui),
  };
  setIfPresent(info, "B77", profile.mengetahuiJabatan);

  // Aspek Non Keuangan: narasi teknis, pemasaran, legalitas, agunan, mitigasi, verifikasi.
  const nonKeuangan: Record<string, CellValue> = {
    B5: v(profile.latarBelakang),
    K13: v(profile.pengalamanUsaha),
    K18: v(profile.alamatUsaha) ?? app.address,
    K19: v(profile.gambaranDaerah),
    K23: v(profile.saranaPrasarana),
    K27: v(profile.bahanBaku),
    K31: v(profile.hubunganSupplier),
    K35: v(profile.prosesProduksi),
    K41: v(profile.sistemPenjualanNarasi) ?? v(profile.sistemPenjualan),
    K42: v(profile.daerahPemasaranNarasi) ?? v(profile.daerahPemasaran),
    K44: v(profile.saluranDistribusi),
    K46: v(profile.faktorPersaingan),
    K52: v(profile.bentukUsaha) ?? "Perorangan (UMKM)",
    G111: v(profile.pengikatan),
    G117: v(profile.asuransiJiwa),
    G122: v(profile.asuransiAgunan),
    H134: v(profile.verifikatorNama),
    H136: profile.verifikatorNama ? { date: today } : null,
    H142: v(profile.kepalaCabangNama),
    H144: profile.kepalaCabangNama ? { date: today } : null,
  };
  setIfPresent(nonKeuangan, "G103", profile.mitigasiRisikoUsaha);
  setIfPresent(nonKeuangan, "G107", profile.mitigasiWanprestasi);
  setIfPresent(nonKeuangan, "M111", pengikatanSummary(profile));
  const asuransiText = asuransiAgunanSummary(profile);
  if (asuransiText !== undefined) nonKeuangan.M122 = asuransiText;
  setIfPresent(nonKeuangan, "H135", profile.verifikatorJabatan);

  let extraPermitRow = 59;
  for (const permit of (profile.perizinan ?? []).filter(p => p.jenis || p.nomor)) {
    const fixedRow = PERIZINAN_FIXED_ROWS[(permit.jenis ?? "").trim().toLowerCase()];
    const usedFixed = fixedRow != null && nonKeuangan[`F${fixedRow}`] == null;
    const r = usedFixed ? fixedRow! : extraPermitRow;
    if (r > 61) continue;
    if (!usedFixed) {
      nonKeuangan[`B${r}`] = v(permit.jenis);
      extraPermitRow += 1;
    }
    Object.assign(nonKeuangan, { [`F${r}`]: v(permit.nomor), [`M${r}`]: v(permit.berlakuSampai), [`S${r}`]: v(permit.atasNama) });
  }

  const tanah = profile.agunanTanah ?? [];
  const kendaraan = profile.agunanKendaraan ?? [];
  tanah.slice(0, 7).forEach((row, i) => {
    const r = 69 + i;
    Object.assign(nonKeuangan, {
      [`B${r}`]: v(row.jenisSurat), [`G${r}`]: v(row.nomor), [`H${r}`]: v(row.atasNama),
      [`L${r}`]: v(row.luasTanah), [`M${r}`]: v(row.luasBangunan), [`N${r}`]: v(row.nilaiPasar),
      [`P${r}`]: row.persen ?? 1, [`Q${r}`]: 0, [`V${r}`]: v(row.pengikatan), [`X${r}`]: v(row.lokasi),
    });
  });
  kendaraan.slice(0, 5).forEach((row, i) => {
    const r = 81 + i;
    Object.assign(nonKeuangan, {
      [`B${r}`]: v(row.merek), [`E${r}`]: v(row.tipe), [`H${r}`]: v(row.tahun), [`I${r}`]: v(row.atasNama),
      [`L${r}`]: v(row.nomorBpkb), [`N${r}`]: v(row.nopol), [`O${r}`]: v(row.nilaiPasar), [`Q${r}`]: row.persen ?? 1, [`R${r}`]: 0,
    });
  });
  if (kendaraan.length > 0) nonKeuangan.Z81 = "Fidusia";
  if (tanah.length === 0 && kendaraan.length === 0 && app.collateralValue > 0) {
    // Rincian agunan belum diisi: nilai agunan SSCI dicatat di baris pertama.
    Object.assign(nonKeuangan, { N69: app.collateralValue, P69: 1, Q69: 0, X69: "Nilai agunan dari data SSCI, rincian perlu dilengkapi" });
  }

  const rekening: Record<string, CellValue> = {};
  const statement = profile.rekeningKoran;
  if (statement) {
    Object.assign(rekening, {
      C1: v(statement.bank),
      E1: "IDR",
      C2: v(statement.nomorRekening),
      E2: statement.saldoAwal ?? 0,
      A6: statement.bulanPertama ? { date: `${statement.bulanPertama}-01` } : null,
    });
    const columns: Array<[string, string]> = [["B", "C"], ["F", "G"], ["J", "K"]];
    statement.months.slice(0, 3).forEach((month, i) => {
      const [debitCol, creditCol] = columns[i]!;
      month.debits.slice(0, MAX_STATEMENT_ROWS).forEach((amount, j) => { rekening[`${debitCol}${6 + j}`] = amount; });
      month.credits.slice(0, MAX_STATEMENT_ROWS).forEach((amount, j) => { rekening[`${creditCol}${6 + j}`] = amount; });
    });
  }
  (profile.saldoBankLain ?? []).filter(r => r.bank || r.saldo != null).slice(0, 5).forEach((row, i) => {
    writeRow(rekening, 62 + i, { B: v(row.bank), C: v(row.nomorRekening), D: row.saldo ?? 0 });
  });
  const assetSlotUsed: Record<string, number> = {};
  for (const asset of profile.aset ?? []) {
    if (!asset.jenis || asset.nilaiTaksasi == null) continue;
    const slots = FLUK_ASSET_SLOTS[asset.jenis]!;
    const index = assetSlotUsed[asset.jenis] ?? 0;
    if (index >= slots.length) continue;
    assetSlotUsed[asset.jenis] = index + 1;
    const { col, row } = splitAddress(slots[index]!);
    rekening[`${col}${row + 1}`] = asset.tahunPerolehan ?? null;
    rekening[`${col}${row + 2}`] = asset.nilaiTaksasi;
  }
  rekening.D133 = v(profile.verifikatorNama);
  rekening.D135 = profile.verifikatorNama ? { date: today } : null;
  rekening.D141 = v(profile.kepalaCabangNama);
  rekening.D143 = profile.kepalaCabangNama ? { date: today } : null;
  setIfPresent(rekening, "D134", profile.verifikatorJabatan);

  const fin = fluktuatifFinancials(profile, app);
  const keuangan: Record<string, CellValue> = {
    G5: v(profile.kas),
    E26: v(profile.keteranganPiutang),
    E39: v(profile.keteranganPersediaan),
    E50: v(profile.keteranganHutang),
    E63: v(profile.keteranganBank),
    E65: v(profile.namaPasangan),
    E74: v(profile.keteranganBankPasangan),
    P80: 0,
    P81: 0,
    L88: profile.sistemPenjualan ? nonCashShare[profile.sistemPenjualan] ?? null : null,
    M116: profile.tenagaKerjaJumlah ?? null,
    M117: profile.tenagaKerjaUpah ?? null,
    J145: fin.biayaLainRow ? v(fin.biayaLainRow.nama) : null,
    T145: fin.biayaLainRow ? fin.biayaLainRow.nominal : null,
    H164: v(profile.verifikatorNama),
    H166: profile.verifikatorNama ? { date: today } : null,
    H172: v(profile.kepalaCabangNama),
    H174: profile.kepalaCabangNama ? { date: today } : null,
  };
  setIfPresent(keuangan, "H165", profile.verifikatorJabatan);

  // Penjualan: baris 92 berumus, baris 93 berisi angka 0 di template sehingga omzet/bulan ditulis langsung.
  const salesColumns: Array<[string, string, string]> = [["H", "I", "L"], ["O", "P", "S"], ["V", "W", "Z"]];
  fin.sales.forEach((line, i) => {
    const r = 92 + i;
    keuangan[`C${r}`] = v(line.nama);
    line.months.forEach((month, j) => {
      const [dayCol, dailyCol, monthCol] = salesColumns[j]!;
      keuangan[`${dayCol}${r}`] = month.hari;
      keuangan[`${dailyCol}${r}`] = month.omzetHarian;
      if (r === 93) keuangan[`${monthCol}${r}`] = month.omzetBulan;
    });
    keuangan[`O${100 + i}`] = line.hppPersen;
  });
  fin.biayaUsahaRows.forEach((row, i) => writeRow(keuangan, 123 + i, { C: v(row.nama), M: row.nominal }));
  if (fin.rumahTanggaRows) {
    const rt = fin.rumahTanggaRows;
    Object.assign(keuangan, { M133: rt.belanja, M134: rt.pendidikan, M135: rt.listrikAir, M136: rt.telepon });
    rt.lainnya.forEach((row, i) => writeRow(keuangan, 137 + i, { C: v(row.nama), M: row.nominal }));
  } else {
    keuangan.M133 = v(profile.biayaRumahTangga);
  }
  fin.pendapatanLainRows.forEach((row, i) => writeRow(keuangan, 150 + i, { J: v(row.nama), T: row.nominal }));

  // Piutang (rumus total hanya ada di baris pertama), persediaan, hutang usaha.
  (profile.piutang ?? []).slice(0, 5).forEach((row, i) => {
    const r = 19 + i;
    writeRow(keuangan, r, { B: v(row.nama), H: row.jumlah ?? null, K: row.harga ?? null, T: v(row.keterangan) });
    if (r > 19) keuangan[`O${r}`] = (row.jumlah ?? 0) * (row.harga ?? 0);
  });
  (profile.persediaan ?? []).slice(0, 5).forEach((row, i) => {
    writeRow(keuangan, 32 + i, { B: v(row.nama), H: row.jumlah ?? null, K: v(row.satuan), N: row.harga ?? null });
  });
  (profile.hutangUsaha ?? []).slice(0, 3).forEach((row, i) => {
    writeRow(keuangan, 45 + i, { B: v(row.nama), H: row.jumlah ?? null, K: row.harga ?? null, T: v(row.keterangan) });
  });

  // Hubungan bank: baris nasabah 56-60, pasangan 67-71 (semua berumus lengkap).
  const bank = bankFacilities("fluktuatif", profile);
  bank.nasabah.forEach((row, i) => writeRow(keuangan, 56 + i, facilityCells(row)));
  bank.pasangan.forEach((row, i) => writeRow(keuangan, 67 + i, facilityCells(row)));

  const usulan: Record<string, CellValue> = {
    N36: Number(profile.rpcPersen ?? "0.7"),
    J76: app.requestedAmount,
    J77: 0,
    J78: 0,
    J81: app.financingTenor,
    J82: monthlyFlatRate(app),
    M82: profile.jenisMargin ?? "Flat",
  };
  setIfPresent(usulan, "B127", profile.verifikatorNama);
  setIfPresent(usulan, "B136", profile.kepalaCabangNama);

  const keputusan: Record<string, CellValue> = {};
  setIfPresent(keputusan, "A85", signLine);
  setIfPresent(keputusan, "B90", profile.kepalaCabangNama);
  setIfPresent(keputusan, "K90", profile.verifikatorNama);

  const jadang: Record<string, CellValue> = { A131: signLine };

  return {
    [SHEET.info]: info,
    [SHEET.nonKeuangan]: nonKeuangan,
    [SHEET.rekening]: rekening,
    [SHEET.keuangan]: keuangan,
    [SHEET.usulan]: usulan,
    [SHEET.keputusan]: keputusan,
    [SHEET.jadang]: jadang,
  };
}

export async function fillFluktuatifWorkbook(
  template: Buffer,
  app: BprsExportApplication,
  profile: BprsProfile,
  now = new Date(),
): Promise<Buffer> {
  const workbook = await XlsxWorkbook.load(template);
  const sheets = buildFluktuatifCells(app, profile, now);
  for (const [sheet, cells] of Object.entries(sheets)) {
    await workbook.write(sheet, cells, { overwriteFormulas: true });
  }
  await workbook.forceRecalculation();
  return workbook.toBuffer();
}

export async function loadFluktuatifTemplate(): Promise<Buffer> {
  return readFile(FLUKTUATIF_TEMPLATE_PATH);
}

/** Nama file unduhan, misalnya "SSCI-00015 Skoring Fluktuatif UMKM.xlsx". */
export function bprsWorkbookFilename(applicationId: number): string {
  return `SSCI-${String(applicationId).padStart(5, "0")} Skoring Fluktuatif UMKM.xlsx`;
}

// ---------------------------------------------------------------------------
// Template Fix Income (karyawan, dengan agunan)
// ---------------------------------------------------------------------------

export const FIX_INCOME_TEMPLATE_PATH = join(process.cwd(), "templates", "bprs", "fix-income-agunan.xlsx");

export const FIX_SHEET = {
  info: "Informasi Pokok",
  nonKeuangan: "Aspek Non Keuangan",
  keuangan: "Aspek Keuangan",
  rekening: "Rekening Koran & Aset",
  usulan: "Usulan Pembiayaan",
  rekomendasi: "Rekomendasi AO",
  keputusan: "Keputusan Pembiayaan",
  komite: "Komite Kredit",
  jadang: "Jadang",
} as const;

/** Baris tabel yang rumusnya lengkap di template (baris 35 dan 46 tidak punya rumus nilai bank). */
const FIX_LAND_ROWS = [34, 36, 37, 38, 39, 40];
const FIX_VEHICLE_ROWS = [47, 48, 49, 50];
const FIX_STATEMENT_FIRST_ROW = 7;
const FIX_STATEMENT_ROWS = 47;

export const FIX_INCOME_INPUT_CELLS: Record<string, string[]> = {
  [FIX_SHEET.info]: [
    "D2", "D3", "D4", "D5", "D6", "D10", "H10", "D11", "D12", "D13", "I13", "D14", "D15", "F17", "I17", "F18", "I18",
    "D19", "D20", "D21", "D22", "D23", "D24", "D25", "D26", "D27", "D29", "D30", "D31", "D32", "D33", "D34", "D35",
    "D36", "D37", "D38", "D39", "D40", "D41", "D43", "D48", "D49", "D53", "D54", "D55", "D56", "D57", "E57", "D58",
    "D59", "D60", "D61", "D62", ...range(["M"], 299, 310),
  ],
  [FIX_SHEET.nonKeuangan]: [
    ...range(["B"], 5, 14), "K16", "K19", "N24", "N25", "N26", "N27",
    ...range(["B", "G", "H", "L", "M", "N", "P", "Q", "V", "X"], 34, 40),
    ...range(["B", "E", "H", "I", "L", "N", "O", "R", "Z"], 46, 50),
    ...range(["B", "E", "H", "L", "Q"], 56, 59),
    "F77", "K77", "F83", "F88", "K88", "L96",
  ],
  [FIX_SHEET.keuangan]: [
    "M5", "M6", "M7", "M10", "M67", "C20", "C21", ...range(["H", "I", "O", "P", "W", "X"], 20, 21), "O28", "O29",
    "M36", "M37", "M39", "M40", "M42", "M43", "M49", "M50", "M51", "M52", "M53",
    "F72", "E86", ...range(["B", "F", "L", "Q", "T", "W", "Z"], 74, 80), ...range(["B", "F", "L", "Q", "T", "W", "Z"], 88, 92),
    "AD74", "AD75", "P100", "P101", "M111",
  ],
  [FIX_SHEET.rekening]: [
    "C1", "C2", "E2", "A6", "G2", "F81",
    ...range(["B", "C", "F", "G", "J", "K"], FIX_STATEMENT_FIRST_ROW, FIX_STATEMENT_FIRST_ROW + FIX_STATEMENT_ROWS - 1),
    "H62", "H63", "H64", "H65", "D67", "D68", "D69", "D70", "H67", "H68", "H69", "H70",
  ],
  [FIX_SHEET.usulan]: ["J49", "J50", "J51", "J52", "J54", "J55", "M55", "C80", "C81", "C82", "J90"],
  [FIX_SHEET.rekomendasi]: ["D5", "D7", "D8", "D9", "D10", "D11", "D15", "D16", "D19", "D20", "A23", "A28", "D28", "G28"],
  [FIX_SHEET.keputusan]: ["A70", "C75", "K75", "R75"],
  [FIX_SHEET.komite]: ["A2", "C19", "C20", "C21", "B24", "A39", "A45", "A51", "J7"],
};

function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1 + months, d!));
  return date.toISOString().slice(0, 10);
}

/** Latar belakang template Fix Income ditulis satu baris per sel B5..B14 (sel tidak digabung). */
const FIX_BACKGROUND_FIRST_ROW = 5;
const FIX_BACKGROUND_ROWS = 10;
const FIX_BACKGROUND_WIDTH = 120;

/** Baris tabel hubungan bank yang rumus angsurannya lengkap (76-78 dan 88-89 tidak). */
const FIX_BANK_ROWS = { nasabah: [74, 75, 79, 80], pasangan: [90, 91, 92] };
/** Tiga slot aset: jenis, jumlah, tahun perolehan, nilai taksasi. */
const FIX_ASSET_SLOTS = [["H62", "H63", "H64", "H65"], ["D67", "D68", "D69", "D70"], ["H67", "H68", "H69", "H70"]] as const;

/** Menyusun nilai sel template Fix Income dari data SSCI dan profil format BPRS. */
export function buildFixIncomeCells(app: BprsExportApplication, profile: BprsProfile, now = new Date()): FilledSheets {
  const today = jakartaToday(now);
  const akad = app.financingAkad ? AKAD_TO_BPRS[app.financingAkad] ?? null : null;
  const rate = monthlyFlatRate(app);
  const marginType = profile.jenisMargin ?? "Flat";
  const signLine = placeAndDate(profile, today);

  const info: Record<string, CellValue> = {
    D2: v(profile.kantor), D3: v(profile.nomorRegister ?? profile.nomorProposal), D4: v(profile.nomorProposal), D5: v(profile.namaAo),
    D6: { date: today }, D10: v(profile.kategoriNasabah),
    H10: profile.kategoriNasabah === "Referral" ? v(profile.namaReferral) : null,
    D11: app.customerName, D12: v(profile.jenisKelamin), D13: v(profile.tempatLahir),
    I13: profile.tanggalLahir ? { date: profile.tanggalLahir } : null,
    D14: app.customerId, D15: app.address, F17: v(profile.desa), I17: v(profile.kecamatan), F18: v(profile.kabupaten), I18: v(profile.kodePos),
    D19: v(profile.telponRumah),
    D20: app.phone, D21: v(profile.statusPerkawinan), D22: v(profile.tanggungan), D23: v(profile.pendidikanFix),
    D24: v(profile.statusTempatTinggal), D25: v(profile.statusKaryawan), D26: v(profile.bidangPekerjaan), D27: v(profile.bonafiditas),
    D29: v(profile.suratKeteranganBekerja), D30: v(profile.slipGaji), D31: v(profile.rekeningGaji),
    D32: v(profile.mouInstansi), D33: v(profile.suratKuasaPotongGaji), D34: v(profile.reputasiFix), D35: v(profile.indikatorReputasi),
    D36: v(profile.ibuKandung), D37: v(profile.namaPasangan), D38: v(profile.ttlPasangan), D39: v(profile.ktpPasangan),
    D40: v(profile.pekerjaanPasangan), D41: v(profile.namaSaudara), D43: v(profile.hpSaudara),
    D48: v(profile.hubunganBank), D49: v(profile.riwayatSlik), D53: profile.pembiayaanKe ?? 1, D54: v(profile.buktiPenggunaanDana),
    D55: app.requestedAmount, D56: app.financingTenor, D57: rate, E57: marginType, D58: akad,
    D59: v(profile.sektorEkonomi), D60: v(profile.jenisPenggunaan), D61: app.loanPurpose, D62: { date: isoDate(app.createdAt, today) },
  };

  const nonKeuangan: Record<string, CellValue> = {
    K16: v(profile.pengalamanUsaha), K19: v(profile.alamatInstansi),
    N24: v(profile.namaInstansi), N25: v(profile.nomorSk), N26: v(profile.tanggalSk), N27: profile.nomorSk ? app.customerName : null,
    F77: v(profile.pengikatan), F83: v(profile.asuransiJiwa), F88: v(profile.asuransiAgunan),
    L96: v(profile.mengetahuiNama),
    H100: v(profile.verifikatorNama), H102: profile.verifikatorNama ? { date: today } : null,
    H108: v(profile.kepalaCabangNama), H110: profile.kepalaCabangNama ? { date: today } : null,
  };
  const background = profile.latarBelakang ? wrapLines(profile.latarBelakang, FIX_BACKGROUND_WIDTH, FIX_BACKGROUND_ROWS) : [];
  for (let i = 0; i < FIX_BACKGROUND_ROWS; i++) nonKeuangan[`B${FIX_BACKGROUND_FIRST_ROW + i}`] = background[i] ?? null;
  setIfPresent(nonKeuangan, "F68", profile.mitigasiRisikoUsaha);
  setIfPresent(nonKeuangan, "F72", profile.mitigasiWanprestasi);
  setIfPresent(nonKeuangan, "K77", pengikatanSummary(profile));
  const fixAsuransiText = asuransiAgunanSummary(profile);
  if (fixAsuransiText !== undefined) nonKeuangan.K88 = fixAsuransiText;
  setIfPresent(nonKeuangan, "L97", profile.mengetahuiJabatan);
  setIfPresent(nonKeuangan, "H101", profile.verifikatorJabatan);

  const tanah = (profile.agunanTanah ?? []).slice(0, FIX_LAND_ROWS.length);
  const kendaraan = (profile.agunanKendaraan ?? []).slice(0, FIX_VEHICLE_ROWS.length);
  tanah.forEach((row, i) => {
    const r = FIX_LAND_ROWS[i]!;
    Object.assign(nonKeuangan, {
      [`B${r}`]: v(row.jenisSurat), [`G${r}`]: v(row.nomor), [`H${r}`]: v(row.atasNama), [`L${r}`]: v(row.luasTanah),
      [`M${r}`]: v(row.luasBangunan), [`N${r}`]: v(row.nilaiPasar), [`P${r}`]: row.persen ?? 1, [`Q${r}`]: 0,
      [`V${r}`]: v(row.pengikatan), [`X${r}`]: v(row.lokasi),
    });
  });
  kendaraan.forEach((row, i) => {
    const r = FIX_VEHICLE_ROWS[i]!;
    Object.assign(nonKeuangan, {
      [`B${r}`]: v(row.merek), [`E${r}`]: v(row.tipe), [`H${r}`]: v(row.tahun), [`I${r}`]: v(row.atasNama),
      [`L${r}`]: v(row.nomorBpkb), [`N${r}`]: v(row.nopol), [`O${r}`]: v(row.nilaiPasar), [`Q${r}`]: row.persen ?? 1, [`R${r}`]: 0, [`Z${r}`]: "Fidusia",
    });
  });
  if (tanah.length === 0 && kendaraan.length === 0 && app.collateralValue > 0) {
    Object.assign(nonKeuangan, { N34: app.collateralValue, P34: 1, Q34: 0, X34: "Nilai agunan dari data SSCI, rincian perlu dilengkapi" });
  }

  const keuangan: Record<string, CellValue> = {
    M5: profile.gajiBulanan ?? app.monthlyRevenue,
    M6: v(profile.uangLembur),
    M7: v(profile.pendapatanTetapLain),
    M10: Number(profile.potonganGaji ?? "0.4"),
    M67: Number(profile.rpcPersen ?? "0.7"),
    F72: app.customerName,
    E83: v(profile.keteranganBank),
    E86: v(profile.namaPasangan),
    P100: 0,
    P101: 0,
    M111: v(profile.mengetahuiNama),
    H115: v(profile.verifikatorNama), H117: profile.verifikatorNama ? { date: today } : null,
    H123: v(profile.kepalaCabangNama), H125: profile.kepalaCabangNama ? { date: today } : null,
  };
  setIfPresent(keuangan, "E95", profile.keteranganBankPasangan);
  setIfPresent(keuangan, "M112", profile.mengetahuiJabatan);
  setIfPresent(keuangan, "H116", profile.verifikatorJabatan);

  // Pendapatan tidak tetap (usaha sampingan): penjualan, HPP, tenaga kerja bulanan, biaya usaha.
  const side = fixSideBusiness(profile);
  const salesColumns: Array<[string, string]> = [["H", "I"], ["O", "P"], ["W", "X"]];
  side.sales.forEach((line, i) => {
    const r = 20 + i;
    keuangan[`C${r}`] = v(line.nama);
    line.months.forEach((month, j) => {
      const [dayCol, dailyCol] = salesColumns[j]!;
      keuangan[`${dayCol}${r}`] = month.hari;
      keuangan[`${dailyCol}${r}`] = month.omzetHarian;
    });
    keuangan[`O${28 + i}`] = line.hppPersen;
  });
  if (profile.tenagaKerjaJumlah != null) keuangan.M42 = profile.tenagaKerjaJumlah;
  if (profile.tenagaKerjaUpah != null) keuangan.M43 = profile.tenagaKerjaUpah;
  side.biayaUsahaRows.forEach((row, i) => writeRow(keuangan, 49 + i, { C: v(row.nama), M: row.nominal }));

  const bank = bankFacilities("fix_income", profile);
  bank.nasabah.forEach((row, i) => writeRow(keuangan, FIX_BANK_ROWS.nasabah[i]!, facilityCells(row)));
  bank.pasangan.forEach((row, i) => writeRow(keuangan, FIX_BANK_ROWS.pasangan[i]!, facilityCells(row)));
  if (!bank.hasRows && app.existingDebt > 0) {
    // Tabel hubungan bank kosong: angsuran existing SSCI ditulis sebagai satu fasilitas
    // 12 bulan tanpa margin (efektif), sehingga rumus PMT di template menghasilkan angsuran yang sama.
    Object.assign(keuangan, {
      B74: "Angsuran existing (data SSCI)", F74: app.existingDebt * 12, L74: 0,
      Q74: { date: today }, T74: { date: addMonths(today, 12) }, W74: "Konsumtif", Y74: "Efektif", Z74: 1, AA74: "Tidak",
    });
  }

  const rekening: Record<string, CellValue> = {};
  const statement = profile.rekeningKoran;
  if (statement) {
    Object.assign(rekening, {
      C1: v(statement.bank), E1: "IDR", C2: v(statement.nomorRekening), E2: statement.saldoAwal ?? 0,
      A6: statement.bulanPertama ? { date: `${statement.bulanPertama}-01` } : null,
    });
    const columns: Array<[string, string]> = [["B", "C"], ["F", "G"], ["J", "K"]];
    const fit = (values: number[]) => {
      if (values.length <= FIX_STATEMENT_ROWS) return values;
      const head = values.slice(0, FIX_STATEMENT_ROWS - 1);
      return [...head, values.slice(FIX_STATEMENT_ROWS - 1).reduce((a, b) => a + b, 0)];
    };
    statement.months.slice(0, 3).forEach((month, i) => {
      const [debitCol, creditCol] = columns[i]!;
      fit(month.debits).forEach((amount, j) => { rekening[`${debitCol}${FIX_STATEMENT_FIRST_ROW + j}`] = amount; });
      fit(month.credits).forEach((amount, j) => { rekening[`${creditCol}${FIX_STATEMENT_FIRST_ROW + j}`] = amount; });
    });
  }
  (profile.aset ?? []).filter(a => a.jenis && a.nilaiTaksasi != null).slice(0, FIX_ASSET_SLOTS.length).forEach((asset, i) => {
    const [jenis, jumlah, tahun, nilai] = FIX_ASSET_SLOTS[i]!;
    Object.assign(rekening, { [jenis]: v(asset.jenis), [jumlah]: asset.jumlah ?? 1, [tahun]: asset.tahunPerolehan ?? null, [nilai]: asset.nilaiTaksasi! });
  });
  Object.assign(rekening, {
    F81: v(profile.mengetahuiNama),
    D85: v(profile.verifikatorNama), D87: profile.verifikatorNama ? { date: today } : null,
    D93: v(profile.kepalaCabangNama), D95: profile.kepalaCabangNama ? { date: today } : null,
  });
  setIfPresent(rekening, "F82", profile.mengetahuiJabatan);
  setIfPresent(rekening, "D86", profile.verifikatorJabatan);

  const collateralLines = [
    ...tanah.map(row => `${row.jenisSurat ?? "Sertipikat"}${row.nomor ? ` No. ${row.nomor}` : ""}${row.luasTanah ? ` luas ${row.luasTanah} m2` : ""}${row.atasNama ? ` an. ${row.atasNama}` : ""}`),
    ...kendaraan.map(row => `BPKB ${[row.merek, row.tipe, row.tahun].filter(Boolean).join(" ")}${row.nopol ? ` Nopol ${row.nopol}` : ""}${row.atasNama ? ` an. ${row.atasNama}` : ""}`),
  ].slice(0, 3);
  const usulan: Record<string, CellValue> = {
    J49: app.requestedAmount, J50: 0, J51: 0, J52: 0, J54: app.financingTenor, J55: rate, M55: marginType,
    C80: collateralLines[0] ?? null, C81: collateralLines[1] ?? null, C82: collateralLines[2] ?? null,
    J90: v(profile.mengetahuiNama),
  };
  setIfPresent(usulan, "J91", profile.mengetahuiJabatan);
  setIfPresent(usulan, "B101", profile.verifikatorNama);
  setIfPresent(usulan, "B110", profile.kepalaCabangNama);

  const rekomendasi: Record<string, CellValue> = {
    D5: app.requestedAmount, D7: app.financingTenor, D8: akad, D9: app.loanPurpose,
    D10: "Terlampir", D11: "Terlampir", D15: "Terlampir", D16: "Terlampir",
    D19: rate, D20: marginType, A23: signLine, A28: v(profile.namaAo),
    D28: v(profile.mengetahuiNama), G28: v(profile.kabagMarketingNama),
  };
  setIfPresent(rekomendasi, "D29", profile.mengetahuiJabatan);
  const keputusan: Record<string, CellValue> = {
    C75: v(profile.namaAo), K75: v(profile.mengetahuiNama), R75: v(profile.kabagMarketingNama),
  };
  setIfPresent(keputusan, "A70", signLine);
  setIfPresent(keputusan, "K76", profile.mengetahuiJabatan);

  const jadang: Record<string, CellValue> = { H139: app.customerName };
  setIfPresent(jadang, "A131", signLine);
  setIfPresent(jadang, "H131", signLine);
  if (profile.namaPasangan) Object.assign(jadang, { E139: profile.namaPasangan, L139: profile.namaPasangan });

  // Sheet Komite Kredit tersembunyi; isian yang rumusnya tidak rusak (#REF!) saja.
  const komite: Record<string, CellValue> = {
    J7: [profile.statusKaryawan, profile.namaInstansi].filter(Boolean).join(", ") || null,
    C19: collateralLines[0] ?? null, C20: collateralLines[1] ?? null, C21: collateralLines[2] ?? null,
  };

  return {
    [FIX_SHEET.info]: info,
    [FIX_SHEET.nonKeuangan]: nonKeuangan,
    [FIX_SHEET.keuangan]: keuangan,
    [FIX_SHEET.rekening]: rekening,
    [FIX_SHEET.usulan]: usulan,
    [FIX_SHEET.rekomendasi]: rekomendasi,
    [FIX_SHEET.keputusan]: keputusan,
    [FIX_SHEET.jadang]: jadang,
    [FIX_SHEET.komite]: komite,
  };
}

type TemplateSpec = {
  path: string;
  inputCells: Record<string, string[]>;
  build: (app: BprsExportApplication, profile: BprsProfile, now?: Date) => FilledSheets;
  filenameLabel: string;
};

export const BPRS_TEMPLATES: Record<BprsTemplateKind, TemplateSpec> = {
  fluktuatif: { path: FLUKTUATIF_TEMPLATE_PATH, inputCells: FLUKTUATIF_INPUT_CELLS, build: buildFluktuatifCells, filenameLabel: "Skoring Fluktuatif UMKM" },
  fix_income: { path: FIX_INCOME_TEMPLATE_PATH, inputCells: FIX_INCOME_INPUT_CELLS, build: buildFixIncomeCells, filenameLabel: "Skoring Fix Income" },
};

export async function fillBprsWorkbook(
  kind: BprsTemplateKind,
  app: BprsExportApplication,
  profile: BprsProfile,
  now = new Date(),
): Promise<{ buffer: Buffer; filename: (applicationId: number) => string }> {
  const spec = BPRS_TEMPLATES[kind];
  const workbook = await XlsxWorkbook.load(await readFile(spec.path));
  for (const [sheet, cells] of Object.entries(spec.build(app, profile, now))) {
    await workbook.write(sheet, cells, { overwriteFormulas: true });
  }
  await workbook.forceRecalculation();
  return {
    buffer: await workbook.toBuffer(),
    filename: id => `SSCI-${String(id).padStart(5, "0")} ${spec.filenameLabel}.xlsx`,
  };
}
