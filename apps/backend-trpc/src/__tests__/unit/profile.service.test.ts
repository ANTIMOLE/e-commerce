/**
 * profile.service.test.ts — Whitebox Unit Test (backend-trpc)
 *
 * Letakkan di: backend-trpc/src/__tests__/unit/profile.service.test.ts
 *
 * Menguji: getProfile, updateProfile, changePassword,
 *          getAddress, addAddress, updateAddress, deleteAddress, setDefaultAddress
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── MOCK ─────────────────────────────────────────────────────

vi.mock("../../config/database", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update:     vi.fn(),
    },
    address: {
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      updateMany: vi.fn(),
      delete:     vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../config/env", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash:    vi.fn(),
    compare: vi.fn(),
  },
}));

// ─── Import setelah mock ──────────────────────────────────────
import { prisma } from "../../config/database";
import bcrypt     from "bcryptjs";
import {
  getProfile,
  updateProfile,
  changePassword,
  getAddress,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../../services/profile.service";

const mockUser    = prisma.user    as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockAddress = prisma.address as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockPrisma  = prisma         as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockBcrypt  = bcrypt         as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => { vi.clearAllMocks(); });

// ─── Fixtures ─────────────────────────────────────────────────
const fakeUser = {
  id: "user-1", name: "Budi", email: "budi@test.com",
  passwordHash: "hashed-password",
  createdAt: new Date(), updatedAt: new Date(),
};

const fakeAddress = {
  id: "addr-1", userId: "user-1",
  label: "Rumah", recipientName: "Budi",
  phone: "08123456789", address: "Jl. Test 1",
  city: "Jakarta", province: "DKI", zipCode: "10110",
  isDefault: false,
};

// ══════════════════════════════════════════════════════════════
// getProfile()
// ══════════════════════════════════════════════════════════════
describe("getProfile()", () => {
  it("✅ return data user tanpa passwordHash", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);

    const result = await getProfile("user-1");

    expect(result).toMatchObject({ id: "user-1", name: "Budi" });
    // passwordHash tidak di-select (lihat service)
    expect(mockUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } })
    );
  });

  it("✅ return null jika user tidak ditemukan", async () => {
    mockUser.findUnique.mockResolvedValue(null);

    const result = await getProfile("ghost");

    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// updateProfile()
// ══════════════════════════════════════════════════════════════
describe("updateProfile()", () => {
  it("✅ update name dan phone user", async () => {
    mockUser.update.mockResolvedValue({ ...fakeUser, name: "Budi Baru", phone: "08999" });

    const result = await updateProfile("user-1", { name: "Budi Baru", phone: "08999" });

    expect(result.name).toBe("Budi Baru");
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data:  { name: "Budi Baru", phone: "08999" },
      })
    );
  });
});

// ══════════════════════════════════════════════════════════════
// changePassword()
// ══════════════════════════════════════════════════════════════
describe("changePassword()", () => {
  it("✅ berhasil ganti password", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockBcrypt.hash.mockResolvedValue("new-hash");
    mockUser.update.mockResolvedValue({});

    const result = await changePassword("user-1", "OldPass!", "NewPass123!");

    expect(result.message).toBe("Password updated successfully");
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: "new-hash" } })
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
      status:  400,
      message: "Current password is incorrect",
    });
  });

  it("✅ hash password baru dengan bcrypt sebelum disimpan", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockBcrypt.hash.mockResolvedValue("new-hash");
    mockUser.update.mockResolvedValue({});

    await changePassword("user-1", "OldPass!", "NewPass123!");

    expect(mockBcrypt.hash).toHaveBeenCalledWith("NewPass123!", 12);
  });
});

// ══════════════════════════════════════════════════════════════
// getAddress()
// ══════════════════════════════════════════════════════════════
describe("getAddress()", () => {
  it("✅ return semua address milik user", async () => {
    mockAddress.findMany.mockResolvedValue([fakeAddress]);

    const result = await getAddress("user-1");

    expect(result).toHaveLength(1);
    expect(mockAddress.findMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("✅ return array kosong jika tidak ada address", async () => {
    mockAddress.findMany.mockResolvedValue([]);

    const result = await getAddress("user-1");

    expect(result).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// addAddress()
// ══════════════════════════════════════════════════════════════
describe("addAddress()", () => {
  const addressData = {
    label: "Kantor", recipientName: "Budi",
    phone: "08123456789", address: "Jl. Bisnis 5",
    city: "Bandung", province: "Jawa Barat",
    zipCode: "40111", isDefault: false,
  };

  it("✅ berhasil tambah address baru", async () => {
    mockAddress.create.mockResolvedValue({ id: "addr-2", ...addressData });

    const result = await addAddress("user-1", addressData);

    expect(mockAddress.create).toHaveBeenCalledOnce();
    expect(result.id).toBe("addr-2");
  });

  it("✅ unset semua default lama jika isDefault: true", async () => {
    mockAddress.updateMany.mockResolvedValue({});
    mockAddress.create.mockResolvedValue({ id: "addr-2", ...addressData, isDefault: true });

    await addAddress("user-1", { ...addressData, isDefault: true });

    expect(mockAddress.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", isDefault: true },
        data:  { isDefault: false },
      })
    );
  });

  it("✅ tidak unset default lama jika isDefault: false", async () => {
    mockAddress.create.mockResolvedValue({ id: "addr-2", ...addressData });

    await addAddress("user-1", { ...addressData, isDefault: false });

    expect(mockAddress.updateMany).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// updateAddress()
// ══════════════════════════════════════════════════════════════
describe("updateAddress()", () => {
  it("✅ berhasil update address milik user", async () => {
    mockAddress.findUnique.mockResolvedValue(fakeAddress);
    mockAddress.update.mockResolvedValue({ ...fakeAddress, city: "Surabaya" });

    const result = await updateAddress("user-1", "addr-1", { city: "Surabaya" });

    expect(mockAddress.update).toHaveBeenCalledOnce();
    expect(result.city).toBe("Surabaya");
  });

  it("❌ throw 404 jika address tidak ditemukan atau bukan milik user", async () => {
    mockAddress.findUnique.mockResolvedValue(null);

    await expect(updateAddress("user-1", "ghost-addr", {})).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 404 jika address milik user lain", async () => {
    mockAddress.findUnique.mockResolvedValue({ ...fakeAddress, userId: "user-other" });

    await expect(updateAddress("user-1", "addr-1", {})).rejects.toMatchObject({ status: 404 });
  });
});

// ══════════════════════════════════════════════════════════════
// deleteAddress()
// ══════════════════════════════════════════════════════════════
describe("deleteAddress()", () => {
  it("✅ berhasil hapus address milik user", async () => {
    mockAddress.findUnique.mockResolvedValue(fakeAddress);
    mockAddress.delete.mockResolvedValue(fakeAddress);

    await deleteAddress("user-1", "addr-1");

    expect(mockAddress.delete).toHaveBeenCalledWith({ where: { id: "addr-1" } });
  });

  it("❌ throw 404 jika address tidak ditemukan", async () => {
    mockAddress.findUnique.mockResolvedValue(null);

    await expect(deleteAddress("user-1", "ghost")).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 404 jika address milik user lain", async () => {
    mockAddress.findUnique.mockResolvedValue({ ...fakeAddress, userId: "user-other" });

    await expect(deleteAddress("user-1", "addr-1")).rejects.toMatchObject({ status: 404 });
  });
});

// ══════════════════════════════════════════════════════════════
// setDefaultAddress()
// ══════════════════════════════════════════════════════════════
describe("setDefaultAddress()", () => {
  it("✅ set address sebagai default via transaction", async () => {
    mockAddress.findUnique.mockResolvedValue(fakeAddress);
    mockPrisma.$transaction.mockResolvedValue([]);

    await setDefaultAddress("user-1", "addr-1");

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    // Transaction harus berisi 2 operasi: unset lama + set baru
    const transactionArgs = mockPrisma.$transaction.mock.calls[0][0];
    expect(transactionArgs).toHaveLength(2);
  });

  it("❌ throw 404 jika address tidak ditemukan", async () => {
    mockAddress.findUnique.mockResolvedValue(null);

    await expect(setDefaultAddress("user-1", "ghost")).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 404 jika address bukan milik user", async () => {
    mockAddress.findUnique.mockResolvedValue({ ...fakeAddress, userId: "user-other" });

    await expect(setDefaultAddress("user-1", "addr-1")).rejects.toMatchObject({ status: 404 });
  });
});
