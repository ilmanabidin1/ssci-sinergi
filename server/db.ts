import { eq, desc, and, gte, lte, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, applications, assessments, auditLogs, documentFiles, InsertApplication, InsertAssessment, InsertDocumentFile } from "../drizzle/schema";
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
  status?: "pending" | "assessed" | "approved" | "rejected";
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

  const counts = { pending: 0, assessed: 0, approved: 0, rejected: 0 };
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
    if (
      application[0].submittedBy === input.checkerId ||
      assessment[0].assessedBy === input.checkerId
    ) {
      throw new Error("Maker-checker melarang pemeriksaan oleh pengguna yang sama");
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

export async function updateDocumentVerification(input: { id: number; organizationId: number; status: "verified" | "rejected"; verifiedBy: number; rejectionReason?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.update(documentFiles).set({ status: input.status, verifiedBy: input.verifiedBy, verifiedAt: new Date(), rejectionReason: input.status === "rejected" ? input.rejectionReason : null, updatedAt: new Date() }).where(and(eq(documentFiles.id, input.id), eq(documentFiles.organizationId, input.organizationId)));
  return result[0].affectedRows === 1;
}
