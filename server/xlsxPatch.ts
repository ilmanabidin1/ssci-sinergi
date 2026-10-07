import JSZip from "jszip";

/**
 * Penulis sel Excel minimal yang menambal XML sheet secara langsung.
 * Library spreadsheet umum (openpyxl, exceljs) menghapus dropdown x14 milik
 * template BPRS saat menyimpan, jadi kita hanya mengganti sel yang perlu.
 */

export type CellValue = string | number | { date: string } | null;

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeXml = (value: string) =>
  value.replace(/[&<>"]/g, ch => ESCAPES[ch]!).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

export function columnNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

export function splitAddress(address: string): { col: string; row: number } {
  const match = /^([A-Z]+)(\d+)$/.exec(address);
  if (!match) throw new Error(`Alamat sel tidak valid: ${address}`);
  return { col: match[1]!, row: Number(match[2]) };
}

/** Tanggal ISO (YYYY-MM-DD) ke nomor seri Excel. */
export function excelDateSerial(isoDate: string): number {
  const ms = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`Tanggal tidak valid: ${isoDate}`);
  return Math.round(ms / 86_400_000) + 25569;
}

function buildCell(address: string, style: string, value: CellValue): string {
  const s = style ? ` s="${style}"` : "";
  if (value === null || value === "") return `<c r="${address}"${s}/>`;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return `<c r="${address}"${s}/>`;
    return `<c r="${address}"${s}><v>${value}</v></c>`;
  }
  if (typeof value === "object") return `<c r="${address}"${s}><v>${excelDateSerial(value.date)}</v></c>`;
  return `<c r="${address}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

const CELL_RE = /<c r="([A-Z]+)(\d+)"([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g;

type RowSpan = { start: number; end: number; open: string; body: string; selfClosing: boolean };

function findRow(xml: string, row: number): RowSpan | null {
  const marker = `<row r="${row}"`;
  let idx = xml.indexOf(marker);
  while (idx !== -1) {
    const after = xml[idx + marker.length];
    if (after === " " || after === ">" || after === "/") break;
    idx = xml.indexOf(marker, idx + 1);
  }
  if (idx === -1) return null;
  const openEnd = xml.indexOf(">", idx);
  const open = xml.slice(idx, openEnd + 1);
  if (open.endsWith("/>")) return { start: idx, end: openEnd + 1, open, body: "", selfClosing: true };
  const close = xml.indexOf("</row>", openEnd);
  return { start: idx, end: close + 6, open, body: xml.slice(openEnd + 1, close), selfClosing: false };
}

function insertRow(xml: string, row: number, rowXml: string): string {
  const sheetDataOpen = xml.indexOf("<sheetData");
  const sheetDataEnd = xml.indexOf("</sheetData>");
  if (sheetDataEnd === -1) {
    const selfClosing = xml.indexOf("<sheetData/>");
    return xml.slice(0, selfClosing) + `<sheetData>${rowXml}</sheetData>` + xml.slice(selfClosing + 12);
  }
  const rowRe = /<row r="(\d+)"/g;
  rowRe.lastIndex = sheetDataOpen;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(xml)) && m.index < sheetDataEnd) {
    if (Number(m[1]) > row) return xml.slice(0, m.index) + rowXml + xml.slice(m.index);
  }
  return xml.slice(0, sheetDataEnd) + rowXml + xml.slice(sheetDataEnd);
}

export type WriteResult = { written: number; skippedFormula: string[] };

/** Menulis nilai ke sel. Sel berisi rumus tidak ditimpa. */
export function writeCells(
  sheetXml: string,
  cells: Record<string, CellValue>,
  options: { overwriteFormulas?: boolean } = {},
): { xml: string } & WriteResult {
  let xml = sheetXml;
  let written = 0;
  const skippedFormula: string[] = [];
  const byRow = new Map<number, Array<[string, CellValue]>>();
  for (const [address, value] of Object.entries(cells)) {
    const { row } = splitAddress(address);
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row)!.push([address, value]);
  }
  for (const [row, entries] of Array.from(byRow)) {
    const span = findRow(xml, row);
    if (!span) {
      const sorted = [...entries].sort((a, b) => columnNumber(splitAddress(a[0]).col) - columnNumber(splitAddress(b[0]).col));
      const body = sorted.map(([address, value]) => buildCell(address, "", value)).join("");
      xml = insertRow(xml, row, `<row r="${row}">${body}</row>`);
      written += entries.length;
      continue;
    }
    let body = span.body;
    for (const [address, value] of entries) {
      const existing = new RegExp(`<c r="${address}"(?=[ />])([^>]*?)(\\/>|>([\\s\\S]*?)<\\/c>)`).exec(body);
      if (existing) {
        if (existing[3]?.includes("<f") && !options.overwriteFormulas) {
          skippedFormula.push(address);
          continue;
        }
        const style = /\ss="(\d+)"/.exec(existing[1]!)?.[1] ?? "";
        body = body.slice(0, existing.index) + buildCell(address, style, value) + body.slice(existing.index + existing[0].length);
      } else {
        const target = columnNumber(splitAddress(address).col);
        let insertAt = body.length;
        CELL_RE.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = CELL_RE.exec(body))) {
          if (columnNumber(m[1]!) > target) {
            insertAt = m.index;
            break;
          }
        }
        body = body.slice(0, insertAt) + buildCell(address, "", value) + body.slice(insertAt);
      }
      written += 1;
    }
    const open = span.selfClosing ? span.open.replace(/\/>$/, ">") : span.open;
    // Atribut spans bisa tidak lagi akurat setelah sel baru ditambahkan.
    const cleanOpen = open.replace(/\sspans="[^"]*"/, "");
    xml = xml.slice(0, span.start) + cleanOpen + body + "</row>" + xml.slice(span.end);
  }
  return { xml, written, skippedFormula };
}

/** Menghapus nilai cache dari semua sel rumus, agar Excel menghitung ulang dan data contoh tidak terbawa. */
export function stripFormulaCaches(sheetXml: string): string {
  return sheetXml.replace(CELL_RE, (full, col, row, attrs, _tail, inner) => {
    if (!inner || !inner.includes("<f")) return full;
    const cleanAttrs = String(attrs).replace(/\st="[^"]*"/, "");
    const cleanInner = String(inner).replace(/<v>[\s\S]*?<\/v>|<v\/>/g, "");
    return `<c r="${col}${row}"${cleanAttrs}>${cleanInner}</c>`;
  });
}

export class XlsxWorkbook {
  private constructor(private zip: JSZip, private sheetPaths: Map<string, string>) {}

  static async load(data: Buffer | Uint8Array): Promise<XlsxWorkbook> {
    const zip = await JSZip.loadAsync(data);
    const workbook = await zip.file("xl/workbook.xml")!.async("string");
    const rels = await zip.file("xl/_rels/workbook.xml.rels")!.async("string");
    const targets = new Map<string, string>();
    for (const m of Array.from(rels.matchAll(/<Relationship [^>]*?Id="([^"]+)"[^>]*?Target="([^"]+)"/g))) targets.set(m[1]!, m[2]!);
    for (const m of Array.from(rels.matchAll(/<Relationship [^>]*?Target="([^"]+)"[^>]*?Id="([^"]+)"/g))) targets.set(m[2]!, m[1]!);
    const sheetPaths = new Map<string, string>();
    for (const m of Array.from(workbook.matchAll(/<sheet [^>]*?name="([^"]+)"[^>]*?r:id="([^"]+)"/g))) {
      const name = m[1]!.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
      const target = targets.get(m[2]!);
      if (target) sheetPaths.set(name, target.startsWith("/") ? target.slice(1) : `xl/${target}`);
    }
    return new XlsxWorkbook(zip, sheetPaths);
  }

  sheetNames(): string[] {
    return Array.from(this.sheetPaths.keys());
  }

  private pathFor(sheet: string): string {
    const path = this.sheetPaths.get(sheet);
    if (!path) throw new Error(`Sheet tidak ditemukan: ${sheet}`);
    return path;
  }

  async readSheet(sheet: string): Promise<string> {
    return this.zip.file(this.pathFor(sheet))!.async("string");
  }

  async write(sheet: string, cells: Record<string, CellValue>, options: { overwriteFormulas?: boolean } = {}): Promise<WriteResult> {
    const path = this.pathFor(sheet);
    const result = writeCells(await this.zip.file(path)!.async("string"), cells, options);
    this.zip.file(path, result.xml);
    return { written: result.written, skippedFormula: result.skippedFormula };
  }

  async transformAllSheets(fn: (xml: string) => string): Promise<void> {
    for (const path of Array.from(this.sheetPaths.values())) {
      this.zip.file(path, fn(await this.zip.file(path)!.async("string")));
    }
  }

  async transformFile(path: string, fn: (xml: string) => string): Promise<void> {
    const file = this.zip.file(path);
    if (file) this.zip.file(path, fn(await file.async("string")));
  }

  /** Meminta Excel menghitung ulang semua rumus saat file dibuka. */
  async forceRecalculation(): Promise<void> {
    await this.transformFile("xl/workbook.xml", xml =>
      /<calcPr\b/.test(xml)
        ? xml.replace(/<calcPr\b([^>]*?)\s*(\/?)>/, (_m, attrs: string, slash: string) =>
            `<calcPr${attrs.replace(/\sfullCalcOnLoad="[^"]*"/, "")} fullCalcOnLoad="1"${slash ? "/" : ""}>`)
        : xml.replace("</workbook>", '<calcPr fullCalcOnLoad="1"/></workbook>'),
    );
  }

  async toBuffer(): Promise<Buffer> {
    return this.zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  }
}
