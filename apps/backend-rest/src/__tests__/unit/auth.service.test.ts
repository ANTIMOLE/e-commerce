/**
 * auth.service.test.ts — Whitebox Unit Test
 *
 * Letakkan di: backend-rest/src/__tests__/unit/auth.service.test.ts
 *
 * STRATEGI:
 *   - Semua dependency di-mock sehingga test ini TIDAK butuh
 *     database atau environment nyata.
 *   - Setiap fungsi service diuji secara isolasi:
 *     input → output + side-effect (apa yang dipanggil di prisma/bcrypt/jwt)
 *   - Happy path + error path keduanya diuji.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── MOCK: harus dipanggil SEBELUM import module under test ───

vi.mock("../../config/database", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("../../config/env", () => ({
  env: {
    JWT_SECRET: "test-jwt-secret-minimum-32-chars-long",
    JWT_REFRESH_SECRET: "test-refresh-secret-minimum-32-chars-long",
    JWT_EXPIRY: "15m",
    JWT_REFRESH_EXPIRY: "7d",
    NODE_ENV: "test",
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
  TokenExpiredError: class TokenExpiredError extends Error {
    constructor() {
      super("jwt expired");
      this.name = "TokenExpiredError";
    }
  },
}));

// ─── Import SETELAH mock ───
import { prisma } from "../../config/database";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as authService from "../../services/auth.service";
import { AppError } from "../../middlewares/error.middleware";

// ─── Helpers ───────────────────────────────────────────────

const mockUser = {
  id: "user-uuid-123",
  name: "Test User",
  email: "test@example.com",
  passwordHash: "$2b$12$hashedpassword",
  role: "USER" as const,
  createdAt: new Date("2024-01-01"),
};

const mockAdminUser = {
  ...mockUser,
  id: "admin-uuid-456",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

// Typed convenience refs
const mockPrismaUser = prisma.user as {
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};
const mockPrismaRefreshToken = prisma.refreshToken as {
  create: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
};
const mockBcrypt = bcrypt as unknown as {
  hash: ReturnType<typeof vi.fn>;
  compare: ReturnType<typeof vi.fn>;
};
const mockJwt = jwt as unknown as {
  sign: ReturnType<typeof vi.fn>;
  verify: ReturnType<typeof vi.fn>;
};

// ─── Bersihkan semua mock sebelum setiap test ──────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════
// 1. register()
// ══════════════════════════════════════════════════════════════
describe("authService.register()", () => {
  const registerInput = {
    name: "Test User",
    email: "new@example.com",
    password: "TestPass123!",
  };

  it("✅ happy path — membuat user baru dan mengembalikan token", async () => {
    // Arrange
    mockPrismaUser.findUnique.mockResolvedValue(null); // email belum dipakai
    mockBcrypt.hash.mockResolvedValue("$2b$12$hashed");
    mockPrismaUser.create.mockResolvedValue({
      id: "new-uuid",
      name: "Test User",
      email: "new@example.com",
      role: "USER",
      createdAt: new Date(),
    });
    mockJwt.sign
      .mockReturnValueOnce("access-token-xxx")
      .mockReturnValueOnce("refresh-token-xxx");
    mockBcrypt.hash.mockResolvedValueOnce("$2b$12$hashed").mockResolvedValueOnce("$2b$10$refreshhashed");
    mockPrismaRefreshToken.create.mockResolvedValue({});

    // Act
    const result = await authService.register(registerInput);

    // Assert struktur return
    expect(result).toHaveProperty("user");
    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
    expect(result.user.email).toBe("new@example.com");
    expect(result.user).not.toHaveProperty("passwordHash");

    // Assert side effects — password di-hash
    expect(mockBcrypt.hash).toHaveBeenCalledWith("TestPass123!", 12);

    // Assert user tersimpan ke database
    expect(mockPrismaUser.create).toHaveBeenCalledOnce();

    // Assert refresh token tersimpan ke database
    expect(mockPrismaRefreshToken.create).toHaveBeenCalledOnce();
  });

  it("❌ throw 409 jika email sudah terdaftar", async () => {
    // Arrange — email sudah ada
    mockPrismaUser.findUnique.mockResolvedValue(mockUser);

    // Act & Assert
    await expect(authService.register(registerInput)).rejects.toThrow(AppError);
    await expect(authService.register(registerInput)).rejects.toMatchObject({
      status: 409,
    });

    // Pastikan user TIDAK dibuat
    expect(mockPrismaUser.create).not.toHaveBeenCalled();
  });

  it("🔍 password yang disimpan ke DB adalah hash, BUKAN plaintext", async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue("$2b$12$securely_hashed");
    mockPrismaUser.create.mockResolvedValue({
      id: "uuid",
      name: "T",
      email: "t@t.com",
      role: "USER",
      createdAt: new Date(),
    });
    mockJwt.sign.mockReturnValue("token");
    mockBcrypt.hash.mockResolvedValue("$2b$10$refreshhash");
    mockPrismaRefreshToken.create.mockResolvedValue({});

    await authService.register(registerInput);

    // Pastikan prisma.user.create menerima passwordHash, BUKAN password plaintext
    const createCall = mockPrismaUser.create.mock.calls[0][0];
    expect(createCall.data.passwordHash).toBeDefined();
    expect(createCall.data.passwordHash).not.toBe("TestPass123!");
    expect(createCall.data).not.toHaveProperty("password");
  });
});

// ══════════════════════════════════════════════════════════════
// 2. login()
// ══════════════════════════════════════════════════════════════
describe("authService.login()", () => {
  const loginInput = {
    email: "test@example.com",
    password: "TestPass123!",
  };

  it("✅ happy path — return token untuk kredensial valid", async () => {
    mockPrismaUser.findUnique.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockJwt.sign
      .mockReturnValueOnce("access-token")
      .mockReturnValueOnce("refresh-token");
    mockBcrypt.hash.mockResolvedValue("$2b$10$refreshhash");
    mockPrismaRefreshToken.create.mockResolvedValue({});

    const result = await authService.login(loginInput);

    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
    expect(result.user).toMatchObject({
      id: mockUser.id,
      email: mockUser.email,
      role: "USER",
    });
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("❌ throw 401 jika email tidak ditemukan", async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);

    await expect(authService.login(loginInput)).rejects.toMatchObject({
      status: 401,
    });

    // Jangan panggil bcrypt.compare — waste CPU dan bocorkan timing info
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
  });

  it("❌ throw 401 jika password salah", async () => {
    mockPrismaUser.findUnique.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(authService.login(loginInput)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("🔒 pesan error email-salah dan password-salah SAMA (anti-enumeration)", async () => {
    // Kedua error harus punya pesan yang identik agar attacker tidak bisa
    // membedakan mana yang salah (email atau password)
    mockPrismaUser.findUnique.mockResolvedValue(null);
    let errNoEmail: AppError | null = null;
    try { await authService.login(loginInput); } catch (e) { errNoEmail = e as AppError; }

    mockPrismaUser.findUnique.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(false);
    let errBadPass: AppError | null = null;
    try { await authService.login(loginInput); } catch (e) { errBadPass = e as AppError; }

    expect(errNoEmail?.message).toBe(errBadPass?.message);
    expect(errNoEmail?.status).toBe(errBadPass?.status);
  });
});

// ══════════════════════════════════════════════════════════════
// 3. logout()
// ══════════════════════════════════════════════════════════════
describe("authService.logout()", () => {
  it("✅ me-revoke semua refresh token aktif milik user", async () => {
    mockPrismaRefreshToken.updateMany.mockResolvedValue({ count: 2 });

    await authService.logout("user-uuid-123");

    expect(mockPrismaRefreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-uuid-123", revoked: false },
      data: { revoked: true },
    });
  });

  it("✅ tidak throw meskipun user tidak punya refresh token aktif", async () => {
    mockPrismaRefreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(authService.logout("user-uuid-123")).resolves.not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════
// 4. refreshToken()
// ══════════════════════════════════════════════════════════════
describe("authService.refreshToken()", () => {
  const rawToken = "raw-refresh-token-string";

  it("✅ mengembalikan access token baru untuk refresh token valid", async () => {
    const decoded = { userId: "user-uuid-123" };
    mockJwt.verify.mockReturnValue(decoded);

    const storedToken = {
      id: "token-row-id",
      userId: "user-uuid-123",
      tokenHash: "$2b$10$hash",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // masa depan
      revoked: false,
    };
    mockPrismaRefreshToken.findMany.mockResolvedValue([storedToken]);
    mockBcrypt.compare.mockResolvedValue(true); // token cocok
    mockPrismaUser.findUnique.mockResolvedValue(mockUser);
    mockJwt.sign.mockReturnValue("new-access-token");

    const result = await authService.refreshToken(rawToken);

    expect(result).toBe("new-access-token");
    expect(mockJwt.verify).toHaveBeenCalledWith(
      rawToken,
      "test-refresh-secret-minimum-32-chars-long"
    );
  });

  it("❌ throw 401 jika token tidak valid (jwt.verify gagal)", async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    await expect(authService.refreshToken(rawToken)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("❌ throw 401 jika tidak ada token aktif di database", async () => {
    mockJwt.verify.mockReturnValue({ userId: "user-uuid-123" });
    mockPrismaRefreshToken.findMany.mockResolvedValue([]); // DB kosong

    await expect(authService.refreshToken(rawToken)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("❌ throw 401 jika token hash tidak cocok (token dicuri/dimanipulasi)", async () => {
    mockJwt.verify.mockReturnValue({ userId: "user-uuid-123" });
    mockPrismaRefreshToken.findMany.mockResolvedValue([
      { tokenHash: "$2b$10$different_hash", expiresAt: new Date(Date.now() + 10000), revoked: false },
    ]);
    mockBcrypt.compare.mockResolvedValue(false); // tidak cocok

    await expect(authService.refreshToken(rawToken)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("❌ throw 401 jika token sudah expired (expiresAt lewat)", async () => {
    mockJwt.verify.mockReturnValue({ userId: "user-uuid-123" });
    mockPrismaRefreshToken.findMany.mockResolvedValue([
      {
        tokenHash: "$2b$10$hash",
        expiresAt: new Date(Date.now() - 1000), // masa lalu
        revoked: false,
      },
    ]);
    mockBcrypt.compare.mockResolvedValue(true);

    await expect(authService.refreshToken(rawToken)).rejects.toMatchObject({
      status: 401,
    });
  });
});

// ══════════════════════════════════════════════════════════════
// 5. changePassword()
// ══════════════════════════════════════════════════════════════
describe("authService.changePassword()", () => {
  it("✅ berhasil mengganti password dan me-revoke semua refresh token", async () => {
    mockPrismaUser.findUnique.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(true); // old password cocok
    mockBcrypt.hash.mockResolvedValue("$2b$12$new_hash");
    mockPrismaUser.update.mockResolvedValue({});
    mockPrismaRefreshToken.updateMany.mockResolvedValue({ count: 1 });

    const result = await authService.changePassword(
      "user-uuid-123",
      "OldPass123!",
      "NewPass456!"
    );

    expect(result).toMatchObject({ message: expect.any(String) });
    // Password baru di-hash dengan bcrypt
    expect(mockBcrypt.hash).toHaveBeenCalledWith("NewPass456!", 12);
    // Refresh token harus di-revoke (paksa login ulang)
    expect(mockPrismaRefreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revoked: true } })
    );
  });

  it("❌ throw 404 jika user tidak ditemukan", async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);

    await expect(
      authService.changePassword("ghost-id", "old", "new")
    ).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika password lama salah", async () => {
    mockPrismaUser.findUnique.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(
      authService.changePassword("user-uuid-123", "WrongOld!", "NewPass456!")
    ).rejects.toMatchObject({ status: 400 });

    // Password TIDAK boleh diupdate jika verifikasi gagal
    expect(mockPrismaUser.update).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// 6. getProfile()
// ══════════════════════════════════════════════════════════════
describe("authService.getProfile()", () => {
  it("✅ mengembalikan data user tanpa passwordHash", async () => {
    mockPrismaUser.findUnique.mockResolvedValue({
      id: "user-uuid-123",
      name: "Test User",
      email: "test@example.com",
      role: "USER",
      createdAt: new Date(),
    });

    const result = await authService.getProfile("user-uuid-123");

    expect(result.user).toMatchObject({ id: "user-uuid-123", role: "USER" });
    // Field sensitif tidak boleh ada
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("❌ throw 404 jika user tidak ditemukan", async () => {
    mockPrismaUser.findUnique.mockResolvedValue(null);

    await expect(authService.getProfile("ghost-id")).rejects.toMatchObject({
      status: 404,
    });
  });
});
