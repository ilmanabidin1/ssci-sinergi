import { eq, desc, asc, and, gte, lte, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, organizations, applications, assessments, auditLogs, documentFiles, applicationComments, creditPolicies, notifications, InsertApplication, InsertAssessment, InsertDocumentFile, InsertCreditPolicy, InsertNotification, surveyPhotos, InsertSurveyPhoto } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Application queries
export async function createApplication(data: InsertApplication & { organizationId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.transaction(async tx => {
    const result = await tx.insert(applications).values(data);
    const applicationId = result[0].insertId;
    await tx.insert(auditLogs).values({
      organizationId: data.organizationId,
      actorUserId: data.submittedBy,
      action: "APPLICATION_CREATED",
      entityType: "application",
      entityId: applicationId,
    });
    return applicationId;
  });
}

export async function getApplicationById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(applications)
    .where(and(eq(applications.id, id), eq(applications.organizationId, organizationId)))
    .limit(1);
  return result[0];
}

export async function getAllApplications(filters: {
  organizationId: number;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let query = db.select().from(applications);
  
  const conditions = [eq(applications.organizationId, filters.organizationId)];
  
  if (filters?.status) {
    conditions.push(eq(applications.status, filters.status as any));
  }
  
  if (filters?.fromDate) {
    conditions.push(gte(applications.createdAt, filters.fromDate));
  }
  
  if (filters?.toDate) {
    conditions.push(lte(applications.createdAt, filters.toDate));
  }
  
  if (filters?.search) {
    conditions.push(
      or(
        like(applications.customerName, `%${filters.search}%`),
        like(applications.customerId, `%${filters.search}%`),
        like(applications.businessName, `%${filters.search}%`)
      )!
    );
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)!) as any;
  }
  
  return query.orderBy(desc(applications.createdAt));
}

export async function getApplicationQueue(filters: {
  organizationId: number;
  status?: "pending" | "assessed" | "approved" | "rejected" | "cancelled";
  limit: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(applications.organizationId, filters.organizationId)];
  if (filters.status) conditions.push(eq(applications.status, filters.status));

  const rows = await db.select().from(applications)
    .where(and(...conditions))
    .orderBy(desc(applications.createdAt))
    .limit(filters.limit);
  if (rows.length === 0) return [];

  const applicationIds = rows.map(application => application.id);
  const assessmentRows = await db.select().from(assessments)
    .where(and(
      eq(assessments.organizationId, filters.organizationId),
      sql`${assessments.applicationId} IN (${sql.join(applicationIds.map(id => sql`${id}`), sql`, `)})`,
    ))
    .orderBy(desc(assessments.assessedAt));
  const latestAssessments = new Map<number, typeof assessmentRows[number]>();
  for (const assessment of assessmentRows) {
    if (!latestAssessments.has(assessment.applicationId)) {
      latestAssessments.set(assessment.applicationId, assessment);
    }
  }

  return rows.map(application => ({
    ...application,
    assessment: latestAssessments.get(application.id) ?? null,
    latestAssessmentScore: latestAssessments.get(application.id)
      ? Number(latestAssessments.get(application.id)!.totalScore)
      : null,
    latestAssessmentClassification: latestAssessments.get(application.id)?.classification ?? null,
  }));
}

export async function getOperationalStats(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const applicationRows = await db.select().from(applications)
    .where(eq(applications.organizationId, organizationId));
  const assessmentRows = await db.select().from(assessments)
    .where(eq(assessments.organizationId, organizationId));

  const counts = { pending: 0, assessed: 0, approved: 0, rejected: 0, cancelled: 0 };
  for (const application of applicationRows) counts[application.status]++;
  const totalRequestedAmount = applicationRows.reduce((sum, application) => sum + Number(application.requestedAmount), 0);
  const approvedAmount = applicationRows
    .filter(application => application.status === "approved")
    .reduce((sum, application) => sum + Number(application.requestedAmount), 0);
  const averageAssessedScore = assessmentRows.length === 0
    ? 0
    : assessmentRows.reduce((sum, assessment) => sum + Number(assessment.totalScore), 0) / assessmentRows.length;

  return {
    counts,
    totalRequestedAmount,
    approvedAmount,
    averageAssessedScore,
    pendingDecision: counts.assessed,
  };
}

export async function cancelApplication(input: {
  applicationId: number;
  organizationId: number;
  actorUserId: number;
  reason?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.transaction(async tx => {
    const updateResult = await tx
      .update(applications)
      .set({
        status: "cancelled",
        decisionNotes: input.reason ?? "Dibatalkan oleh pemohon",
        updatedAt: new Date(),
      })
      .where(and(
        eq(applications.id, input.applicationId),
        eq(applications.organizationId, input.organizationId),
        eq(applications.status, "pending")
      ));
    if (updateResult[0].affectedRows !== 1) {
      throw new Error("Hanya pengajuan berstatus menunggu penilaian yang dapat dibatalkan");
    }
    await tx.insert(auditLogs).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "APPLICATION_CANCELLED",
      entityType: "application",
      entityId: input.applicationId,
    });
  });
}

export async function updateApplicationStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(applications)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(applications.id, id));
}

// Assessment queries
export async function createAssessment(data: InsertAssessment & { organizationId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.transaction(async tx => {
    const result = await tx.insert(assessments).values(data);
    const assessmentId = result[0].insertId;
    const updateResult = await tx
      .update(applications)
      .set({ status: "assessed", updatedAt: new Date() })
      .where(and(
        eq(applications.id, data.applicationId),
        eq(applications.organizationId, data.organizationId),
        eq(applications.status, "pending")
      ));

    if (updateResult[0].affectedRows !== 1) {
      throw new Error("Aplikasi sudah dinilai atau statusnya tidak valid");
    }

    await tx.insert(auditLogs).values({
      organizationId: data.organizationId,
      actorUserId: data.assessedBy,
      action: "ASSESSMENT_CREATED",
      entityType: "assessment",
      entityId: assessmentId,
      metadata: { applicationId: data.applicationId, modelVersion: data.modelVersion },
    });
    return assessmentId;
  });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result[0];
}

export async function registerBprs(input: {
  organizationName: string;
  organizationSlug: string;
  adminName: string;
  email: string;
  passwordHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async tx => {
    const organizationResult = await tx.insert(organizations).values({
      name: input.organizationName,
      legalName: input.organizationName,
      slug: input.organizationSlug,
      registrationStatus: "pending",
    });
    const organizationId = Number(organizationResult[0].insertId);
    await tx.insert(users).values({
      openId: `local:${input.email}`,
      email: input.email,
      name: input.adminName,
      passwordHash: input.passwordHash,
      loginMethod: "password",
      role: "admin",
      organizationId,
    });
    return { organizationId };
  });
}

export async function createPilotAdmin(input: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values({
    openId: `local:${input.email}`,
    email: input.email,
    name: input.name,
    passwordHash: input.passwordHash,
    loginMethod: "password",
    role: "admin",
    organizationId: 1,
  });
}

export async function assertDatabaseConnectivity() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  await db.execute(sql`SELECT 1`);
}

export async function recordReportExport(actorUserId: number, applicationId: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(auditLogs).values({
    organizationId,
    actorUserId,
    action: "REPORT_EXPORTED",
    entityType: "application",
    entityId: applicationId,
  });
}

export async function decideApplication(input: {
  applicationId: number;
  decision: "approved" | "rejected";
  notes: string;
  checkerId: number;
  organizationId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.transaction(async tx => {
    const application = await tx
      .select()
      .from(applications)
      .where(and(
        eq(applications.id, input.applicationId),
        eq(applications.organizationId, input.organizationId)
      ))
      .limit(1);
    const assessment = await tx
      .select()
      .from(assessments)
      .where(and(
        eq(assessments.applicationId, input.applicationId),
        eq(assessments.organizationId, input.organizationId)
      ))
      .orderBy(desc(assessments.assessedAt))
      .limit(1);

    if (!application[0] || application[0].status !== "assessed" || !assessment[0]) {
      throw new Error("Aplikasi belum dinilai atau sudah diputuskan");
    }
    const updateResult = await tx
      .update(applications)
      .set({
        status: input.decision,
        checkedBy: input.checkerId,
        checkedAt: new Date(),
        decisionNotes: input.notes,
        updatedAt: new Date(),
      })
      .where(and(
        eq(applications.id, input.applicationId),
        eq(applications.organizationId, input.organizationId),
        eq(applications.status, "assessed")
      ));
    if (updateResult[0].affectedRows !== 1) {
      throw new Error("Status aplikasi berubah; muat ulang halaman");
    }

    await tx.insert(auditLogs).values({
      organizationId: input.organizationId,
      actorUserId: input.checkerId,
      action: input.decision === "approved" ? "APPLICATION_APPROVED" : "APPLICATION_REJECTED",
      entityType: "application",
      entityId: input.applicationId,
      metadata: { assessmentId: assessment[0].id },
    });
  });
}

export async function getAssessmentByApplicationId(applicationId: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select()
    .from(assessments)
    .where(and(
      eq(assessments.applicationId, applicationId),
      eq(assessments.organizationId, organizationId)
    ))
    .orderBy(desc(assessments.assessedAt))
    .limit(1);
  
  return result[0];
}

export async function deleteAssessment(applicationId: number, organizationId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async tx => {
    const application = await tx
      .select()
      .from(applications)
      .where(and(
        eq(applications.id, applicationId),
        eq(applications.organizationId, organizationId)
      ))
      .limit(1);
    if (!application[0]) {
      throw new Error("Pengajuan tidak ditemukan");
    }
    if (application[0].status !== "assessed") {
      throw new Error("Penilaian hanya dapat dihapus saat pengajuan menunggu keputusan");
    }

    const deleteResult = await tx
      .delete(assessments)
      .where(and(
        eq(assessments.applicationId, applicationId),
        eq(assessments.organizationId, organizationId)
      ));
    if (!deleteResult[0].affectedRows) {
      throw new Error("Penilaian tidak ditemukan");
    }

    await tx
      .update(applications)
      .set({ status: "pending", updatedAt: new Date() })
      .where(and(
        eq(applications.id, applicationId),
        eq(applications.organizationId, organizationId)
      ));
    await tx.insert(auditLogs).values({
      organizationId,
      actorUserId,
      action: "ASSESSMENT_DELETED",
      entityType: "assessment",
      entityId: applicationId,
      metadata: { applicationId },
    });
    return { success: true };
  });
}

export async function hardDeleteApplication(applicationId: number, organizationId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async tx => {
    const application = await tx
      .select()
      .from(applications)
      .where(and(
        eq(applications.id, applicationId),
        eq(applications.organizationId, organizationId)
      ))
      .limit(1);
    if (!application[0]) {
      throw new Error("Pengajuan tidak ditemukan");
    }

    await tx.delete(documentFiles).where(and(
      eq(documentFiles.applicationId, applicationId),
      eq(documentFiles.organizationId, organizationId)
    ));
    await tx.delete(assessments).where(and(
      eq(assessments.applicationId, applicationId),
      eq(assessments.organizationId, organizationId)
    ));
    await tx.delete(applications).where(and(
      eq(applications.id, applicationId),
      eq(applications.organizationId, organizationId)
    ));
    await tx.delete(auditLogs).where(and(
      eq(auditLogs.organizationId, organizationId),
      eq(auditLogs.entityId, applicationId)
    ));

    return { success: true };
  });
}

export async function getAllAssessments(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(assessments)
    .where(eq(assessments.organizationId, organizationId))
    .orderBy(desc(assessments.assessedAt));
}

export async function updateUserRole(email: string, role: "maker" | "checker" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.email, email));
}

export async function updateOrganizationSettings(organizationId: number, input: {
  name?: string;
  legalName?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  primaryColor?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(organizations).set({
    ...(input.name ? { name: input.name } : {}),
    ...(input.legalName ? { legalName: input.legalName } : {}),
    ...(input.address !== undefined ? { address: input.address } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
    ...(input.primaryColor ? { primaryColor: input.primaryColor } : {}),
    updatedAt: new Date(),
  }).where(eq(organizations.id, organizationId));
}

export async function updateUserProfile(userId: number, input: {
  name?: string;
  position?: string | null;
  phone?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({
    ...(input.name ? { name: input.name } : {}),
    ...(input.position !== undefined ? { position: input.position } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function getAssessmentStats(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const allAssessments = await db.select().from(assessments)
    .where(eq(assessments.organizationId, organizationId));
  
  const stats = {
    total: allAssessments.length,
    sangatLayak: allAssessments.filter(a => a.classification === "Sangat Layak").length,
    layak: allAssessments.filter(a => a.classification === "Layak").length,
    perluPengawasan: allAssessments.filter(a => a.classification === "Perlu Pengawasan").length,
    tidakLayak: allAssessments.filter(a => a.classification === "Tidak Layak").length,
    averageScore: allAssessments.length > 0 
      ? allAssessments.reduce((sum, a) => sum + Number(a.totalScore), 0) / allAssessments.length 
      : 0,
  };
  
  return stats;
}

export async function listCustomerMaster(organizationId: number, search?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(applications.organizationId, organizationId)];
  const trimmed = search?.trim();
  if (trimmed) {
    const term = `%${trimmed}%`;
    conditions.push(
      or(
        like(applications.customerName, term),
        like(applications.customerId, term),
        like(applications.businessName, term),
      )!
    );
  }

  const rows = await db.select().from(applications).where(and(...conditions));
  if (rows.length === 0) return [];

  const applicationIds = rows.map(app => app.id);
  const assessmentRows = await db.select().from(assessments)
    .where(and(
      eq(assessments.organizationId, organizationId),
      sql`${assessments.applicationId} IN (${sql.join(applicationIds.map(id => sql`${id}`), sql`, `)})`,
    ))
    .orderBy(desc(assessments.assessedAt));

  const latestAssessments = new Map<number, typeof assessmentRows[number]>();
  for (const assessment of assessmentRows) {
    if (!latestAssessments.has(assessment.applicationId)) {
      latestAssessments.set(assessment.applicationId, assessment);
    }
  }

  const byCustomer = new Map<string, {
    customerName: string;
    customerId: string;
    businessName: string;
    totalApplications: number;
    statuses: Record<string, number>;
    lastApplicationDate: Date;
    latestAssessmentDate: Date | null;
    latestAssessmentScore: number | null;
  }>();

  for (const app of rows) {
    let entry = byCustomer.get(app.customerId);
    if (!entry) {
      entry = {
        customerName: app.customerName,
        customerId: app.customerId,
        businessName: app.businessName,
        totalApplications: 0,
        statuses: {},
        lastApplicationDate: app.createdAt,
        latestAssessmentDate: null,
        latestAssessmentScore: null,
      };
      byCustomer.set(app.customerId, entry);
    }
    entry.totalApplications++;
    entry.statuses[app.status] = (entry.statuses[app.status] ?? 0) + 1;
    if (app.createdAt > entry.lastApplicationDate) {
      entry.lastApplicationDate = app.createdAt;
    }
    const assessment = latestAssessments.get(app.id);
    if (assessment) {
      const assessedAt = new Date(assessment.assessedAt);
      if (entry.latestAssessmentDate === null || assessedAt > entry.latestAssessmentDate) {
        entry.latestAssessmentDate = assessedAt;
        entry.latestAssessmentScore = Number(assessment.totalScore);
      }
    }
  }

  return Array.from(byCustomer.values())
    .sort((a, b) => b.lastApplicationDate.getTime() - a.lastApplicationDate.getTime())
    .slice(0, 100)
    .map(entry => ({
      customerName: entry.customerName,
      customerId: entry.customerId,
      businessName: entry.businessName,
      totalApplications: entry.totalApplications,
      statuses: entry.statuses,
      latestAssessmentScore: entry.latestAssessmentScore,
      lastApplicationDate: entry.lastApplicationDate.toISOString(),
    }));
}

export async function getDashboardTrend(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const assessmentRows = await db.select().from(assessments)
    .where(eq(assessments.organizationId, organizationId));

  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  const monthSet = new Set(months);
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const month of months) buckets.set(month, { sum: 0, count: 0 });

  for (const assessment of assessmentRows) {
    const date = new Date(assessment.assessedAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthSet.has(month)) continue;
    const bucket = buckets.get(month)!;
    bucket.sum += Number(assessment.totalScore);
    bucket.count++;
  }

  return months.map(month => {
    const bucket = buckets.get(month)!;
    return {
      month,
      averageScore: bucket.count > 0 ? bucket.sum / bucket.count : 0,
      count: bucket.count,
    };
  });
}

export async function getAnalystPerformance(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const assessmentRows = await db.select().from(assessments)
    .where(eq(assessments.organizationId, organizationId));
  const userRows = await db.select().from(users)
    .where(eq(users.organizationId, organizationId));

  const userMap = new Map<number, typeof userRows[number]>();
  for (const user of userRows) userMap.set(user.id, user);

  const buckets = new Map<number, { sum: number; count: number }>();
  for (const assessment of assessmentRows) {
    if (assessment.assessedBy == null) continue;
    let bucket = buckets.get(assessment.assessedBy);
    if (!bucket) {
      bucket = { sum: 0, count: 0 };
      buckets.set(assessment.assessedBy, bucket);
    }
    bucket.sum += Number(assessment.totalScore);
    bucket.count++;
  }

  return Array.from(buckets.entries()).map(([userId, bucket]) => ({
    userId,
    name: userMap.get(userId)?.name ?? "Unknown",
    count: bucket.count,
    averageScore: bucket.count > 0 ? bucket.sum / bucket.count : 0,
  }));
}

export async function createDocumentFile(data: InsertDocumentFile & { organizationId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const application = await getApplicationById(data.applicationId, data.organizationId);
  if (!application) return undefined;
  const result = await db.insert(documentFiles).values(data);
  return result[0].insertId;
}

export async function getDocumentFiles(applicationId: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(documentFiles).where(and(eq(documentFiles.applicationId, applicationId), eq(documentFiles.organizationId, organizationId))).orderBy(desc(documentFiles.createdAt));
}

export async function getDocumentFileById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(documentFiles)
    .where(and(eq(documentFiles.id, id), eq(documentFiles.organizationId, organizationId)))
    .limit(1);
  return result[0];
}

export async function searchCustomerHistory(organizationId: number, query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const rows = await db.select().from(applications)
    .where(and(
      eq(applications.organizationId, organizationId),
      or(
        like(applications.customerName, `%${trimmed}%`),
        like(applications.customerId, `%${trimmed}%`)
      )!
    ))
    .orderBy(desc(applications.createdAt))
    .limit(10);

  if (rows.length === 0) return [];

  const applicationIds = rows.map(app => app.id);
  const assessmentRows = await db.select().from(assessments)
    .where(and(
      eq(assessments.organizationId, organizationId),
      sql`${assessments.applicationId} IN (${sql.join(applicationIds.map(id => sql`${id}`), sql`, `)})`,
    ))
    .orderBy(desc(assessments.assessedAt));

  const latestAssessments = new Map<number, typeof assessmentRows[number]>();
  for (const assessment of assessmentRows) {
    if (!latestAssessments.has(assessment.applicationId)) {
      latestAssessments.set(assessment.applicationId, assessment);
    }
  }

  return rows.map(app => {
    const assessment = latestAssessments.get(app.id);
    return {
      customerName: app.customerName,
      customerId: app.customerId,
      businessName: app.businessName,
      status: app.status,
      latestAssessmentScore: assessment ? Number(assessment.totalScore) : null,
      latestAssessmentClassification: assessment?.classification ?? null,
      date: app.createdAt,
    };
  });
}

export async function updateDocumentVerification(input: { id: number; organizationId: number; status: "verified" | "rejected"; verifiedBy: number; rejectionReason?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(documentFiles).set({ status: input.status, verifiedBy: input.verifiedBy, verifiedAt: new Date(), rejectionReason: input.status === "rejected" ? input.rejectionReason : null, updatedAt: new Date() }).where(and(eq(documentFiles.id, input.id), eq(documentFiles.organizationId, input.organizationId)));
  return result[0].affectedRows === 1;
}

// User/team management
export async function createTeamUser(input: {
  organizationId: number;
  name: string;
  email: string;
  position?: string | null;
  phone?: string | null;
  passwordHash: string;
  role: "maker" | "checker";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values({
    openId: `local:${input.email}`,
    email: input.email,
    name: input.name,
    position: input.position ?? null,
    phone: input.phone ?? null,
    passwordHash: input.passwordHash,
    loginMethod: "password",
    role: input.role,
    organizationId: input.organizationId,
    active: 1,
  });
  return Number(result[0].insertId);
}

export async function listOrganizationUsers(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(users)
    .where(eq(users.organizationId, organizationId))
    .orderBy(desc(users.id));
}

export async function setUserActive(organizationId: number, userId: number, active: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users)
    .set({ active: active ? 1 : 0, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)));
}

// Application comments / timeline
export async function addApplicationComment(input: {
  organizationId: number;
  applicationId: number;
  authorUserId: number;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(applicationComments).values(input);
  return Number(result[0].insertId);
}

export async function listApplicationComments(organizationId: number, applicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(applicationComments)
    .where(and(
      eq(applicationComments.organizationId, organizationId),
      eq(applicationComments.applicationId, applicationId)
    ))
    .orderBy(asc(applicationComments.createdAt));
}

export async function listApplicationActivity(organizationId: number, applicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(auditLogs)
    .where(and(
      eq(auditLogs.organizationId, organizationId),
      eq(auditLogs.entityId, applicationId)
    ))
    .orderBy(desc(auditLogs.createdAt));
}

// Credit policy
export async function getCreditPolicy(organizationId: number): Promise<{
  dscrMin: number;
  ltvMax: number;
  maxPlafon: number | null;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(creditPolicies)
    .where(eq(creditPolicies.organizationId, organizationId))
    .limit(1);

  if (rows.length === 0) {
    return { dscrMin: 1.25, ltvMax: 80, maxPlafon: null };
  }

  const policy = rows[0];
  return {
    dscrMin: Number(policy.dscrMin),
    ltvMax: Number(policy.ltvMax),
    maxPlafon: policy.maxPlafon !== null && policy.maxPlafon !== undefined ? Number(policy.maxPlafon) : null,
  };
}

export async function upsertCreditPolicy(organizationId: number, input: {
  dscrMin: number;
  ltvMax: number;
  maxPlafon: number | null;
  updatedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values: InsertCreditPolicy = {
    organizationId,
    dscrMin: input.dscrMin.toString(),
    ltvMax: input.ltvMax.toString(),
    maxPlafon: input.maxPlafon !== null ? input.maxPlafon.toString() : null,
    updatedBy: input.updatedBy,
  };

  await db.insert(creditPolicies).values(values).onDuplicateKeyUpdate({
    set: {
      dscrMin: input.dscrMin.toString(),
      ltvMax: input.ltvMax.toString(),
      maxPlafon: input.maxPlafon !== null ? input.maxPlafon.toString() : null,
      updatedBy: input.updatedBy,
      updatedAt: new Date(),
    },
  });

  return { success: true };
}

// Notifications
export async function createNotification(input: {
  organizationId: number;
  userId: number;
  type: string;
  title: string;
  content?: string | null;
  applicationId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const values: InsertNotification = {
    organizationId: input.organizationId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    content: input.content ?? null,
    applicationId: input.applicationId ?? null,
  };

  const result = await db.insert(notifications).values(values);
  return Number(result[0].insertId);
}

export async function listNotifications(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(notifications)
    .where(and(
      eq(notifications.organizationId, organizationId),
      eq(notifications.userId, userId)
    ))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function countUnreadNotifications(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ count: sql`COUNT(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.organizationId, organizationId),
      eq(notifications.userId, userId),
      eq(notifications.read, 0)
    ));
  return Number(result[0].count);
}

export async function markNotificationsRead(organizationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications)
    .set({ read: 1 })
    .where(and(
      eq(notifications.organizationId, organizationId),
      eq(notifications.userId, userId),
      eq(notifications.read, 0)
    ));
  return { success: true };
}

// SLIK / BI-checking export
export async function getSlikExport(organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(applications)
    .where(eq(applications.organizationId, organizationId))
    .orderBy(desc(applications.createdAt))
    .limit(500);

  if (rows.length === 0) return [];

  const applicationIds = rows.map(application => application.id);
  const assessmentRows = await db.select().from(assessments)
    .where(and(
      eq(assessments.organizationId, organizationId),
      sql`${assessments.applicationId} IN (${sql.join(applicationIds.map(id => sql`${id}`), sql`, `)})`,
    ))
    .orderBy(desc(assessments.assessedAt));

  const latestAssessments = new Map<number, typeof assessmentRows[number]>();
  for (const assessment of assessmentRows) {
    if (!latestAssessments.has(assessment.applicationId)) {
      latestAssessments.set(assessment.applicationId, assessment);
    }
  }

  return rows.map(application => {
    const assessment = latestAssessments.get(application.id);
    return {
      customerName: application.customerName,
      customerId: application.customerId,
      businessName: application.businessName,
      businessType: application.businessType,
      requestedAmount: Number(application.requestedAmount),
      status: application.status,
      totalScore: assessment ? Number(assessment.totalScore) : null,
      classification: assessment?.classification ?? null,
      assessedAt: assessment?.assessedAt ?? null,
    };
  });
}

// Survey photos
export async function createSurveyPhoto(data: InsertSurveyPhoto & { organizationId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(surveyPhotos).values(data);
  return Number(result[0].insertId);
}

export async function listSurveyPhotos(organizationId: number, applicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(surveyPhotos)
    .where(and(
      eq(surveyPhotos.organizationId, organizationId),
      eq(surveyPhotos.applicationId, applicationId)
    ))
    .orderBy(desc(surveyPhotos.createdAt));
}

export async function getSurveyPhotoById(id: number, organizationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(surveyPhotos)
    .where(and(eq(surveyPhotos.id, id), eq(surveyPhotos.organizationId, organizationId)))
    .limit(1);
  return result[0];
}

export async function updateSurveyAnalysis(id: number, organizationId: number, data: {
  status: "analyzed" | "failed";
  analysisResult?: Record<string, unknown> | null;
  analyzedAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(surveyPhotos)
    .set({
      ...(data.status ? { status: data.status } : {}),
      ...(data.analysisResult !== undefined ? { analysisResult: data.analysisResult } : {}),
      ...(data.analyzedAt !== undefined ? { analyzedAt: data.analyzedAt } : {}),
    })
    .where(and(eq(surveyPhotos.id, id), eq(surveyPhotos.organizationId, organizationId)));
}
