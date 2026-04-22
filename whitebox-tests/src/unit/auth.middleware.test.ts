/**
 * auth.middleware.test.ts — Whitebox Unit Test
 *
 * Letakkan di: backend-rest/src/__tests__/unit/auth.middleware.test.ts
 *
 * Test fungsi `authenticate` dan `optionalAuth` secara isolasi.
 * Request dan Response di-mock sebagai objek biasa (tidak butuh
 * Express yang jalan sungguhan).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── MOCK sebelum import ─────────────────────────────────────

vi.mock("../../config/env", () => ({
  env: {
    JWT_SECRET: "test-jwt-secret-minimum-32-chars-long",
    JWT_REFRESH_SECRET: "test-refresh-secret-minimum-32-chars-long",
    NODE_ENV: "test",
  },
}));

vi.mock("../../config/database", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: { verify: vi.fn() },
  TokenExpiredError: class TokenExpiredError extends Error {
    constructor() { super("jwt expired"); this.name = "TokenExpiredError"; }
  },
}));

// ─── Import SETELAH mock ─────────────────────────────────────
import { prisma } from "../../config/database";
import jwt from "jsonwebtoken";
import { authenticate, optionalAuth } from "../../middlewares/auth.middleware";

// ─── Helper: buat mock Request, Response, NextFunction ───────

function mockRequest(overrides: Record<string, unknown> = {}) {
  return {
    cookies: {},
    user: undefined,
    ...overrides,
  } as any;
}

function mockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as any;
}

const next = vi.fn();

// ─── Typed mocks ─────────────────────────────────────────────
const mockJwtVerify = (jwt as any).verify as ReturnType<typeof vi.fn>;
const mockPrismaFindUnique = (prisma.user as any).findUnique as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════
// authenticate()
// ══════════════════════════════════════════════════════════════
describe("authenticate middleware", () => {
  it("✅ memanggil next() dan set req.user jika token valid", async () => {
    const req = mockRequest({ cookies: { accessToken: "valid.jwt.token" } });
    const res = mockResponse();

    mockJwtVerify.mockReturnValue({ userId: "user-uuid", role: "USER" });
    mockPrismaFindUnique.mockResolvedValue({ id: "user-uuid", role: "USER" });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toMatchObject({ id: "user-uuid", role: "USER" });
    expect(res.status).not.toHaveBeenCalled(); // tidak return error
  });

  it("❌ return 401 jika tidak ada cookie accessToken", async () => {
    const req = mockRequest({ cookies: {} });
    const res = mockResponse();

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("❌ return 401 jika jwt.verify melempar TokenExpiredError", async () => {
    const req = mockRequest({ cookies: { accessToken: "expired.token" } });
    const res = mockResponse();

    const { TokenExpiredError } = await import("jsonwebtoken") as any;
    mockJwtVerify.mockImplementation(() => { throw new TokenExpiredError(); });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("❌ return 401 jika token tidak valid (signature salah)", async () => {
    const req = mockRequest({ cookies: { accessToken: "tampered.token" } });
    const res = mockResponse();

    mockJwtVerify.mockImplementation(() => { throw new Error("invalid signature"); });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("❌ return 401 jika user tidak ditemukan di database", async () => {
    const req = mockRequest({ cookies: { accessToken: "valid.token" } });
    const res = mockResponse();

    mockJwtVerify.mockReturnValue({ userId: "deleted-user-id", role: "USER" });
    mockPrismaFindUnique.mockResolvedValue(null); // user dihapus

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("✅ set req.user.role dari database, bukan dari token (RBAC trust boundary)", async () => {
    // Jika role di token USER tapi di DB sudah di-upgrade jadi ADMIN
    // → harus ambil dari DB, bukan token
    const req = mockRequest({ cookies: { accessToken: "valid.token" } });
    const res = mockResponse();

    mockJwtVerify.mockReturnValue({ userId: "user-uuid", role: "USER" }); // token bilang USER
    mockPrismaFindUnique.mockResolvedValue({ id: "user-uuid", role: "ADMIN" }); // DB bilang ADMIN

    await authenticate(req, res, next);

    expect(req.user.role).toBe("ADMIN"); // harus ikut DB
    expect(next).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// optionalAuth()
// ══════════════════════════════════════════════════════════════
describe("optionalAuth middleware", () => {
  it("✅ memanggil next() tanpa set req.user jika tidak ada cookie", async () => {
    const req = mockRequest({ cookies: {} });
    const res = mockResponse();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeUndefined();
  });

  it("✅ set req.user jika token ada dan valid", async () => {
    const req = mockRequest({ cookies: { accessToken: "valid.token" } });
    const res = mockResponse();

    mockJwtVerify.mockReturnValue({ userId: "user-uuid", role: "USER" });
    mockPrismaFindUnique.mockResolvedValue({ id: "user-uuid", role: "USER" });

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeDefined();
  });
});
