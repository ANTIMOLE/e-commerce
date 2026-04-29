/**
 * category.service.test.ts — Whitebox Unit Test (backend-rest)
 *
 * Letakkan di: backend-rest/src/__tests__/unit/category.service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/database", () => ({
  prisma: {
    category: {
      findMany:  vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../config/env", () => ({
  env: { NODE_ENV: "test" },
}));

import { prisma } from "../../config/database";
import { getAll, getBySlug } from "../../services/category.service";

const mockCategory = prisma.category as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => { vi.clearAllMocks(); });

const fakeCategory = {
  id: "cat-1", name: "Elektronik", slug: "elektronik",
  description: "Produk elektronik", _count: { products: 5 },
};

describe("getAll()", () => {
  it("✅ return semua kategori sorted by name", async () => {
    mockCategory.findMany.mockResolvedValue([fakeCategory]);

    const result = await getAll();

    expect(result).toHaveLength(1);
    expect(mockCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: "asc" } })
    );
  });

  it("✅ return array kosong jika tidak ada kategori", async () => {
    mockCategory.findMany.mockResolvedValue([]);

    const result = await getAll();

    expect(result).toHaveLength(0);
  });

  it("✅ response include _count.products (hanya produk aktif)", async () => {
    mockCategory.findMany.mockResolvedValue([fakeCategory]);

    const result = await getAll();

    expect(result[0]).toHaveProperty("_count");
  });
});

describe("getBySlug()", () => {
  it("✅ return kategori yang ditemukan", async () => {
    mockCategory.findUnique.mockResolvedValue(fakeCategory);

    const result = await getBySlug("elektronik");

    expect(result.slug).toBe("elektronik");
    expect(mockCategory.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "elektronik" } })
    );
  });

  it("❌ throw 404 jika slug tidak ditemukan", async () => {
    mockCategory.findUnique.mockResolvedValue(null);

    await expect(getBySlug("tidak-ada"))
      .rejects.toMatchObject({ status: 404 });
  });
});
