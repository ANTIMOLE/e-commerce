import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router        = t.router;
export const middleware    = t.middleware;
export const mergeRouters  = t.mergeRouters;

// ── Public — siapa saja boleh akses ──────────────────────────
export const publicProcedure = t.procedure;

// ── Protected — harus login ───────────────────────────────────
export const protectedProcedure = t.procedure.use(
  middleware(({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code:    "UNAUTHORIZED",
        message: "Anda harus login untuk mengakses fitur ini",
      });
    }
    return next({
      ctx: {
        ...ctx,
        userId:    ctx.userId,
        userEmail: ctx.userEmail,
        userRole:  ctx.userRole,
      },
    });
  })
);

// ── Admin only — harus login DAN role ADMIN ───────────────────
export const adminProcedure = t.procedure.use(
  middleware(({ ctx, next }) => {
    if (!ctx.userId) {
      throw new TRPCError({
        code:    "UNAUTHORIZED",
        message: "Anda harus login untuk mengakses fitur ini",
      });
    }
    if (ctx.userRole !== "ADMIN") {
      throw new TRPCError({
        code:    "FORBIDDEN",
        message: "Anda tidak memiliki akses ke resource ini",
      });
    }
    return next({
      ctx: {
        ...ctx,
        userId:    ctx.userId,
        userEmail: ctx.userEmail,
        userRole:  "ADMIN" as const,
      },
    });
  })
);
