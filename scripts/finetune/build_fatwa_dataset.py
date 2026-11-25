#!/usr/bin/env python3
"""Build a small fine-tune set from the DSN-MUI fatwas.

No language model is involved: every answer is text taken from a fatwa, and
every question comes from the structure of that fatwa.

  fatwa_section   one pair per ruling section (Pertama, Kedua, ...)
  definition      "X adalah ..." items from the general provisions
  fatwa_overview  which fatwa governs a topic and what it covers

Fatwas marked revoked, and fatwas outside BPRS financing (capital market,
insurance, ...), are left out. Output, in corpus/dataset/: train.jsonl and
val.jsonl. Each line holds "messages" (system, user, assistant) and "meta".

Usage:
    python3 scripts/finetune/build_fatwa_dataset.py
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "corpus"))

import common  # noqa: E402
from common import log  # noqa: E402

OUT_DIR = common.CORPUS_DIR / "dataset"

SYSTEM_PROMPT = (
    "Anda adalah asisten SSCI untuk analis pembiayaan dan Dewan Pengawas Syariah di BPRS. "
    "Jawab dalam bahasa Indonesia berdasarkan fatwa DSN-MUI, "
    "dan sebutkan nomor fatwa serta bagian yang menjadi dasar jawaban."
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


def definitions(body: str) -> list[tuple[str, str]]:
    """(term, definition) for list items shaped "N. Term adalah ..."."""
    found = []
    for item in body.split("\n"):
        match = re.match(r"\d{1,3}\.\s+(.{3,110}?) adalah (.{30,1500})$", item)
        if match and not re.search(r"[.;:]", match.group(1)):
            term = re.sub(r",? yang selanjutnya di(sebut|singkat) .*$", "", match.group(1))
            found.append((term.strip(), item.split(" ", 1)[1].strip()))
    return found


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


def in_validation(doc_key: str) -> bool:
    return int(hashlib.sha256(doc_key.encode()).hexdigest(), 16) % 100 < VAL_PERCENT


def main() -> None:
    argparse.ArgumentParser(description=__doc__.split("\n")[0]).parse_args()
    records: list[dict] = []
    for entry in common.load_manifest(common.CORPUS_DIR / "dsn-mui" / "manifest.jsonl").values():
        records.extend(fatwa_records(entry))

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
