/**
 * auth.service.test.ts — Whitebox Unit Test (backend-trpc)
 *
 * Letakkan di: backend-trpc/src/__tests__/unit/auth.service.test.ts
 *
 * Menguji: register, login, logout, changePassword, getProfile, refreshToken
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── MOCK (harus sebelum import) ──────────────────────────────

vi.mock("../../config/database", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
    },
    refreshToken: {
      create:     vi.fn(),
      findMany:   vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../../config/env", () => ({
  env: {
    JWT_SECRET:          "test-jwt-secret-minimum-32-chars-long!!",
    JWT_REFRESH_SECRET:  "test-refresh-secret-minimum-32-chars!!",
    JWT_EXPIRY:          "15m",
    JWT_REFRESH_EXPIRY:  "7d",
    NODE_ENV:            "test",
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash:    vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign:   vi.fn(),
    verify: vi.fn(),
  },
}));

// ─── Import setelah mock ──────────────────────────────────────
import { prisma }       from "../../config/database";
import bcrypt           from "bcryptjs";
import jwt              from "jsonwebtoken";
import {
  register,
  login,
  logout,
  changePassword,
  getProfile,
  refreshToken,
} from "../../services/auth.service";

// ─── Typed mocks ──────────────────────────────────────────────
const mockUser         = prisma.user         as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockToken        = prisma.refreshToken as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockBcrypt       = bcrypt              as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockJwt          = jwt                 as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => { vi.clearAllMocks(); });

// ══════════════════════════════════════════════════════════════
// register()
// ══════════════════════════════════════════════════════════════
describe("register()", () => {
  const input = { name: "Budi", email: "budi@test.com", password: "Rahasia123!" };

  it("✅ berhasil register dan return user + tokens", async () => {
    mockUser.findUnique.mockResolvedValue(null); // email belum ada
    mockBcrypt.hash.mockResolvedValue("hashed-password");
    mockUser.create.mockResolvedValue({
      id: "user-1", name: "Budi", email: "budi@test.com",
      role: "USER", createdAt: new Date(),
    });
    mockJwt.sign.mockReturnValueOnce("access-token").mockReturnValueOnce("refresh-token");
    mockBcrypt.hash.mockResolvedValue("hashed-refresh");
    mockToken.create.mockResolvedValue({});

    const result = await register(input);

    expect(result.user.email).toBe("budi@test.com");
    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
    expect(mockUser.create).toHaveBeenCalledOnce();
    expect(mockToken.create).toHaveBeenCalledOnce();
  });

  it("❌ throw 409 jika email sudah terdaftar", async () => {
    mockUser.findUnique.mockResolvedValue({ id: "existing", email: input.email });

    await expect(register(input)).rejects.toMatchObject({
      status: 409,
      message: "Email sudah terdaftar.",
    });
    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it("✅ password di-hash dengan bcrypt (tidak disimpan plaintext)", async () => {
    mockUser.findUnique.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue("hashed-password");
    mockUser.create.mockResolvedValue({
      id: "user-1", name: "Budi", email: input.email,
      role: "USER", createdAt: new Date(),
    });
    mockJwt.sign.mockReturnValue("token");
    mockToken.create.mockResolvedValue({});

    await register(input);

    expect(mockBcrypt.hash).toHaveBeenCalledWith(input.password, 12);
    // Data yang dikirim ke prisma harus pakai hash, bukan password asli
    const createCall = mockUser.create.mock.calls[0][0];
    expect(createCall.data.passwordHash).toBe("hashed-password");
    expect(createCall.data).not.toHaveProperty("password");
  });
});

// ══════════════════════════════════════════════════════════════
// login()
// ══════════════════════════════════════════════════════════════
describe("login()", () => {
  const input = { email: "budi@test.com", password: "Rahasia123!" };
  const fakeUser = {
    id: "user-1", name: "Budi", email: "budi@test.com",
    role: "USER", passwordHash: "hashed-password",
  };

  it("✅ berhasil login dan return user + tokens", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockJwt.sign.mockReturnValueOnce("access-token").mockReturnValueOnce("refresh-token");
    mockBcrypt.hash.mockResolvedValue("hashed-refresh");
    mockToken.create.mockResolvedValue({});

    const result = await login(input);

    expect(result.user.email).toBe("budi@test.com");
    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
  });

  it("❌ throw 401 jika email tidak ditemukan", async () => {
    mockUser.findUnique.mockResolvedValue(null);

    await expect(login(input)).rejects.toMatchObject({ status: 401 });
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
  });

  it("❌ throw 401 jika password salah", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(login(input)).rejects.toMatchObject({
      status:  401,
      message: "Email atau password salah.",
    });
    expect(mockToken.create).not.toHaveBeenCalled();
  });

  it("✅ password divalidasi via bcrypt.compare (tidak compare plaintext)", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockJwt.sign.mockReturnValue("token");
    mockBcrypt.hash.mockResolvedValue("h");
    mockToken.create.mockResolvedValue({});

    await login(input);

    expect(mockBcrypt.compare).toHaveBeenCalledWith(input.password, fakeUser.passwordHash);
  });
});

// ══════════════════════════════════════════════════════════════
// logout()
// ══════════════════════════════════════════════════════════════
describe("logout()", () => {
  it("✅ revoke semua refresh token milik user", async () => {
    mockToken.updateMany.mockResolvedValue({ count: 2 });

    await logout("user-1");

    expect(mockToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revoked: false },
      data:  { revoked: true },
    });
  });
});

// ══════════════════════════════════════════════════════════════
// changePassword()
// ══════════════════════════════════════════════════════════════
describe("changePassword()", () => {
  const fakeUser = { id: "user-1", passwordHash: "old-hash" };

  it("✅ berhasil ganti password dan revoke semua token", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockBcrypt.hash.mockResolvedValue("new-hash");
    mockUser.update.mockResolvedValue({});
    mockToken.updateMany.mockResolvedValue({});

    const result = await changePassword("user-1", "OldPass!", "NewPass123!");

    expect(result.message).toBe("Password berhasil diubah");
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: "new-hash" } })
    );
    expect(mockToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", revoked: false } })
    );
  });

  it("❌ throw 404 jika user tidak ditemukan", async () => {
    mockUser.findUnique.mockResolvedValue(null);

    await expect(changePassword("ghost", "old", "new")).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika password lama salah", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(changePassword("user-1", "WrongPass!", "new")).rejects.toMatchObject({
      status: 400,
      message: "Password lama salah",
    });
    expect(mockUser.update).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// getProfile()
// ══════════════════════════════════════════════════════════════
describe("getProfile()", () => {
  it("✅ return profil user dengan role + phone, tanpa passwordHash", async () => {
    const fakeUser = {
      id: "user-1", name: "Budi", email: "budi@test.com",
      role: "USER", phone: "081234567890",
      createdAt: new Date(),
    };
    mockUser.findUnique.mockResolvedValue(fakeUser);

    const result = await getProfile("user-1");

    expect(result.user).toMatchObject({ id: "user-1", name: "Budi" });
    // Parity dengan REST: role harus ada
    expect(result.user).toHaveProperty("role");
    expect(result.user.role).toBe("USER");
    // Regression: phone harus ada
    expect(result.user).toHaveProperty("phone");
    expect(result.user.phone).toBe("081234567890");
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("❌ throw 404 jika user tidak ditemukan", async () => {
    mockUser.findUnique.mockResolvedValue(null);

    await expect(getProfile("ghost")).rejects.toMatchObject({ status: 404 });
  });
});

// ══════════════════════════════════════════════════════════════
// refreshToken()
// ══════════════════════════════════════════════════════════════
describe("refreshToken()", () => {
  it("✅ return accessToken baru jika refresh token valid", async () => {
    mockJwt.verify.mockReturnValue({ userId: "user-1" });
    const fakeStoredToken = {
      id: "rt-1", userId: "user-1",
      tokenHash: "hashed-rt",
      expiresAt: new Date(Date.now() + 86400_000), // belum expired
      revoked: false,
    };
    mockToken.findMany.mockResolvedValue([fakeStoredToken]);
    mockBcrypt.compare.mockResolvedValue(true);
    mockUser.findUnique.mockResolvedValue({ id: "user-1", role: "USER" });
    mockJwt.sign.mockReturnValue("new-access-token");

    const result = await refreshToken("valid-refresh-token");

    expect(result).toBe("new-access-token");
  });

  it("❌ throw 401 jika jwt.verify gagal", async () => {
    mockJwt.verify.mockImplementation(() => { throw new Error("invalid"); });

    await expect(refreshToken("bad-token")).rejects.toMatchObject({ status: 401 });
  });

  it("❌ throw 401 jika tidak ada token cocok di DB", async () => {
    mockJwt.verify.mockReturnValue({ userId: "user-1" });
    mockToken.findMany.mockResolvedValue([]);

    await expect(refreshToken("orphan-token")).rejects.toMatchObject({ status: 401 });
  });

  it("❌ throw 401 jika token sudah expired (expiresAt lampau)", async () => {
    mockJwt.verify.mockReturnValue({ userId: "user-1" });
    const expiredToken = {
      id: "rt-1", userId: "user-1",
      tokenHash: "hashed-rt",
      expiresAt: new Date(Date.now() - 1000), // sudah lewat
      revoked: false,
    };
    mockToken.findMany.mockResolvedValue([expiredToken]);
    mockBcrypt.compare.mockResolvedValue(true);

    await expect(refreshToken("expired-token")).rejects.toMatchObject({ status: 401 });
  });
});
