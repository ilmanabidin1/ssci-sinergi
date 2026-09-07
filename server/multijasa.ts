/**
 * Logika & Validasi Kepatuhan Pembiayaan Multijasa
 * Mengacu pada:
 * 1. Fatwa DSN-MUI No. 44/DSN-MUI/VIII/2004 tentang Pembiayaan Multijasa
 * 2. Buku Pedoman Produk Pembiayaan Multijasa OJK (Perbankan Syariah)
 */

export interface MultijasaCalculationInput {
  serviceCost: number; // Nilai perolehan manfaat jasa (Rp)
  downPayment?: number; // Uang muka / Hamish Jiddiyyah (Rp)
  ujrahAmount: number; // Imbalan/keuntungan bank dalam nominal tetap (Rp)
  tenorMonths: number; // Jangka waktu sewa/cicilan (bulan)
}

export interface MultijasaCalculationResult {
  pokokPembiayaan: number; // Nilai jasa - uang muka
  ujrahNominal: number; // Keuntungan nominal tetap
  totalPiutangIjarah: number; // Pokok + Ujrah
  angsuranBulanan: number; // Total piutang / tenor
  imbalanEquivalentPercent: number; // Equivalent rate p.a. untuk komparasi internal
}

export function calculateMultijasaBreakdown(
  input: MultijasaCalculationInput
): MultijasaCalculationResult {
  const serviceCost = Math.max(0, input.serviceCost);
  const downPayment = Math.max(0, input.downPayment || 0);
  const ujrahNominal = Math.max(0, input.ujrahAmount);
  const tenor = Math.max(1, input.tenorMonths);

  const pokokPembiayaan = Math.max(0, serviceCost - downPayment);
  const totalPiutangIjarah = pokokPembiayaan + ujrahNominal;
  const angsuranBulanan = Math.round((totalPiutangIjarah / tenor) * 100) / 100;

  // Persentase ekuivalen per tahun = (ujrah / pokok) / (tenor/12) * 100
  const imbalanEquivalentPercent =
    pokokPembiayaan > 0
      ? Math.round((ujrahNominal / pokokPembiayaan) / (tenor / 12) * 10000) / 100
      : 0;

  return {
    pokokPembiayaan,
    ujrahNominal,
    totalPiutangIjarah,
    angsuranBulanan,
    imbalanEquivalentPercent,
  };
}
