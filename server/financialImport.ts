const MAX_FINANCIAL_CSV_SIZE = 1024 * 1024;
const REQUIRED_COLUMNS = ["month", "revenue", "expenses", "existingInstallment"] as const;

export class FinancialImportError extends Error {}

type FinancialRow = {
  month: number;
  revenue: number;
  expenses: number;
  existingInstallment: number;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;

  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (quoted) {
      if (character === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        field += character;
      }
    } else if (closedQuote && character !== "," && character !== "\n" && character !== "\r") {
      throw new FinancialImportError("CSV memiliki karakter setelah kutip penutup");
    } else if (character === '"') {
      if (field.length !== 0) throw new FinancialImportError("CSV memiliki kutip pada posisi yang tidak valid");
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
      closedQuote = false;
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(value => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
      closedQuote = false;
    } else {
      field += character;
    }
  }
  if (quoted) throw new FinancialImportError("CSV memiliki kutip yang tidak berpasangan");
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some(value => value.trim() !== "")) rows.push(row);
  }
  return rows;
}

function parseNumber(value: string, label: string): number {
  const input = value.trim().replace(/\s+/g, "");
  if (!input || !/^\d[\d.,]*$/.test(input)) {
    throw new FinancialImportError(`${label} memiliki format angka yang tidak valid`);
  }

  const commas = (input.match(/,/g) || []).length;
  const dots = (input.match(/\./g) || []).length;
  let normalized: string;
  if (commas && dots) {
    const decimal = input.lastIndexOf(",") > input.lastIndexOf(".") ? "," : ".";
    const grouping = decimal === "," ? /\./g : /,/g;
    const decimalIndex = input.lastIndexOf(decimal);
    const fraction = input.slice(decimalIndex + 1);
    if (!/^\d{1,2}$/.test(fraction)) throw new FinancialImportError(`${label} memiliki desimal yang tidak valid`);
    const integerPart = input.slice(0, decimalIndex);
    const integerGroups = integerPart.split(decimal === "," ? "." : ",");
    if (!/^\d{1,3}$/.test(integerGroups[0]) || !integerGroups.slice(1).every(part => /^\d{3}$/.test(part))) {
      throw new FinancialImportError(`${label} memiliki format angka yang tidak valid`);
    }
    const integer = integerPart.replace(grouping, "");
    normalized = `${integer}.${fraction}`;
  } else if (commas || dots) {
    const separator = commas ? "," : ".";
    const parts = input.split(separator);
    const looksGrouped = parts.length > 1 && parts.slice(1).every(part => /^\d{3}$/.test(part));
    if (looksGrouped) normalized = parts.join("");
    else if (parts.length === 2 && /^\d{1,2}$/.test(parts[1])) normalized = `${parts[0]}.${parts[1]}`;
    else throw new FinancialImportError(`${label} memiliki pemisah angka yang tidak valid`);
  } else {
    normalized = input;
  }

  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0 || number > Number.MAX_SAFE_INTEGER) {
    throw new FinancialImportError(`${label} harus berupa angka non-negatif yang valid`);
  }
  return number;
}

function average(values: number[]) {
  const result = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(result * 100) / 100;
}

export function parseFinancialCsv(data: string) {
  if (typeof data !== "string" || !data || !/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 === 1) {
    throw new FinancialImportError("Data CSV bukan base64 yang valid");
  }
  const bytes = Buffer.from(data, "base64");
  if (!bytes.length || bytes.length > MAX_FINANCIAL_CSV_SIZE) {
    throw new FinancialImportError("CSV harus berisi antara 1 byte dan maksimal 1 MB");
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new FinancialImportError("CSV harus berupa teks UTF-8");
  }
  const rows = parseCsv(text);
  if (rows.length < 2) throw new FinancialImportError("CSV harus memiliki header dan minimal satu baris data");
  const header = rows[0].map((value, index) => (index === 0 ? value.replace(/^\uFEFF/, "") : value).trim());
  const indexes = REQUIRED_COLUMNS.map(column => header.indexOf(column));
  if (indexes.some(index => index < 0) || new Set(indexes).size !== indexes.length) {
    throw new FinancialImportError("Header CSV wajib memuat month,revenue,expenses,existingInstallment");
  }
  const dataRows = rows.slice(1);
  if (dataRows.length > 12) throw new FinancialImportError("CSV hanya boleh berisi 1 sampai 12 baris data");
  const parsed: FinancialRow[] = dataRows.map((row, rowIndex) => {
    const monthText = row[indexes[0]]?.trim() || "";
    if (!/^\d{1,2}$/.test(monthText)) throw new FinancialImportError(`Bulan pada baris ${rowIndex + 2} tidak valid`);
    const month = Number(monthText);
    if (month < 1 || month > 12) throw new FinancialImportError(`Bulan pada baris ${rowIndex + 2} harus 1 sampai 12`);
    return {
      month,
      revenue: parseNumber(row[indexes[1]] || "", `Pendapatan pada baris ${rowIndex + 2}`),
      expenses: parseNumber(row[indexes[2]] || "", `Pengeluaran pada baris ${rowIndex + 2}`),
      existingInstallment: parseNumber(row[indexes[3]] || "", `Angsuran pada baris ${rowIndex + 2}`),
    };
  });
  return {
    monthlyRevenue: average(parsed.map(row => row.revenue)),
    monthlyExpenses: average(parsed.map(row => row.expenses)),
    existingInstallment: average(parsed.map(row => row.existingInstallment)),
    rowCount: parsed.length,
  };
}

export { MAX_FINANCIAL_CSV_SIZE, REQUIRED_COLUMNS };
