/**
 * profile.service.test.ts — Whitebox Unit Test (backend-rest)
 *
 * Letakkan di: backend-rest/src/__tests__/unit/profile.service.test.ts
 *
 * Menguji: getProfile, updateProfile, changePassword,
 *          getAddress, addAddress, updateAddress, deleteAddress, setDefaultAddress
 *
 * Pesan error service menggunakan Bahasa Indonesia:
 *  - "User tidak ditemukan" (404)
 *  - "Password lama salah" (400)
 *  - "Address not found" (404)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { prisma }  from "../../config/database";
import bcrypt      from "bcryptjs";
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
  passwordHash: "hashed-old-password", phone: "08123456789",
  role: "USER", createdAt: new Date(), updatedAt: new Date(),
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
  it("✅ return data user (id, name, email, phone — tanpa passwordHash)", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);

    const result = await getProfile("user-1");

    expect(result).toMatchObject({ id: "user-1", name: "Budi" });
    // Regression: phone harus ada di response getProfile (pernah hilang dari select)
    expect(result).toHaveProperty("phone");
    expect((result as any).phone).toBe("08123456789");
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
  it("✅ update name dan phone", async () => {
    mockUser.update.mockResolvedValue({ ...fakeUser, name: "Budi Baru", phone: "0899" });

    const result = await updateProfile("user-1", { name: "Budi Baru", phone: "0899" });

    expect(result.name).toBe("Budi Baru");
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data:  { name: "Budi Baru", phone: "0899" },
      })
    );
  });
});

// ══════════════════════════════════════════════════════════════
// changePassword()
// ══════════════════════════════════════════════════════════════
describe("changePassword()", () => {
  it("✅ berhasil ganti password — return pesan Bahasa Indonesia", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockBcrypt.hash.mockResolvedValue("new-hash");
    mockUser.update.mockResolvedValue({});

    const result = await changePassword("user-1", "OldPass!", "NewPass123!");

    // FIX: service pakai Bahasa Indonesia — bukan "Password updated successfully"
    expect(result.message).toBe("Password berhasil diubah");
    expect(mockUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: "new-hash" } })
    );
  });

  it("✅ hash password baru dengan bcrypt (cost factor 12)", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockBcrypt.hash.mockResolvedValue("new-hash");
    mockUser.update.mockResolvedValue({});

    await changePassword("user-1", "OldPass!", "NewPass123!");

    expect(mockBcrypt.hash).toHaveBeenCalledWith("NewPass123!", 12);
  });

  it("❌ throw 404 jika user tidak ditemukan", async () => {
    mockUser.findUnique.mockResolvedValue(null);

    await expect(changePassword("ghost", "old", "new"))
      .rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika password lama salah — pesan Bahasa Indonesia", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(changePassword("user-1", "WrongPass!", "new"))
      .rejects.toMatchObject({
        status:  400,
        message: "Password lama salah", // FIX: bukan "Current password is incorrect"
      });
  });

  it("✅ password lama dicompare dengan passwordHash di DB", async () => {
    mockUser.findUnique.mockResolvedValue(fakeUser);
    mockBcrypt.compare.mockResolvedValue(true);
    mockBcrypt.hash.mockResolvedValue("new-hash");
    mockUser.update.mockResolvedValue({});

    await changePassword("user-1", "OldPass!", "NewPass123!");

    expect(mockBcrypt.compare).toHaveBeenCalledWith("OldPass!", fakeUser.passwordHash);
  });
});

// ══════════════════════════════════════════════════════════════
// getAddress()
// ══════════════════════════════════════════════════════════════
describe("getAddress()", () => {
  it("✅ return semua alamat milik user", async () => {
    mockAddress.findMany.mockResolvedValue([fakeAddress]);

    const result = await getAddress("user-1");

    expect(result).toHaveLength(1);
    expect(mockAddress.findMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("✅ return array kosong jika tidak ada alamat", async () => {
    mockAddress.findMany.mockResolvedValue([]);

    const result = await getAddress("user-1");

    expect(result).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// addAddress()
// ══════════════════════════════════════════════════════════════
describe("addAddress()", () => {
  const newAddressData = {
    label: "Kantor", recipientName: "Budi",
    phone: "08123456789", address: "Jl. Bisnis 5",
    city: "Bandung", province: "Jawa Barat",
    zipCode: "40111", isDefault: false,
  };

  it("✅ berhasil tambah alamat baru", async () => {
    mockAddress.create.mockResolvedValue({ id: "addr-2", ...newAddressData });

    const result = await addAddress("user-1", newAddressData);

    expect(mockAddress.create).toHaveBeenCalledOnce();
    expect(result.id).toBe("addr-2");
  });

  it("✅ unset semua default lama jika isDefault: true", async () => {
    mockAddress.updateMany.mockResolvedValue({});
    mockAddress.create.mockResolvedValue({ id: "addr-2", ...newAddressData, isDefault: true });

    await addAddress("user-1", { ...newAddressData, isDefault: true });

    expect(mockAddress.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", isDefault: true },
        data:  { isDefault: false },
      })
    );
  });

  it("✅ tidak unset default lama jika isDefault: false", async () => {
    mockAddress.create.mockResolvedValue({ id: "addr-2", ...newAddressData });

    await addAddress("user-1", { ...newAddressData, isDefault: false });

    expect(mockAddress.updateMany).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// updateAddress()
// ══════════════════════════════════════════════════════════════
describe("updateAddress()", () => {
  it("✅ berhasil update alamat milik user", async () => {
    mockAddress.findUnique.mockResolvedValue(fakeAddress);
    mockAddress.update.mockResolvedValue({ ...fakeAddress, city: "Surabaya" });

    const result = await updateAddress("user-1", "addr-1", { city: "Surabaya" });

    expect(mockAddress.update).toHaveBeenCalledOnce();
    expect(result.city).toBe("Surabaya");
  });

  it("✅ partial update: hanya city dikirim — label lama HARUS tetap utuh", async () => {
    // Regression: service harus pakai { ...existing, ...data } bukan overwrite penuh.
    // Jika pakai overwrite, label bisa jadi null/undefined saat tidak dikirim.
    mockAddress.findUnique.mockResolvedValue(fakeAddress); // label: "Rumah"
    mockAddress.update.mockResolvedValue({ ...fakeAddress, city: "Surabaya" });

    await updateAddress("user-1", "addr-1", { city: "Surabaya" });

    const updateData = mockAddress.update.mock.calls[0][0].data;
    // Data yang dikirim ke prisma.update TIDAK boleh menghapus label yang ada
    // Jika city-only dikirim, label tidak boleh ada di data (atau boleh ada tapi sama)
    if ("label" in updateData) {
      // Kalau label ikut dikirim ke update, nilainya harus sama dengan aslinya
      expect(updateData.label).toBe(fakeAddress.label);
    }
    // city harus ada di update data
    expect(updateData.city).toBe("Surabaya");
  });

  it("✅ partial update: response tetap berisi label lama saat label tidak dikirim", async () => {
    mockAddress.findUnique.mockResolvedValue(fakeAddress);  // label: "Rumah"
    mockAddress.update.mockResolvedValue({ ...fakeAddress, city: "Bandung" });

    const result = await updateAddress("user-1", "addr-1", { city: "Bandung" });

    // label pada result harus "Rumah", bukan null/undefined
    expect(result.label).toBe("Rumah");
    expect(result.city).toBe("Bandung");
  });

  it("❌ throw 404 jika alamat tidak ditemukan", async () => {
    mockAddress.findUnique.mockResolvedValue(null);

    await expect(updateAddress("user-1", "ghost-addr", {}))
      .rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 404 jika alamat milik user lain (ownership check)", async () => {
    mockAddress.findUnique.mockResolvedValue({ ...fakeAddress, userId: "user-other" });

    await expect(updateAddress("user-1", "addr-1", {}))
      .rejects.toMatchObject({ status: 404 });
  });

  it("✅ explicit clear label: label: null dikirim → label di-update ke null (bukan diabaikan)", async () => {
    // Contract: kalau klien sengaja kirim label: null, itu adalah intentional clear —
    // berbeda dari omit (tidak kirim sama sekali). Service harus meneruskan null ke prisma.
    mockAddress.findUnique.mockResolvedValue(fakeAddress);
    mockAddress.update.mockResolvedValue({ ...fakeAddress, label: null });

    const result = await updateAddress("user-1", "addr-1", { label: null as any });

    // Nilai null harus diteruskan ke prisma.update — bukan diabaikan
    const updateData = mockAddress.update.mock.calls[0][0].data;
    expect(updateData).toHaveProperty("label");
    expect(updateData.label).toBeNull();
    // Result juga harus reflect nilai baru
    expect(result.label).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// deleteAddress()
// ══════════════════════════════════════════════════════════════
describe("deleteAddress()", () => {
  it("✅ berhasil hapus alamat milik user", async () => {
    mockAddress.findUnique.mockResolvedValue(fakeAddress);
    mockAddress.delete.mockResolvedValue(fakeAddress);

    await deleteAddress("user-1", "addr-1");

    expect(mockAddress.delete).toHaveBeenCalledWith({ where: { id: "addr-1" } });
  });

  it("❌ throw 404 jika alamat tidak ditemukan", async () => {
    mockAddress.findUnique.mockResolvedValue(null);

    await expect(deleteAddress("user-1", "ghost"))
      .rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 404 jika alamat milik user lain", async () => {
    mockAddress.findUnique.mockResolvedValue({ ...fakeAddress, userId: "user-other" });

    await expect(deleteAddress("user-1", "addr-1"))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ══════════════════════════════════════════════════════════════
// setDefaultAddress()
// ══════════════════════════════════════════════════════════════
describe("setDefaultAddress()", () => {
  it("✅ set default via $transaction dengan 2 operasi (unset lama + set baru)", async () => {
    mockAddress.findUnique.mockResolvedValue(fakeAddress);
    mockPrisma.$transaction.mockResolvedValue([]);

    await setDefaultAddress("user-1", "addr-1");

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    const txArgs = mockPrisma.$transaction.mock.calls[0][0];
    expect(txArgs).toHaveLength(2); // [updateMany, update]
  });

  it("❌ throw 404 jika alamat tidak ditemukan", async () => {
    mockAddress.findUnique.mockResolvedValue(null);

    await expect(setDefaultAddress("user-1", "ghost"))
      .rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 404 jika alamat milik user lain", async () => {
    mockAddress.findUnique.mockResolvedValue({ ...fakeAddress, userId: "user-other" });

    await expect(setDefaultAddress("user-1", "addr-1"))
      .rejects.toMatchObject({ status: 404 });
  });
});
