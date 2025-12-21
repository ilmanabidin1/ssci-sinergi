import { eq, desc, and, gte, lte, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, applications, assessments, InsertApplication, InsertAssessment } from "../drizzle/schema";
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
export async function createApplication(data: InsertApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(applications).values(data);
  return result[0].insertId;
}

export async function getApplicationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return result[0];
}

export async function getAllApplications(filters?: {
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let query = db.select().from(applications);
  
  const conditions = [];
  
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

export async function updateApplicationStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(applications)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(applications.id, id));
}

// Assessment queries
export async function createAssessment(data: InsertAssessment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(assessments).values(data);
  return result[0].insertId;
}

export async function getAssessmentByApplicationId(applicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select()
    .from(assessments)
    .where(eq(assessments.applicationId, applicationId))
    .orderBy(desc(assessments.assessedAt))
    .limit(1);
  
  return result[0];
}

export async function getAllAssessments() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(assessments).orderBy(desc(assessments.assessedAt));
}

export async function getAssessmentStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const allAssessments = await db.select().from(assessments);
  
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
