import PDFDocument from "pdfkit";
import { deflateSync } from "node:zlib";
import { documentLabel } from "@shared/workflow";

/**
 * Berkas contoh untuk tombol "Isi contoh dokumen" (uji coba dan demo). Isinya jelas bertanda
 * contoh dan tidak memuat data nasabah, supaya tidak pernah tertukar dengan dokumen asli.
 */

export const DEMO_DOCUMENT_PREFIX = "CONTOH-";

/** PDF satu halaman bertuliskan jenis dokumen dan keterangan bahwa ini contoh. */
export function makeSampleDocumentPdf(documentType: string, badanUsaha: boolean): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", layout: "landscape", margin: 40, info: { Title: `Dokumen contoh ${documentType}` } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(3).dash(8, { space: 6 }).stroke("#b8862b");
    doc.undash();
    doc.fillColor("#14213d").font("Helvetica-Bold").fontSize(30).text("DOKUMEN CONTOH", 40, 70, { align: "center" });
    doc.font("Helvetica-Bold").fontSize(22).fillColor("#b8862b").text(documentLabel(documentType, badanUsaha), { align: "center" });
    doc.moveDown(1.2);
    doc.font("Helvetica").fontSize(12).fillColor("#334155").text(
      "Berkas ini dibuat otomatis oleh tombol \"Isi contoh dokumen\" di SSCI untuk uji coba dan demo. Ini bukan dokumen asli nasabah dan tidak boleh dipakai sebagai dasar keputusan pembiayaan.",
      { align: "center" },
    );
    doc.end();
  });
}

/** PNG polos 640x400 bergaris diagonal, cukup untuk mewakili foto survei contoh. */
export function makeSampleSurveyPng(): Buffer {
  const width = 640;
  const height = 400;
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) {
      const stripe = Math.floor((x + y) / 40) % 2 === 0;
      const border = x < 8 || y < 8 || x >= width - 8 || y >= height - 8;
      const [r, g, b] = border ? [184, 134, 43] : stripe ? [238, 242, 248] : [214, 222, 235];
      row[1 + x * 3] = r;
      row[2 + x * 3] = g;
      row[3 + x * 3] = b;
    }
    rows.push(row);
  }
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
