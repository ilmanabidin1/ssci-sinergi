import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
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
  
  // Sustainability Indicators
  environmentalPractices: text("environmentalPractices"),
  socialImpact: text("socialImpact"),
  governanceQuality: mysqlEnum("governanceQuality", ["excellent", "good", "fair", "poor"]).notNull(),
  
  // Application metadata
  status: mysqlEnum("status", ["pending", "assessed", "approved", "rejected"]).default("pending").notNull(),
  submittedBy: int("submittedBy").notNull(),
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
  
  // Assessment metadata
  assessedBy: int("assessedBy").notNull(),
  assessedAt: timestamp("assessedAt").defaultNow().notNull(),
  notes: text("notes"),
});

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;
