"""Shared helpers for the corpus scrapers: polite HTTP, PDF text, manifest.

Standard library only. PDF text needs the `pdftotext` and `pdfinfo` commands
(package `poppler-utils`). OCR of scanned PDFs is optional and needs `tesseract`
(package `tesseract-ocr`).
"""

from __future__ import annotations

import concurrent.futures
import hashlib
import html
import http.cookiejar
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CORPUS_DIR = REPO_ROOT / "corpus"
RAW_DIR = CORPUS_DIR / "raw"

USER_AGENT = "Mozilla/5.0 (compatible; ssci-corpus-builder; academic research)"
# Below this many characters per page a PDF is treated as a scan without text.
MIN_CHARS_PER_PAGE = 200


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


class Fetcher:
    """HTTP client that waits between requests and retries transient errors."""

    def __init__(self, delay: float = 1.5, timeout: int = 120, retries: int = 5):
        self.delay = delay
        self.timeout = timeout
        self.retries = retries
        self._last = 0.0
        self._opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        self._opener.addheaders = [("User-Agent", USER_AGENT)]

    def _wait(self) -> None:
        pause = self.delay - (time.monotonic() - self._last)
        if pause > 0:
            time.sleep(pause)
        self._last = time.monotonic()

    def open(self, url: str, data: dict | None = None):
        body = urllib.parse.urlencode(data).encode() if data is not None else None
        error: Exception | None = None
        for attempt in range(self.retries):
            self._wait()
            try:
                return self._opener.open(url, body, timeout=self.timeout)
            except urllib.error.HTTPError as exc:
                # A missing page will not appear on retry; a busy server might.
                if exc.code < 500 and exc.code != 429:
                    raise
                error = exc
            except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
                error = exc
            time.sleep(2 ** (attempt + 1))
        raise RuntimeError(f"gagal mengambil {url}: {error}")

    def text(self, url: str, data: dict | None = None) -> str:
        payload, _ = self._read(url, data, None)
        return payload.decode("utf-8", "replace")

    def bytes(self, url: str, max_bytes: int | None = None) -> tuple[bytes, str]:
        """Return the body and its content type. Raises if larger than max_bytes."""
        return self._read(url, None, max_bytes)

    def _read(self, url: str, data: dict | None, max_bytes: int | None) -> tuple[bytes, str]:
        # Some sites answer 200 with a short firewall page now and then.
        # Treating that as content would silently drop results, so retry.
        for attempt in range(self.retries):
            with self.open(url, data) as response:
                content_type = response.headers.get("Content-Type", "")
                length = response.headers.get("Content-Length")
                if max_bytes and length and int(length) > max_bytes:
                    raise TooLarge(int(length))
                payload = response.read(max_bytes + 1) if max_bytes else response.read()
            if max_bytes and len(payload) > max_bytes:
                raise TooLarge(len(payload))
            if not (len(payload) < 2000 and b"Request Rejected" in payload):
                return payload, content_type
            log(f"ditolak firewall, coba lagi ({attempt + 1}/{self.retries}): {url}")
            time.sleep(30 * 2**attempt)
        raise RuntimeError(f"terus ditolak firewall: {url}")


class TooLarge(Exception):
    def __init__(self, size: int):
        super().__init__(f"berkas terlalu besar ({size} byte)")
        self.size = size


def strip_tags(fragment: str) -> str:
    """HTML fragment to plain text on one line."""
    text = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def slugify(text: str, max_length: int = 70) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug[:max_length].rstrip("-") or "tanpa-judul"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_pdf(path: Path) -> bool:
    with path.open("rb") as handle:
        return handle.read(5) == b"%PDF-"


def require_poppler() -> None:
    missing = [tool for tool in ("pdftotext", "pdfinfo", "pdfimages") if not shutil.which(tool)]
    if missing:
        sys.exit(
            f"Perintah {', '.join(missing)} tidak ditemukan. "
            "Pasang poppler-utils (Ubuntu: sudo apt-get install poppler-utils)."
        )


def pdf_pages(path: Path) -> int:
    result = subprocess.run(["pdfinfo", str(path)], capture_output=True, text=True)
    match = re.search(r"^Pages:\s+(\d+)", result.stdout, flags=re.M)
    return int(match.group(1)) if match else 0


def clean_text(text: str) -> str:
    """Drop form feeds and trailing spaces, and collapse runs of blank lines."""
    lines = [line.rstrip() for line in text.replace("\f", "\n").splitlines()]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip() + "\n"


def is_scanned(path: Path, pages: int) -> bool:
    """True when most pages are a single large image, i.e. a scanned document."""
    result = subprocess.run(["pdfimages", "-list", str(path)], capture_output=True, text=True)
    scanned_pages = set()
    for line in result.stdout.splitlines()[2:]:
        parts = line.split()
        if len(parts) > 4 and parts[3].isdigit() and parts[4].isdigit():
            if int(parts[3]) * int(parts[4]) >= 1_500_000:
                scanned_pages.add(parts[0])
    return pages > 0 and len(scanned_pages) >= 0.7 * pages


def ocr_available() -> bool:
    return bool(shutil.which("tesseract") and shutil.which("pdftoppm"))


# Tesseract's Indonesian model never outputs the letter "q", so qardh, fiqh
# and Q.S. come out as gardh, figh and O.S. The English model reads the same
# Latin text without that defect.
OCR_LANGUAGE = "eng"


def ocr_pdf(path: Path) -> str:
    """Render each page at 300 dpi and read it with Tesseract."""
    language = OCR_LANGUAGE
    with tempfile.TemporaryDirectory() as folder:
        subprocess.run(
            ["pdftoppm", "-r", "300", "-gray", "-png", str(path), f"{folder}/page"],
            check=True,
            capture_output=True,
        )
        images = sorted(Path(folder).glob("page-*.png"))

        def read(image: Path) -> str:
            # One thread per process: pages already run in parallel, and
            # Tesseract's own threads on top of that make it many times slower.
            try:
                done = subprocess.run(
                    ["tesseract", str(image), "stdout", "-l", language, "--psm", "3"],
                    capture_output=True,
                    env={**os.environ, "OMP_THREAD_LIMIT": "1"},
                    timeout=300,
                )
            except subprocess.TimeoutExpired:
                return ""
            return done.stdout.decode("utf-8", "replace")

        with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count() or 2) as pool:
            return "\f".join(pool.map(read, images))


def pdf_to_text(path: Path, ocr: bool = False) -> dict:
    """Extract text from a PDF.

    Returns {"text", "pages", "quality"}. Quality is:
      "text"          the PDF was produced digitally, text is exact
      "ocr"           a scan, read again here with Tesseract
      "embedded_ocr"  a scan, text comes from the OCR layer stored in the PDF
                      (often poor); run with --ocr to read it again
      "needs_ocr"     a scan without any text; run with --ocr
    """
    pages = pdf_pages(path)
    text = _run_pdftotext(path)
    has_text = len(text.strip()) >= MIN_CHARS_PER_PAGE * max(pages, 1)
    scanned = is_scanned(path, pages)
    quality = "text"
    if scanned or not has_text:
        quality = "embedded_ocr" if has_text else "needs_ocr"
        if ocr and ocr_available():
            text = ocr_pdf(path)
            quality = "ocr"
    return {"text": clean_text(text), "pages": pages, "quality": quality}


def reusable(previous: dict, text_path: Path, ocr: bool) -> bool:
    """True when an earlier run already produced this text file.

    Saves reading the PDF again, which matters for OCR. A file that still
    needs OCR is redone when this run has --ocr.
    """
    quality = previous.get("text_quality")
    if previous.get("status") != "ok" or not text_path.exists():
        return False
    return quality in ("text", "ocr") or (not ocr and quality is not None)


def _run_pdftotext(path: Path) -> str:
    result = subprocess.run(
        ["pdftotext", "-enc", "UTF-8", str(path), "-"], capture_output=True
    )
    return result.stdout.decode("utf-8", "replace")


def load_manifest(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    entries = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            entry = json.loads(line)
            entries[entry["id"]] = entry
    return entries


def write_manifest(path: Path, entries: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [json.dumps(entry, ensure_ascii=False, sort_keys=True) for entry in entries]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_document(path: Path, header: dict[str, str], body: str) -> None:
    """Write a text file that opens with a short provenance header."""
    path.parent.mkdir(parents=True, exist_ok=True)
    head = "\n".join(f"{key}: {value}" for key, value in header.items() if value)
    path.write_text(f"{head}\n\n---\n\n{body}", encoding="utf-8")
