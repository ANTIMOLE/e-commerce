import { z }                  from "zod";
import { TRPCError }          from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc/init";
import { serviceCall }        from "../trpc/errors";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "@ecommerce/shared";
import * as authService from "../services/auth.service";

// Cookie config — mirrors REST (auth.service.ts COOKIE_OPTIONS)
const COOKIE_OPTIONS = {
  httpOnly:  true,
  secure:    process.env.NODE_ENV === "production",
  sameSite:  "lax" as const,
  path:      "/",
  maxAge:    7 * 24 * 60 * 60 * 1000, // 7 days
};

export const authRouter = router({

  // ── GET /auth/me ─────────────────────────────────────────
  // REST:  GET /auth/me → getMeController
  // tRPC:  trpc.auth.me.useQuery()
  me: protectedProcedure.query(async ({ ctx }) => {
    return serviceCall(() => authService.getProfile(ctx.userId!));
  }),

  // ── POST /auth/register ───────────────────────────────────
  // REST:  POST /auth/register
  // tRPC:  trpc.auth.register.useMutation()
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await serviceCall(() => authService.register(input));
      // Set refresh token as httpOnly cookie (same as REST)
      ctx.res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);
      return {
        user:        result.user,
        accessToken: result.accessToken,
      };
    }),

  // ── POST /auth/login ──────────────────────────────────────
  // REST:  POST /auth/login
  // tRPC:  trpc.auth.login.useMutation()
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await serviceCall(() => authService.login(input));
      ctx.res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);
      return {
        user:        result.user,
        accessToken: result.accessToken,
      };
    }),

  // ── POST /auth/logout ─────────────────────────────────────
  // REST:  POST /auth/logout
  // tRPC:  trpc.auth.logout.useMutation()
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await serviceCall(() => authService.logout(ctx.userId!));
    ctx.res.clearCookie("refreshToken", { path: "/" });
    return { success: true };
  }),

  // ── POST /auth/refresh ────────────────────────────────────
  // REST:  POST /auth/refresh (reads cookie)
  // tRPC:  trpc.auth.refresh.useMutation()
  //        Input: refreshToken dari cookie atau body
  refresh: publicProcedure
    .input(z.object({ refreshToken: z.string().min(1) }).optional())
    .mutation(async ({ input, ctx }) => {
      // Try body first, then cookie
      const token =
        input?.refreshToken ??
        (ctx.res as any).req?.cookies?.refreshToken;

      if (!token) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Refresh token tidak ditemukan." });
      }

      const accessToken = await serviceCall(() => authService.refreshToken(token));
      return { accessToken };
    }),

  // ── PATCH /auth/change-password ───────────────────────────
  // REST:  PATCH /auth/change-password
  // tRPC:  trpc.auth.changePassword.useMutation()
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ input, ctx }) => {
      return serviceCall(() =>
        authService.changePassword(ctx.userId!, input.oldPassword, input.newPassword)
      );
    }),
});
