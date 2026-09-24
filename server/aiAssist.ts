import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ENV } from "./_core/env";

export const OPENROUTER_ASSIST_MODEL = "openai/gpt-6-luna";
const TIMEOUT_MS = 30_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export class AiInputError extends Error {}
export class AiProviderError extends Error {}

type FetchOptions = { fetch?: typeof fetch; timeoutMs?: number };

const providerResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
});

const SCOPE_RULE =
  "Anda adalah asisten analis kelayakan pembiayaan syariah BPRS. Tugas Anda hanya membantu menilai kelayakan pembiayaan. " +
  "Anda tidak menghitung ulang atau mengubah skor SSCI dan tidak mengambil keputusan; keputusan final tetap milik BPRS. " +
  "Jawab dalam Bahasa Indonesia yang ringkas dan faktual, hanya berdasarkan data yang diberikan. Jangan mengarang fakta.";

async function callOpenRouterJson<T>(params: {
  name: string;
  jsonSchema: Record<string, unknown>;
  schema: z.ZodType<T>;
  system: string;
  user: string | Array<Record<string, unknown>>;
  maxTokens: number;
  options?: FetchOptions;
}): Promise<T> {
  if (!ENV.openRouterApiKey) throw new AiProviderError("Layanan AI belum dikonfigurasi");
  const fetchImpl = params.options?.fetch ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.options?.timeoutMs ?? TIMEOUT_MS);
  try {
    const response = await fetchImpl(`${ENV.openRouterBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ssci-sinergi-production.up.railway.app",
        "X-Title": "SSCI Sinergi",
      },
      body: JSON.stringify({
        model: OPENROUTER_ASSIST_MODEL,
        temperature: 0,
        max_tokens: params.maxTokens,
        response_format: {
          type: "json_schema",
          json_schema: { name: params.name, strict: true, schema: params.jsonSchema },
        },
        messages: [
          { role: "system", content: `${SCOPE_RULE}\n\n${params.system}` },
          { role: "user", content: params.user },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new AiProviderError("Permintaan ke layanan AI gagal");
    const provider = providerResponseSchema.parse(await response.json());
    return params.schema.parse(JSON.parse(provider.choices[0]!.message.content));
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    throw new AiProviderError("Respons layanan AI tidak valid");
  } finally {
    clearTimeout(timeout);
  }
}

const strArray = { type: "array", items: { type: "string" } } as const;
const nullableNumber = { type: ["number", "null"] } as const;
const nullableString = { type: ["string", "null"] } as const;

// ---------------------------------------------------------------------------
// 1. Supporting document extraction
// ---------------------------------------------------------------------------

export const SUPPORTING_DOCUMENT_TYPES = ["slip_gaji", "mutasi_rekening", "nib", "npwp"] as const;
export type SupportingDocumentType = (typeof SUPPORTING_DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<SupportingDocumentType, string> = {
  slip_gaji: "Slip gaji",
  mutasi_rekening: "Mutasi rekening",
  nib: "NIB (Nomor Induk Berusaha)",
  npwp: "NPWP",
};

export const documentExtractionInputSchema = z.object({
  documentType: z.enum(SUPPORTING_DOCUMENT_TYPES),
  imageBase64: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png"]),
  declared: z.object({
    customerName: z.string().max(255).optional(),
    businessName: z.string().max(255).optional(),
    monthlyRevenue: z.number().nonnegative().optional(),
    monthlyExpenses: z.number().nonnegative().optional(),
    existingDebt: z.number().nonnegative().optional(),
  }).optional(),
});

const documentExtractionSchema = z.object({
  holderName: z.string().nullable(),
  businessName: z.string().nullable(),
  documentNumber: z.string().nullable(),
  monthlyIncome: z.number().nonnegative().nullable(),
  monthlyExpenses: z.number().nonnegative().nullable(),
  existingInstallment: z.number().nonnegative().nullable(),
  periodCovered: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
}).strict();

export type DocumentExtractionResult = z.infer<typeof documentExtractionSchema> & {
  documentType: SupportingDocumentType;
  mismatches: string[];
  model: string;
};

function validateImage(imageBase64: string, contentType: "image/jpeg" | "image/png") {
  const maxLength = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
  if (imageBase64.length > maxLength || imageBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(imageBase64)) {
    throw new AiInputError("Data gambar tidak valid");
  }
  const bytes = Buffer.from(imageBase64, "base64");
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) throw new AiInputError("Ukuran gambar maksimal 5 MB");
  const isJpeg = contentType === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = contentType === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!isJpeg && !isPng) throw new AiInputError("Isi file tidak sesuai format gambar");
}

const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function compareWithDeclared(
  extracted: z.infer<typeof documentExtractionSchema>,
  declared: z.infer<typeof documentExtractionInputSchema>["declared"],
): string[] {
  if (!declared) return [];
  const mismatches: string[] = [];
  const differs = (a: number, b: number) => b > 0 && Math.abs(a - b) / b > 0.2;
  if (extracted.holderName && declared.customerName && normalizeName(declared.customerName) &&
      !normalizeName(extracted.holderName).includes(normalizeName(declared.customerName)) &&
      !normalizeName(declared.customerName).includes(normalizeName(extracted.holderName))) {
    mismatches.push(`Nama di dokumen (${extracted.holderName}) berbeda dengan nama nasabah (${declared.customerName}).`);
  }
  if (extracted.businessName && declared.businessName && normalizeName(declared.businessName) &&
      !normalizeName(extracted.businessName).includes(normalizeName(declared.businessName)) &&
      !normalizeName(declared.businessName).includes(normalizeName(extracted.businessName))) {
    mismatches.push(`Nama usaha di dokumen (${extracted.businessName}) berbeda dengan yang diisi (${declared.businessName}).`);
  }
  if (extracted.monthlyIncome !== null && declared.monthlyRevenue && differs(extracted.monthlyIncome, declared.monthlyRevenue)) {
    mismatches.push(`Pendapatan di dokumen (Rp ${extracted.monthlyIncome.toLocaleString("id-ID")}) berbeda lebih dari 20% dari yang diisi (Rp ${declared.monthlyRevenue.toLocaleString("id-ID")}).`);
  }
  if (extracted.monthlyExpenses !== null && declared.monthlyExpenses && differs(extracted.monthlyExpenses, declared.monthlyExpenses)) {
    mismatches.push(`Pengeluaran di dokumen (Rp ${extracted.monthlyExpenses.toLocaleString("id-ID")}) berbeda lebih dari 20% dari yang diisi (Rp ${declared.monthlyExpenses.toLocaleString("id-ID")}).`);
  }
  if (extracted.existingInstallment !== null && declared.existingDebt !== undefined && extracted.existingInstallment > (declared.existingDebt ?? 0) * 1.2 + 1) {
    mismatches.push(`Angsuran yang terlihat di dokumen (Rp ${extracted.existingInstallment.toLocaleString("id-ID")}) lebih besar dari angsuran existing yang diisi (Rp ${(declared.existingDebt ?? 0).toLocaleString("id-ID")}).`);
  }
  return mismatches;
}

export async function extractSupportingDocument(
  input: z.infer<typeof documentExtractionInputSchema>,
  options?: FetchOptions,
): Promise<DocumentExtractionResult> {
  validateImage(input.imageBase64, input.contentType);
  const label = DOCUMENT_LABELS[input.documentType];
  const extracted = await callOpenRouterJson({
    name: "supporting_document_extraction",
    schema: documentExtractionSchema,
    maxTokens: 700,
    options,
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        holderName: nullableString,
        businessName: nullableString,
        documentNumber: nullableString,
        monthlyIncome: nullableNumber,
        monthlyExpenses: nullableNumber,
        existingInstallment: nullableNumber,
        periodCovered: nullableString,
        confidence: { type: "number", minimum: 0, maximum: 1 },
        warnings: strArray,
      },
      required: ["holderName", "businessName", "documentNumber", "monthlyIncome", "monthlyExpenses", "existingInstallment", "periodCovered", "confidence", "warnings"],
    },
    system:
      `Ekstrak data dari dokumen pendukung pembiayaan berjenis "${label}". Nilai uang dalam Rupiah sebagai angka tanpa titik. ` +
      "Untuk slip gaji: monthlyIncome = gaji bersih per bulan, existingInstallment = potongan angsuran pinjaman jika ada. " +
      "Untuk mutasi rekening: monthlyIncome = rata-rata total kredit (uang masuk) per bulan, monthlyExpenses = rata-rata total debit per bulan, existingInstallment = debit rutin yang tampak sebagai angsuran pinjaman. " +
      "Untuk NIB/NPWP: isi holderName, businessName, dan documentNumber; field uang null. " +
      "Field yang tidak terlihat jelas diisi null dan beri peringatan. Jika dokumen tampak bukan jenis yang diminta, tulis peringatan.",
    user: [
      { type: "text", text: `Baca dokumen ${label} ini dan kembalikan JSON sesuai skema.` },
      { type: "image_url", image_url: { url: `data:${input.contentType};base64,${input.imageBase64}` } },
    ],
  });
  return {
    ...extracted,
    warnings: extracted.warnings.map(w => w.trim()).filter(Boolean),
    documentType: input.documentType,
    mismatches: compareWithDeclared(extracted, input.declared),
    model: OPENROUTER_ASSIST_MODEL,
  };
}

// ---------------------------------------------------------------------------
// Shared application snapshot for text-based assists
// ---------------------------------------------------------------------------

export type ApplicationSnapshot = {
  customerName: string;
  customerId: string;
  businessName: string;
  businessType: string;
  businessAge: number;
  address: string;
  monthlyRevenue: number;
  monthlyExpenses: number;
  existingDebt: number;
  collateralValue: number;
  requestedAmount: number;
  financingTenor: number;
  marginRate: number;
  financingAkad: string;
  loanPurpose: string;
  businessShariaCompliant: string;
  shariaComplianceNotes?: string | null;
  legalDocuments: Array<{ type: string; status: string }>;
};

function describeApplication(app: ApplicationSnapshot): string {
  const rp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
  return [
    `Nama usaha: ${app.businessName}`,
    `Jenis usaha: ${app.businessType}`,
    `Lama usaha: ${app.businessAge} bulan`,
    `Alamat: ${app.address}`,
    `Pendapatan bulanan: ${rp(app.monthlyRevenue)}`,
    `Pengeluaran bulanan: ${rp(app.monthlyExpenses)}`,
    `Angsuran existing per bulan: ${rp(app.existingDebt)}`,
    `Nilai agunan: ${rp(app.collateralValue)}`,
    `Pembiayaan diajukan: ${rp(app.requestedAmount)}`,
    `Tenor: ${app.financingTenor} bulan`,
    `Margin/ujrah: ${app.marginRate}%`,
    `Akad: ${app.financingAkad}`,
    `Tujuan pembiayaan: ${app.loanPurpose}`,
    `Kepatuhan syariah usaha (isian analis): ${app.businessShariaCompliant}`,
    app.shariaComplianceNotes ? `Catatan syariah: ${app.shariaComplianceNotes}` : "",
    `Dokumen legal: ${app.legalDocuments.map(d => `${d.type} (${d.status})`).join(", ") || "-"}`,
  ].filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// 2. Data consistency check (rules + AI)
// ---------------------------------------------------------------------------

export type ConsistencyIssue = { severity: "tinggi" | "sedang" | "rendah"; field: string; message: string; source: "aturan" | "ai" };
export type ConsistencyResult = { issues: ConsistencyIssue[]; summary: string; aiStatus: "generated" | "unavailable"; model: string | null };

export function ruleConsistencyIssues(app: ApplicationSnapshot): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const add = (severity: ConsistencyIssue["severity"], field: string, message: string) =>
    issues.push({ severity, field, message, source: "aturan" });
  if (!/^\d{16}$/.test(app.customerId.trim())) {
    add("sedang", "NIK", "NIK tidak terdiri dari 16 digit angka.");
  }
  if (app.monthlyRevenue <= 0) add("tinggi", "Pendapatan", "Pendapatan bulanan kosong atau nol.");
  if (app.monthlyExpenses >= app.monthlyRevenue && app.monthlyRevenue > 0) {
    add("tinggi", "Pengeluaran", "Pengeluaran bulanan sama dengan atau melebihi pendapatan, sehingga tidak ada sisa untuk angsuran.");
  }
  const surplus = app.monthlyRevenue - app.monthlyExpenses - app.existingDebt;
  const newInstallment = app.financingTenor > 0 ? (app.requestedAmount * (1 + app.marginRate / 100)) / app.financingTenor : 0;
  if (surplus > 0 && newInstallment > surplus) {
    add("tinggi", "Kapasitas bayar", `Perkiraan angsuran baru (Rp ${Math.round(newInstallment).toLocaleString("id-ID")}) melebihi sisa pendapatan setelah pengeluaran dan angsuran existing (Rp ${Math.round(surplus).toLocaleString("id-ID")}).`);
  }
  if (app.collateralValue > 0 && app.requestedAmount > app.collateralValue) {
    add("sedang", "Agunan", "Nilai pembiayaan melebihi nilai agunan.");
  }
  if (app.monthlyRevenue > 0 && app.requestedAmount > app.monthlyRevenue * 36) {
    add("sedang", "Plafon", "Pembiayaan diajukan lebih dari 36 kali pendapatan bulanan.");
  }
  if (app.financingAkad === "murabahah" && app.marginRate <= 0) {
    add("sedang", "Margin", "Akad murabahah tetapi margin tercatat 0%.");
  }
  if (app.businessAge < 6) add("rendah", "Lama usaha", "Usaha berjalan kurang dari 6 bulan.");
  const missingDocs = app.legalDocuments.filter(d => d.status === "missing" || d.status === "pending");
  if (missingDocs.length > 0) {
    add("rendah", "Dokumen", `Dokumen belum lengkap/terverifikasi: ${missingDocs.map(d => d.type).join(", ")}.`);
  }
  return issues;
}

const aiConsistencySchema = z.object({
  issues: z.array(z.object({
    severity: z.enum(["tinggi", "sedang", "rendah"]),
    field: z.string(),
    message: z.string(),
  }).strict()),
  summary: z.string(),
}).strict();

export async function checkApplicationConsistency(app: ApplicationSnapshot, options?: FetchOptions): Promise<ConsistencyResult> {
  const ruleIssues = ruleConsistencyIssues(app);
  try {
    const ai = await callOpenRouterJson({
      name: "application_consistency",
      schema: aiConsistencySchema,
      maxTokens: 900,
      options,
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          issues: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                severity: { type: "string", enum: ["tinggi", "sedang", "rendah"] },
                field: { type: "string" },
                message: { type: "string" },
              },
              required: ["severity", "field", "message"],
            },
          },
          summary: { type: "string" },
        },
        required: ["issues", "summary"],
      },
      system:
        "Periksa konsistensi data pengajuan pembiayaan sebelum dinilai. Cari hal yang tidak masuk akal atau saling bertentangan, misalnya jenis usaha yang tidak cocok dengan nama usaha, " +
        "omzet yang tidak wajar untuk jenis dan lama usaha, tujuan pembiayaan yang tidak sesuai dengan usaha, atau alamat yang tidak konsisten (kecamatan/kota/provinsi). " +
        "Jangan ulangi temuan yang sudah ditemukan aturan otomatis. Jika tidak ada temuan, kembalikan issues kosong. summary maksimal 2 kalimat.",
      user: `${describeApplication(app)}\n\nTemuan aturan otomatis (jangan diulang):\n${ruleIssues.map(i => `- ${i.message}`).join("\n") || "-"}`,
    });
    return {
      issues: [...ruleIssues, ...ai.issues.map(i => ({ ...i, source: "ai" as const }))],
      summary: ai.summary,
      aiStatus: "generated",
      model: OPENROUTER_ASSIST_MODEL,
    };
  } catch {
    return {
      issues: ruleIssues,
      summary: ruleIssues.length ? "Pemeriksaan AI tidak tersedia; ditampilkan hasil pemeriksaan aturan otomatis." : "Tidak ada temuan dari aturan otomatis. Pemeriksaan AI tidak tersedia.",
      aiStatus: "unavailable",
      model: null,
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Sharia conformity check grounded in DSN-MUI fatwa
// ---------------------------------------------------------------------------

const FATWA_FILES: Record<string, Array<[string, string]>> = {
  murabahah: [["Fatwa DSN-MUI No. 04/2000 tentang Murabahah", "04-Murabahah.txt"], ["Fatwa DSN-MUI No. 111/2017 tentang Akad Jual Beli Murabahah", "111_-_Akad_Jual_Beli_Murabahah.txt"]],
  mudharabah: [["Fatwa DSN-MUI No. 115/2017 tentang Akad Mudharabah", "115_-_Akad_Mudharabah.txt"]],
  qardh: [["Fatwa DSN-MUI No. 19/2001 tentang Al-Qardh", "19-Qardh.txt"]],
  multijasa: [["Fatwa DSN-MUI No. 112/2017 tentang Akad Ijarah", "112_-_Akad_Ijarah.txt"]],
};
const FATWA_CHAR_LIMIT = 14_000;

function loadFatwaContext(akad: string): { titles: string[]; text: string } {
  const entries = FATWA_FILES[akad] ?? FATWA_FILES.murabahah!;
  const perFile = Math.floor(FATWA_CHAR_LIMIT / entries.length);
  const parts: string[] = [];
  const titles: string[] = [];
  for (const [title, file] of entries) {
    try {
      const text = readFileSync(join(process.cwd(), "knowledge_base", file), "utf8").replace(/\s+/g, " ");
      parts.push(`### ${title}\n${text.slice(0, perFile)}`);
      titles.push(title);
    } catch {
      continue;
    }
  }
  return { titles, text: parts.join("\n\n") };
}

const shariaCheckSchema = z.object({
  verdict: z.enum(["sesuai", "perlu_klarifikasi", "tidak_sesuai"]),
  summary: z.string(),
  findings: z.array(z.object({ point: z.string(), reference: z.string() }).strict()),
  clarifications: z.array(z.string()),
}).strict();

export type ShariaCheckResult = z.infer<typeof shariaCheckSchema> & { sources: string[]; model: string };

export async function checkShariaConformity(app: ApplicationSnapshot, options?: FetchOptions): Promise<ShariaCheckResult> {
  const fatwa = loadFatwaContext(app.financingAkad);
  const result = await callOpenRouterJson({
    name: "sharia_conformity",
    schema: shariaCheckSchema,
    maxTokens: 1000,
    options,
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        verdict: { type: "string", enum: ["sesuai", "perlu_klarifikasi", "tidak_sesuai"] },
        summary: { type: "string" },
        findings: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: { point: { type: "string" }, reference: { type: "string" } },
            required: ["point", "reference"],
          },
        },
        clarifications: strArray,
      },
      required: ["verdict", "summary", "findings", "clarifications"],
    },
    system:
      "Periksa apakah jenis usaha dan tujuan pembiayaan pengajuan ini sesuai dengan akad yang dipilih, berdasarkan kutipan fatwa DSN-MUI yang diberikan. " +
      "Fokus pada: halal-tidaknya objek/usaha, kecocokan tujuan pembiayaan dengan karakter akad (misal murabahah untuk pembelian barang, bukan modal kerja tunai tanpa barang), dan ketentuan fatwa yang relevan. " +
      "Setiap findings wajib menyebut rujukan fatwa (nomor dan bagian/ketentuan) dari teks yang diberikan; jangan mengutip fatwa yang tidak ada dalam teks. " +
      "clarifications berisi pertanyaan yang perlu dikonfirmasi analis ke nasabah. Ini catatan pendukung pilar Kepatuhan Syariah, bukan fatwa atau keputusan.",
    user: `DATA PENGAJUAN\n${describeApplication(app)}\n\nKUTIPAN FATWA DSN-MUI\n${fatwa.text || "(teks fatwa tidak tersedia)"}`,
  });
  return { ...result, sources: fatwa.titles, model: OPENROUTER_ASSIST_MODEL };
}

// ---------------------------------------------------------------------------
// 4. Committee brief
// ---------------------------------------------------------------------------

export type CommitteeBriefInput = {
  application: ApplicationSnapshot;
  assessment: {
    totalScore: number;
    classification: string;
    sustainableFinanceScore: number;
    shariaScore: number;
    legalScore: number;
    strengths: string | null;
    riskFactors: string | null;
  } | null;
  policy: {
    dsrRatio: number;
    isDsrCompliant: boolean;
    approvalAuthority: string;
    appraisal: string;
  };
};

const committeeBriefSchema = z.object({
  headline: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  questions: z.array(z.string()),
}).strict();

export type CommitteeBriefResult = z.infer<typeof committeeBriefSchema> & { model: string };

export async function generateCommitteeBrief(input: CommitteeBriefInput, options?: FetchOptions): Promise<CommitteeBriefResult> {
  const a = input.assessment;
  const result = await callOpenRouterJson({
    name: "committee_brief",
    schema: committeeBriefSchema,
    maxTokens: 900,
    options,
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: { headline: { type: "string" }, pros: strArray, cons: strArray, questions: strArray },
      required: ["headline", "pros", "cons", "questions"],
    },
    system:
      "Susun ringkasan satu halaman untuk rapat komite pembiayaan. headline: 1 kalimat posisi pengajuan tanpa menyatakan disetujui/ditolak. " +
      "pros: 3-5 poin pendukung kelayakan. cons: 3-5 poin risiko atau kelemahan. questions: 3-5 pertanyaan yang perlu diklarifikasi komite sebelum memutuskan. " +
      "Gunakan angka dari data. Jangan mengubah skor atau klasifikasi.",
    user: [
      "DATA PENGAJUAN",
      describeApplication(input.application),
      "",
      "HASIL PENILAIAN SSCI",
      a ? `Total skor ${a.totalScore} (${a.classification}); Keuangan ${a.sustainableFinanceScore}/55, Syariah ${a.shariaScore}/25, Legal ${a.legalScore}/20.\nKekuatan: ${a.strengths ?? "-"}\nFaktor risiko: ${a.riskFactors ?? "-"}` : "Belum dinilai.",
      "",
      "KEBIJAKAN BPRS",
      `DSR ${input.policy.dsrRatio}% (${input.policy.isDsrCompliant ? "memenuhi" : "melebihi"} batas 40%). Kewenangan memutus: ${input.policy.approvalAuthority}. Taksasi agunan: ${input.policy.appraisal}.`,
    ].join("\n"),
  });
  return { ...result, model: OPENROUTER_ASSIST_MODEL };
}
