import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import type { TrpcContext } from "./context";
import { ENV } from "./env";

type SessionUser = NonNullable<TrpcContext["user"]>;

const TWO_FACTOR_SETUP_PATHS = new Set([
  "auth.me",
  "auth.logout",
  "auth.setupTwoFactor",
  "auth.enableTwoFactor",
]);

export function needsTwoFactorSetup(user: Pick<SessionUser, "role" | "twoFactorEnabled">): boolean {
  return ENV.enforceTwoFactor && (user.role === "admin" || user.role === "checker") && !user.twoFactorEnabled;
}

export function isSuperAdmin(user: Pick<SessionUser, "email"> | null | undefined): boolean {
  return !!user?.email && ENV.superAdminEmails.includes(user.email.toLowerCase());
}

function assertTwoFactorReady(user: SessionUser, path: string) {
  if (needsTwoFactorSetup(user) && !TWO_FACTOR_SETUP_PATHS.has(path)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "TWO_FACTOR_REQUIRED: Aktifkan autentikasi dua faktor untuk melanjutkan." });
  }
}

// Pesan validasi zod dalam Bahasa Indonesia.
z.config(z.locales.id());

const GENERIC_SERVER_ERROR = "Terjadi kesalahan di server. Coba lagi beberapa saat; jika berulang, hubungi admin.";
/** Pesan teknis (stack, SQL, koneksi, bahasa Inggris) tidak boleh sampai ke pengguna. */
const TECHNICAL_MESSAGE = /(sql|econn|etimedout|database|cannot read|undefined|null|is not a function|unexpected token|duplicate entry|er_|syntax|stack|openid|not configured)/i;

function friendlyZodMessage(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Isian tidak valid.";
  const field = first.path.length ? ` (${first.path.map(String).join(".")})` : "";
  const more = error.issues.length > 1 ? ` dan ${error.issues.length - 1} isian lain` : "";
  return `Isian tidak valid${field}: ${first.message}${more}.`;
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    let message = shape.message;
    let fieldErrors: Record<string, string> | undefined;
    if (error.cause instanceof z.ZodError) {
      message = friendlyZodMessage(error.cause);
      fieldErrors = Object.fromEntries(error.cause.issues.map(issue => [issue.path.map(String).join("."), issue.message]));
    } else if (error.code === "INTERNAL_SERVER_ERROR" && (TECHNICAL_MESSAGE.test(message) || !message.trim())) {
      message = GENERIC_SERVER_ERROR;
    }
    return { ...shape, message, data: { ...shape.data, stack: undefined, fieldErrors } };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  assertTwoFactorReady(ctx.user, opts.path);

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const requireRole = (...roles: Array<"maker" | "checker" | "admin">) =>
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Akses peran tidak mencukupi" });
    }
    assertTwoFactorReady(ctx.user, opts.path);
    return next({ ctx: { ...ctx, user: ctx.user } });
  });

export const makerProcedure = t.procedure.use(requireRole("maker", "admin"));
export const checkerProcedure = t.procedure.use(requireRole("checker", "admin"));

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    assertTwoFactorReady(ctx.user, opts.path);

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const superAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    if (!isSuperAdmin(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Khusus SuperAdmin platform" });
    if (!ctx.user.twoFactorEnabled) {
      throw new TRPCError({ code: "FORBIDDEN", message: "TWO_FACTOR_REQUIRED: SuperAdmin wajib mengaktifkan autentikasi dua faktor." });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
