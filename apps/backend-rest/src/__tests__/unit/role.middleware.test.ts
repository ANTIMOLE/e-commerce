/**
 * role.middleware.test.ts — Whitebox Unit Test
 *
 * Letakkan di: backend-rest/src/__tests__/unit/role.middleware.test.ts
 *
 * Test RBAC logic:
 *   - requireRole(single)
 *   - requireRole(array)
 *   - requireAdmin
 *   - requireUser
 *   - requireOwnerOrAdmin
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireRole,
  requireAdmin,
  requireUser,
  requireOwnerOrAdmin,
} from "../../middlewares/role.middleware";

// ─── Helper ─────────────────────────────────────────────────

function mockReq(userOverride?: Partial<{ id: string; role: "USER" | "ADMIN" }>) {
  return {
    user: userOverride
      ? { id: "default-user-id", role: "USER" as const, ...userOverride }
      : undefined,
    params: {},
  } as any;
}

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
}

beforeEach(() => { vi.clearAllMocks(); });

// ══════════════════════════════════════════════════════════════
// requireRole()
// ══════════════════════════════════════════════════════════════
describe("requireRole()", () => {
  it("✅ memanggil next() jika role cocok (single)", () => {
    const req = mockReq({ role: "ADMIN" });
    const res = mockRes();
    const next = vi.fn();

    requireRole("ADMIN")(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("✅ memanggil next() jika role ada di array", () => {
    const req = mockReq({ role: "USER" });
    const res = mockRes();
    const next = vi.fn();

    requireRole(["USER", "ADMIN"])(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("❌ return 403 jika role tidak cocok", () => {
    const req = mockReq({ role: "USER" });
    const res = mockRes();
    const next = vi.fn();

    requireRole("ADMIN")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("❌ return 401 jika req.user undefined (tidak terauthentikasi)", () => {
    const req = mockReq(); // user = undefined
    const res = mockRes();
    const next = vi.fn();

    requireRole("USER")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// requireAdmin (shorthand)
// ══════════════════════════════════════════════════════════════
describe("requireAdmin", () => {
  it("✅ ADMIN role: next() dipanggil", () => {
    const req = mockReq({ role: "ADMIN" });
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("❌ USER role: 403 Forbidden", () => {
    const req = mockReq({ role: "USER" });
    const res = mockRes();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// requireUser (shorthand — USER dan ADMIN boleh)
// ══════════════════════════════════════════════════════════════
describe("requireUser", () => {
  it("✅ USER role: next() dipanggil", () => {
    const req = mockReq({ role: "USER" });
    const res = mockRes();
    const next = vi.fn();

    requireUser(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("✅ ADMIN role: next() juga dipanggil", () => {
    const req = mockReq({ role: "ADMIN" });
    const res = mockRes();
    const next = vi.fn();

    requireUser(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

// ══════════════════════════════════════════════════════════════
// requireOwnerOrAdmin
// ══════════════════════════════════════════════════════════════
describe("requireOwnerOrAdmin()", () => {
  it("✅ ADMIN bisa akses resource milik siapapun", async () => {
    const req = mockReq({ id: "admin-id", role: "ADMIN" });
    const res = mockRes();
    const next = vi.fn();

    const getOwnerId = vi.fn().mockResolvedValue("other-user-id");

    await requireOwnerOrAdmin(getOwnerId)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    // ADMIN tidak perlu check owner → getOwnerId bisa tidak dipanggil
  });

  it("✅ USER bisa akses resource miliknya sendiri", async () => {
    const req = mockReq({ id: "user-uuid", role: "USER" });
    const res = mockRes();
    const next = vi.fn();

    const getOwnerId = vi.fn().mockResolvedValue("user-uuid"); // sama

    await requireOwnerOrAdmin(getOwnerId)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("❌ USER tidak bisa akses resource milik user lain (IDOR)", async () => {
    const req = mockReq({ id: "attacker-id", role: "USER" });
    const res = mockRes();
    const next = vi.fn();

    const getOwnerId = vi.fn().mockResolvedValue("victim-id"); // berbeda

    await requireOwnerOrAdmin(getOwnerId)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("❌ return 401 jika req.user undefined", async () => {
    const req = mockReq(); // tanpa user
    const res = mockRes();
    const next = vi.fn();

    await requireOwnerOrAdmin(vi.fn())(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("❌ return 500 jika getOwnerId melempar error", async () => {
    const req = mockReq({ id: "user-uuid", role: "USER" });
    const res = mockRes();
    const next = vi.fn();

    const getOwnerId = vi.fn().mockRejectedValue(new Error("DB error"));

    await requireOwnerOrAdmin(getOwnerId)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });
});
