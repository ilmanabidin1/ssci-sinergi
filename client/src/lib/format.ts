/**
 * Format angka dan tanggal yang sama di semua halaman, supaya skor tidak
 * tampil "77.21" di satu panel dan "97,5" di panel lain, dan tanggal tidak
 * ambigu antara hari dan bulan.
 */

type DateInput = string | number | Date | null | undefined;

const toDate = (value: DateInput) => {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Contoh: "11 Nov 2026". */
export function formatDate(value: DateInput): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";
}

/** Contoh: "11 Nov 2026, 01.07". */
export function formatDateTime(value: DateInput): string {
  const date = toDate(value);
  return date ? date.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
}

/** Angka desimal dengan koma, jumlah digit tetap. Contoh: formatDecimal(77.2105, 2) menjadi "77,21". */
export function formatDecimal(value: number, digits = 1): string {
  return Number(value).toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
