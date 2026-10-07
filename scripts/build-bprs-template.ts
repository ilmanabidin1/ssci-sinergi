/**
 * Membuat template Excel BPRS yang bersih dari file contoh BPRS.
 *
 *   npx tsx scripts/build-bprs-template.ts <file-asli.xlsx>
 *
 * Semua sel isian dikosongkan, nilai cache rumus dihapus, dan teks yang tidak
 * lagi dipakai di sharedStrings diganti kosong, sehingga data nasabah contoh
 * tidak ikut tersimpan di repositori.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { FLUKTUATIF_INPUT_CELLS, FLUKTUATIF_TEMPLATE_PATH } from "../server/bprsExcel";
import { XlsxWorkbook, stripFormulaCaches } from "../server/xlsxPatch";

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error("Pakai: npx tsx scripts/build-bprs-template.ts <file-asli.xlsx>");
  const workbook = await XlsxWorkbook.load(await readFile(source));

  for (const [sheet, cells] of Object.entries(FLUKTUATIF_INPUT_CELLS)) {
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
  await workbook.forceRecalculation();
  await mkdir(dirname(FLUKTUATIF_TEMPLATE_PATH), { recursive: true });
  await writeFile(FLUKTUATIF_TEMPLATE_PATH, await workbook.toBuffer());
  console.log(`Template ditulis ke ${FLUKTUATIF_TEMPLATE_PATH} (${blanked} teks contoh dikosongkan)`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
