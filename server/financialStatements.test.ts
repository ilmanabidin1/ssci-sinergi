import { describe, expect, it } from "vitest";
import {
  companyProfileSchema,
  computeGrowth,
  computeRatios,
  computeWorkingCapital,
  financialChecks,
  isValidNpwp,
  missingFinancialItems,
  monthlyFiguresFromStatements,
  monthsSince,
  periodTotals,
  type FinancialStatements,
} from "@shared/financialStatements";
import { buildDemoBadanScenario } from "@shared/demoBadan";

const statements: FinancialStatements = {
  previous: {
    label: "PER-DESEMBER 2024",
    neraca: { kas: 50, bank: 150, piutang: 300, persediaan: 500, tanahBangunan: 1000, kendaraan: 200, peralatan: 100, asetLain: 0, hutangJangkaPendek: 400, hutangJangkaPanjang: 300, modalDisetor: 1000, modalLain: 0, saldoLabaLalu: 400, labaBerjalan: 200 },
    labaRugi: { penjualan: 3000, hpp: 2100, biayaPenjualan: 100, biayaOperasional: 500, biayaBank: 50, biayaPajak: 30, biayaLainnya: 20 },
  },
  current: {
    label: "PER-DESEMBER 2025",
    neraca: { kas: 100, bank: 200, piutang: 400, persediaan: 600, tanahBangunan: 1000, kendaraan: 200, peralatan: 100, asetLain: 0, hutangJangkaPendek: 500, hutangJangkaPanjang: 300, modalDisetor: 1000, modalLain: 0, saldoLabaLalu: 600, labaBerjalan: 200 },
    labaRugi: { penjualan: 3650, hpp: 2555, biayaPenjualan: 120, biayaOperasional: 600, biayaBank: 60, biayaPajak: 40, biayaLainnya: 75 },
  },
  periodDays: 365,
};

describe("perhitungan neraca dan laba rugi", () => {
  it("menjumlahkan neraca dan laba rugi seperti workbook", () => {
    const t = periodTotals(statements.current);
    expect(t.aktivaLancar).toBe(1300);
    expect(t.aktivaTetap).toBe(1300);
    expect(t.totalAset).toBe(2600);
    expect(t.totalKewajiban).toBe(800);
    expect(t.modal).toBe(1800);
    expect(t.selisih).toBe(0);
    expect(t.labaKotor).toBe(1095);
    expect(t.totalBiaya).toBe(895);
    expect(t.labaBersih).toBe(200);
  });

  it("menghitung rasio dan status benchmark bank", () => {
    const ratios = Object.fromEntries(computeRatios(statements.current).map(r => [r.key, r]));
    expect(ratios.currentRatio!.value).toBeCloseTo(260);
    expect(ratios.currentRatio!.status).toBe("memenuhi");
    expect(ratios.quickRatio!.value).toBeCloseTo(140);
    expect(ratios.cashRatio!.value).toBeCloseTo(60);
    expect(ratios.der!.value).toBeCloseTo(44.44, 1);
    expect(ratios.der!.status).toBe("memenuhi");
    expect(ratios.dar!.value).toBeCloseTo(30.77, 1);
    expect(ratios.equityMultiplier!.value).toBeCloseTo(1.444, 2);
    expect(ratios.equityMultiplier!.status).toBe("info");
    expect(ratios.roa!.value).toBeCloseTo(7.69, 1);
    expect(ratios.roe!.value).toBeCloseTo(11.11, 1);
    expect(ratios.roe!.status).toBe("tidak_memenuhi");
    expect(ratios.bopo!.value).toBeCloseTo(94.52, 1);
    expect(ratios.bopo!.status).toBe("tidak_memenuhi");
  });

  it("tidak membagi dengan nol", () => {
    const ratios = computeRatios({ neraca: {}, labaRugi: {} });
    expect(ratios.every(r => r.value === null && r.status === "tidak_dapat_dihitung")).toBe(true);
  });

  it("menghitung pertumbuhan, kebutuhan modal kerja, dan angka bulanan SSCI", () => {
    const growth = computeGrowth(statements);
    expect(growth.aset).toBeCloseTo(((2600 - 2300) / 2300) * 100);
    expect(growth.penjualan).toBeCloseTo(21.67, 1);
    expect(growth.labaBersih).toBeCloseTo(0);

    const wc = computeWorkingCapital(statements);
    expect(wc.hariPiutang).toBeCloseTo(40);
    expect(wc.hariPersediaan).toBeCloseTo(85.71, 1);
    expect(wc.hariHutang).toBeCloseTo(71.43, 1);
    expect(wc.siklusKas).toBeCloseTo(54.29, 1);
    expect(wc.sumberPertumbuhan).toBe("historis");
    const withProjection = computeWorkingCapital({ ...statements, expectedSalesGrowth: 10 });
    expect(withProjection.sumberPertumbuhan).toBe("proyeksi");
    expect(withProjection.proyeksiPenjualan).toBeCloseTo(4015);
    expect(withProjection.kebutuhanModalKerja).toBeCloseTo((withProjection.siklusKas! * 4015) / 365);

    const monthly = monthlyFiguresFromStatements({ current: { neraca: {}, labaRugi: { penjualan: 1_200_000_000, hpp: 600_000_000, biayaOperasional: 120_000_000, biayaPajak: 12_000_000 } } });
    expect(monthly).toEqual({ monthlyRevenue: 100_000_000, monthlyExpenses: 61_000_000 });
  });
});

describe("pemeriksaan data laporan keuangan", () => {
  it("lolos untuk data yang seimbang", () => {
    expect(financialChecks(statements).filter(c => c.severity !== "rendah")).toEqual([]);
    expect(missingFinancialItems(statements)).toEqual([]);
  });

  it("menandai neraca tidak seimbang, ekuitas negatif, current ratio rendah, DER tinggi, dan periode kosong", () => {
    const bad: FinancialStatements = {
      previous: { neraca: {}, labaRugi: {} },
      current: {
        neraca: { kas: 100_000_000, piutang: 100_000_000, hutangJangkaPendek: 400_000_000, hutangJangkaPanjang: 100_000_000, modalDisetor: 100_000_000, saldoLabaLalu: -350_000_000 },
        labaRugi: { penjualan: 1_000_000_000, hpp: 900_000_000, biayaOperasional: 200_000_000 },
      },
    };
    const fields = financialChecks(bad).map(c => c.field);
    expect(fields).toContain("Periode data");
    expect(fields).toContain("Neraca");
    expect(fields).toContain("Modal");
    expect(fields).toContain("Likuiditas");
    expect(fields).toContain("Profitabilitas");
    expect(missingFinancialItems(bad)).toEqual(["Neraca & laba rugi tahun lalu", "Neraca periode berjalan belum seimbang"]);

    const leveraged = structuredClone(statements);
    leveraged.current.neraca.hutangJangkaPanjang = 1300;
    leveraged.current.neraca.modalDisetor = 0;
    expect(financialChecks(leveraged).map(c => c.field)).toContain("Solvabilitas");
    expect(financialChecks(null)[0]!.severity).toBe("tinggi");
  });
});

describe("validasi identitas badan hukum", () => {
  it("menerima NPWP 15 atau 16 digit", () => {
    expect(isValidNpwp("01.234.567.8-901.000")).toBe(true);
    expect(isValidNpwp("0123456789012345")).toBe(true);
    expect(isValidNpwp("12345")).toBe(false);
  });

  it("menghitung lama berdiri dalam bulan", () => {
    expect(monthsSince("2020-03-15", new Date(2025, 2, 20))).toBe(60);
    expect(monthsSince("2020-03-15", new Date(2025, 2, 10))).toBe(59);
    expect(monthsSince("2030-01-01", new Date(2025, 0, 1))).toBeNull();
  });

  it("schema menolak NIB dan NIK direktur yang salah", () => {
    expect(companyProfileSchema.safeParse({ nib: "123" }).success).toBe(false);
    expect(companyProfileSchema.safeParse({ direktur: { nik: "123" } }).success).toBe(false);
    expect(companyProfileSchema.safeParse({ financials: { previous: { neraca: { kas: -1 } }, current: {} } }).success).toBe(false);
    expect(companyProfileSchema.safeParse({ financials: { previous: { neraca: { saldoLabaLalu: -1 } }, current: {} } }).success).toBe(true);
  });
});

/** Generator acak deterministik agar contoh dapat diuji untuk banyak benih. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("data contoh badan hukum", () => {
  it("selalu konsisten: neraca seimbang, laba sama dengan laba rugi, tumbuh wajar, lolos schema", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const demo = buildDemoBadanScenario({ rng: seeded(seed), today: new Date(2026, 10, 4) });
      const fs = demo.financials;
      for (const period of [fs.previous, fs.current]) {
        const t = periodTotals(period);
        expect(t.selisih).toBe(0);
        expect(period.neraca.labaBerjalan).toBe(t.labaBersih);
        expect(t.labaBersih).toBeGreaterThan(0);
        expect(Object.values(period.neraca).every(v => (v ?? 0) >= 0)).toBe(true);
      }
      const growth = computeGrowth(fs);
      expect(growth.penjualan!).toBeGreaterThan(5);
      expect(growth.penjualan!).toBeLessThan(25);
      expect(growth.aset!).toBeGreaterThan(0);
      expect(financialChecks(fs).filter(c => c.severity !== "rendah")).toEqual([]);
      expect(companyProfileSchema.safeParse({ ...demo.company, financials: fs }).success).toBe(true);
      expect(isValidNpwp(demo.customer.customerId)).toBe(true);
      expect(Number(demo.finance.requestedAmount)).toBeGreaterThan(0);
      const monthly = monthlyFiguresFromStatements(fs);
      expect(demo.finance.monthlyRevenue).toBe(String(monthly.monthlyRevenue));
      // Angsuran baru + existing tetap di bawah batas DSR 40% laba bulanan.
      const installment = (Number(demo.finance.requestedAmount) * (1 + Number(demo.finance.marginRate) / 100)) / Number(demo.finance.financingTenor);
      expect((installment + Number(demo.finance.existingDebt)) / (monthly.monthlyRevenue - monthly.monthlyExpenses)).toBeLessThanOrEqual(0.4);
    }
  });
});
