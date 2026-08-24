import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { checkerProcedure, makerProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { calculateSSCI } from "./scoring";
import { TRPCError } from "@trpc/server";
import { generateAssessmentPDF } from "./pdfGenerator";
import {
  SSCI_LEGAL_DOCUMENT_STATUSES,
  SSCI_METHODOLOGY_VERSION,
  SSCI_REQUIRED_LEGAL_DOCUMENTS,
} from "@shared/ssciMethodology";
import { generateNarrativeRecommendation } from "./openRouterRecommendations";

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
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  applications: router({
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
        status: z.enum(["pending", "assessed", "approved", "rejected"]).optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        return db.getAllApplications({ ...input, organizationId: ctx.user.organizationId });
      }),

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
          assessedBy: ctx.user.id,
          notes: input.notes,
        });

        return {
          assessmentId,
          result: {
            ...result,
            recommendations: narrative.recommendation,
            recommendationStatus: narrative.status,
          },
        };
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
});

export type AppRouter = typeof appRouter;
