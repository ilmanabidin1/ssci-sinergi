import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { calculateSSCI } from "./scoring";
import { TRPCError } from "@trpc/server";

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
    create: protectedProcedure
      .input(z.object({
        customerName: z.string().min(1),
        customerId: z.string().min(1),
        businessName: z.string().min(1),
        businessType: z.string().min(1),
        businessAge: z.number().int().positive(),
        address: z.string().min(1),
        phone: z.string().min(1),
        email: z.string().email().optional(),
        monthlyRevenue: z.string(),
        monthlyExpenses: z.string(),
        existingDebt: z.string(),
        collateralValue: z.string(),
        requestedAmount: z.string(),
        loanPurpose: z.string().min(1),
        legalDocuments: z.array(z.object({
          type: z.string(),
          status: z.string(),
          notes: z.string().optional(),
        })),
        businessShariaCompliant: z.enum(["yes", "no", "partial"]),
        shariaComplianceNotes: z.string().optional(),
        environmentalPractices: z.string().optional(),
        socialImpact: z.string().optional(),
        governanceQuality: z.enum(["excellent", "good", "fair", "poor"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const applicationId = await db.createApplication({
          ...input,
          submittedBy: ctx.user.id,
          status: "pending",
        });
        return { id: applicationId };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const application = await db.getApplicationById(input.id);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        return application;
      }),

    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllApplications(input);
      }),

    assess: protectedProcedure
      .input(z.object({
        applicationId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get application
        const application = await db.getApplicationById(input.applicationId);
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }

        // Calculate SSCI score
        const result = calculateSSCI(application);

        // Save assessment
        const assessmentId = await db.createAssessment({
          applicationId: input.applicationId,
          sustainableFinanceScore: result.sustainableFinanceScore.toString(),
          shariaScore: result.shariaScore.toString(),
          legalScore: result.legalScore.toString(),
          totalScore: result.totalScore.toString(),
          classification: result.classification,
          scoreBreakdown: result.scoreBreakdown,
          recommendations: result.recommendations,
          riskFactors: result.riskFactors,
          strengths: result.strengths,
          modelVersion: "1.0.0",
          confidence: result.confidence.toString(),
          assessedBy: ctx.user.id,
          notes: input.notes,
        });

        // Update application status
        await db.updateApplicationStatus(input.applicationId, "assessed");

        return { assessmentId, result };
      }),
  }),

  assessments: router({
    getByApplicationId: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .query(async ({ input }) => {
        return db.getAssessmentByApplicationId(input.applicationId);
      }),

    list: protectedProcedure
      .query(async () => {
        return db.getAllAssessments();
      }),

    stats: protectedProcedure
      .query(async () => {
        return db.getAssessmentStats();
      }),

    getWithApplication: protectedProcedure
      .input(z.object({ applicationId: z.number() }))
      .query(async ({ input }) => {
        const application = await db.getApplicationById(input.applicationId);
        const assessment = await db.getAssessmentByApplicationId(input.applicationId);
        
        if (!application) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }

        return {
          application,
          assessment,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
