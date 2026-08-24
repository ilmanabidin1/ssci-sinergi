import { describe, expect, it } from "vitest";
import { parseFinancialCsv } from "./financialImport";

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64");

describe("financial CSV import", () => {
  it("parses Indonesian and grouped financial numbers and returns averages", () => {
    // Commas are CSV separators, so use quoted Indonesian decimal values here.
    const quoted = "month,revenue,expenses,existingInstallment\n1,25.000.000,10.000.000,\"1,5\"\n2,\"30.000.000\",\"12.500.000\",\"2.000\"";
    expect(parseFinancialCsv(encode(quoted))).toEqual({
      monthlyRevenue: 27500000,
      monthlyExpenses: 11250000,
      existingInstallment: 1000.75,
      rowCount: 2,
    });
  });

  it("rejects missing columns, negative values, invalid UTF-8, and too many rows", () => {
    expect(() => parseFinancialCsv(encode("month,revenue,expenses\n1,1,1"))).toThrow(/header/i);
    expect(() => parseFinancialCsv(encode("month,revenue,expenses,existingInstallment\n1,-1,1,1"))).toThrow();
    expect(() => parseFinancialCsv("//8=")).toThrow(/UTF-8/i);
    const rows = Array.from({ length: 13 }, (_, index) => `${index + 1},1,1,1`).join("\n");
    expect(() => parseFinancialCsv(encode(`month,revenue,expenses,existingInstallment\n${rows}`))).toThrow(/12/);
  });
});
