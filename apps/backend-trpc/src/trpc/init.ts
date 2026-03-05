import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

// ── Init tRPC ─────────────────────────────────────────────────
// Satu instance per aplikasi — jangan di-init ulang di file lain
const t = initTRPC.context<Context>().create();

// ── Exports ───────────────────────────────────────────────────
export const router      = t.router;
export const middleware  = t.middleware;
export const mergeRouters = t.mergeRouters;

// ── Public Procedure ──────────────────────────────────────────
// Bisa dipanggil tanpa auth
export const publicProcedure = t.procedure;

// ── Auth Middleware ───────────────────────────────────────────
const isAuthenticated = middleware(({ ctx, next }) => {
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
    },
  });
});

// ── Protected Procedure ───────────────────────────────────────
// Otomatis reject kalau tidak ada userId di context
export const protectedProcedure = t.procedure.use(isAuthenticated);
