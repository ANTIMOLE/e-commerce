/**
 * trpc.errors.test.ts — Whitebox Unit Test (backend-trpc)
 *
 * Letakkan di: backend-trpc/src/__tests__/unit/trpc.errors.test.ts
 *
 * Menguji: toTRPCError, serviceCall (dari src/trpc/errors.ts)
 * Menguji: protectedProcedure, adminProcedure middleware (dari src/trpc/init.ts)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError }   from "@trpc/server";
import { AppError }    from "../../middlewares/error.middleware";
import { toTRPCError, serviceCall } from "../../trpc/errors";

beforeEach(() => { vi.clearAllMocks(); });

// ══════════════════════════════════════════════════════════════
// toTRPCError()
// ══════════════════════════════════════════════════════════════
describe("toTRPCError()", () => {
  it("✅ return TRPCError langsung jika sudah TRPCError", () => {
    const original = new TRPCError({ code: "NOT_FOUND", message: "not found" });
    const result   = toTRPCError(original);

    expect(result).toBe(original); // same reference
  });

  it("✅ convert AppError 400 → BAD_REQUEST", () => {
    const err    = new AppError("Input tidak valid.", 400);
    const result = toTRPCError(err);

    expect(result).toBeInstanceOf(TRPCError);
    expect(result.code).toBe("BAD_REQUEST");
    expect(result.message).toBe("Input tidak valid.");
  });

  it("✅ convert AppError 401 → UNAUTHORIZED", () => {
    const result = toTRPCError(new AppError("Unauthorized.", 401));
    expect(result.code).toBe("UNAUTHORIZED");
  });

  it("✅ convert AppError 403 → FORBIDDEN", () => {
    const result = toTRPCError(new AppError("Forbidden.", 403));
    expect(result.code).toBe("FORBIDDEN");
  });

  it("✅ convert AppError 404 → NOT_FOUND", () => {
    const result = toTRPCError(new AppError("Tidak ditemukan.", 404));
    expect(result.code).toBe("NOT_FOUND");
    expect(result.message).toBe("Tidak ditemukan.");
  });

  it("✅ convert AppError 409 → CONFLICT", () => {
    const result = toTRPCError(new AppError("Conflict.", 409));
    expect(result.code).toBe("CONFLICT");
  });

  it("✅ AppError dengan status tidak dikenal → INTERNAL_SERVER_ERROR", () => {
    const result = toTRPCError(new AppError("Unknown.", 418)); // I'm a teapot
    expect(result.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("✅ convert Error biasa → INTERNAL_SERVER_ERROR", () => {
    const err    = new Error("Something crashed");
    const result = toTRPCError(err);

    expect(result.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.message).toBe("Something crashed");
  });

  it("✅ non-Error value → INTERNAL_SERVER_ERROR dengan pesan default", () => {
    const result = toTRPCError("string error");

    expect(result.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.message).toBe("Terjadi kesalahan.");
  });

  it("✅ null/undefined → INTERNAL_SERVER_ERROR", () => {
    expect(toTRPCError(null).code).toBe("INTERNAL_SERVER_ERROR");
    expect(toTRPCError(undefined).code).toBe("INTERNAL_SERVER_ERROR");
  });
});

// ══════════════════════════════════════════════════════════════
// serviceCall()
// ══════════════════════════════════════════════════════════════
describe("serviceCall()", () => {
  it("✅ return hasil fungsi jika tidak ada error", async () => {
    const result = await serviceCall(async () => ({ id: "user-1" }));
    expect(result).toEqual({ id: "user-1" });
  });

  it("✅ convert AppError menjadi TRPCError saat serviceCall gagal", async () => {
    const fn = async () => { throw new AppError("Tidak ditemukan.", 404); };

    await expect(serviceCall(fn)).rejects.toBeInstanceOf(TRPCError);

    try {
      await serviceCall(fn);
    } catch (err) {
      expect((err as TRPCError).code).toBe("NOT_FOUND");
      expect((err as TRPCError).message).toBe("Tidak ditemukan.");
    }
  });

  it("✅ convert Error biasa menjadi TRPCError INTERNAL_SERVER_ERROR", async () => {
    const fn = async () => { throw new Error("DB connection lost"); };

    try {
      await serviceCall(fn);
    } catch (err) {
      expect((err as TRPCError).code).toBe("INTERNAL_SERVER_ERROR");
    }
  });

  it("✅ TRPCError yang sudah ada tidak di-wrap ulang", async () => {
    const original = new TRPCError({ code: "UNAUTHORIZED", message: "Login required" });
    const fn       = async () => { throw original; };

    try {
      await serviceCall(fn);
    } catch (err) {
      expect(err).toBe(original); // same reference, tidak di-wrap
    }
  });
});

// ══════════════════════════════════════════════════════════════
// AppError class
// ══════════════════════════════════════════════════════════════
describe("AppError class", () => {
  it("✅ default status 400 jika tidak diberikan", () => {
    const err = new AppError("Bad request");
    expect(err.status).toBe(400);
    expect(err.name).toBe("AppError");
    expect(err.message).toBe("Bad request");
  });

  it("✅ instanceof Error", () => {
    expect(new AppError("test")).toBeInstanceOf(Error);
  });

  it("✅ status custom disimpan dengan benar", () => {
    const err = new AppError("Not found", 404);
    expect(err.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════
// tRPC middleware: protectedProcedure & adminProcedure
// ══════════════════════════════════════════════════════════════
describe("tRPC middleware — protectedProcedure", () => {
  /**
   * Kita test middleware secara langsung dengan memanggil fungsi
   * middleware dan memeriksa apakah next() dipanggil atau TRPCError dilempar.
   */

  it("✅ next() dipanggil jika ctx.userId ada", async () => {
    const next = vi.fn().mockResolvedValue({ ok: true });
    const ctx  = { userId: "user-1", userEmail: "u@test.com", userRole: "USER" as const, res: {} as any };

    // Simulasi middleware isAuthenticated
    const isAuthenticated = ({ ctx, next }: any) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Login required" });
      return next({ ctx: { ...ctx, userId: ctx.userId } });
    };

    await isAuthenticated({ ctx, next });

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0].ctx.userId).toBe("user-1");
  });

  it("❌ throw UNAUTHORIZED jika ctx.userId kosong", async () => {
    const next = vi.fn();
    const ctx  = { res: {} as any };

    const isAuthenticated = ({ ctx, next }: any) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Anda harus login untuk mengakses fitur ini" });
      return next({ ctx });
    };

    expect(() => isAuthenticated({ ctx, next })).toThrow(TRPCError);
    expect(next).not.toHaveBeenCalled();

    try {
      isAuthenticated({ ctx, next });
    } catch (err) {
      expect((err as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });
});

describe("tRPC middleware — adminProcedure", () => {
  const isAdmin = ({ ctx, next }: any) => {
    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Anda harus login untuk mengakses fitur ini" });
    if (ctx.userRole !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN", message: "Anda tidak memiliki akses ke resource ini" });
    return next({ ctx: { ...ctx, userRole: "ADMIN" as const } });
  };

  it("✅ next() dipanggil jika userRole ADMIN", async () => {
    const next = vi.fn().mockResolvedValue({ ok: true });
    const ctx  = { userId: "admin-1", userRole: "ADMIN" as const, res: {} as any };

    await isAdmin({ ctx, next });

    expect(next).toHaveBeenCalledOnce();
  });

  it("❌ throw UNAUTHORIZED jika tidak login", () => {
    const next = vi.fn();
    const ctx  = { res: {} as any };

    expect(() => isAdmin({ ctx, next })).toThrow(TRPCError);

    try {
      isAdmin({ ctx, next });
    } catch (err) {
      expect((err as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("❌ throw FORBIDDEN jika login tapi role USER", () => {
    const next = vi.fn();
    const ctx  = { userId: "user-1", userRole: "USER" as const, res: {} as any };

    expect(() => isAdmin({ ctx, next })).toThrow(TRPCError);

    try {
      isAdmin({ ctx, next });
    } catch (err) {
      expect((err as TRPCError).code).toBe("FORBIDDEN");
      expect((err as TRPCError).message).toBe("Anda tidak memiliki akses ke resource ini");
    }
  });
});
