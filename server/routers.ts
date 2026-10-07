import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, checkerProcedure, isSuperAdmin, makerProcedure, needsTwoFactorSetup, publicProcedure, protectedProcedure, router, superAdminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { calculateRecommendedPlafon, calculateSSCI } from "./scoring";
import { TRPCError } from "@trpc/server";
import { generatePdfReport } from "./pdfReport";
import { evaluateBprsPolicy } from "@shared/bprsPolicy";
import {
  SSCI_LEGAL_DOCUMENT_STATUSES,
  SSCI_METHODOLOGY_VERSION,
  SSCI_REQUIRED_LEGAL_DOCUMENTS,
} from "@shared/ssciMethodology";
import { generateNarrativeRecommendation } from "./openRouterRecommendations";
import { hashPassword, verifyPassword } from "./passwordAuth";
import { decodeLogo, LOGO_CONTENT_TYPES, LogoUploadError, storeLogo } from "./logoUpload";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { CONTENT_TYPES, DOCUMENT_TYPES, decodeDocumentData, sanitizeOriginalName, storeDocument } from "./documentUpload";
import { isSameActor, maskNik } from "@shared/privacy";
import { runSensitivity } from "./sensitivity";
import { determineReviewTrack, evaluateExitGate } from "@shared/reviewTrack";
import { buildEnrollment, clearLoginFailures, decryptSecret, encryptSecret, generateTotpSecret, isLoginLocked, recordLoginFailure, verifyTotp } from "./twoFactor";
import { AiInputError, AiProviderError, blockingIssues, checkApplicationConsistency, mergeFallbackRecommendation, mergeRiskFactors, ruleConsistencyIssues, checkShariaConformity, documentExtractionInputSchema, extractSupportingDocument, generateCommitteeBrief, type ApplicationSnapshot, bankStatementInputSchema, readBankStatement, draftBprsNarrative, explainScoreComparison } from "./aiAssist";
import { extractKtpOcr, KtpOcrInputError, KtpOcrProviderError, ktpOcrInputSchema } from "./ktpOcr";
import { FinancialImportError, parseFinancialCsv } from "./financialImport";
import { calculateMurabahahBreakdown } from "./murabahah";
import { analyzeSurveyImage, decodeSurveyImage, storeSurveyImage, SURVEY_CONTENT_TYPES, SurveyUploadError, SurveyProviderError } from "./surveyAnalysis";
import { AKAD_TO_BPRS, bprsProfileSchema, checkBprsProfile, computeBprsScore, lamaUsahaFromMonths } from "@shared/bprsTemplate";
import { bprsWorkbookFilename, fillFluktuatifWorkbook, loadFluktuatifTemplate, type BprsExportApplication } from "./bprsExcel";
import { readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";

const nonNegativeMoney = z
  .string()
  .regex(/^\d+(?:\.\d{1,2})?$/, "Nilai keuangan tidak valid");
const positiveMoney = nonNegativeMoney.refine(value => Number(value) > 0, {
  message: "Nilai harus lebih dari nol",
});

const legalDocumentsSchema = z
  .array(
    z.object({
      type: z.string().trim().min(1).max(100),
      status: z.enum(SSCI_LEGAL_DOCUMENT_STATUSES),
      notes: z.string().trim().max(500).optional(),
    })
  )
  .min(1)
  .refine(documents => new Set(documents.map(document => document.type)).size === documents.length, {
    message: "Jenis dokumen tidak boleh duplikat",
  });

type ApplicationRecord = NonNullable<Awaited<ReturnType<typeof db.getApplicationById>>>;

function toSnapshot(application: ApplicationRecord): ApplicationSnapshot {
  return {
    customerName: application.customerName,
    customerId: application.customerId,
    businessName: application.businessName,
    businessType: application.businessType,
    businessAge: Number(application.businessAge),
    address: application.address,
    monthlyRevenue: Number(application.monthlyRevenue),
    monthlyExpenses: Number(application.monthlyExpenses),
    existingDebt: Number(application.existingDebt),
    collateralValue: Number(application.collateralValue),
    requestedAmount: Number(application.requestedAmount),
    financingTenor: Number(application.financingTenor),
    marginRate: Number(application.marginRate),
    financingAkad: application.financingAkad || "murabahah",
    loanPurpose: application.loanPurpose,
    businessShariaCompliant: application.businessShariaCompliant,
    shariaComplianceNotes: application.shariaComplianceNotes,
    legalDocuments: Array.isArray(application.legalDocuments) ? application.legalDocuments.map(d => ({ type: d.type, status: d.status })) : [],
  };
}

function policyFor(application: ApplicationRecord) {
  return evaluateBprsPolicy({
    requestedAmount: Number(application.requestedAmount),
    collateralValue: Number(application.collateralValue),
    monthlyRevenue: Number(application.monthlyRevenue),
    monthlyExpenses: Number(application.monthlyExpenses),
    existingDebt: Number(application.existingDebt),
    tenorMonths: Number(application.financingTenor),
    marginRate: Number(application.marginRate),
    isRelatedParty: application.isRelatedParty === "yes",
    relatedPartyRelation: application.relatedPartyRelation || undefined,
    isNonIndividual: application.businessType?.toLowerCase().includes("pt") ||
      application.businessType?.toLowerCase().includes("cv") ||
      application.businessType?.toLowerCase().includes("badan"),
  });
}

async function loadApplicationOrThrow(applicationId: number, organizationId: number) {
  const application = await db.getApplicationById(applicationId, organizationId);
  if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Pengajuan tidak ditemukan" });
  return application;
}

function toSafeUser<T extends { passwordHash?: unknown; twoFactorSecret?: unknown; twoFactorLastStep?: unknown }>(user: T) {
  const { passwordHash: _passwordHash, twoFactorSecret: _secret, twoFactorLastStep: _lastStep, ...safeUser } = user;
  return safeUser;
}

function parseTicket(ticketOrId: string): number {
  const id = Number.parseInt(ticketOrId.trim().replace(/^SSCI-/i, "").replace(/^0+/, ""), 10);
  if (Number.isNaN(id) || id <= 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Nomor tiket pengajuan tidak valid" });
  }
  return id;
}

async function computeExitGate(application: ApplicationRecord, organizationId: number) {
  const [documents, photos, requests] = await Promise.all([
    db.getDocumentFiles(application.id, organizationId),
    db.listSurveyPhotos(organizationId, application.id),
    db.listCustomerRequests(application.id, organizationId),
  ]);
  return evaluateExitGate({
    track: determineReviewTrack(application),
    documents,
    surveyPhotoCount: photos.length,
    openCustomerRequests: requests.filter(r => r.status === "open").length,
  });
}

const AI_UNAVAILABLE = "Layanan AI sedang tidak tersedia. Coba lagi beberapa saat lagi.";

function toBprsApplication(application: ApplicationRecord): BprsExportApplication {
  return {
    customerName: application.customerName,
    customerId: application.customerId,
    address: application.address,
    phone: application.phone,
    businessName: application.businessName,
    businessType: application.businessType,
    loanPurpose: application.loanPurpose,
    businessAge: application.businessAge,
    monthlyRevenue: Number(application.monthlyRevenue),
    monthlyExpenses: Number(application.monthlyExpenses),
    existingDebt: Number(application.existingDebt),
    collateralValue: Number(application.collateralValue),
    requestedAmount: Number(application.requestedAmount),
    financingTenor: application.financingTenor,
    marginRate: Number(application.marginRate),
    financingAkad: application.financingAkad ?? null,
    createdAt: application.createdAt,
  };
}

const BPRS_LOCKED_STATUSES = new Set(["approved", "rejected", "cancelled"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      return {
        ...toSafeUser(ctx.user),
        needsTwoFactorSetup: needsTwoFactorSetup(ctx.user),
        isSuperAdmin: isSuperAdmin(ctx.user),
      };
    }),
    login: publicProcedure
      .input(z.object({
        email: z.string().trim().email().max(320),
        password: z.string().min(4).max(200),
        otp: z.string().trim().max(10).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const email = input.email.toLowerCase();
        const limiterKey = `${email}|${ctx.req.ip ?? ""}`;
        if (isLoginLocked(limiterKey)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit." });
        }
        const user = await db.getUserByEmail(email);
        if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
          recordLoginFailure(limiterKey);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email atau password salah" });
        }
        if (!user.active) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Akun ini telah dinonaktifkan. Hubungi administrator BPRS." });
        }
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          if (!input.otp) return { success: false, requiresTwoFactor: true } as const;
          const step = verifyTotp(decryptSecret(user.twoFactorSecret), input.otp, { lastUsedStep: user.twoFactorLastStep });
          if (step === null) {
            recordLoginFailure(limiterKey);
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Kode autentikasi salah atau kedaluwarsa" });
          }
          await db.updateTwoFactor(user.id, { twoFactorLastStep: step });
        }
        clearLoginFailures(limiterKey);
        const organization = await db.getOrganizationById(user.organizationId);
        if (organization?.registrationStatus === "pending") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Pendaftaran BPRS masih menunggu verifikasi" });
        }
        const token = await sdk.signSession({
          openId: user.openId,
          appId: ENV.appId,
          name: user.name || user.email || "Pengguna SSCI",
        });
        ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
        return { success: true, requiresTwoFactor: false } as const;
      }),
    setupTwoFactor: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.twoFactorEnabled) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Autentikasi dua faktor sudah aktif" });
        }
        const secret = generateTotpSecret();
        await db.updateTwoFactor(ctx.user.id, { twoFactorSecret: encryptSecret(secret), twoFactorEnabled: false, twoFactorLastStep: null });
        return buildEnrollment(secret, ctx.user.email || ctx.user.name || `user-${ctx.user.id}`);
      }),
    enableTwoFactor: protectedProcedure
      .input(z.object({ code: z.string().trim().min(6).max(10) }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user?.twoFactorSecret) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Mulai pengaturan 2FA terlebih dahulu" });
        }
        const step = verifyTotp(decryptSecret(user.twoFactorSecret), input.code);
        if (step === null) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Kode tidak sesuai. Pastikan jam ponsel sudah benar lalu coba lagi." });
        }
        await db.updateTwoFactor(user.id, { twoFactorEnabled: true, twoFactorLastStep: step });
        await db.recordAuditEvent({ organizationId: user.organizationId, actorUserId: user.id, action: "TWO_FACTOR_ENABLED", entityType: "user", entityId: user.id });
        return { success: true };
      }),
    disableTwoFactor: protectedProcedure
      .input(z.object({ password: z.string().min(4).max(200), code: z.string().trim().min(6).max(10) }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Autentikasi dua faktor belum aktif" });
        }
        if (!user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Password saat ini tidak sesuai" });
        }
        if (verifyTotp(decryptSecret(user.twoFactorSecret), input.code, { lastUsedStep: user.twoFactorLastStep }) === null) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Kode autentikasi salah atau kedaluwarsa" });
        }
        await db.updateTwoFactor(user.id, { twoFactorSecret: null, twoFactorEnabled: false, twoFactorLastStep: null });
        await db.recordAuditEvent({ organizationId: user.organizationId, actorUserId: user.id, action: "TWO_FACTOR_DISABLED", entityType: "user", entityId: user.id });
        return { success: true };
      }),
    registerBprs: publicProcedure
      .input(z.object({
        organizationName: z.string().trim().min(2).max(255),
        organizationSlug: z.string().trim().min(3).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung"),
        adminName: z.string().trim().min(2).max(255),
        email: z.string().trim().email().max(320),
        password: z.string().min(8).max(200),
      }))
      .mutation(async ({ input }) => {
        const email = input.email.toLowerCase();
        if (await db.getUserByEmail(email)) {
          throw new TRPCError({ code: "CONFLICT", message: "Email sudah terdaftar" });
        }
        try {
          await db.registerBprs({ ...input, organizationName: input.organizationName.trim(), organizationSlug: input.organizationSlug.trim(), adminName: input.adminName.trim(), email, passwordHash: await hashPassword(input.password) });
        } catch (error) {
          if (error instanceof Error && /duplicate|unique/i.test(error.message)) {
            throw new TRPCError({ code: "CONFLICT", message: "Email atau slug sudah terdaftar" });
          }
          throw error;
        }
        return { success: true };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(4).max(200),
        newPassword: z.string().min(8).max(200).refine(
          value => /[a-zA-Z]/.test(value) && /\d/.test(value),
          { message: "Password harus mengandung minimal satu huruf dan satu angka" }
        ),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user?.passwordHash || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Password saat ini tidak sesuai" });
        }
        const newPasswordHash = await hashPassword(input.newPassword);
        await db.updateUserPassword(user.id, newPasswordHash);
        return { success: true };
      }),
    checkPasswordExpiry: protectedProcedure
      .query(async ({ ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pengguna tidak ditemukan" });
        }
        const daysSinceChange = Math.floor((Date.now() - user.passwordChangedAt.getTime()) / 86400000);
        return {
          expired: daysSinceChange > 90,
          daysSinceChange,
        };
      }),
  }),

  organization: router({
    getSettings: protectedProcedure
      .query(async ({ ctx }) => {
        const organization = await db.getOrganizationById(ctx.user.organizationId);
        if (!organization) throw new TRPCError({ code: "NOT_FOUND", message: "Organisasi tidak ditemukan" });
        return organization;
      }),
    updateSettings: adminProcedure
      .input(z.object({
        name: z.string().trim().min(2).max(255).optional(),
        legalName: z.string().trim().min(2).max(255).optional(),
        address: z.string().trim().max(2000).nullable().optional(),
        phone: z.string().trim().max(50).nullable().optional(),
        email: z.string().trim().email().max(320).nullable().optional(),
        logoUrl: z.string().trim().max(500).nullable().optional(),
        primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Warna harus format hex").optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateOrganizationSettings(ctx.user.organizationId, input);
        return { success: true };
      }),
    uploadLogo: adminProcedure
      .input(z.object({
        data: z.string().min(1).max(2_800_000),
        contentType: z.enum(LOGO_CONTENT_TYPES),
      }))
      .mutation(async ({ input, ctx }) => {
        let bytes: Buffer;
        try {
          bytes = decodeLogo(input.data, input.contentType);
        } catch (error) {
          if (error instanceof LogoUploadError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          throw new TRPCError({ code: "BAD_REQUEST", message: "Logo tidak dapat diproses" });
        }
        const storedName = await storeLogo(bytes, input.contentType);
        const logoUrl = `/uploads/${storedName}`;
        await db.updateOrganizationSettings(ctx.user.organizationId, { logoUrl });
        return { logoUrl };
      }),
    updateOperatorProfile: protectedProcedure
      .input(z.object({
        name: z.string().trim().min(2).max(255).optional(),
        position: z.string().trim().max(100).nullable().optional(),
        phone: z.string().trim().max(50).nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
    createUser: adminProcedure
      .input(z.object({
        name: z.string().trim().min(2).max(255),
        email: z.string().trim().email().max(320),
        password: z.string().min(6).max(200),
        position: z.string().trim().max(100).optional(),
        phone: z.string().trim().max(50).optional(),
        role: z.enum(["maker", "checker"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const email = input.email.toLowerCase();
        const existing = await db.getUserByEmail(email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Email sudah terdaftar" });
        }
        try {
          await db.createTeamUser({
            organizationId: ctx.user.organizationId,
            name: input.name.trim(),
            email,
            position: input.position,
            phone: input.phone,
            passwordHash: await hashPassword(input.password),
            role: input.role,
          });
        } catch (error) {
          if (error instanceof Error && /duplicate|unique/i.test(error.message)) {
            throw new TRPCError({ code: "CONFLICT", message: "Email sudah terdaftar" });
          }
          throw error;
        }
        return { success: true };
      }),
    listUsers: adminProcedure
      .query(async ({ ctx }) => {
        const users = await db.listOrganizationUsers(ctx.user.organizationId);
        return users.map(toSafeUser);
      }),
    setUserActive: adminProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        active: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Tidak dapat menonaktifkan akun sendiri" });
        }
        await db.setUserActive(ctx.user.organizationId, input.userId, input.active);
        return { success: true };
      }),
    resetUserTwoFactor: adminProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const target = await db.getUserById(input.userId);
        if (!target || target.organizationId !== ctx.user.organizationId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pengguna tidak ditemukan" });
        }
        await db.updateTwoFactor(target.id, { twoFactorSecret: null, twoFactorEnabled: false, twoFactorLastStep: null });
        await db.recordAuditEvent({ organizationId: ctx.user.organizationId, actorUserId: ctx.user.id, action: "TWO_FACTOR_RESET", entityType: "user", entityId: target.id });
        return { success: true };
      }),
    getCreditPolicy: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getCreditPolicy(ctx.user.organizationId);
      }),
    updateCreditPolicy: adminProcedure
      .input(z.object({
        dscrMin: z.number().min(1).max(10),
        ltvMax: z.number().min(1).max(100),
        maxPlafon: z.number().min(0).nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.upsertCreditPolicy(ctx.user.organizationId, {
          dscrMin: input.dscrMin,
          ltvMax: input.ltvMax,
          maxPlafon: input.maxPlafon,
          updatedBy: ctx.user.id,
        });
        return { success: true };
      }),
    auditLog: adminProcedure
      .input(z.object({
        limit: z.number().int().positive().max(500).optional(),
        offset: z.number().int().min(0).optional(),
        action: z.string().trim().max(64).optional(),
      }).optional())
      .query(({ input, ctx }) => db.listAuditLogs(ctx.user.organizationId, input)),
  }),

  notifications: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.listNotifications(ctx.user.organizationId, ctx.user.id);
      }),
    unreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        return db.countUnreadNotifications(ctx.user.organizationId, ctx.user.id);
      }),
    markRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        return db.markNotificationsRead(ctx.user.organizationId, ctx.user.id);
      }),
  }),

  applications: router({
    trackStatus: publicProcedure
      .input(z.object({
        ticketOrId: z.string().trim().min(1).max(50),
        customerIdLast4: z.string().trim().length(4, "Masukkan 4 digit terakhir NIK / ID"),
      }))
      .query(async ({ input }) => {
        const id = parseTicket(input.ticketOrId);
        const limiterKey = `track:${id}`;
        if (isLoginLocked(limiterKey)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." });
        }

        const data = await db.trackApplicationPublic(id, input.customerIdLast4);
        if (!data) {
          recordLoginFailure(limiterKey);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Pengajuan tidak ditemukan atau 4 digit terakhir NIK tidak sesuai",
          });
        }
        return data;
      }),

    submitCustomerRequest: publicProcedure
      .input(z.object({
        ticketOrId: z.string().trim().min(1).max(50),
        customerIdLast4: z.string().trim().length(4),
        type: z.enum(["pembaruan_data", "peninjauan_keputusan"]),
        message: z.string().trim().min(20, "Jelaskan permintaan Anda minimal 20 karakter").max(1000),
        contactPhone: z.string().trim().max(30).regex(/^[0-9+\-\s]*$/, "Nomor telepon tidak valid").optional(),
      }))
      .mutation(async ({ input }) => {
        const id = parseTicket(input.ticketOrId);
        const limiterKey = `track:${id}`;
        if (isLoginLocked(limiterKey)) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." });
        }
        const application = await db.getApplicationForCustomer(id, input.customerIdLast4);
        if (!application) {
          recordLoginFailure(limiterKey);
          throw new TRPCError({ code: "NOT_FOUND", message: "Pengajuan tidak ditemukan atau 4 digit terakhir NIK tidak sesuai" });
        }
        if (input.type === "pembaruan_data" && application.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Pembaruan data hanya dapat diajukan sebelum pengajuan dinilai. Setelah keputusan, gunakan permintaan peninjauan ulang." });
        }
        if (input.type === "peninjauan_keputusan" && application.status !== "rejected") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Peninjauan ulang hanya dapat diajukan untuk pengajuan yang belum disetujui." });
        }
        const result = await db.createCustomerRequest({
          organizationId: application.organizationId,
          applicationId: application.id,
          type: input.type,
          message: input.message,
          contactPhone: input.contactPhone,
        });
        if (!result.created) {
          throw new TRPCError({ code: "CONFLICT", message: "Permintaan sejenis masih diproses oleh BPRS. Mohon tunggu tanggapan." });
        }
        const label = input.type === "pembaruan_data" ? "pembaruan data" : "peninjauan ulang keputusan";
        try {
          const recipients = (await db.listOrganizationUsers(application.organizationId))
            .filter(user => user.active && (user.role === "admin" || user.role === "checker" || user.id === application.submittedBy));
          for (const recipient of recipients) {
            await db.createNotification({
              organizationId: application.organizationId,
              userId: recipient.id,
              type: "CUSTOMER_REQUEST",
              title: `Permintaan ${label} dari nasabah`,
              content: `Tiket SSCI-${String(application.id).padStart(5, "0")}: nasabah mengajukan ${label}.`,
              applicationId: application.id,
            });
          }
        } catch (error) {
          console.warn("[Notification] Failed to notify about customer request:", error);
        }
        await db.recordAuditEvent({ organizationId: application.organizationId, actorUserId: 0, action: "CUSTOMER_REQUEST_CREATED", entityType: "application", entityId: application.id, metadata: { type: input.type, requestId: result.id } });
        return { success: true };
      }),

    listCustomerRequests: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        return db.listCustomerRequests(input.applicationId, ctx.user.organizationId);
      }),

    resolveCustomerRequest: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), resolutionNote: z.string().trim().min(10, "Tanggapan minimal 10 karakter").max(1000) }))
      .mutation(async ({ input, ctx }) => {
        const request = await db.resolveCustomerRequest({ id: input.id, organizationId: ctx.user.organizationId, resolvedBy: ctx.user.id, resolutionNote: input.resolutionNote });
        if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Permintaan tidak ditemukan atau sudah ditanggapi" });
        await db.recordAuditEvent({ organizationId: ctx.user.organizationId, actorUserId: ctx.user.id, action: "CUSTOMER_REQUEST_RESOLVED", entityType: "application", entityId: request.applicationId, metadata: { requestId: request.id, type: request.type } });
        return { success: true };
      }),

    importFinancialCsv: makerProcedure
      .input(z.object({ data: z.string().min(1).max(1_400_000) }))
      .mutation(({ input }) => {
        try {
          return parseFinancialCsv(input.data);
        } catch (error) {
          if (error instanceof FinancialImportError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          throw new TRPCError({ code: "BAD_REQUEST", message: "CSV tidak dapat diproses" });
        }
      }),
    extractKtp: makerProcedure
      .input(ktpOcrInputSchema)
      .mutation(async ({ input }) => {
        try {
          return await extractKtpOcr(input);
        } catch (error) {
          if (error instanceof KtpOcrInputError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          if (error instanceof KtpOcrProviderError) {
            throw new TRPCError({ code: "BAD_GATEWAY", message: "KTP OCR service unavailable" });
          }
          throw new TRPCError({ code: "BAD_GATEWAY", message: "KTP OCR service unavailable" });
        }
      }),

    create: makerProcedure
      .input(z.object({
        customerName: z.string().trim().min(1).max(255),
        customerId: z.string().trim().min(1).max(100),
        businessName: z.string().trim().min(1).max(255),
        businessType: z.string().trim().min(1).max(100),
        businessAge: z.number().int().positive(),
        address: z.string().trim().min(1).max(2000),
        phone: z.string().trim().min(1).max(50),
        email: z.string().email().optional(),
        monthlyRevenue: positiveMoney,
        monthlyExpenses: nonNegativeMoney,
        existingDebt: nonNegativeMoney,
        collateralValue: nonNegativeMoney,
        requestedAmount: positiveMoney,
        financingTenor: z.number().int().min(1).max(360),
        marginRate: z.number().min(0).max(100),
        loanPurpose: z.string().trim().min(1).max(2000),
        legalDocuments: legalDocumentsSchema,
        businessShariaCompliant: z.enum(["yes", "no", "partial"]),
        shariaComplianceNotes: z.string().trim().max(2000).optional(),
        murabahahType: z.enum(["standard", "ultra_mikro", "personal"]).optional(),
        murabahahSupplierName: z.string().trim().max(255).optional(),
        murabahahObject: z.string().trim().max(255).optional(),
        murabahahPriceKnown: z.enum(["yes", "no"]).optional(),
        murabahahMarginDisclosed: z.enum(["yes", "no"]).optional(),
        murabahahDownPayment: z.enum(["yes", "no"]).optional(),
        murabahahWakalah: z.enum(["yes", "no"]).optional(),
        murabahahDpsReviewed: z.enum(["yes", "no"]).optional(),
        murabahahAcquisitionPrice: nonNegativeMoney.nullable().optional(),
        murabahahDirectCost: nonNegativeMoney.nullable().optional(),
        murabahahSupplierDiscount: nonNegativeMoney.nullable().optional(),
        murabahahDownPaymentAmount: nonNegativeMoney.nullable().optional(),
        murabahahMarginAmount: nonNegativeMoney.nullable().optional(),
        murabahahInvoiceNumber: z.string().trim().max(100).optional(),
        murabahahWakalahConfirmedAt: z.date().nullable().optional(),
        murabahahQabdhVerifiedAt: z.date().nullable().optional(),
        murabahahSignedAt: z.date().nullable().optional(),
        murabahahTaazirToWelfare: z.enum(["yes", "no"]).optional(),
        murabahahNotes: z.string().trim().max(2000).optional(),
        financingAkad: z.enum(["murabahah", "mudharabah", "qardh", "multijasa"]).optional(),
        isRelatedParty: z.enum(["yes", "no"]).optional(),
        relatedPartyRelation: z.string().trim().max(255).optional(),
        incomeSourceType: z.enum(["fixed", "non_fixed", "joint_income"]).optional(),
        qardhAdminFee: nonNegativeMoney.nullable().optional(),
        qardhPurpose: z.string().trim().max(255).optional(),
        multijasaAkadType: z.enum(["ijarah", "kafalah_bil_ujrah"]).optional(),
        multijasaServiceCategory: z.enum(["pendidikan", "umrah_haji", "kesehatan", "tenaga_kerja_renovasi", "sewa_properti", "lainnya"]).optional(),
        multijasaServiceProvider: z.string().trim().max(255).optional(),
        multijasaSourceObject: z.string().trim().max(255).optional(),
        multijasaServiceCost: nonNegativeMoney.nullable().optional(),
        multijasaDownPayment: nonNegativeMoney.nullable().optional(),
        multijasaUjrahAmount: nonNegativeMoney.nullable().optional(),
        multijasaWakalah: z.enum(["yes", "no"]).optional(),
        multijasaDpsReviewed: z.enum(["yes", "no"]).optional(),
        multijasaTaazirToWelfare: z.enum(["yes", "no"]).optional(),
        multijasaNotes: z.string().trim().max(2000).optional(),
        mudharabahType: z.enum(["muthlaqah", "muqayyadah"]).optional(),
        mudharabahCapitalValue: nonNegativeMoney.nullable().optional(),
        mudharabahCapitalForm: z.enum(["uang", "aset", "kombinasi"]).optional(),
        mudharabahBusinessPurpose: z.string().trim().max(2000).optional(),
        mudharabahProfitSharingMethod: z.enum(["profit_sharing", "net_revenue"]).optional(),
        mudharabahBankNisbah: z.string().trim().regex(/^\d{1,3}(\.\d{1,2})?$/, "Nisbah tidak valid").optional(),
        mudharabahCustomerNisbah: z.string().trim().regex(/^\d{1,3}(\.\d{1,2})?$/, "Nisbah tidak valid").optional(),
        mudharabahPbh: nonNegativeMoney.nullable().optional(),
        mudharabahRbh: nonNegativeMoney.nullable().optional(),
        mudharabahCollateral: z.enum(["yes", "no"]).optional(),
        mudharabahGuarantor: z.enum(["yes", "no"]).optional(),
        mudharabahTaazirToWelfare: z.enum(["yes", "no"]).optional(),
        mudharabahSignedAt: z.date().nullable().optional(),
        mudharabahNotes: z.string().trim().max(2000).optional(),
        environmentalPractices: z.string().trim().max(2000).optional(),
        socialImpact: z.string().trim().max(2000).optional(),
        governanceQuality: z.enum(["excellent", "good", "fair", "poor"]),
        financialDataSource: z.enum(["laporan_keuangan", "omzet_harian", "mutasi_rekening", "dokumen_ai"]).optional(),
        financialDataNote: z.string().trim().max(1000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const moneyOrNull = (value: string | null | undefined) => (!value || value === "" ? null : value.toString());
        const applicationId = await db.createApplication({
          ...input,
          marginRate: input.marginRate.toString(),
          murabahahAcquisitionPrice: moneyOrNull(input.murabahahAcquisitionPrice),
          murabahahDirectCost: moneyOrNull(input.murabahahDirectCost),
          murabahahSupplierDiscount: moneyOrNull(input.murabahahSupplierDiscount),
          murabahahDownPaymentAmount: moneyOrNull(input.murabahahDownPaymentAmount),
          murabahahMarginAmount: moneyOrNull(input.murabahahMarginAmount),
          multijasaServiceCost: moneyOrNull(input.multijasaServiceCost),
          multijasaDownPayment: moneyOrNull(input.multijasaDownPayment),
          multijasaUjrahAmount: moneyOrNull(input.multijasaUjrahAmount),
          qardhAdminFee: moneyOrNull(input.qardhAdminFee),
          mudharabahCapitalValue: moneyOrNull(input.mudharabahCapitalValue),
          mudharabahPbh: moneyOrNull(input.mudharabahPbh),
          mudharabahRbh: moneyOrNull(input.mudharabahRbh),
          organizationId: ctx.user.organizationId,
          submittedBy: ctx.user.id,
          status: "pending",
        });
        try {
          const admins = (await db.listOrganizationUsers(ctx.user.organizationId))
            .filter(user => user.role === "admin");
          for (const admin of admins) {
            await db.createNotification({
              organizationId: ctx.user.organizationId,
              userId: admin.id,
              type: "APPLICATION_CREATED",
              title: "Pengajuan baru",
              content: `Pengajuan baru atas nama ${input.customerName} telah dibuat`,
              applicationId,
            });
          }
        } catch (error) {
          console.warn("[Notification] Failed to notify admins:", error);
        }
        return { id: applicationId };
      }),

    murabahahPreview: protectedProcedure
      .input(z.object({
        requestedAmount: z.string(),
        acquisitionPrice: z.string().nullable().optional(),
        directCost: z.string().nullable().optional(),
        supplierDiscount: z.string().nullable().optional(),
        downPaymentAmount: z.string().nullable().optional(),
        marginRate: z.string().nullable().optional(),
      }))
      .query(({ input }) => calculateMurabahahBreakdown(input)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const application = await db.getApplicationById(input.id, ctx.user.organizationId);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        return application;
      }),

    list: protectedProcedure
      .input(z.object({
        status: z.enum(["pending", "assessed", "approved", "rejected", "cancelled"]).optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
       return db.getAllApplications({ ...input, organizationId: ctx.user.organizationId });
       }),

    queue: protectedProcedure
      .input(z.object({
        status: z.enum(["pending", "assessed", "approved", "rejected", "cancelled"]).optional(),
        limit: z.number().int().positive().max(100).default(50),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
        submittedBy: z.number().int().positive().optional(),
      }).optional())
      .query(({ input, ctx }) => db.getApplicationQueue({
        ...input,
        organizationId: ctx.user.organizationId,
        limit: input?.limit ?? 50,
      })),

    operationalStats: protectedProcedure
      .input(z.object({
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
        analystId: z.number().int().positive().optional(),
      }).optional())
      .query(({ input, ctx }) => db.getOperationalStats(ctx.user.organizationId, input)),

    listAnalysts: protectedProcedure
      .query(async ({ ctx }) => {
        const users = await db.listOrganizationUsers(ctx.user.organizationId);
        return users
          .filter(user => user.role === "maker" || user.role === "checker" || user.role === "admin")
          .map(toSafeUser);
      }),

    slaMetrics: protectedProcedure
      .query(({ ctx }) => db.getSlaMetrics(ctx.user.organizationId)),

    bulkExport: checkerProcedure
      .input(z.object({
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        const rows = await db.getBulkExport(ctx.user.organizationId, input);
        await db.recordAuditEvent({ organizationId: ctx.user.organizationId, actorUserId: ctx.user.id, action: "BULK_EXPORTED", entityType: "organization", entityId: ctx.user.organizationId, metadata: { rows: rows.length } });
        return rows;
      }),

    customerMaster: protectedProcedure
      .input(z.object({ search: z.string().trim().max(200).optional() }).optional())
      .query(async ({ input, ctx }) => {
        const rows = await db.listCustomerMaster(ctx.user.organizationId, input?.search);
        return rows.map(row => ({ ...row, customerId: maskNik(row.customerId) }));
      }),

    dashboardTrend: protectedProcedure
      .query(({ ctx }) => db.getDashboardTrend(ctx.user.organizationId)),

    analystPerformance: protectedProcedure
      .query(({ ctx }) => db.getAnalystPerformance(ctx.user.organizationId)),


    assess: makerProcedure
      .input(z.object({
        applicationId: z.number(),
        notes: z.string().trim().max(2000).optional(),
        dataCheckAcknowledgement: z.string().trim().max(2000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get application
        const application = await db.getApplicationById(input.applicationId, ctx.user.organizationId);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }

        const snapshot = toSnapshot(application);
        const ruleIssues = ruleConsistencyIssues(snapshot);
        const blocking = blockingIssues(ruleIssues);
        const acknowledgement = input.dataCheckAcknowledgement?.trim() || null;
        if (blocking.length > 0 && (!acknowledgement || acknowledgement.length < 10)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Ada ${blocking.length} temuan pemeriksaan data yang wajib diperbaiki atau dikonfirmasi dengan catatan (minimal 10 karakter) sebelum penilaian.`,
          });
        }

        // Calculate SSCI score
        const result = calculateSSCI(application);
        const riskFactors = mergeRiskFactors(result.riskFactors, ruleIssues);
        const policy = await db.getCreditPolicy(ctx.user.organizationId);
        const plafon = calculateRecommendedPlafon(application, policy);
        const [narrative, consistency] = await Promise.all([
          generateNarrativeRecommendation({
            classification: result.classification,
            totalScore: result.totalScore,
            sustainableFinanceScore: result.sustainableFinanceScore,
            shariaScore: result.shariaScore,
            legalScore: result.legalScore,
            scoreBreakdown: result.scoreBreakdown,
            strengths: result.strengths,
            riskFactors,
            fallbackRecommendation: mergeFallbackRecommendation(result.recommendations, ruleIssues),
          }),
          checkApplicationConsistency(snapshot),
        ]);
        const toFinding = ({ severity, field, message }: { severity: "tinggi" | "sedang" | "rendah"; field: string; message: string }) => ({ severity, field, message });

        // Save assessment
        const assessmentId = await db.createAssessment({
          applicationId: input.applicationId,
          organizationId: ctx.user.organizationId,
          sustainableFinanceScore: result.sustainableFinanceScore.toString(),
          shariaScore: result.shariaScore.toString(),
          legalScore: result.legalScore.toString(),
          totalScore: result.totalScore.toString(),
          classification: result.classification,
          scoreBreakdown: result.scoreBreakdown,
          recommendations: narrative.recommendation,
          riskFactors,
          strengths: result.strengths,
          modelVersion: SSCI_METHODOLOGY_VERSION,
          confidence: result.confidence.toString(),
          recommendationStatus: narrative.status,
          recommendationModel: narrative.model,
          recommendationPromptVersion: narrative.promptVersion,
          recommendedPlafon: plafon.recommendedAmount.toString(),
          dscrRatio: plafon.dscrRatio.toString(),
          ltvRatio: plafon.ltvRatio.toString(),
          assessedBy: ctx.user.id,
          notes: input.notes,
          dataChecks: {
            ruleIssues: ruleIssues.map(toFinding),
            aiNotes: consistency.issues.filter(issue => issue.source === "ai").map(toFinding),
            aiStatus: consistency.aiStatus,
            acknowledgement: blocking.length > 0 ? acknowledgement : null,
            checkedAt: new Date().toISOString(),
          },
        });

        try {
          const recipients = (await db.listOrganizationUsers(ctx.user.organizationId))
            .filter(user => user.role === "admin" || user.role === "checker");
          for (const recipient of recipients) {
            await db.createNotification({
              organizationId: ctx.user.organizationId,
              userId: recipient.id,
              type: "ASSESSMENT_CREATED",
              title: "Penilaian selesai",
              content: `Pengajuan ${application.customerName} telah dinilai`,
              applicationId: input.applicationId,
            });
          }
        } catch (error) {
          console.warn("[Notification] Failed to notify admins/checkers:", error);
        }

        return {
          assessmentId,
          result: {
            ...result,
            recommendations: narrative.recommendation,
            recommendationStatus: narrative.status,
            plafon,
          },
          policy,
        };
      }),

    searchCustomerHistory: protectedProcedure
      .input(z.object({ query: z.string().trim().max(200) }))
      .query(async ({ input, ctx }) => {
        return db.searchCustomerHistory(ctx.user.organizationId, input.query);
      }),

    exportSlik: checkerProcedure
      .query(async ({ ctx }) => {
        const rows = await db.getSlikExport(ctx.user.organizationId);
        await db.recordAuditEvent({ organizationId: ctx.user.organizationId, actorUserId: ctx.user.id, action: "SLIK_EXPORTED", entityType: "organization", entityId: ctx.user.organizationId, metadata: { rows: rows.length } });
        return rows;
      }),

    sensitivity: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        try {
          return runSensitivity(application);
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Uji sensitivitas tidak dapat dijalankan" });
        }
      }),

    overrideClassification: checkerProcedure
      .input(z.object({
        applicationId: z.number().int().positive(),
        classification: z.enum(["Sangat Layak", "Layak", "Perlu Pengawasan", "Tidak Layak"]).nullable(),
        reason: z.string().trim().max(2000),
      }))
      .mutation(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        const assessment = await db.getAssessmentByApplicationId(input.applicationId, ctx.user.organizationId);
        if (!assessment || application.status !== "assessed") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Peninjauan hanya dapat dilakukan setelah penilaian dan sebelum keputusan." });
        }
        if (isSameActor(ctx.user.id, application.submittedBy, assessment.assessedBy)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Pemisahan maker-checker: peninjauan harus dilakukan pengguna lain." });
        }
        if (input.classification === assessment.classification) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Klasifikasi hasil peninjauan sama dengan klasifikasi sistem." });
        }
        if (input.reason.length < 20) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Alasan peninjauan wajib diisi minimal 20 karakter." });
        }
        await db.setAssessmentOverride({
          assessmentId: assessment.id,
          organizationId: ctx.user.organizationId,
          classification: input.classification,
          reason: input.classification ? input.reason : null,
          actorUserId: ctx.user.id,
        });
        await db.recordAuditEvent({
          organizationId: ctx.user.organizationId,
          actorUserId: ctx.user.id,
          action: input.classification ? "CLASSIFICATION_OVERRIDDEN" : "CLASSIFICATION_OVERRIDE_CLEARED",
          entityType: "assessment",
          entityId: assessment.id,
          metadata: {
            applicationId: application.id,
            systemClassification: assessment.classification,
            systemScore: Number(assessment.totalScore),
            previousOverride: assessment.overrideClassification ?? null,
            newOverride: input.classification,
            reason: input.reason.slice(0, 250),
          },
        });
        return { success: true };
      }),

    exitGate: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        return computeExitGate(application, ctx.user.organizationId);
      }),

    revealNik: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        await db.recordAuditEvent({ organizationId: ctx.user.organizationId, actorUserId: ctx.user.id, action: "NIK_REVEALED", entityType: "application", entityId: application.id });
        return { customerId: application.customerId };
      }),

    cancel: makerProcedure
      .input(z.object({
        applicationId: z.number().int().positive(),
        reason: z.string().trim().max(500).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.cancelApplication({
          applicationId: input.applicationId,
          organizationId: ctx.user.organizationId,
          actorUserId: ctx.user.id,
          reason: input.reason,
        });
        return { success: true };
      }),

    decide: checkerProcedure
      .input(z.object({
        applicationId: z.number().int().positive(),
        decision: z.enum(["approved", "rejected"]),
        notes: z.string().trim().min(1).max(2000),
      }))
      .mutation(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        const assessment = await db.getAssessmentByApplicationId(input.applicationId, ctx.user.organizationId);
        if (isSameActor(ctx.user.id, application.submittedBy, assessment?.assessedBy)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Pemisahan maker-checker: Anda membuat atau menilai pengajuan ini, sehingga keputusan harus diambil pengguna lain.",
          });
        }
        const gate = input.decision === "approved" ? await computeExitGate(application, ctx.user.organizationId) : null;
        if (gate && !gate.passed) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Syarat persetujuan ${gate.track === "ringkas" ? "jalur ringkas" : "jalur lengkap"} belum terpenuhi: ${gate.items.filter(i => !i.ok).map(i => i.label).join("; ")}.`,
          });
        }
        await db.decideApplication({
          applicationId: input.applicationId,
          organizationId: ctx.user.organizationId,
          decision: input.decision,
          notes: input.notes,
          checkerId: ctx.user.id,
        });
        return { success: true };
      }),

    addComment: makerProcedure
      .input(z.object({
        applicationId: z.number().int().positive(),
        content: z.string().trim().min(1).max(2000),
      }))
      .mutation(async ({ input, ctx }) => {
        const application = await db.getApplicationById(input.applicationId, ctx.user.organizationId);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        const id = await db.addApplicationComment({
          organizationId: ctx.user.organizationId,
          applicationId: input.applicationId,
          authorUserId: ctx.user.id,
          content: input.content,
        });
        return { id };
      }),

    listComments: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        return db.listApplicationComments(ctx.user.organizationId, input.applicationId);
      }),

    listActivity: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        return db.listApplicationActivity(ctx.user.organizationId, input.applicationId);
      }),
  }),

  assessments: router({
    getByApplicationId: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .query(async ({ input, ctx }) => {
        return db.getAssessmentByApplicationId(input.applicationId, ctx.user.organizationId);
      }),

    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getAllAssessments(ctx.user.organizationId);
      }),

    stats: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getAssessmentStats(ctx.user.organizationId);
      }),

    delete: checkerProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        try {
          return await db.deleteAssessment(input.applicationId, ctx.user.organizationId, ctx.user.id);
        } catch (error) {
          if (error instanceof Error) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Gagal menghapus penilaian" });
        }
      }),

    hardDelete: adminProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        try {
          return await db.hardDeleteApplication(input.applicationId, ctx.user.organizationId, ctx.user.id);
        } catch (error) {
          if (error instanceof Error) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Gagal menghapus pengajuan" });
        }
      }),

    getWithApplication: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .query(async ({ input, ctx }) => {
        const application = await db.getApplicationById(input.applicationId, ctx.user.organizationId);
        const assessment = await db.getAssessmentByApplicationId(input.applicationId, ctx.user.organizationId);
        
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }

        const bprsEvaluation = evaluateBprsPolicy({
          requestedAmount: Number(application.requestedAmount),
          collateralValue: Number(application.collateralValue),
          monthlyRevenue: Number(application.monthlyRevenue),
          monthlyExpenses: Number(application.monthlyExpenses),
          existingDebt: Number(application.existingDebt),
          tenorMonths: Number(application.financingTenor),
          marginRate: Number(application.marginRate),
          isRelatedParty: application.isRelatedParty === "yes",
          relatedPartyRelation: application.relatedPartyRelation || undefined,
          isNonIndividual: application.businessType?.toLowerCase().includes("pt") ||
            application.businessType?.toLowerCase().includes("cv") ||
            application.businessType?.toLowerCase().includes("badan"),
        });

        return {
          application: { ...application, customerId: maskNik(application.customerId) },
          assessment,
          bprsEvaluation,
        };
      }),
    
    exportReport: protectedProcedure
      .input(z.object({
        applicationId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const application = await db.getApplicationById(input.applicationId, ctx.user.organizationId);
        const assessment = await db.getAssessmentByApplicationId(input.applicationId, ctx.user.organizationId);
        
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        
        if (!assessment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
        }

        const organization = await db.getOrganizationById(ctx.user.organizationId);
        const pdfBuffer = await generatePdfReport({ application, assessment, organization });
        await db.recordReportExport(ctx.user.id, application.id, ctx.user.organizationId);
        
        return {
          pdf: pdfBuffer.toString("base64"),
          filename: `SSCI_Laporan_${application.id}_${Date.now()}.pdf`,
        };
      }),
  }),

  documents: router({
    uploadDocument: makerProcedure.input(z.object({
      applicationId: z.number().int().positive(), documentType: z.enum(DOCUMENT_TYPES),
      originalName: z.string().trim().min(1).max(255), contentType: z.enum(CONTENT_TYPES), data: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      let bytes: Buffer;
      try { bytes = decodeDocumentData(input.data); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid document" }); }
      const application = await db.getApplicationById(input.applicationId, ctx.user.organizationId);
      if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      const storedName = await storeDocument(bytes, input.contentType);
      const id = await db.createDocumentFile({ organizationId: ctx.user.organizationId, applicationId: input.applicationId, documentType: input.documentType, originalName: sanitizeOriginalName(input.originalName), storedName, contentType: input.contentType, sizeBytes: bytes.length, uploadedBy: ctx.user.id, status: "uploaded" });
      if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Document could not be saved" });
      return { id, storedName };
    }),
    listDocuments: protectedProcedure.input(z.object({ applicationId: z.number().int().positive() })).query(({ input, ctx }) => db.getDocumentFiles(input.applicationId, ctx.user.organizationId)),
    verifyDocument: checkerProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["verified", "rejected"]), reason: z.string().trim().max(2000).optional() }).refine(value => value.status !== "rejected" || !!value.reason, { message: "Rejection reason is required" })).mutation(async ({ input, ctx }) => {
      const updated = await db.updateDocumentVerification({ id: input.id, organizationId: ctx.user.organizationId, status: input.status, verifiedBy: ctx.user.id, rejectionReason: input.reason });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      if (input.status === "rejected") {
        try {
          const document = await db.getDocumentFileById(input.id, ctx.user.organizationId);
          if (document) {
            await db.createNotification({
              organizationId: ctx.user.organizationId,
              userId: document.uploadedBy,
              type: "DOCUMENT_REJECTED",
              title: "Dokumen ditolak",
              content: `Dokumen ${document.originalName} ditolak: ${input.reason}`,
              applicationId: document.applicationId,
            });
          }
        } catch (error) {
          console.warn("[Notification] Failed to notify uploader:", error);
        }
      }
      return { success: true };
    }),
  }),

  survey: router({
    uploadPhoto: makerProcedure
      .input(z.object({
        applicationId: z.number().int().positive(),
        contentType: z.enum(SURVEY_CONTENT_TYPES),
        data: z.string().min(1),
        caption: z.string().trim().max(255).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const application = await db.getApplicationById(input.applicationId, ctx.user.organizationId);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        let bytes: Buffer;
        try {
          bytes = decodeSurveyImage(input.data, input.contentType);
        } catch (error) {
          if (error instanceof SurveyUploadError) {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
          throw new TRPCError({ code: "BAD_REQUEST", message: "Foto survey tidak dapat diproses" });
        }
        const storedName = await storeSurveyImage(bytes, input.contentType);
        const id = await db.createSurveyPhoto({
          organizationId: ctx.user.organizationId,
          applicationId: input.applicationId,
          uploadedBy: ctx.user.id,
          storedName,
          contentType: input.contentType,
          caption: input.caption,
        });
        return { id, storedName };
      }),

    list: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .query(({ input, ctx }) => {
        return db.listSurveyPhotos(ctx.user.organizationId, input.applicationId);
      }),

    deletePhoto: makerProcedure
      .input(z.object({ photoId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const photo = await db.deleteSurveyPhoto(input.photoId, ctx.user.organizationId);
        if (!photo) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Survey photo not found" });
        }
        try {
          const filePath = join(UPLOAD_DIR, photo.storedName);
          unlinkSync(filePath);
        } catch {
          // file already missing is fine
        }
        return { success: true };
      }),

    analyze: makerProcedure
      .input(z.object({ photoId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const photo = await db.getSurveyPhotoById(input.photoId, ctx.user.organizationId);
        if (!photo) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Survey photo not found" });
        }
        if (photo.status !== "uploaded") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Survey photo sudah dianalisis" });
        }
        const filePath = join(UPLOAD_DIR, photo.storedName);
        let fileBuffer: Buffer;
        try {
          fileBuffer = readFileSync(filePath);
        } catch (error) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Survey photo file not found" });
        }
        const imageBase64 = fileBuffer.toString("base64");
        try {
          const result = await analyzeSurveyImage(imageBase64, photo.contentType);
          await db.updateSurveyAnalysis(input.photoId, ctx.user.organizationId, {
            status: "analyzed",
            analysisResult: result,
            analyzedAt: new Date(),
          });
          return result;
        } catch (error) {
          if (error instanceof SurveyProviderError) {
            await db.updateSurveyAnalysis(input.photoId, ctx.user.organizationId, {
              status: "failed",
              analyzedAt: new Date(),
            });
            throw new TRPCError({ code: "BAD_GATEWAY", message: "Survey AI service unavailable" });
          }
          throw error;
        }
      }),
  }),
  platform: router({
    listOrganizations: superAdminProcedure.query(() => db.listOrganizationsForPlatform()),

    setOrganizationStatus: superAdminProcedure
      .input(z.object({ organizationId: z.number().int().positive(), status: z.enum(["pending", "active"]) }))
      .mutation(async ({ input, ctx }) => {
        if (input.organizationId === ctx.user.organizationId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Status organisasi sendiri tidak dapat diubah dari konsol platform." });
        }
        const organization = await db.getOrganizationById(input.organizationId);
        if (!organization) throw new TRPCError({ code: "NOT_FOUND", message: "Organisasi tidak ditemukan" });
        await db.setOrganizationRegistrationStatus(input.organizationId, input.status);
        await db.recordAuditEvent({
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: input.status === "active" ? "ORGANIZATION_APPROVED" : "ORGANIZATION_SUSPENDED",
          entityType: "organization",
          entityId: input.organizationId,
          metadata: { by: "superadmin", previousStatus: organization.registrationStatus },
        });
        return { success: true };
      }),

    auditLogs: superAdminProcedure
      .input(z.object({ organizationId: z.number().int().positive().optional(), action: z.string().trim().max(64).optional(), limit: z.number().int().min(1).max(500).optional() }).optional())
      .query(({ input }) => db.listPlatformAuditLogs(input ?? {})),
  }),

  bprsWorkbook: router({
    get: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        const profile = application.bprsProfile ?? {};
        const app = toBprsApplication(application);
        return {
          profile,
          score: computeBprsScore(profile, app),
          checks: checkBprsProfile(profile, app),
          derived: {
            lamaUsaha: lamaUsahaFromMonths(app.businessAge),
            akad: app.financingAkad ? AKAD_TO_BPRS[app.financingAkad] ?? null : null,
          },
          editable: !BPRS_LOCKED_STATUSES.has(application.status),
        };
      }),

    save: makerProcedure
      .input(z.object({ applicationId: z.number().int().positive(), profile: bprsProfileSchema }))
      .mutation(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        if (BPRS_LOCKED_STATUSES.has(application.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Pengajuan sudah diputuskan atau dibatalkan, isian format BPRS tidak dapat diubah" });
        }
        await db.updateBprsProfile(application.id, ctx.user.organizationId, input.profile);
        await db.recordAuditEvent({
          organizationId: ctx.user.organizationId,
          actorUserId: ctx.user.id,
          action: "BPRS_PROFILE_UPDATED",
          entityType: "application",
          entityId: application.id,
          metadata: { filledFields: Object.keys(input.profile).length },
        });
        const app = toBprsApplication(application);
        return { score: computeBprsScore(input.profile, app), checks: checkBprsProfile(input.profile, app) };
      }),

    exportExcel: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        let buffer: Buffer;
        try {
          buffer = await fillFluktuatifWorkbook(await loadFluktuatifTemplate(), toBprsApplication(application), application.bprsProfile ?? {});
        } catch (error) {
          console.error("[bprsWorkbook] export failed", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "File Excel BPRS gagal dibuat" });
        }
        await db.recordAuditEvent({
          organizationId: ctx.user.organizationId,
          actorUserId: ctx.user.id,
          action: "BPRS_EXCEL_EXPORTED",
          entityType: "application",
          entityId: application.id,
          metadata: { template: "fluktuatif-umkm" },
        });
        return { filename: bprsWorkbookFilename(application.id), base64: buffer.toString("base64") };
      }),

    readStatement: makerProcedure
      .input(bankStatementInputSchema.extend({ applicationId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        try {
          return await readBankStatement({ pages: input.pages, customerName: application.customerName });
        } catch (error) {
          if (error instanceof AiInputError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          throw new TRPCError({ code: "BAD_GATEWAY", message: AI_UNAVAILABLE });
        }
      }),

    draftNarrative: makerProcedure
      .input(z.object({ applicationId: z.number().int().positive(), profile: bprsProfileSchema }))
      .mutation(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        try {
          return await draftBprsNarrative(toSnapshot(application), input.profile);
        } catch {
          throw new TRPCError({ code: "BAD_GATEWAY", message: AI_UNAVAILABLE });
        }
      }),

    compareScores: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        const assessment = await db.getAssessmentByApplicationId(input.applicationId, ctx.user.organizationId);
        const bprs = computeBprsScore(application.bprsProfile ?? {}, toBprsApplication(application));
        return explainScoreComparison({
          ssci: assessment ? { totalScore: Number(assessment.totalScore), classification: assessment.classification } : null,
          bprs,
        });
      }),
  }),

  aiAssist: router({
    ruleCheck: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .query(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        const issues = ruleConsistencyIssues(toSnapshot(application));
        return { issues, blockingCount: blockingIssues(issues).length };
      }),

    extractDocument: makerProcedure
      .input(documentExtractionInputSchema)
      .mutation(async ({ input }) => {
        try {
          return await extractSupportingDocument(input);
        } catch (error) {
          if (error instanceof AiInputError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          throw new TRPCError({ code: "BAD_GATEWAY", message: AI_UNAVAILABLE });
        }
      }),

    checkConsistency: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        return checkApplicationConsistency(toSnapshot(application));
      }),

    checkSharia: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        try {
          return await checkShariaConformity(toSnapshot(application));
        } catch (error) {
          if (error instanceof AiProviderError) throw new TRPCError({ code: "BAD_GATEWAY", message: AI_UNAVAILABLE });
          throw error;
        }
      }),

    committeeBrief: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const application = await loadApplicationOrThrow(input.applicationId, ctx.user.organizationId);
        const assessment = await db.getAssessmentByApplicationId(input.applicationId, ctx.user.organizationId);
        const policy = policyFor(application);
        try {
          return await generateCommitteeBrief({
            application: toSnapshot(application),
            assessment: assessment ? {
              totalScore: Number(assessment.totalScore),
              classification: assessment.classification,
              sustainableFinanceScore: Number(assessment.sustainableFinanceScore),
              shariaScore: Number(assessment.shariaScore),
              legalScore: Number(assessment.legalScore),
              strengths: assessment.strengths,
              riskFactors: assessment.riskFactors,
            } : null,
            policy: {
              dsrRatio: policy.dsrRatio,
              isDsrCompliant: policy.isDsrCompliant,
              approvalAuthority: policy.approvalAuthority.roleTitle,
              appraisal: policy.appraisalRequirement.label,
            },
          });
        } catch (error) {
          if (error instanceof AiProviderError) throw new TRPCError({ code: "BAD_GATEWAY", message: AI_UNAVAILABLE });
          throw error;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
