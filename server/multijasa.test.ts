import { describe, expect, it } from "vitest";
import { calculateMultijasaBreakdown } from "./multijasa";

describe("calculateMultijasaBreakdown", () => {
  it("calculates pokok, total piutang, and installment correctly", () => {
    // Biaya kuliah/pendidikan Rp 20.000.000, Uang muka Rp 2.000.000, Ujrah Rp 1.800.000, Tenor 12 bulan
    const result = calculateMultijasaBreakdown({
      serviceCost: 20_000_000,
      downPayment: 2_000_000,
      ujrahAmount: 1_800_000,
      tenorMonths: 12,
    });

    expect(result.pokokPembiayaan).toBe(18_000_000);
    expect(result.ujrahNominal).toBe(1_800_000);
    expect(result.totalPiutangIjarah).toBe(19_800_000);
    expect(result.angsuranBulanan).toBe(1_650_000);
    expect(result.imbalanEquivalentPercent).toBe(10); // 1.8jt / 18jt * 100%
  });

  it("handles zero down payment properly", () => {
    const result = calculateMultijasaBreakdown({
      serviceCost: 35_000_000, // Paket Umrah
      ujrahAmount: 3_500_000,
      tenorMonths: 24,
    });

    expect(result.pokokPembiayaan).toBe(35_000_000);
    expect(result.totalPiutangIjarah).toBe(38_500_000);
    expect(result.angsuranBulanan).toBe(1_604_166.67);
  });
});
