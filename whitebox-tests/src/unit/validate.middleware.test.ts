/**
 * validate.middleware.test.ts — Whitebox Unit Test
 *
 * Letakkan di: backend-rest/src/__tests__/unit/validate.middleware.test.ts
 *
 * Test Zod-based validation middleware secara isolasi.
 * Tidak butuh mock — middleware ini murni stateless.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { validate, validateMultiple } from "../../middlewares/validate.middleware";

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as any;
}

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
}

beforeEach(() => vi.clearAllMocks());

// ─── Schema contoh ────────────────────────────────────────────
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ══════════════════════════════════════════════════════════════
// validate(schema, "body")
// ══════════════════════════════════════════════════════════════
describe("validate() — body", () => {
  it("✅ next() dipanggil dan req.body ter-transform jika valid", () => {
    const req = mockReq({ body: { email: "user@example.com", password: "SecurePass!" } });
    const res = mockRes();
    const next = vi.fn();

    validate(loginSchema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("❌ return 400 jika email tidak valid", () => {
    const req = mockReq({ body: { email: "not-an-email", password: "SecurePass!" } });
    const res = mockRes();
    const next = vi.fn();

    validate(loginSchema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errors: expect.objectContaining({ email: expect.any(Array) }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("❌ return 400 jika field wajib tidak ada", () => {
    const req = mockReq({ body: {} }); // kosong
    const res = mockRes();
    const next = vi.fn();

    validate(loginSchema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("❌ return 400 jika password terlalu pendek", () => {
    const req = mockReq({ body: { email: "user@example.com", password: "short" } });
    const res = mockRes();
    const next = vi.fn();

    validate(loginSchema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.objectContaining({ password: expect.any(Array) }),
      })
    );
  });

  it("✅ field extra di body di-strip oleh Zod (keamanan mass-assignment)", () => {
    // Zod secara default strip unknown fields → attacker tidak bisa inject role
    const req = mockReq({
      body: {
        email: "user@example.com",
        password: "SecurePass!",
        role: "ADMIN", // attacker mencoba inject ini
      },
    });
    const res = mockRes();
    const next = vi.fn();

    validate(loginSchema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.role).toBeUndefined(); // di-strip Zod
  });
});

// ══════════════════════════════════════════════════════════════
// validate(schema, "query")
// ══════════════════════════════════════════════════════════════
describe("validate() — query params", () => {
  it("✅ meng-coerce string ke number (query selalu string dari HTTP)", () => {
    const req = mockReq({ query: { page: "2", limit: "10" } }); // string dari URL
    const res = mockRes();
    const next = vi.fn();

    validate(paginationSchema, "query")(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBe(2);   // sudah jadi number
    expect(req.query.limit).toBe(10);
  });

  it("✅ mengisi default jika query kosong", () => {
    const req = mockReq({ query: {} });
    const res = mockRes();
    const next = vi.fn();

    validate(paginationSchema, "query")(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBe(1);
    expect(req.query.limit).toBe(20);
  });

  it("❌ return 400 jika limit melebihi max", () => {
    const req = mockReq({ query: { limit: "999" } });
    const res = mockRes();
    const next = vi.fn();

    validate(paginationSchema, "query")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// validateMultiple()
// ══════════════════════════════════════════════════════════════
describe("validateMultiple()", () => {
  const paramSchema = z.object({ id: z.uuid() });

  it("✅ next() jika semua schema valid", () => {
    const req = mockReq({
      body: { email: "u@example.com", password: "Secure123!" },
      params: { id: "550e8400-e29b-41d4-a716-446655440000" },
    });
    const res = mockRes();
    const next = vi.fn();

    validateMultiple({ body: loginSchema, params: paramSchema })(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("❌ return 400 dengan errors dari SEMUA schema yang gagal", () => {
    const req = mockReq({
      body: {}, // body invalid
      params: { id: "not-a-uuid" }, // params invalid
    });
    const res = mockRes();
    const next = vi.fn();

    validateMultiple({ body: loginSchema, params: paramSchema })(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonArg = res.json.mock.calls[0][0];
    // Harus ada errors dari kedua schema
    expect(jsonArg.errors).toHaveProperty("body");
    expect(jsonArg.errors).toHaveProperty("params");
    expect(next).not.toHaveBeenCalled();
  });
});
