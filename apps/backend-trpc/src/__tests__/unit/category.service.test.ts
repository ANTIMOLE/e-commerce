/**
 * category.service.test.ts — Whitebox Unit Test (backend-trpc)
 *
 * Letakkan di: backend-trpc/src/__tests__/unit/category.service.test.ts
 *
 * Menguji: getAll, getBySlug
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── MOCK ─────────────────────────────────────────────────────

vi.mock("../../config/database", () => ({
  prisma: {
    category: {
      findMany:   vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../config/env", () => ({
  env: { NODE_ENV: "test" },
}));

// ─── Import setelah mock ──────────────────────────────────────
import { prisma }               from "../../config/database";
import { getAll, getBySlug }    from "../../services/category.service";

const mockCategory = prisma.category as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => { vi.clearAllMocks(); });

const fakeCategory = {
  id: "cat-1", name: "Sepatu", slug: "sepatu",
  description: "Semua jenis sepatu",
  _count: { products: 10 },
};

// ══════════════════════════════════════════════════════════════
// getAll()
// ══════════════════════════════════════════════════════════════
describe("getAll()", () => {
  it("✅ return semua kategori diurutkan by name asc", async () => {
    mockCategory.findMany.mockResolvedValue([fakeCategory]);

    const result = await getAll();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ slug: "sepatu" });
    expect(mockCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: "asc" } })
    );
  });

  it("✅ query hanya menghitung produk yang isActive: true", async () => {
    mockCategory.findMany.mockResolvedValue([fakeCategory]);

    await getAll();

    const selectArg = mockCategory.findMany.mock.calls[0][0].select;
    expect(selectArg._count.select.products.where).toMatchObject({ isActive: true });
  });

  it("✅ return array kosong jika tidak ada kategori", async () => {
    mockCategory.findMany.mockResolvedValue([]);

    const result = await getAll();

    expect(result).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// getBySlug()
// ══════════════════════════════════════════════════════════════
describe("getBySlug()", () => {
  it("✅ return kategori jika slug ditemukan", async () => {
    mockCategory.findUnique.mockResolvedValue(fakeCategory);

    const result = await getBySlug("sepatu");

    expect(result).toMatchObject({ slug: "sepatu", name: "Sepatu" });
    expect(mockCategory.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "sepatu" } })
    );
  });

  it("❌ throw 404 jika slug tidak ditemukan", async () => {
    mockCategory.findUnique.mockResolvedValue(null);

    await expect(getBySlug("tidak-ada")).rejects.toMatchObject({
      status:  404,
      message: "Kategori tidak ditemukan.",
    });
  });
});
