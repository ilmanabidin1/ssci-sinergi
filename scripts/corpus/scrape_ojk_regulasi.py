#!/usr/bin/env python3
"""Download OJK regulations that matter for BPRS and turn them into text.

The regulation search at https://www.ojk.go.id/id/regulasi/Default.aspx is an
ASP.NET form. This script submits one title search per entry in QUERIES,
walks the result pages, keeps the regulations that pass the entry's filter,
then opens each regulation page and downloads its PDF attachments into
corpus/raw/ojk/. Text goes to corpus/ojk/<regulation>/ with an entry in
manifest.jsonl.

The site does not say whether a regulation is still in force. Old and
replaced regulations are downloaded too; check the status before citing one.

Usage:
    python3 scripts/corpus/scrape_ojk_regulasi.py              # everything
    python3 scripts/corpus/scrape_ojk_regulasi.py --list       # only print what would be taken
    python3 scripts/corpus/scrape_ojk_regulasi.py --limit 5    # quick trial
    python3 scripts/corpus/scrape_ojk_regulasi.py --ocr        # OCR scanned PDFs
"""

from __future__ import annotations

import argparse
import datetime
import html
import re
import urllib.parse

import common
from common import log

BASE = "https://www.ojk.go.id"
SEARCH_URL = f"{BASE}/id/regulasi/Default.aspx"
FORM = "ctl00$PlaceHolderMain$ctl01$"
OUT_DIR = common.CORPUS_DIR / "ojk"
RAW_DIR = common.RAW_DIR / "ojk"
MANIFEST = OUT_DIR / "manifest.jsonl"
MAX_PDF_BYTES = 40 * 1024 * 1024

# One title search per entry. A result is kept when its title matches `title`
# (if given) and its sector label contains `sector` (if given).
#   core        written for BPRS
#   supporting  sharia banking in general, read with care for BPRS
#   general     applies to every financial institution, BPRS included
QUERIES = [
    {"term": "Bank Perekonomian Rakyat Syariah", "relevance": "core"},
    {"term": "Bank Pembiayaan Rakyat Syariah", "relevance": "core"},
    {"term": "BPRS", "relevance": "core"},
    {"term": "Perbankan Syariah", "relevance": "supporting"},
    {"term": "Bank Syariah", "relevance": "supporting"},
    {"term": "Dewan Pengawas Syariah", "relevance": "supporting", "sector": "Perbankan"},
    {"term": "Akad", "relevance": "supporting", "title": r"\bakad\b"},
    {"term": "Pelindungan Konsumen", "relevance": "general"},
    {"term": "Perlindungan Konsumen", "relevance": "general"},
    {"term": "Keuangan Berkelanjutan", "relevance": "general"},
    {"term": "Sistem Layanan Informasi Keuangan", "relevance": "general"},
    {"term": "Anti Pencucian Uang", "relevance": "general"},
    {"term": "Layanan Pengaduan", "relevance": "general"},
]
# Titles about other industries. Checked only for "supporting" and "general"
# results, so a regulation written for BPRS is never dropped by this.
EXCLUDE_TITLE = re.compile(
    r"pasar modal|efek syariah|non-?bank|lembaga keuangan mikro|perusahaan pembiayaan|"
    r"urun dana|pinjam meminjam|bagi bank umum|uji kemampuan dan kepatutan|"
    r"komite perbankan syariah|jaringan kantor|sinergi perbankan|produk investasi",
    re.I,
)
EXCLUDE_TYPE = ("Peraturan Bapepam", "Klasifikasi Bapepam")
RELEVANCE_ORDER = {"core": 0, "supporting": 1, "general": 2}
TYPE_SHORT = {
    "Peraturan OJK": "pojk",
    "Surat Edaran OJK": "seojk",
    "Peraturan ADK": "padk",
    "Undang-Undang": "uu",
    "Peraturan Pemerintah": "pp",
    "PPBI": "pbi",
    "SEBI": "sebi",
}


def hidden_fields(page: str) -> dict[str, str]:
    fields = {}
    for tag in re.findall(r'<input[^>]*type="hidden"[^>]*>', page):
        name = re.search(r'name="([^"]*)"', tag)
        value = re.search(r'value="([^"]*)"', tag)
        if name:
            fields[name.group(1)] = html.unescape(value.group(1)) if value else ""
    return fields


def parse_results(page: str) -> list[dict]:
    """Rows of a search result page."""
    rows = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", page, flags=re.S):
        link = re.search(r'href="(/id/regulasi/Pages/[^"]+)"[^>]*>(.*?)</a>', row, flags=re.S)
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row, flags=re.S)
        if not link or not cells:
            continue
        caption = re.search(r'class="caption"[^>]*>(.*?)</div>', row, flags=re.S)
        parts = [part.strip() for part in common.strip_tags(caption.group(1)).split("•")] if caption else []
        parts += [""] * (3 - len(parts))
        rows.append(
            {
                "number": common.strip_tags(cells[0]),
                "title": common.strip_tags(link.group(2)),
                "page_url": BASE + html.unescape(link.group(1)),
                "type": parts[0],
                "sector": parts[1],
            }
        )
    return rows


def next_page_target(page: str) -> str | None:
    """Postback target of the page after the current one, if there is one."""
    pager = re.search(r'DataPagerArticles" class="pagination">(.*?)</span>\s*</nav>', page, flags=re.S)
    current = re.search(r'currentPagingButton">(\d+)<', page)
    if not pager or not current:
        return None
    wanted = str(int(current.group(1)) + 1)
    for target, label in re.findall(
        r"__doPostBack\(&#39;([^&]+)&#39;,&#39;&#39;\)\">([^<]*)</a>", pager.group(1)
    ):
        if label.strip() == wanted:
            return target
    return None


def search(fetcher: common.Fetcher, term: str) -> list[dict]:
    filters = {
        FORM + "DropDownListSektor": "0",
        FORM + "DropDownListSubSektor": "0",
        FORM + "DropDownListJenisRegulasi": "0",
        FORM + "DropDownListTahun": "0",
        FORM + "TextBoxJudul": term,
        FORM + "TextBoxNomor": "",
    }
    fields = hidden_fields(fetcher.text(SEARCH_URL))
    page = fetcher.text(SEARCH_URL, {**fields, **filters, FORM + "ButtonSearch": "Cari Regulasi"})
    if "__VIEWSTATE" not in page:
        raise RuntimeError(f"halaman pencarian OJK tidak dikenali untuk \"{term}\"")
    rows = parse_results(page)
    # 60 pages of 10 is far more than any title search here returns.
    for _ in range(60):
        target = next_page_target(page)
        if not target:
            break
        fields = hidden_fields(page)
        page = fetcher.text(SEARCH_URL, {**fields, **filters, "__EVENTTARGET": target, "__EVENTARGUMENT": ""})
        if "__VIEWSTATE" not in page:
            raise RuntimeError(f"halaman hasil OJK tidak dikenali untuk \"{term}\"")
        rows.extend(parse_results(page))
    return rows


def passes(row: dict, query: dict) -> bool:
    if query["term"].lower() not in row["title"].lower():
        return False
    if "sector" in query and query["sector"].lower() not in row["sector"].lower():
        return False
    if "title" in query and not re.search(query["title"], row["title"], flags=re.I):
        return False
    if query["relevance"] != "core":
        if EXCLUDE_TITLE.search(row["title"]) or row["type"] in EXCLUDE_TYPE:
            return False
    return True


def collect(fetcher: common.Fetcher) -> list[dict]:
    """Run every query and merge the results, keeping the strongest relevance."""
    found: dict[str, dict] = {}
    for query in QUERIES:
        rows = fetcher.with_fresh_session(lambda: search(fetcher, query["term"]), query["term"])
        kept = [row for row in rows if passes(row, query)]
        log(f"cari \"{query['term']}\": {len(rows)} hasil, {len(kept)} diambil")
        for row in kept:
            known = found.get(row["page_url"])
            if known and RELEVANCE_ORDER[known["relevance"]] <= RELEVANCE_ORDER[query["relevance"]]:
                continue
            found[row["page_url"]] = {**row, "relevance": query["relevance"], "matched_query": query["term"]}
    return sorted(found.values(), key=lambda row: (RELEVANCE_ORDER[row["relevance"]], row["page_url"]))


def parse_detail(page: str) -> dict:
    """Metadata and attachment links of a regulation page."""

    def field(css_class: str) -> str:
        match = re.search(rf'class="{css_class}[^"]*"[^>]*>(.*?)</span>', page, flags=re.S)
        return common.strip_tags(match.group(1)) if match else ""

    effective = None
    date = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", field("display-date-text"))
    if date:
        month, day, year = (int(part) for part in date.groups())
        effective = f"{year:04d}-{month:02d}-{day:02d}"

    attachments, seen = [], set()
    for link, label in re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', page, flags=re.S):
        link = html.unescape(link)
        if "/Documents/" not in link or not re.search(r"\.\w{2,5}$", link.split("?")[0]):
            continue
        url = urllib.parse.urljoin(BASE, urllib.parse.quote(urllib.parse.unquote(link), safe="/:?=&%"))
        if url in seen:
            continue
        seen.add(url)
        name = urllib.parse.unquote(link.split("?")[0].rsplit("/", 1)[-1])
        attachments.append({"name": name, "label": common.strip_tags(label) or name, "url": url})
    return {
        "sector": field("sektor-regulasi-display"),
        "subsector": field("subsektor-regulasi-display"),
        "type": field("jenis-regulasi-display"),
        "number": re.sub(r"\s+/", "/", field("nomor-regulasi-display")),
        "effective_date": effective,
        "attachments": attachments,
    }


def folder_name(row: dict, taken: set[str]) -> str:
    short = TYPE_SHORT.get(row["type"], common.slugify(row["type"] or "regulasi", 12))
    number = common.slugify(re.sub(r"(?i)^(pojk|seojk|padk)\s*", "", row["number"]), 30)
    name = f"{short}-{number}-{common.slugify(row['title'], 60)}"
    if name in taken:
        name = common.slugify(row["page_url"].rsplit("/", 1)[-1].removesuffix(".aspx"), 110)
    taken.add(name)
    return name


def process(fetcher: common.Fetcher, row: dict, folder: str, previous: dict, ocr: bool) -> dict:
    detail = parse_detail(
        fetcher.with_fresh_session(lambda: fetcher.text(row["page_url"]), row["page_url"])
    )
    entry = {
        "id": "ojk-" + folder,
        "source": "ojk",
        "type": detail["type"] or row["type"],
        "number": detail["number"] or row["number"],
        "title": row["title"],
        "sector": detail["sector"] or row["sector"],
        "subsector": detail["subsector"],
        "effective_date": detail["effective_date"],
        "year": int(detail["effective_date"][:4]) if detail["effective_date"] else None,
        "relevance": row["relevance"],
        "matched_query": row["matched_query"],
        "page_url": row["page_url"],
        "status": "ok",
        "files": [],
    }
    old_files = {item["url"]: item for item in previous.get("files", [])}
    for index, attachment in enumerate(detail["attachments"], 1):
        item = {"name": attachment["name"], "url": attachment["url"], "status": "ok"}
        entry["files"].append(item)
        if not attachment["name"].lower().endswith(".pdf"):
            item["status"] = "skipped_not_pdf"
            continue
        stem = f"{index:02d}-{common.slugify(attachment['name'].rsplit('.', 1)[0], 80)}"
        pdf_path = RAW_DIR / folder / f"{stem}.pdf"
        try:
            if pdf_path.exists() and common.is_pdf(pdf_path):
                item["fetched_at"] = old_files.get(attachment["url"], {}).get("fetched_at")
            else:
                payload, _ = fetcher.with_fresh_session(
                    lambda: fetcher.bytes(attachment["url"], MAX_PDF_BYTES), attachment["name"]
                )
                if not payload.startswith(b"%PDF-"):
                    raise ValueError("bukan berkas PDF")
                pdf_path.parent.mkdir(parents=True, exist_ok=True)
                pdf_path.write_bytes(payload)
                item["fetched_at"] = datetime.date.today().isoformat()
            text_path = OUT_DIR / folder / f"{stem}.txt"
            old = old_files.get(attachment["url"], {})
            if common.reusable(old, text_path, ocr):
                for key in ("text_file", "pages", "chars", "text_quality", "sha256"):
                    item[key] = old.get(key)
                continue
            extracted = common.pdf_to_text(pdf_path, ocr=ocr)
            common.write_document(
                text_path,
                {
                    "Sumber": "Otoritas Jasa Keuangan (ojk.go.id)",
                    "Jenis": entry["type"],
                    "Nomor": entry["number"],
                    "Tentang": entry["title"],
                    "Berkas": attachment["name"],
                    "Tautan": row["page_url"],
                },
                extracted["text"],
            )
            item.update(
                text_file=str(text_path.relative_to(common.CORPUS_DIR)),
                pages=extracted["pages"],
                chars=len(extracted["text"]),
                text_quality=extracted["quality"],
                sha256=common.sha256_file(pdf_path),
            )
        except common.TooLarge as exc:
            item.update(status="skipped_too_large", bytes=exc.size)
        except Exception as exc:  # one broken attachment must not stop the run
            item.update(status="failed", error=str(exc))
    if not any(item["status"] == "ok" for item in entry["files"]):
        entry["status"] = "no_text"
    return entry


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--list", action="store_true", help="hanya tampilkan regulasi yang akan diambil")
    parser.add_argument("--limit", type=int, help="hanya proses N regulasi pertama")
    parser.add_argument("--ocr", action="store_true", help="OCR untuk PDF hasil scan")
    parser.add_argument("--delay", type=float, default=2.0, help="jeda antar permintaan (detik)")
    args = parser.parse_args()

    common.require_poppler()
    if args.ocr and not common.ocr_available():
        raise SystemExit("--ocr butuh tesseract. Pasang paket tesseract-ocr.")
    fetcher = common.Fetcher(delay=args.delay)
    rows = collect(fetcher)
    log(f"{len(rows)} regulasi lolos saringan")
    if args.list:
        for row in rows:
            print(f"{row['relevance']:<10} {row['type']:<17} {row['number']:<22} {row['title']}")
        return
    if args.limit:
        rows = rows[: args.limit]

    previous = common.load_manifest(MANIFEST)
    entries, taken = [], set()
    for index, row in enumerate(rows, 1):
        folder = folder_name(row, taken)
        try:
            entry = process(fetcher, row, folder, previous.get("ojk-" + folder, {}), args.ocr)
        except Exception as exc:  # one broken page must not stop the run
            entry = {**row, "id": "ojk-" + folder, "source": "ojk", "status": "failed", "error": str(exc), "files": []}
        done = sum(1 for item in entry["files"] if item["status"] == "ok")
        log(f"[{index}/{len(rows)}] {entry['status']} {done}/{len(entry['files'])} berkas: {row['number']} {row['title'][:70]}")
        entries.append(entry)

    # A --limit run must not drop entries collected by an earlier full run.
    seen = {entry["id"] for entry in entries}
    entries.extend(entry for key, entry in previous.items() if key not in seen)
    entries.sort(key=lambda entry: (RELEVANCE_ORDER.get(entry.get("relevance"), 9), entry["id"]))
    common.write_manifest(MANIFEST, entries)
    ok = sum(1 for entry in entries if entry["status"] == "ok")
    log(f"selesai: {ok} regulasi berisi teks, {len(entries) - ok} tanpa teks atau gagal")


if __name__ == "__main__":
    main()
