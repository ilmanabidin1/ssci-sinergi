import { describe, expect, it } from "vitest";
import { compareFields, flattenStatement, makeRecordingFetch, outputProblems, renderReport, summarize, valuesMatch, type CallRecord, type RunRecord } from "./lib";

const run = (over: Partial<RunRecord>): RunRecord => ({
  task: "ktp", caseId: "a.jpg", model: "qwen", ok: true, ms: 1000, error: null, output: {}, problems: [], fields: [], calls: [], ...over,
});

describe("makeRecordingFetch", () => {
  it("mengalihkan alamat, model, dan kunci tanpa mengubah isi permintaan", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const base = (async (url: string, init: RequestInit) => {
      seen.push({ url, init });
      return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 7, completion_tokens: 2 } }), { status: 200 });
    }) as unknown as typeof fetch;
    const calls: CallRecord[] = [];
    const fetchImpl = makeRecordingFetch({ name: "qwen", baseUrl: "http://lokal:8000/v1/", model: "qwen-uji" }, "", calls, base);
    const response = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer kunci-produksi" },
      body: JSON.stringify({ model: "model-lama", temperature: 0, messages: [{ role: "user", content: "halo" }] }),
    });
    expect(seen[0]!.url).toBe("http://lokal:8000/v1/chat/completions");
    expect(JSON.parse(String(seen[0]!.init.body))).toEqual({ model: "qwen-uji", temperature: 0, messages: [{ role: "user", content: "halo" }] });
    expect(JSON.stringify(seen[0]!.init.headers)).not.toContain("kunci-produksi");
    expect((await response.json()).choices[0].message.content).toBe("{}");
    expect(calls[0]).toMatchObject({ status: 200, promptTokens: 7, completionTokens: 2, content: "{}", error: null });
  });

  it("mencatat sebab saat server menolak", async () => {
    const base = (async () => new Response(JSON.stringify({ error: { message: "model tidak ada" } }), { status: 404 })) as unknown as typeof fetch;
    const calls: CallRecord[] = [];
    const response = await makeRecordingFetch({ name: "x", baseUrl: "http://x/v1", model: "m" }, "k", calls, base)("u", { body: "{}" });
    expect(response.ok).toBe(false);
    expect(calls[0]).toMatchObject({ status: 404, error: "model tidak ada" });
  });
});

describe("pembandingan", () => {
  it("mengabaikan huruf besar dan tanda baca, dan memberi kelonggaran 1% pada angka", () => {
    expect(valuesMatch("Jl. Merdeka No. 5", "JL MERDEKA NO 5")).toBe(true);
    expect(valuesMatch("3200000000000001", "3200000000000002")).toBe(false);
    expect(valuesMatch(5_000_000, 5_040_000)).toBe(true);
    expect(valuesMatch(5_000_000, 5_100_000)).toBe(false);
    expect(valuesMatch(null, null)).toBe(true);
    expect(valuesMatch(null, "isi")).toBe(false);
    expect(valuesMatch(["sesuai", "perlu_klarifikasi"], "perlu_klarifikasi")).toBe(true);
  });

  it("hanya menilai kolom yang ada di nilai benar", () => {
    const fields = compareFields({ customerName: "Budi", customerId: "1" }, { customerName: "budi", customerId: "2", address: "x" });
    expect(fields.map(f => [f.field, f.match])).toEqual([["customerName", true], ["customerId", false]]);
  });

  it("menjumlahkan rekening koran per bulan", () => {
    const flat = flattenStatement({ holderName: "A", months: [{ month: "2026-01", credits: [100, 250], debits: [40] }] });
    expect(flat).toEqual({ holderName: "A", "2026-01 totalKredit": 350, "2026-01 totalDebit": 40 });
  });
});

describe("outputProblems", () => {
  it("menandai ringkasan komite yang melanggar aturan prompt", () => {
    const problems = outputProblems("komite", { headline: "Pengajuan layak disetujui", pros: ["a"], cons: ["a", "b", "c"], questions: ["a", "b", "c"] });
    expect(problems).toEqual(["pros berisi 1 butir, seharusnya 3 sampai 5", "headline menyatakan keputusan"]);
  });

  it("menandai nama nasabah dan tanda pisah panjang di narasi", () => {
    const problems = outputProblems("narasi_bprs", { latarBelakang: "Budi Santoso berdagang — sejak lama" }, { customerName: "Budi Santoso" });
    expect(problems).toEqual(["memakai tanda pisah panjang", "menulis nama nasabah"]);
  });

  it("menerima keluaran yang patuh", () => {
    expect(outputProblems("syariah", { findings: [{ point: "x", reference: "Fatwa No. 04/2000 bagian Pertama" }] })).toEqual([]);
  });
});

describe("laporan", () => {
  const runs = [
    run({ fields: [{ field: "customerId", expected: "1", actual: "1", match: true }, { field: "address", expected: "a", actual: "b", match: false }] }),
    run({ caseId: "b.jpg", ok: false, error: "Respons tidak valid", ms: 9000 }),
    run({ model: "sekarang", ms: 3000, problems: ["x"] }),
  ];

  it("merangkum per fungsi dan model", () => {
    expect(summarize(runs)).toEqual([
      { task: "ktp", model: "qwen", runs: 2, ok: 1, clean: 1, fieldsMatched: 1, fieldsTotal: 2, medianMs: 1000 },
      { task: "ktp", model: "sekarang", runs: 1, ok: 1, clean: 0, fieldsMatched: 0, fieldsTotal: 0, medianMs: 3000 },
    ]);
  });

  it("memuat ringkasan, kegagalan, dan kolom yang salah", () => {
    const report = renderReport(runs, [{ name: "qwen", baseUrl: "http://x/v1", model: "m" }], "2026-01-01T00:00:00Z");
    expect(report).toContain("| ktp | qwen | 1/2 | 1/2 | 1/2 | 1.0 dtk |");
    expect(report).toContain("| ktp | b.jpg | qwen | Respons tidak valid |");
    expect(report).toContain('| ktp | a.jpg | qwen | address | "a" | "b" |');
  });
});
