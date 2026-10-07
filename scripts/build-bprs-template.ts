/**
 * Membuat template Excel BPRS yang bersih dari file contoh BPRS.
 *
 *   npx tsx scripts/build-bprs-template.ts fluktuatif <file-asli.xlsx>
 *   npx tsx scripts/build-bprs-template.ts fix_income <file-asli.xlsx>
 *
 * Semua sel isian dikosongkan, nilai cache rumus dihapus, teks yang tidak lagi
 * dipakai di sharedStrings diganti kosong, dan path tautan eksternal (yang bisa
 * memuat nama nasabah atau pegawai) dinetralkan, sehingga data contoh tidak ikut
 * tersimpan di repositori.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { BPRS_TEMPLATES } from "../server/bprsExcel";
import { XlsxWorkbook, stripFormulaCaches } from "../server/xlsxPatch";

async function main() {
  const [kind, source] = process.argv.slice(2);
  const spec = BPRS_TEMPLATES[kind as keyof typeof BPRS_TEMPLATES];
  if (!spec || !source) throw new Error("Pakai: npx tsx scripts/build-bprs-template.ts <fluktuatif|fix_income> <file-asli.xlsx>");
  const workbook = await XlsxWorkbook.load(await readFile(source));

  for (const [sheet, cells] of Object.entries(spec.inputCells)) {
    await workbook.write(sheet, Object.fromEntries(cells.map(c => [c, null])), { overwriteFormulas: true });
  }
  await workbook.transformAllSheets(stripFormulaCaches);

  const referenced = new Set<number>();
  for (const sheet of workbook.sheetNames()) {
    const xml = await workbook.readSheet(sheet);
    for (const m of Array.from(xml.matchAll(/<c [^>]*?t="s"[^>]*>\s*<v>(\d+)<\/v>/g))) referenced.add(Number(m[1]));
  }
  let blanked = 0;
  await workbook.transformFile("xl/sharedStrings.xml", xml => {
    let index = -1;
    return xml.replace(/<si>[\s\S]*?<\/si>|<si\/>/g, item => {
      index += 1;
      if (referenced.has(index)) return item;
      blanked += 1;
      return "<si><t></t></si>";
    });
  });

  // Lokasi folder asli di komputer BPRS (berisi nama pegawai) tidak perlu ikut.
  await workbook.transformFile("xl/workbook.xml", xml =>
    xml.replace(/<mc:AlternateContent\b[^>]*>(?:(?!<\/mc:AlternateContent>)[\s\S])*?x15ac:absPath[\s\S]*?<\/mc:AlternateContent>/, ""));
  for (const path of workbook.filePaths().filter(p => /^xl\/externalLinks\/_rels\/.*\.rels$/.test(p))) {
    await workbook.transformFile(path, xml => xml.replace(/Target="[^"]*"/g, 'Target="file:///tautan-eksternal.xlsx"'));
  }
  await workbook.transformFile("docProps/core.xml", xml =>
    xml.replace(/<cp:lastModifiedBy>[\s\S]*?<\/cp:lastModifiedBy>/, "<cp:lastModifiedBy>SSCI</cp:lastModifiedBy>"));
  await workbook.forceRecalculation();
  await mkdir(dirname(spec.path), { recursive: true });
  await writeFile(spec.path, await workbook.toBuffer());
  console.log(`Template ditulis ke ${spec.path} (${blanked} teks contoh dikosongkan)`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
