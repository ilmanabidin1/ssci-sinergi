#!/usr/bin/env python3
"""Download every DSN-MUI fatwa and turn it into text.

The fatwa list at https://dsnmui.or.id/kategori/fatwa/ is a table of
number, title and a Google Drive link to the PDF. This script walks all
pages of that table, downloads each PDF once into corpus/raw/dsn-mui/,
and writes the text to corpus/dsn-mui/ with an entry in manifest.jsonl.

Usage:
    python3 scripts/corpus/scrape_dsn_fatwa.py            # everything
    python3 scripts/corpus/scrape_dsn_fatwa.py --limit 5  # quick trial
    python3 scripts/corpus/scrape_dsn_fatwa.py --ocr      # OCR scanned PDFs
"""

from __future__ import annotations

import argparse
import datetime
import html
import re
import urllib.parse

import common
from common import log

LIST_URL = "https://dsnmui.or.id/kategori/fatwa/"
OUT_DIR = common.CORPUS_DIR / "dsn-mui"
RAW_DIR = common.RAW_DIR / "dsn-mui"
MANIFEST = OUT_DIR / "manifest.jsonl"
MAX_PDF_BYTES = 60 * 1024 * 1024

# Relevance to BPRS financing. "other" wins over "core", so a sukuk fatwa that
# mentions ijarah is not treated as a financing contract.
OTHER_TOPICS = re.compile(
    r"pasar modal|saham|obligasi|sukuk|reksa ?dana|efek|surat berharga|sbsn|sbis|"
    r"sertifikat (bank indonesia|wadi|investasi|deposito)|bursa|etf|exchange traded|"
    r"asuransi|tabarru|reasuransi|pensiun|anuitas|rumah sakit|pariwisata|"
    r"penjualan langsung|plbs|pasar uang|antarbank|bulion|komoditi|letter of credit|l/c|"
    r"lembaga penjamin simpanan|penjaminan syariah|kartu|waran|hmetd|"
    r"repo|lindung nilai|hedging|dana haji|bpjs|jaminan sosial|"
    r"uang elektronik|teknologi informasi|anjak piutang|pembiayaan sindikasi|"
    r"likuiditas|pedagang kaki lima|properti inden",
    re.I,
)
CORE_TOPICS = re.compile(
    r"murabahah|salam|istishna|mudharabah|musyarakah|syirkah|ijarah|multijasa|"
    r"wakalah|kafalah|hawalah|qardh|rahn|ju.?alah|wadi.?ah|sharf|"
    r"giro|tabungan|deposito|jual beli|akad|janji|wa.?d|ta.?widh|ganti rugi|"
    r"sanksi|uang muka|diskon|potongan|pelunasan|penyelesaian piutang|"
    r"penjadwalan|konversi|agunan|jaminan|pembiayaan|restrukturisasi|"
    r"tanggung renteng|pencadangan|bagi hasil|keuntungan|biaya|denda|"
    r"line facility|rekening koran|pengalihan utang|novasi|subrogasi",
    re.I,
)


def classify(title: str) -> str:
    """Return "core", "other" or "supporting" from a fatwa title."""
    if OTHER_TOPICS.search(title):
        return "other"
    if CORE_TOPICS.search(title):
        return "core"
    return "supporting"


def parse_number(label: str) -> tuple[int | None, int | None]:
    """"167/DSN-MUI/IX/2026" -> (167, 2026)."""
    match = re.match(r"\s*(\d+)\s*/", label)
    year = re.search(r"(19|20)\d{2}", label)
    return (int(match.group(1)) if match else None, int(year.group(0)) if year else None)


def drive_file_id(url: str) -> str | None:
    match = re.search(r"/file/d/([\w-]+)", url) or re.search(r"[?&]id=([\w-]+)", url)
    return match.group(1) if match else None


def parse_list_page(page: str) -> list[dict]:
    """Rows of the fatwa table: number label, title and document link."""
    rows = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", page, flags=re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row, flags=re.S)
        if len(cells) < 2 or "DSN" not in common.strip_tags(cells[0]).upper():
            continue
        link = re.search(r'href="([^"]+)"', row)
        rows.append(
            {
                "label": common.strip_tags(cells[0]),
                "title": common.strip_tags(cells[1]),
                "url": html.unescape(link.group(1)) if link else None,
            }
        )
    return rows


def last_page(page: str) -> int:
    numbers = [int(n) for n in re.findall(r"/kategori/fatwa/page/(\d+)/", page)]
    return max(numbers, default=1)


def collect_list(fetcher: common.Fetcher) -> list[dict]:
    first = fetcher.text(LIST_URL)
    rows = parse_list_page(first)
    total = last_page(first)
    for number in range(2, total + 1):
        rows.extend(parse_list_page(fetcher.text(f"{LIST_URL}page/{number}/")))
        log(f"daftar fatwa: halaman {number}/{total}")
    return rows


def download_pdf(fetcher: common.Fetcher, url: str, target) -> None:
    """Save the PDF behind a Drive share link or a direct link."""
    file_id = drive_file_id(url) if "google.com" in url else None
    if file_id:
        # Links shared before 2021 only work with their resource key.
        key = re.search(r"resourcekey=([\w-]+)", url)
        url = f"https://drive.usercontent.google.com/download?id={file_id}&export=download"
        if key:
            url += f"&resourcekey={key.group(1)}"
    payload, _ = fetcher.bytes(url, MAX_PDF_BYTES)
    if file_id and not payload.startswith(b"%PDF-"):
        # Drive shows a confirmation form for files it cannot scan for viruses.
        form = payload.decode("utf-8", "replace")
        fields = dict(re.findall(r'<input type="hidden" name="([^"]+)" value="([^"]*)"', form))
        if "confirm" in fields:
            query = urllib.parse.urlencode(fields)
            payload, _ = fetcher.bytes(
                f"https://drive.usercontent.google.com/download?{query}", MAX_PDF_BYTES
            )
    if not payload.startswith(b"%PDF-"):
        raise ValueError("tautan tidak mengembalikan berkas PDF")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--limit", type=int, help="hanya proses N fatwa pertama")
    parser.add_argument("--ocr", action="store_true", help="OCR untuk PDF hasil scan")
    parser.add_argument("--delay", type=float, default=1.5, help="jeda antar permintaan (detik)")
    args = parser.parse_args()

    common.require_poppler()
    if args.ocr and not common.ocr_available():
        raise SystemExit("--ocr butuh tesseract. Pasang paket tesseract-ocr.")
    fetcher = common.Fetcher(delay=args.delay)
    previous = common.load_manifest(MANIFEST)
    rows = collect_list(fetcher)
    log(f"{len(rows)} fatwa ditemukan di daftar")
    if args.limit:
        rows = rows[: args.limit]

    entries = []
    for index, row in enumerate(rows, 1):
        number, year = parse_number(row["label"])
        doc_id = f"dsn-mui-{number:03d}" if number else f"dsn-mui-{common.slugify(row['label'])}"
        name = f"fatwa-{number:03d}-{common.slugify(row['title'])}" if number else doc_id
        entry = {
            "id": doc_id,
            "source": "dsn-mui",
            "type": "fatwa",
            "number": row["label"],
            "fatwa_number": number,
            "year": year,
            "title": row["title"],
            "relevance": classify(row["title"]),
            # The list marks replaced fatwas in the title itself.
            "revoked": bool(re.search(r"tidak berlaku", row["title"], flags=re.I)),
            "page_url": LIST_URL,
            "file_url": row["url"],
            "status": "ok",
        }
        pdf_path = RAW_DIR / f"{name}.pdf"
        try:
            if not row["url"]:
                raise ValueError("baris tanpa tautan dokumen")
            if not (pdf_path.exists() and common.is_pdf(pdf_path)):
                download_pdf(fetcher, row["url"], pdf_path)
                entry["fetched_at"] = datetime.date.today().isoformat()
            else:
                entry["fetched_at"] = previous.get(doc_id, {}).get("fetched_at")
            text_path = OUT_DIR / f"{name}.txt"
            old = previous.get(doc_id, {})
            if common.reusable(old, text_path, args.ocr):
                for key in ("text_file", "pages", "chars", "text_quality", "sha256"):
                    entry[key] = old.get(key)
                log(f"[{index}/{len(rows)}] {row['label']} sudah ada")
                entries.append(entry)
                continue
            extracted = common.pdf_to_text(pdf_path, ocr=args.ocr)
            common.write_document(
                text_path,
                {
                    "Sumber": "Dewan Syariah Nasional MUI (dsnmui.or.id)",
                    "Nomor": f"Fatwa DSN-MUI No. {row['label']}",
                    "Tentang": row["title"],
                    "Tautan": row["url"],
                },
                extracted["text"],
            )
            entry.update(
                text_file=str(text_path.relative_to(common.CORPUS_DIR)),
                pages=extracted["pages"],
                chars=len(extracted["text"]),
                text_quality=extracted["quality"],
                sha256=common.sha256_file(pdf_path),
            )
        except Exception as exc:  # one broken link must not stop the run
            entry["status"] = "failed"
            entry["error"] = str(exc)
        log(f"[{index}/{len(rows)}] {row['label']} {entry['status']} {entry.get('text_quality', '')}")
        entries.append(entry)

    # A --limit run must not drop entries collected by an earlier full run.
    seen = {entry["id"] for entry in entries}
    entries.extend(entry for key, entry in previous.items() if key not in seen)
    entries.sort(key=lambda entry: (entry.get("fatwa_number") or 0, entry["id"]))
    common.write_manifest(MANIFEST, entries)

    failed = [entry for entry in entries if entry["status"] != "ok"]
    scans = [e for e in entries if e.get("text_quality") in ("needs_ocr", "embedded_ocr")]
    log(f"selesai: {len(entries) - len(failed)} berhasil, {len(failed)} gagal, {len(scans)} belum di-OCR ulang")


if __name__ == "__main__":
    main()
