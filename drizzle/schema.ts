import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  legalName: varchar("legalName", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  registrationStatus: mysqlEnum("registrationStatus", ["pending", "active"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["maker", "checker", "admin"]).default("maker").notNull(),
  organizationId: int("organizationId").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Financing applications table - stores customer data and business information
 */
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").default(1).notNull(),
  // Customer Information
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerId: varchar("customerId", { length: 100 }).notNull(),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  businessType: varchar("businessType", { length: 100 }).notNull(),
  businessAge: int("businessAge").notNull(), // in months
  address: text("address").notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 320 }),
  
  // Financial Data
  monthlyRevenue: decimal("monthlyRevenue", { precision: 15, scale: 2 }).notNull(),
  monthlyExpenses: decimal("monthlyExpenses", { precision: 15, scale: 2 }).notNull(),
  existingDebt: decimal("existingDebt", { precision: 15, scale: 2 }).notNull(),
  collateralValue: decimal("collateralValue", { precision: 15, scale: 2 }).notNull(),
  requestedAmount: decimal("requestedAmount", { precision: 15, scale: 2 }).notNull(),
  financingTenor: int("financingTenor").notNull(),
  marginRate: decimal("marginRate", { precision: 5, scale: 2 }).notNull(),
  loanPurpose: text("loanPurpose").notNull(),
  
  // Legal Documents (stored as JSON array of document info)
  legalDocuments: json("legalDocuments").$type<{
    type: string;
    status: string;
    notes?: string;
  }[]>().notNull(),
  
  // Sharia Compliance Data
  businessShariaCompliant: mysqlEnum("businessShariaCompliant", ["yes", "no", "partial"]).notNull(),
  shariaComplianceNotes: text("shariaComplianceNotes"),
  
  // Murabahah Akad Checklist (DSN-MUI Fatwa compliance)
  murabahahSupplierName: mysqlEnum("murabahahSupplierName", ["yes", "no", "tidak_relevan"]),
  murabahahObject: mysqlEnum("murabahahObject", ["yes", "no", "tidak_relevan"]),
  murabahahPriceKnown: mysqlEnum("murabahahPriceKnown", ["yes", "no", "tidak_relevan"]),
  murabahahMarginDisclosed: mysqlEnum("murabahahMarginDisclosed", ["yes", "no", "tidak_relevan"]),
  murabahahDownPayment: mysqlEnum("murabahahDownPayment", ["yes", "no", "tidak_relevan"]),
  murabahahWakalah: mysqlEnum("murabahahWakalah", ["yes", "no", "tidak_relevan"]),
  murabahahDpsReviewed: mysqlEnum("murabahahDpsReviewed", ["yes", "no", "tidak_relevan"]),
  murabahahNotes: text("murabahahNotes"),
  
  // Sustainability Indicators
  environmentalPractices: text("environmentalPractices"),
  socialImpact: text("socialImpact"),
  governanceQuality: mysqlEnum("governanceQuality", ["excellent", "good", "fair", "poor"]).notNull(),
  
  // Application metadata
  status: mysqlEnum("status", ["pending", "assessed", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  submittedBy: int("submittedBy").notNull(),
  checkedBy: int("checkedBy"),
  checkedAt: timestamp("checkedAt"),
  decisionNotes: text("decisionNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

/**
 * Assessments table - stores SSCI scoring results
 */
export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").default(1).notNull(),
  applicationId: int("applicationId").notNull(),
  
  // SSCI Score Components
  sustainableFinanceScore: decimal("sustainableFinanceScore", { precision: 5, scale: 2 }).notNull(),
  shariaScore: decimal("shariaScore", { precision: 5, scale: 2 }).notNull(),
  legalScore: decimal("legalScore", { precision: 5, scale: 2 }).notNull(),
  
  // Final SSCI Score (0-100)
  totalScore: decimal("totalScore", { precision: 5, scale: 2 }).notNull(),
  
  // Classification
  classification: mysqlEnum("classification", [
    "Sangat Layak",
    "Layak",
    "Perlu Pengawasan",
    "Tidak Layak"
  ]).notNull(),
  
  // Detailed breakdown (stored as JSON for flexibility)
  scoreBreakdown: json("scoreBreakdown").$type<{
    sustainableFinance: {
      financial_health: number;
      debt_capacity: number;
      cash_flow: number;
      collateral: number;
    };
    sharia: {
      business_compliance: number;
      transaction_compliance: number;
      documentation: number;
    };
    legal: {
      business_legality: number;
      document_completeness: number;
      regulatory_compliance: number;
    };
  }>().notNull(),
  
  // Recommendations
  recommendations: text("recommendations").notNull(),
  riskFactors: text("riskFactors"),
  strengths: text("strengths"),
  
  // ML Model Metadata
  modelVersion: varchar("modelVersion", { length: 50 }).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }),
  recommendationStatus: mysqlEnum("recommendationStatus", ["generated", "rule_fallback"]).default("rule_fallback").notNull(),
  recommendationModel: varchar("recommendationModel", { length: 100 }),
  recommendationPromptVersion: varchar("recommendationPromptVersion", { length: 50 }),
  
  // Recommended Plafon
  recommendedPlafon: decimal("recommendedPlafon", { precision: 15, scale: 2 }),
  dscrRatio: decimal("dscrRatio", { precision: 5, scale: 2 }),
  ltvRatio: decimal("lvrRatio", { precision: 5, scale: 2 }),

  // Assessment metadata
  assessedBy: int("assessedBy").notNull(),
  assessedAt: timestamp("assessedAt").defaultNow().notNull(),
  notes: text("notes"),
});

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").default(1).notNull(),
  actorUserId: int("actorUserId").notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId").notNull(),
  metadata: json("metadata").$type<Record<string, string | number | boolean | null>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const documentFiles = mysqlTable("documentFiles", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  applicationId: int("applicationId").notNull(),
  documentType: mysqlEnum("documentType", ["KTP", "NPWP", "NIB"]).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  storedName: varchar("storedName", { length: 255 }).notNull(),
  contentType: mysqlEnum("contentType", ["application/pdf", "image/jpeg", "image/png"]).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  status: mysqlEnum("status", ["uploaded", "verified", "rejected"]).default("uploaded").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  verifiedBy: int("verifiedBy"),
  verifiedAt: timestamp("verifiedAt"),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentFile = typeof documentFiles.$inferSelect;
export type InsertDocumentFile = typeof documentFiles.$inferInsert;
