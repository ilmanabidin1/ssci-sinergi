import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { checkerProcedure, makerProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { calculateRecommendedPlafon, calculateSSCI } from "./scoring";
import { TRPCError } from "@trpc/server";
import { generateAssessmentPDF } from "./pdfGenerator";
import {
  SSCI_LEGAL_DOCUMENT_STATUSES,
  SSCI_METHODOLOGY_VERSION,
  SSCI_REQUIRED_LEGAL_DOCUMENTS,
} from "@shared/ssciMethodology";
import { generateNarrativeRecommendation } from "./openRouterRecommendations";
import { hashPassword, verifyPassword } from "./passwordAuth";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { CONTENT_TYPES, DOCUMENT_TYPES, decodeDocumentData, sanitizeOriginalName, storeDocument } from "./documentUpload";
import { extractKtpOcr, KtpOcrInputError, KtpOcrProviderError, ktpOcrInputSchema } from "./ktpOcr";
import { FinancialImportError, parseFinancialCsv } from "./financialImport";

const nonNegativeMoney = z
  .string()
  .regex(/^\d+(?:\.\d{1,2})?$/, "Nilai keuangan tidak valid");
const positiveMoney = nonNegativeMoney.refine(value => Number(value) > 0, {
  message: "Nilai harus lebih dari nol",
});

const legalDocumentsSchema = z
  .array(
    z.object({
      type: z.enum(SSCI_REQUIRED_LEGAL_DOCUMENTS),
      status: z.enum(SSCI_LEGAL_DOCUMENT_STATUSES),
      notes: z.string().trim().max(500).optional(),
    })
  )
  .length(SSCI_REQUIRED_LEGAL_DOCUMENTS.length)
  .refine(documents => new Set(documents.map(document => document.type)).size === documents.length, {
    message: "Jenis dokumen tidak boleh duplikat",
  });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      const { passwordHash: _passwordHash, ...safeUser } = ctx.user;
      return safeUser;
    }),
    login: publicProcedure
      .input(z.object({
        email: z.string().trim().email().max(320),
        password: z.string().min(4).max(200),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByEmail(input.email.toLowerCase());
        if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email atau password salah" });
        }
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
  }),

  applications: router({
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
        murabahahSupplierName: z.enum(["yes", "no", "tidak_relevan"]).optional(),
        murabahahObject: z.enum(["yes", "no", "tidak_relevan"]).optional(),
        murabahahPriceKnown: z.enum(["yes", "no", "tidak_relevan"]).optional(),
        murabahahMarginDisclosed: z.enum(["yes", "no", "tidak_relevan"]).optional(),
        murabahahDownPayment: z.enum(["yes", "no", "tidak_relevan"]).optional(),
        murabahahWakalah: z.enum(["yes", "no", "tidak_relevan"]).optional(),
        murabahahDpsReviewed: z.enum(["yes", "no", "tidak_relevan"]).optional(),
        murabahahNotes: z.string().trim().max(2000).optional(),
        environmentalPractices: z.string().trim().max(2000).optional(),
        socialImpact: z.string().trim().max(2000).optional(),
        governanceQuality: z.enum(["excellent", "good", "fair", "poor"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const applicationId = await db.createApplication({
          ...input,
          marginRate: input.marginRate.toString(),
          organizationId: ctx.user.organizationId,
          submittedBy: ctx.user.id,
          status: "pending",
        });
        return { id: applicationId };
      }),

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
      }).optional())
      .query(({ input, ctx }) => db.getApplicationQueue({
        ...input,
        organizationId: ctx.user.organizationId,
        limit: input?.limit ?? 50,
      })),

    operationalStats: protectedProcedure
      .query(({ ctx }) => db.getOperationalStats(ctx.user.organizationId)),

    assess: makerProcedure
      .input(z.object({
        applicationId: z.number(),
        notes: z.string().trim().max(2000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get application
        const application = await db.getApplicationById(input.applicationId, ctx.user.organizationId);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }

        // Calculate SSCI score
        const result = calculateSSCI(application);
        const plafon = calculateRecommendedPlafon(application);
        const narrative = await generateNarrativeRecommendation({
          classification: result.classification,
          totalScore: result.totalScore,
          sustainableFinanceScore: result.sustainableFinanceScore,
          shariaScore: result.shariaScore,
          legalScore: result.legalScore,
          scoreBreakdown: result.scoreBreakdown,
          strengths: result.strengths,
          riskFactors: result.riskFactors,
          fallbackRecommendation: result.recommendations,
        });

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
          riskFactors: result.riskFactors,
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
        });

        return {
          assessmentId,
          result: {
            ...result,
            recommendations: narrative.recommendation,
            recommendationStatus: narrative.status,
            plafon,
          },
        };
      }),

    searchCustomerHistory: protectedProcedure
      .input(z.object({ query: z.string().trim().max(200) }))
      .query(async ({ input, ctx }) => {
        return db.searchCustomerHistory(ctx.user.organizationId, input.query);
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
        await db.decideApplication({
          applicationId: input.applicationId,
          organizationId: ctx.user.organizationId,
          decision: input.decision,
          notes: input.notes,
          checkerId: ctx.user.id,
        });
        return { success: true };
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

    getWithApplication: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .query(async ({ input, ctx }) => {
        const application = await db.getApplicationById(input.applicationId, ctx.user.organizationId);
        const assessment = await db.getAssessmentByApplicationId(input.applicationId, ctx.user.organizationId);
        
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }

        return {
          application,
          assessment,
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

        const htmlContent = generateAssessmentPDF({ application, assessment });
        await db.recordReportExport(ctx.user.id, application.id, ctx.user.organizationId);
        
        return {
          html: htmlContent,
          filename: `SSCI_Assessment_${application.id}_${Date.now()}.html`,
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
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
