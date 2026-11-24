/**
 * Bagian uji banding model AI yang tidak menyentuh jaringan atau berkas:
 * pengalih permintaan, pembanding hasil dengan nilai benar, dan penyusun laporan.
 */

export type ModelTarget = {
  /** Nama pendek untuk laporan, misalnya "sekarang" atau "qwen". */
  name: string;
  /** Alamat API yang kompatibel dengan OpenAI, sampai /v1. */
  baseUrl: string;
  model: string;
  /** Nama variabel lingkungan yang berisi kunci API. Kosongkan untuk server lokal tanpa kunci. */
  apiKeyEnv?: string;
};

export type CallRecord = {
  status: number | null;
  ms: number;
  promptTokens: number | null;
  completionTokens: number | null;
  /** Isi jawaban mentah dari model, untuk menelusuri kegagalan. */
  content: string | null;
  error: string | null;
};

export type RunRecord = {
  task: string;
  caseId: string;
  model: string;
  ok: boolean;
  ms: number;
  error: string | null;
  output: unknown;
  /** Pelanggaran aturan keluaran yang bisa diperiksa otomatis. */
  problems: string[];
  /** Hasil pembandingan dengan nilai benar; kosong bila kasus tidak punya nilai benar. */
  fields: FieldResult[];
  calls: CallRecord[];
};

export type FieldResult = { field: string; expected: unknown; actual: unknown; match: boolean };

/**
 * Fungsi AI produksi selalu memanggil alamat dan model yang tertanam di kode.
 * Fetch ini mengalihkan panggilan itu ke model yang diuji tanpa mengubah
 * prompt, skema, atau parameter lain, lalu mencatat waktu dan jawabannya.
 */
export function makeRecordingFetch(
  target: ModelTarget,
  apiKey: string,
  calls: CallRecord[],
  baseFetch: typeof fetch = fetch,
): typeof fetch {
  return (async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    body.model = target.model;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const started = Date.now();
    const record: CallRecord = { status: null, ms: 0, promptTokens: null, completionTokens: null, content: null, error: null };
    calls.push(record);
    try {
      const response = await baseFetch(`${target.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: init?.signal,
      });
      const text = await response.text();
      record.status = response.status;
      record.ms = Date.now() - started;
      try {
        const parsed = JSON.parse(text);
        record.content = parsed?.choices?.[0]?.message?.content ?? null;
        record.promptTokens = parsed?.usage?.prompt_tokens ?? null;
        record.completionTokens = parsed?.usage?.completion_tokens ?? null;
        if (!response.ok) record.error = String(parsed?.error?.message ?? text).slice(0, 500);
      } catch {
        record.error = text.slice(0, 500);
      }
      return new Response(text, { status: response.status, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      record.ms = Date.now() - started;
      record.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }) as typeof fetch;
}

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Sama bila teks cocok tanpa melihat huruf besar dan tanda baca, atau angka berselisih paling banyak 1%. */
export function valuesMatch(expected: unknown, actual: unknown): boolean {
  if (expected === null || expected === undefined) return actual === null || actual === undefined;
  if (typeof expected === "number") {
    if (typeof actual !== "number") return false;
    return Math.abs(actual - expected) <= Math.max(1, Math.abs(expected) * 0.01);
  }
  if (typeof expected === "string") return typeof actual === "string" && normalizeText(actual) === normalizeText(expected);
  if (typeof expected === "boolean") return actual === expected;
  if (Array.isArray(expected)) return expected.some(option => valuesMatch(option, actual));
  return JSON.stringify(expected) === JSON.stringify(actual);
}

/**
 * Bandingkan hanya kolom yang ditulis di nilai benar. Daftar di nilai benar
 * berarti "salah satu dari ini", misalnya verdict yang masih bisa diterima.
 */
export function compareFields(expected: Record<string, unknown>, actual: Record<string, unknown>): FieldResult[] {
  return Object.entries(expected).map(([field, value]) => ({
    field,
    expected: value,
    actual: actual[field],
    match: valuesMatch(value, actual[field]),
  }));
}

type StatementMonth = { month: string; credits: number[]; debits: number[] };

/** Rekening koran dinilai lewat jumlah kredit dan debit per bulan, bukan per baris transaksi. */
export function flattenStatement(result: { months?: StatementMonth[] } & Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = { ...result };
  delete flat.months;
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  for (const month of result.months ?? []) {
    flat[`${month.month} totalKredit`] = sum(month.credits);
    flat[`${month.month} totalDebit`] = sum(month.debits);
  }
  return flat;
}

const EM_DASH = /[–—]/;

/** Aturan keluaran yang tertulis di prompt produksi dan bisa dicek tanpa menilai isi. */
export function outputProblems(task: string, output: any, context: { customerName?: string } = {}): string[] {
  const problems: string[] = [];
  const count = (label: string, list: unknown, min: number, max: number) => {
    const n = Array.isArray(list) ? list.length : 0;
    if (n < min || n > max) problems.push(`${label} berisi ${n} butir, seharusnya ${min} sampai ${max}`);
  };
  const text = JSON.stringify(output ?? "");
  if (task === "komite") {
    count("pros", output?.pros, 3, 5);
    count("cons", output?.cons, 3, 5);
    count("questions", output?.questions, 3, 5);
    if (/\b(disetujui|ditolak)\b/i.test(String(output?.headline ?? ""))) problems.push("headline menyatakan keputusan");
  }
  if (task === "syariah") {
    const findings = Array.isArray(output?.findings) ? output.findings : [];
    if (findings.some((f: any) => !/\d/.test(String(f?.reference ?? "")))) problems.push("ada temuan tanpa nomor fatwa");
  }
  if (task === "narasi_bprs") {
    if (EM_DASH.test(text)) problems.push("memakai tanda pisah panjang");
    const name = context.customerName?.trim();
    if (name && text.toLowerCase().includes(name.toLowerCase())) problems.push("menulis nama nasabah");
  }
  if (task === "beda_skor" && EM_DASH.test(text)) problems.push("memakai tanda pisah panjang");
  return problems;
}

export type Summary = {
  task: string;
  model: string;
  runs: number;
  ok: number;
  clean: number;
  fieldsMatched: number;
  fieldsTotal: number;
  medianMs: number | null;
};

export function summarize(runs: RunRecord[]): Summary[] {
  const groups = new Map<string, RunRecord[]>();
  for (const run of runs) {
    const key = `${run.task}\u0000${run.model}`;
    groups.set(key, [...(groups.get(key) ?? []), run]);
  }
  return Array.from(groups.values()).map(group => {
    const times = group.filter(r => r.ok).map(r => r.ms).sort((a, b) => a - b);
    const fields = group.flatMap(r => r.fields);
    return {
      task: group[0]!.task,
      model: group[0]!.model,
      runs: group.length,
      ok: group.filter(r => r.ok).length,
      clean: group.filter(r => r.ok && r.problems.length === 0).length,
      fieldsMatched: fields.filter(f => f.match).length,
      fieldsTotal: fields.length,
      medianMs: times.length ? times[Math.floor(times.length / 2)]! : null,
    };
  });
}

const cell = (value: unknown) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>");

export function renderReport(runs: RunRecord[], targets: ModelTarget[], startedAt: string): string {
  const lines: string[] = [];
  lines.push("# Uji banding model AI SSCI", "");
  lines.push(`Dijalankan: ${startedAt}`, "");
  lines.push("| Nama | Model | Alamat |", "|---|---|---|");
  for (const t of targets) lines.push(`| ${cell(t.name)} | ${cell(t.model)} | ${cell(t.baseUrl)} |`);
  lines.push("", "## Ringkasan", "");
  lines.push("- **Berhasil**: fungsi mengembalikan JSON yang lolos skema produksi.");
  lines.push("- **Patuh aturan**: berhasil dan tidak melanggar aturan keluaran di prompt.");
  lines.push("- **Kolom cocok**: kolom yang sama dengan nilai benar; kosong bila kasus tidak punya nilai benar.");
  lines.push("", "| Fungsi | Model | Berhasil | Patuh aturan | Kolom cocok | Waktu tengah |", "|---|---|---|---|---|---|");
  for (const s of summarize(runs)) {
    lines.push(
      `| ${s.task} | ${cell(s.model)} | ${s.ok}/${s.runs} | ${s.clean}/${s.runs} | ` +
        `${s.fieldsTotal ? `${s.fieldsMatched}/${s.fieldsTotal}` : ""} | ${s.medianMs === null ? "" : `${(s.medianMs / 1000).toFixed(1)} dtk`} |`,
    );
  }

  const failures = runs.filter(r => !r.ok);
  if (failures.length) {
    lines.push("", "## Kegagalan", "", "| Fungsi | Kasus | Model | Sebab |", "|---|---|---|---|");
    for (const r of failures) lines.push(`| ${r.task} | ${cell(r.caseId)} | ${cell(r.model)} | ${cell(r.error)} |`);
  }

  const wrong = runs.filter(r => r.fields.some(f => !f.match));
  if (wrong.length) {
    lines.push("", "## Kolom yang tidak cocok", "", "| Fungsi | Kasus | Model | Kolom | Seharusnya | Hasil |", "|---|---|---|---|---|---|");
    for (const r of wrong) {
      for (const f of r.fields.filter(f => !f.match)) {
        lines.push(`| ${r.task} | ${cell(r.caseId)} | ${cell(r.model)} | ${cell(f.field)} | ${cell(JSON.stringify(f.expected))} | ${cell(JSON.stringify(f.actual))} |`);
      }
    }
  }

  lines.push("", "## Keluaran berdampingan", "", "Untuk dinilai ahli: bandingkan isi jawaban tiap model pada kasus yang sama.");
  const cases = new Map<string, RunRecord[]>();
  for (const run of runs) {
    const key = `${run.task} / ${run.caseId}`;
    cases.set(key, [...(cases.get(key) ?? []), run]);
  }
  for (const [key, group] of Array.from(cases.entries())) {
    lines.push("", `### ${key}`);
    for (const r of group) {
      lines.push("", `**${r.model}**${r.ok ? "" : ` (gagal: ${r.error})`}${r.problems.length ? ` (melanggar: ${r.problems.join("; ")})` : ""}`);
      if (r.ok) lines.push("", "```json", JSON.stringify(r.output, null, 2), "```");
    }
  }
  return lines.join("\n") + "\n";
}
