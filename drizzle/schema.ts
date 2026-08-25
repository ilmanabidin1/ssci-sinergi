import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  legalName: varchar("legalName", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  registrationStatus: mysqlEnum("registrationStatus", ["pending", "active"]).default("active").notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  logoUrl: varchar("logoUrl", { length: 500 }),
  primaryColor: varchar("primaryColor", { length: 20 }).default("#2458d6"),
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
  position: varchar("position", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

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
  
  // Akad financing (dynamic checklist selector)
  financingAkad: mysqlEnum("financingAkad", ["murabahah", "mudharabah"]),

  // Murabahah Akad Checklist (OJK Pedoman Produk Murabahah & DSN-MUI compliance)
  murabahahType: mysqlEnum("murabahahType", ["standard", "ultra_mikro", "personal"]),
  murabahahSupplierName: varchar("murabahahSupplierName", { length: 255 }),
  murabahahObject: varchar("murabahahObject", { length: 255 }),
  murabahahPriceKnown: mysqlEnum("murabahahPriceKnown", ["yes", "no"]),
  murabahahMarginDisclosed: mysqlEnum("murabahahMarginDisclosed", ["yes", "no"]),
  murabahahDownPayment: mysqlEnum("murabahahDownPayment", ["yes", "no"]),
  murabahahWakalah: mysqlEnum("murabahahWakalah", ["yes", "no"]),
  murabahahDpsReviewed: mysqlEnum("murabahahDpsReviewed", ["yes", "no"]),
  murabahahAcquisitionPrice: decimal("murabahahAcquisitionPrice", { precision: 15, scale: 2 }),
  murabahahDirectCost: decimal("murabahahDirectCost", { precision: 15, scale: 2 }),
  murabahahSupplierDiscount: decimal("murabahahSupplierDiscount", { precision: 15, scale: 2 }),
  murabahahDownPaymentAmount: decimal("murabahahDownPaymentAmount", { precision: 15, scale: 2 }),
  murabahahMarginAmount: decimal("murabahahMarginAmount", { precision: 15, scale: 2 }),
  murabahahInvoiceNumber: varchar("murabahahInvoiceNumber", { length: 100 }),
  murabahahWakalahConfirmedAt: timestamp("murabahahWakalahConfirmedAt"),
  murabahahQabdhVerifiedAt: timestamp("murabahahQabdhVerifiedAt"),
  murabahahSignedAt: timestamp("murabahahSignedAt"),
  murabahahTaazirToWelfare: mysqlEnum("murabahahTaazirToWelfare", ["yes", "no"]).default("yes"),
  murabahahNotes: text("murabahahNotes"),

  // Mudharabah Akad Checklist (OJK Pedoman Produk Mudarabah & DSN-MUI compliance)
  mudharabahType: mysqlEnum("mudharabahType", ["muthlaqah", "muqayyadah"]),
  mudharabahCapitalValue: decimal("mudharabahCapitalValue", { precision: 15, scale: 2 }),
  mudharabahCapitalForm: mysqlEnum("mudharabahCapitalForm", ["uang", "aset", "kombinasi"]),
  mudharabahBusinessPurpose: text("mudharabahBusinessPurpose"),
  mudharabahProfitSharingMethod: mysqlEnum("mudharabahProfitSharingMethod", ["profit_sharing", "net_revenue"]),
  mudharabahBankNisbah: decimal("mudharabahBankNisbah", { precision: 5, scale: 2 }),
  mudharabahCustomerNisbah: decimal("mudharabahCustomerNisbah", { precision: 5, scale: 2 }),
  mudharabahPbh: decimal("mudharabahPbh", { precision: 15, scale: 2 }),
  mudharabahRbh: decimal("mudharabahRbh", { precision: 15, scale: 2 }),
  mudharabahCollateral: mysqlEnum("mudharabahCollateral", ["yes", "no"]),
  mudharabahGuarantor: mysqlEnum("mudharabahGuarantor", ["yes", "no"]),
  mudharabahTaazirToWelfare: mysqlEnum("mudharabahTaazirToWelfare", ["yes", "no"]).default("yes"),
  mudharabahSignedAt: timestamp("mudharabahSignedAt"),
  mudharabahNotes: text("mudharabahNotes"),
  
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

export const applicationComments = mysqlTable("applicationComments", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  applicationId: int("applicationId").notNull(),
  authorUserId: int("authorUserId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApplicationComment = typeof applicationComments.$inferSelect;
export type InsertApplicationComment = typeof applicationComments.$inferInsert;

export const creditPolicies = mysqlTable("creditPolicies", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().unique(),
  dscrMin: decimal("dscrMin", { precision: 5, scale: 2 }).notNull().default("1.25"),
  ltvMax: decimal("ltvMax", { precision: 5, scale: 2 }).notNull().default("80"),
  maxPlafon: decimal("maxPlafon", { precision: 15, scale: 2 }),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditPolicy = typeof creditPolicies.$inferSelect;
export type InsertCreditPolicy = typeof creditPolicies.$inferInsert;

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  applicationId: int("applicationId"),
  read: int("read").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const surveyPhotos = mysqlTable("surveyPhotos", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  applicationId: int("applicationId").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  storedName: varchar("storedName", { length: 255 }).notNull(),
  contentType: mysqlEnum("contentType", ["image/jpeg", "image/png"]).notNull(),
  caption: varchar("caption", { length: 255 }),
  status: mysqlEnum("status", ["uploaded", "analyzed", "failed"]).default("uploaded").notNull(),
  analysisResult: json("analysisResult").$type<Record<string, unknown>>(),
  analyzedAt: timestamp("analyzedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SurveyPhoto = typeof surveyPhotos.$inferSelect;
export type InsertSurveyPhoto = typeof surveyPhotos.$inferInsert;
