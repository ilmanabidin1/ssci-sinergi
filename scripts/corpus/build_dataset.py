#!/usr/bin/env python3
"""Build fine-tune question and answer pairs from the scraped corpus.

No language model is involved: every answer is text taken from a source
document, and every question comes from the structure of that document.

  fatwa section   one pair per ruling section (Pertama, Kedua, ...)
  fatwa overview  which fatwa governs a topic and what it covers
  article         one pair per Pasal of a regulation
  definition      "X adalah ..." items from general provisions
  faq             question and answer lists published by OJK and BI

Output, in corpus/dataset/: train.jsonl and val.jsonl. Each line holds
"messages" (system, user, assistant) and "meta" (source, kind, year, ...).

Usage:
    python3 scripts/corpus/build_dataset.py
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import re

import common
from common import log

OUT_DIR = common.CORPUS_DIR / "dataset"

SYSTEM_PROMPT = (
    "Anda adalah asisten SSCI untuk analis pembiayaan dan Dewan Pengawas Syariah di BPRS. "
    "Jawab dalam bahasa Indonesia berdasarkan fatwa DSN-MUI dan regulasi OJK, "
    "dan sebutkan nomor fatwa atau regulasi yang menjadi dasar jawaban."
)

MIN_ANSWER = 80
MAX_ANSWER = 4000
VAL_PERCENT = 5

ORDINALS = [
    "Pertama", "Kedua", "Ketiga", "Keempat", "Kelima", "Keenam", "Ketujuh",
    "Kedelapan", "Kesembilan", "Kesepuluh", "Kesebelas", "Kedua belas",
    "Ketiga belas", "Keempat belas", "Kelima belas", "Keenam belas",
]  # fmt: skip

ARABIC = re.compile("[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿‎‏‪-‮]")
# A new list item: "1.", "a.", "(2)", "2)".
# The last form is a number that OCR dropped: ". Jual Beli adalah".
ENUMERATOR = re.compile(r"^(\(?\d{1,3}[.)]|\(\d{1,3}\)|[a-z][.)]|\.(?=\s[A-Z]))(\s+|$)")
QUESTION_WORD = re.compile(
    r"^(Apa|Apakah|Bagaimana|Bagaimanakah|Siapa|Siapakah|Kapan|Mengapa|Kenapa|Berapa|"
    r"Berapakah|Di ?mana|Bilamana|Sejak kapan|Bolehkah|Hal apa|Jenis|Pihak mana|Sampai kapan)\b"
)


def body_of(text: str) -> str:
    """Document text without the provenance header."""
    return text.split("\n---\n", 1)[-1]


def tidy_lines(text: str, footer: re.Pattern | None = None) -> list[str]:
    """Lines without Arabic residue, page numbers, footers and catchwords."""
    lines = []
    for line in text.splitlines():
        line = re.sub(r"^-\s*\d+\s*-\s*|^-\d+(?=[A-Za-z])", "", line.strip())
        line = re.sub(r" -\d{1,3}(?=[A-Z])", " ", line)  # page mark fused into a line
        if not line or ARABIC.search(line):
            continue
        if re.fullmatch(r"\d{1,3}", line) or re.fullmatch(r".{1,40}\.\.\.", line):
            continue
        if footer and footer.fullmatch(line):
            continue
        lines.append(re.sub(r"\s+", " ", line))
    return lines


def unwrap(lines: list[str]) -> str:
    """Join wrapped lines; each list item starts a new line."""
    out: list[str] = []
    for line in lines:
        if out and not ENUMERATOR.match(line):
            out[-1] = f"{out[-1]} {line}" if out[-1] else line
        else:
            out.append(line)
    return "\n".join(part.strip() for part in out if part.strip())


def parts_of(body: str) -> list[str]:
    """Split a long text at line breaks into parts that fit MAX_ANSWER."""
    parts: list[str] = []
    for line in body.split("\n"):
        if parts and len(parts[-1]) + len(line) < MAX_ANSWER:
            parts[-1] += "\n" + line
        else:
            parts.append(line)
    return parts


def part_label(index: int, total: int) -> str:
    return f" (bagian {index} dari {total})" if total > 1 else ""


def usable(answer: str) -> bool:
    if not MIN_ANSWER <= len(answer) <= MAX_ANSWER:
        return False
    letters = sum(ch.isalpha() or ch.isspace() for ch in answer)
    return letters >= 0.8 * len(answer)


def split_fatwa(text: str, number: int | None) -> list[dict]:
    """Ruling sections of a fatwa: [{"ordinal", "title", "body"}]."""
    match = re.search(r"^\s*M\s?E\s?M\s?U\s?T\s?U\s?S\s?K\s?A\s?N", text, flags=re.M | re.I)
    if not match:
        return []
    ruling = re.split(r"^\s*Ditetapkan di", text[match.end():], flags=re.M)[0]
    footer = re.compile(
        r"(Dewan Syari.?ah Nasional.{0,40}(MUI|Indonesia))"
        + (rf"|(0*{number}\s+\S.{{0,90}})" if number else ""),
        flags=re.I,
    )
    lines = tidy_lines(ruling, footer)

    # Headings must come in order, so "Kedua" inside a sentence is not a heading.
    starts: list[tuple[int, str]] = []
    for index, line in enumerate(lines):
        if len(starts) == len(ORDINALS):
            break
        wanted = ORDINALS[len(starts)]
        if re.match(rf"{wanted.replace(' ', ' ?')}\s*(:|$)", line, flags=re.I):
            starts.append((index, wanted))
    if not starts:
        # Older fatwas list their rulings without Pertama, Kedua, ...
        rest = [line for line in lines if not re.match(r"(Menetapkan\b|:\s*FATWA TENTANG)", line, flags=re.I)]
        return [{"ordinal": "", "title": "", "body": unwrap(rest)}]
    sections = []
    for position, (start, ordinal) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        chunk = lines[start:end]
        chunk[0] = re.sub(r"^[A-Za-z ]+?\s*(:|$)", "", chunk[0], count=1).strip()
        chunk = [re.sub(r"^:\s*", "", line) for line in chunk if line not in ("", ":")]
        title = ""
        if len(chunk) > 1 and is_title(chunk[0], chunk[1]):
            title = chunk.pop(0).rstrip(": ")
        sections.append({"ordinal": ordinal, "title": title, "body": unwrap(chunk)})
    return sections


def is_title(line: str, following: str) -> bool:
    """True when the first line of a section is its heading, not its text."""
    if len(line) > 120 or line[-1] in ".;,":
        return False
    if line.endswith(":") or ENUMERATOR.match(following):
        return True
    return len(line.split()) <= 9 and following[:1].isupper()


SMALL_WORDS = {"dan", "atau", "bagi", "dari", "yang", "di", "ke", "dalam", "dengan", "untuk", "atas", "serta", "oleh", "pada"}
ACRONYMS = {"bpr", "bprs", "ojk", "dps", "slik", "ppka", "kpmm", "bmpd", "bmpk", "apu", "ppt", "uus", "bus"}


def title_case(text: str) -> str:
    words = []
    for word in text.lower().split():
        bare = word.strip(",.()")
        if bare in ACRONYMS:
            words.append(word.upper())
        else:
            words.append(word if bare in SMALL_WORDS and words else word.capitalize())
    return " ".join(words)


def split_articles(text: str) -> list[dict]:
    """Articles of a regulation: [{"number", "chapter", "body"}]."""
    text = re.split(r"^\s*Ditetapkan di", text, flags=re.M)[0]
    lines = tidy_lines(text)
    articles: list[dict] = []
    chapter = ""
    current: dict | None = None
    index = 0
    while index < len(lines):
        line = lines[index]
        heading = re.fullmatch(r"Pasal (\d+)", line)
        if heading and int(heading.group(1)) == len(articles) + 1:
            current = {"number": int(heading.group(1)), "chapter": chapter, "lines": []}
            articles.append(current)
        elif re.fullmatch(r"BAB [IVXLC]+", line):
            # The chapter title follows in capitals, possibly on two lines.
            title = []
            while index + 1 < len(lines) and lines[index + 1].isupper():
                index += 1
                title.append(lines[index])
            chapter = title_case(" ".join(title))
            current = None
        elif re.fullmatch(r"Bagian \w+( \w+)?", line):
            current = None
        elif current is not None:
            current["lines"].append(line)
        index += 1
    return [
        {"number": a["number"], "chapter": a["chapter"], "body": unwrap(a["lines"])}
        for a in articles
    ]


def definitions(body: str) -> list[tuple[str, str]]:
    """(term, definition) for list items shaped "N. Term adalah ..."."""
    found = []
    for item in body.split("\n"):
        match = re.match(r"\d{1,3}\.\s+(.{3,110}?) adalah (.{30,1500})$", item)
        if match and not re.search(r"[.;:]", match.group(1)):
            term = re.sub(r",? yang selanjutnya di(sebut|singkat) .*$", "", match.group(1))
            found.append((term.strip(), item.split(" ", 1)[1].strip()))
    return found


def split_faq(text: str) -> list[tuple[str, str]]:
    """(question, answer) pairs from a published question and answer list."""
    raw = []
    for line in tidy_lines(text):
        # Drop the Q/A (or T/J) markers; they sit on their own line or lead one.
        line = re.sub(r"^([QATJ]\d*\s?[.:]|[QA]\s(?=[A-Z]))\s*", "", line)
        # Also drop part headings such as "A. UMUM".
        if line and not re.fullmatch(r"[QATJ]|[A-Z]\.\s+[A-Z ,/&-]+", line):
            raw.append(line)

    def number_of(line: str) -> int:
        match = re.match(r"(\d{1,3})\.(\s|$)", line)
        return int(match.group(1)) if match else 0

    def closes(index: int) -> bool:
        """True when the lines from here run into a "?" before a sentence ends."""
        for offset, line in enumerate(raw[index : index + 8]):
            if line.endswith("?"):
                return True
            if line[-1] in ".;:" and not (offset == 0 and re.fullmatch(r"\d{1,3}\.", line)):
                return False
        return False

    # Numbered lists: item N opens question N, and numbering may restart at 1
    # in each part. Numbers inside an answer are not followed by a question.
    numbered = last = 0
    for index, line in enumerate(raw):
        if number_of(line) in (1, last + 1) and closes(index):
            numbered, last = numbered + 1, number_of(line)
    use_numbers = numbered >= 3

    pairs: list[tuple[str, str]] = []
    question: list[str] = []
    answer: list[str] = []
    asking = False
    count = 0
    for index, line in enumerate(raw):
        if use_numbers:
            opens = number_of(line) in (1, count + 1) and closes(index)
            if opens:
                count = number_of(line)
                line = re.sub(r"^[QT]\s(?=[A-Z])", "", line.split(".", 1)[1].strip())
        else:
            opens = not asking and bool(QUESTION_WORD.match(line)) and closes(index)
        if opens:
            if question and answer:
                pairs.append((" ".join(question), unwrap(answer)))
            question, answer, asking = [], [], True
        if not line:
            continue
        if asking:
            question.append(line)
            asking = not line.endswith("?")
        elif question:
            answer.append(line)
    if question and answer:
        pairs.append((" ".join(question), unwrap(answer)))
    # A question mark inside an answer means two entries ran together.
    return [(q, a) for q, a in pairs if "?" not in a]


def pick(options: list[str], key: str) -> str:
    """Stable choice of a question wording."""
    return options[int(hashlib.sha256(key.encode()).hexdigest(), 16) % len(options)]


def record(doc_id: str, kind: str, part: str, question: str, answer: str, meta: dict) -> dict:
    return {
        "id": f"{doc_id}:{kind}:{part}",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer},
        ],
        "meta": {"source_id": doc_id, "kind": kind, **meta},
    }


def fatwa_records(entry: dict) -> list[dict]:
    if entry["status"] != "ok" or entry["revoked"] or entry["relevance"] == "other":
        return []
    text = body_of((common.CORPUS_DIR / entry["text_file"]).read_text(encoding="utf-8"))
    ref = f"Fatwa DSN-MUI No. {entry['number']} tentang {entry['title']}"
    meta = {
        "source": "dsn-mui",
        "ref": ref,
        "year": entry["year"],
        "relevance": entry["relevance"],
        "text_quality": entry["text_quality"],
    }
    doc_id = entry["id"]
    sections = split_fatwa(text, entry["fatwa_number"])
    records = []
    titles = []
    for section in sections:
        title, body, ordinal = section["title"], section["body"], section["ordinal"]
        if re.search(r"penutup", title, flags=re.I):
            continue
        if title:
            titles.append(title)
        if section is sections[-1] and re.search(r"musyawarah|disempurnakan", body) and len(body) < 700:
            continue  # closing clause without a title
        pieces = parts_of(body)
        for index, piece in enumerate(pieces, 1):
            if not usable(piece):
                continue
            label = part_label(index, len(pieces))
            if title:
                question = pick(
                    [
                        f"Jelaskan {title} menurut {ref}{label}.",
                        f"Bagaimana {title} diatur dalam {ref}{label}?",
                        f"Apa isi bagian \"{title}\" dalam {ref}{label}?",
                    ],
                    f"{doc_id}{ordinal}",
                )
                lead = f"{ref}, bagian {ordinal} ({title}){label}, menetapkan:"
            elif ordinal:
                question = f"Apa isi ketentuan {ordinal.lower()} {ref}{label}?"
                lead = f"{ref}, bagian {ordinal}{label}, menetapkan:"
            else:
                question = f"Apa saja ketentuan yang ditetapkan {ref}{label}?"
                lead = f"{ref}{label} menetapkan:"
            records.append(
                record(doc_id, "fatwa_section", f"{ordinal or 'isi'}-{index}", question, f"{lead}\n\n{piece}", meta)
            )
        if re.search(r"ketentuan umum", title, flags=re.I):
            for term, sentence in definitions(body):
                records.append(
                    record(
                        doc_id,
                        "definition",
                        common.slugify(term),
                        f"Apa yang dimaksud dengan {term} menurut {ref}?",
                        f"Menurut {ref}, {sentence}",
                        meta,
                    )
                )
    if len(titles) >= 2:
        listing = "\n".join(f"- {title}" for title in titles)
        records.append(
            record(
                doc_id,
                "fatwa_overview",
                "0",
                f"Fatwa DSN-MUI mana yang mengatur {entry['title']}, dan apa saja yang diaturnya?",
                f"{entry['title']} diatur dalam Fatwa DSN-MUI No. {entry['number']}. "
                f"Fatwa ini memuat:\n{listing}",
                meta,
            )
        )
    return records


def file_kind(name: str) -> str:
    name = name.lower()
    if "abstrak" in name or "ringkasan" in name:
        return "abstract"
    if re.search(r"faq|tanya", name):
        return "faq"
    if re.search(r"lamp|penjelasan", name):
        return "attachment"
    return "main"


REGULATION_PREFIX = {
    "Peraturan OJK": "POJK Nomor",
    "Surat Edaran OJK": "SEOJK Nomor",
    "PPBI": "Peraturan Bank Indonesia Nomor",
    "SEBI": "Surat Edaran Bank Indonesia Nomor",
    "Undang-Undang": "Undang-Undang Nomor",
}


def regulation_ref(entry: dict) -> str:
    """ "POJK Nomor 24 Tahun 2024 tentang Kualitas Aset ..." """
    number = re.sub(r"\s*/\s*", "/", entry["number"])
    prefix = REGULATION_PREFIX.get(entry["type"], "")
    if prefix and not re.match(r"[A-Za-z]", number):
        number = f"{prefix} {number}"
    title = re.sub(r"^(Peraturan|Surat Edaran|Undang-Undang|POJK|SEOJK)[\w ]*? (tentang|perihal) ", "", entry["title"], flags=re.I)
    return f"{number} tentang {title}"


def regulation_records(entry: dict, seen: set[str]) -> list[dict]:
    ref = regulation_ref(entry)
    doc_id = entry["id"]
    records = []
    for position, item in enumerate(entry.get("files", []), 1):
        if item.get("status") != "ok" or item["sha256"] in seen:
            continue
        seen.add(item["sha256"])
        kind = file_kind(item["name"])
        if kind not in ("main", "faq"):
            continue
        text = body_of((common.CORPUS_DIR / item["text_file"]).read_text(encoding="utf-8"))
        meta = {
            "source": "ojk",
            "ref": ref,
            "year": entry.get("year"),
            "relevance": entry["relevance"],
            "text_quality": item["text_quality"],
        }
        if kind == "faq":
            for number, (question, answer) in enumerate(split_faq(text), 1):
                if usable(answer) and len(question) <= 600:
                    records.append(
                        record(doc_id, "faq", f"{position}-{number}", f"Terkait {ref}: {question}", answer, meta)
                    )
            continue
        for article in split_articles(text):
            number, body, chapter = article["number"], article["body"], article["chapter"]
            if number == 1 or re.match(r"(Dalam|Yang dimaksud)", body):
                for term, sentence in definitions(body):
                    records.append(
                        record(
                            doc_id,
                            "definition",
                            f"{position}-{common.slugify(term)}",
                            f"Apa yang dimaksud dengan {term} menurut {ref}?",
                            f"Menurut Pasal {number} {ref}, {sentence}",
                            meta,
                        )
                    )
            if re.search(r"mulai berlaku pada tanggal", body):
                continue
            topic = f" (Bab {chapter})" if chapter else ""
            pieces = parts_of(body)
            for index, piece in enumerate(pieces, 1):
                if not usable(piece):
                    continue
                label = part_label(index, len(pieces))
                question = pick(
                    [
                        f"Apa bunyi Pasal {number} {ref}{label}?",
                        f"Apa yang diatur dalam Pasal {number}{topic} {ref}{label}?",
                        f"Jelaskan ketentuan Pasal {number} {ref}{label}.",
                    ],
                    f"{doc_id}{position}{number}",
                )
                records.append(
                    record(
                        doc_id,
                        "article",
                        f"{position}-{number}-{index}",
                        question,
                        f"Pasal {number}{topic} {ref}{label} menyatakan:\n\n{piece}",
                        meta,
                    )
                )
    return records


def in_validation(doc_key: str) -> bool:
    return int(hashlib.sha256(doc_key.encode()).hexdigest(), 16) % 100 < VAL_PERCENT


def main() -> None:
    argparse.ArgumentParser(description=__doc__.split("\n")[0]).parse_args()
    records: list[dict] = []
    for entry in common.load_manifest(common.CORPUS_DIR / "dsn-mui" / "manifest.jsonl").values():
        records.extend(fatwa_records(entry))
    seen: set[str] = set()
    for entry in common.load_manifest(common.CORPUS_DIR / "ojk" / "manifest.jsonl").values():
        if entry["status"] == "ok":
            records.extend(regulation_records(entry, seen))

    # The same answer under two ids adds nothing.
    unique: dict[str, dict] = {}
    for item in records:
        key = item["messages"][1]["content"] + item["messages"][2]["content"]
        unique.setdefault(key, item)
    records = sorted(unique.values(), key=lambda item: item["id"])

    train = [item for item in records if not in_validation(item["id"])]
    val = [item for item in records if in_validation(item["id"])]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, rows in (("train", train), ("val", val)):
        lines = [json.dumps(row, ensure_ascii=False) for row in rows]
        (OUT_DIR / f"{name}.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")

    kinds = collections.Counter(item["meta"]["kind"] for item in records)
    sources = collections.Counter(item["meta"]["source"] for item in records)
    documents = len({item["meta"]["source_id"] for item in records})
    log(f"{len(records)} pasangan dari {documents} dokumen: {len(train)} latih, {len(val)} validasi")
    log("per jenis: " + ", ".join(f"{kind} {count}" for kind, count in kinds.most_common()))
    log("per sumber: " + ", ".join(f"{source} {count}" for source, count in sources.most_common()))


if __name__ == "__main__":
    main()
