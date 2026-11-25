/**
 * Uji banding model AI untuk SSCI.
 *
 * Menjalankan fungsi AI produksi (prompt dan skema yang sama persis) pada
 * beberapa model, lalu menulis laporan perbandingan.
 *
 *   pnpm eval:ai                          semua fungsi, semua model
 *   pnpm eval:ai --tasks syariah,komite   fungsi tertentu saja
 *   pnpm eval:ai --models qwen            model tertentu saja
 *   pnpm eval:ai --list                   tampilkan kasus yang akan dijalankan
 *
 * Model dibaca dari ai-eval/models.json, kasus teks dari scripts/ai-eval/cases.json,
 * dan gambar dari ai-eval/data/. Lihat scripts/ai-eval/README.md.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compareFields,
  flattenStatement,
  makeRecordingFetch,
  outputProblems,
  renderReport,
  type CallRecord,
  type ModelTarget,
  type RunRecord,
} from "./lib";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const WORK_DIR = join(ROOT, "ai-eval");
const DATA_DIR = join(WORK_DIR, "data");
const DOCUMENT_TYPES = ["slip_gaji", "mutasi_rekening", "nib", "npwp"] as const;
const TEXT_TASKS = ["konsistensi", "syariah", "komite", "narasi_bprs", "rekomendasi", "beda_skor"] as const;
const IMAGE_TASKS = ["ktp", "dokumen", "rekening_koran", "survei"] as const;

type TextCase = {
  id: string;
  note?: string;
  application: any;
  assessment?: any;
  policy?: any;
  profile?: any;
  bprsScore?: any;
  expect?: Record<string, Record<string, unknown>>;
};

type Job = {
  task: string;
  caseId: string;
  expected?: Record<string, unknown>;
  customerName?: string;
  run: (options: { fetch: typeof fetch; timeoutMs: number }) => Promise<unknown>;
  /** Ubah keluaran menjadi kolom datar untuk dibandingkan dengan nilai benar. */
  flatten?: (output: any) => Record<string, unknown>;
};

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]!;
    if (!key.startsWith("--")) continue;
    const next = argv[i + 1];
    args[key.slice(2)] = next && !next.startsWith("--") ? argv[++i]! : "true";
  }
  return args;
}

const contentTypeOf = (file: string) => (extname(file).toLowerCase() === ".png" ? "image/png" : "image/jpeg") as "image/png" | "image/jpeg";
const isImage = (file: string) => [".jpg", ".jpeg", ".png"].includes(extname(file).toLowerCase());
const readImage = async (file: string) => (await readFile(file)).toString("base64");

async function readExpected(file: string): Promise<Record<string, unknown> | undefined> {
  return existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : undefined;
}

async function listDir(dir: string): Promise<string[]> {
  return existsSync(dir) ? (await readdir(dir)).sort() : [];
}

async function buildJobs(wanted: Set<string>): Promise<Job[]> {
  // Kode produksi membaca kunci saat modul dimuat dan menolak jalan tanpa kunci.
  // Kunci yang sebenarnya dipasang per model oleh fetch pengalih.
  process.env.AI_API_KEY ||= "uji-banding";
  const assist = await import("../../server/aiAssist");
  const { generateNarrativeRecommendation } = await import("../../server/openRouterRecommendations");
  const { extractKtpOcr } = await import("../../server/ktpOcr");
  const { analyzeSurveyImage } = await import("../../server/surveyAnalysis");

  const jobs: Job[] = [];
  const add = (job: Job) => {
    if (wanted.has(job.task)) jobs.push(job);
  };

  const cases: TextCase[] = JSON.parse(await readFile(join(HERE, "cases.json"), "utf8"));
  for (const c of cases) {
    const app = c.application;
    add({
      task: "konsistensi",
      caseId: c.id,
      expected: c.expect?.konsistensi,
      run: async options => {
        const result = await assist.checkApplicationConsistency(app, options);
        if (result.aiStatus !== "generated") throw new Error("AI tidak menjawab; hanya temuan aturan yang keluar");
        return { summary: result.summary, issues: result.issues.filter(i => i.source === "ai") };
      },
      flatten: output => ({ adaTemuan: output.issues.length > 0 }),
    });
    add({
      task: "syariah",
      caseId: c.id,
      expected: c.expect?.syariah,
      run: options => assist.checkShariaConformity(app, options),
    });
    if (c.policy) {
      add({
        task: "komite",
        caseId: c.id,
        run: options => assist.generateCommitteeBrief({ application: app, assessment: c.assessment ?? null, policy: c.policy }, options),
      });
    }
    if (c.profile) {
      add({
        task: "narasi_bprs",
        caseId: c.id,
        customerName: app.customerName,
        run: options => assist.draftBprsNarrative(app, c.profile, options),
      });
    }
    if (c.assessment) {
      add({
        task: "rekomendasi",
        caseId: c.id,
        run: async options => {
          const result = await generateNarrativeRecommendation(
            { ...c.assessment, scoreBreakdown: c.assessment.scoreBreakdown ?? {}, fallbackRecommendation: "(narasi aturan)" },
            options,
          );
          if (result.status !== "generated") throw new Error("AI tidak menjawab; narasi aturan yang keluar");
          return { recommendation: result.recommendation };
        },
      });
    }
    if (c.bprsScore) {
      add({
        task: "beda_skor",
        caseId: c.id,
        run: async options => {
          const ssci = c.assessment ? { totalScore: c.assessment.totalScore, classification: c.assessment.classification } : null;
          const result = await assist.explainScoreComparison({ ssci, bprs: c.bprsScore }, options);
          if (result.source !== "ai") throw new Error("AI tidak menjawab; penjelasan aturan yang keluar");
          return { explanation: result.explanation };
        },
      });
    }
  }

  // Gambar: satu berkas per kasus, dengan nilai benar di <nama>.expected.json bila ada.
  for (const file of (await listDir(join(DATA_DIR, "ktp"))).filter(isImage)) {
    const path = join(DATA_DIR, "ktp", file);
    add({
      task: "ktp",
      caseId: file,
      expected: await readExpected(path.replace(/\.\w+$/, ".expected.json")),
      run: async options => extractKtpOcr({ imageBase64: await readImage(path), contentType: contentTypeOf(file) }, options),
    });
  }
  for (const type of DOCUMENT_TYPES) {
    for (const file of (await listDir(join(DATA_DIR, type))).filter(isImage)) {
      const path = join(DATA_DIR, type, file);
      add({
        task: "dokumen",
        caseId: `${type}/${file}`,
        expected: await readExpected(path.replace(/\.\w+$/, ".expected.json")),
        run: async options =>
          assist.extractSupportingDocument({ documentType: type, imageBase64: await readImage(path), contentType: contentTypeOf(file) }, options),
      });
    }
  }
  for (const file of (await listDir(join(DATA_DIR, "survei"))).filter(isImage)) {
    const path = join(DATA_DIR, "survei", file);
    add({
      task: "survei",
      caseId: file,
      run: async options => analyzeSurveyImage(await readImage(path), contentTypeOf(file), options),
    });
  }
  // Rekening koran: satu folder per kasus, berisi halaman berurutan dan expected.json.
  for (const folder of await listDir(join(DATA_DIR, "rekening_koran"))) {
    const dir = join(DATA_DIR, "rekening_koran", folder);
    const pages = (await listDir(dir)).filter(isImage);
    if (!pages.length) continue;
    add({
      task: "rekening_koran",
      caseId: folder,
      expected: await readExpected(join(dir, "expected.json")),
      run: async options =>
        assist.readBankStatement(
          {
            pages: await Promise.all(
              pages.slice(0, assist.MAX_STATEMENT_PAGES).map(async page => ({ imageBase64: await readImage(join(dir, page)), contentType: contentTypeOf(page) })),
            ),
          },
          options,
        ),
      flatten: flattenStatement,
    });
  }
  return jobs;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const allTasks: string[] = [...TEXT_TASKS, ...IMAGE_TASKS];
  const tasks = args.tasks ? args.tasks.split(",").map(t => t.trim()) : allTasks;
  const unknown = tasks.filter(t => !allTasks.includes(t));
  if (unknown.length) throw new Error(`Fungsi tidak dikenal: ${unknown.join(", ")}. Pilihan: ${allTasks.join(", ")}`);

  const jobs = await buildJobs(new Set(tasks));
  if (args.list) {
    for (const job of jobs) console.log(`${job.task}\t${job.caseId}${job.expected ? "\t(ada nilai benar)" : ""}`);
    console.log(`${jobs.length} kasus`);
    return;
  }

  const modelsFile = args.config ?? join(WORK_DIR, "models.json");
  if (!existsSync(modelsFile)) {
    throw new Error(`Daftar model tidak ditemukan di ${modelsFile}. Salin scripts/ai-eval/models.example.json ke sana lalu sesuaikan.`);
  }
  let targets: ModelTarget[] = JSON.parse(await readFile(modelsFile, "utf8"));
  if (args.models) {
    const names = args.models.split(",").map(n => n.trim());
    targets = targets.filter(t => names.includes(t.name));
  }
  if (!targets.length) throw new Error("Tidak ada model yang dipilih.");
  for (const target of targets) {
    if (target.apiKeyEnv && !process.env[target.apiKeyEnv]) {
      throw new Error(`Model "${target.name}" butuh kunci di variabel ${target.apiKeyEnv}, tetapi variabel itu kosong.`);
    }
  }
  if (!jobs.length) throw new Error("Tidak ada kasus untuk dijalankan.");

  const timeoutMs = Number(args.timeout ?? 180) * 1000;
  const startedAt = new Date().toISOString();
  const runs: RunRecord[] = [];
  for (const job of jobs) {
    for (const target of targets) {
      const calls: CallRecord[] = [];
      const fetchImpl = makeRecordingFetch(target, target.apiKeyEnv ? process.env[target.apiKeyEnv]! : "", calls);
      const started = Date.now();
      const record: RunRecord = { task: job.task, caseId: job.caseId, model: target.name, ok: false, ms: 0, error: null, output: null, problems: [], fields: [], calls };
      try {
        const output: any = await job.run({ fetch: fetchImpl, timeoutMs });
        // Kolom "model" diisi kode produksi dengan nama model lama; buang agar tidak menyesatkan.
        if (output && typeof output === "object") delete output.model;
        record.ok = true;
        record.output = output;
        record.problems = outputProblems(job.task, output, { customerName: job.customerName });
        if (job.expected) record.fields = compareFields(job.expected, job.flatten ? job.flatten(output) : output);
      } catch (error) {
        // Kode produksi menyamarkan sebab kegagalan; sebab aslinya ada di catatan panggilan.
        const last = calls[calls.length - 1];
        const cause = calls.find(c => c.error)?.error ?? (last?.content ? `jawaban model: ${last.content.slice(0, 200)}` : undefined);
        record.error = [error instanceof Error ? error.message : String(error), cause].filter(Boolean).join(" | ");
      }
      record.ms = Date.now() - started;
      runs.push(record);
      console.log(`${record.ok ? "ok   " : "GAGAL"} ${job.task} / ${job.caseId} / ${target.name} (${(record.ms / 1000).toFixed(1)} dtk)`);
    }
  }

  const outDir = join(WORK_DIR, "results", startedAt.replace(/[:.]/g, "-"));
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "results.json"), JSON.stringify({ startedAt, targets, runs }, null, 2));
  await writeFile(join(outDir, "report.md"), renderReport(runs, targets, startedAt));
  console.log(`\nLaporan: ${join("ai-eval", "results", basename(outDir), "report.md")}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
