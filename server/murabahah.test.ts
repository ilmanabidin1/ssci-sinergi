import { describe, expect, it } from "vitest";
import { calculateMurabahahBreakdown } from "./murabahah";

describe("calculateMurabahahBreakdown", () => {
  it("computes harga perolehan = pokok + biaya langsung - diskon", () => {
    const result = calculateMurabahahBreakdown({
      requestedAmount: "50000000",
      acquisitionPrice: "100000000",
      directCost: "5000000",
      supplierDiscount: "3000000",
      marginRate: "5",
    });
    expect(result.hargaPerolehan).toBe(102000000);
  });

  it("computes pokok pembiayaan = harga perolehan - uang muka", () => {
    const result = calculateMurabahahBreakdown({
      requestedAmount: "50000000",
      acquisitionPrice: "100000000",
      directCost: "5000000",
      supplierDiscount: "3000000",
      downPaymentAmount: "20000000",
      marginRate: "5",
    });
    expect(result.hargaPerolehan).toBe(102000000);
    expect(result.pokokPembiayaan).toBe(82000000);
  });

  it("computes piutang murabahah = pokok + margin", () => {
    const result = calculateMurabahahBreakdown({
      requestedAmount: "50000000",
      acquisitionPrice: "100000000",
      directCost: "5000000",
      supplierDiscount: "3000000",
      downPaymentAmount: "20000000",
      marginRate: "5",
    });
    expect(result.marginNominal).toBe(5100000);
    expect(result.piutangMurabahah).toBe(87100000);
  });

  it("suggests ultra_mikro for 15jt and standard for 50jt", () => {
    const ultraMikro = calculateMurabahahBreakdown({ requestedAmount: "15000000" });
    const standard = calculateMurabahahBreakdown({ requestedAmount: "50000000" });
    expect(ultraMikro.suggestedType).toBe("ultra_mikro");
    expect(standard.suggestedType).toBe("standard");
  });
});
