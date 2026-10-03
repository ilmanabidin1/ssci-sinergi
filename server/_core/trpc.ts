import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
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

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
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
