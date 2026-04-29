/**
 * product.service.test.ts — Whitebox Unit Test (backend-trpc)
 *
 * Letakkan di: backend-trpc/src/__tests__/unit/product.service.test.ts
 *
 * Perubahan vs versi original:
 *  - Tambah regression group: 0-valued filter (minPrice=0, maxPrice=0, minRating=0)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/database", () => ({
  prisma: {
    product: {
      count:      vi.fn(),
      findMany:   vi.fn(),
      findFirst:  vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../config/env", () => ({ env: { NODE_ENV: "test" } }));

import { prisma }                              from "../../config/database";
import { getAll, getBySlug, getById, search } from "../../services/product.service";

const mockProduct = prisma.product as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => { vi.clearAllMocks(); });

const fakeProduct = {
  id: "prod-1", name: "Sepatu Nike", slug: "sepatu-nike",
  price: 500000, images: [], rating: 4.5, soldCount: 100,
  stock: 10, location: "Jakarta", discount: 0,
  description: "Sepatu keren", createdAt: new Date(),
  category: { id: "cat-1", name: "Sepatu", slug: "sepatu" },
};

// ══════════════════════════════════════════════════════════════
// getAll()
// ══════════════════════════════════════════════════════════════
describe("getAll()", () => {
  it("✅ return data + meta pagination default", async () => {
    mockProduct.count.mockResolvedValue(25);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);

    const result = await getAll({});

    expect(result.data).toHaveLength(1);
    expect(result.totalCount).toBe(25);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(2);         // ceil(25/20)
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPrevPage).toBe(false);
  });

  it("✅ filter by categoryId diteruskan ke prisma where", async () => {
    mockProduct.count.mockResolvedValue(5);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);

    await getAll({ categoryId: "cat-1" });

    const where = mockProduct.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ categoryId: "cat-1", isActive: true });
  });

  it("✅ filter by q (search keyword) diteruskan ke prisma where", async () => {
    mockProduct.count.mockResolvedValue(3);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);

    await getAll({ q: "nike" });

    const where = mockProduct.findMany.mock.calls[0][0].where;
    expect(where.name).toMatchObject({ contains: "nike" });
  });

  it("✅ filter by minPrice dan maxPrice (nilai normal)", async () => {
    mockProduct.count.mockResolvedValue(2);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);

    await getAll({ minPrice: 100000, maxPrice: 600000 });

    const where = mockProduct.findMany.mock.calls[0][0].where;
    expect(where.price).toMatchObject({ gte: 100000, lte: 600000 });
  });

  it("✅ pagination: skip dihitung dari (page-1)*limit", async () => {
    mockProduct.count.mockResolvedValue(100);
    mockProduct.findMany.mockResolvedValue([]);

    await getAll({ page: 3, limit: 10 });

    const args = mockProduct.findMany.mock.calls[0][0];
    expect(args.skip).toBe(20);   // (3-1)*10
    expect(args.take).toBe(10);
  });

  it("✅ hasPrevPage true jika page > 1", async () => {
    mockProduct.count.mockResolvedValue(50);
    mockProduct.findMany.mockResolvedValue([]);

    const result = await getAll({ page: 2, limit: 10 });

    expect(result.hasPrevPage).toBe(true);
  });

  it("✅ hanya produk isActive: true yang di-query", async () => {
    mockProduct.count.mockResolvedValue(0);
    mockProduct.findMany.mockResolvedValue([]);

    await getAll({});

    expect(mockProduct.count.mock.calls[0][0].where).toMatchObject({ isActive: true });
    expect(mockProduct.findMany.mock.calls[0][0].where).toMatchObject({ isActive: true });
  });

  // ── Regression: 0-valued filter ───────────────────────────────
  // Bug: `...(minPrice && { price: { gte: minPrice } })` skip nilai 0 karena falsy.
  // Fix yang benar: `minPrice !== undefined` atau `minPrice != null`.

  it("🔴 regression: minPrice=0 harus menghasilkan filter gte:0, BUKAN di-skip", async () => {
    mockProduct.count.mockResolvedValue(5);
    mockProduct.findMany.mockResolvedValue([]);

    await getAll({ minPrice: 0 });

    const where = mockProduct.findMany.mock.calls[0][0].where;
    // Jika pakai truthy check → price tidak ada di where → test MERAH
    expect(where).toHaveProperty("price");
    expect(where.price).toMatchObject({ gte: 0 });
  });

  it("🔴 regression: maxPrice=0 harus menghasilkan filter lte:0, BUKAN di-skip", async () => {
    mockProduct.count.mockResolvedValue(0);
    mockProduct.findMany.mockResolvedValue([]);

    await getAll({ maxPrice: 0 });

    const where = mockProduct.findMany.mock.calls[0][0].where;
    expect(where).toHaveProperty("price");
    expect(where.price).toMatchObject({ lte: 0 });
  });

  it("🔴 regression: minPrice=0 dan maxPrice=0 — keduanya aktif sekaligus", async () => {
    mockProduct.count.mockResolvedValue(0);
    mockProduct.findMany.mockResolvedValue([]);

    await getAll({ minPrice: 0, maxPrice: 0 });

    const where = mockProduct.findMany.mock.calls[0][0].where;
    expect(where.price).toMatchObject({ gte: 0, lte: 0 });
  });

  it("🔴 regression: minRating=0 harus menghasilkan filter rating gte:0, BUKAN di-skip", async () => {
    mockProduct.count.mockResolvedValue(5);
    mockProduct.findMany.mockResolvedValue([]);

    await getAll({ minRating: 0 });

    const where = mockProduct.findMany.mock.calls[0][0].where;
    expect(where).toHaveProperty("rating");
    expect(where.rating).toMatchObject({ gte: 0 });
  });

  it("✅ minRating normal (>0) tetap berfungsi setelah fix", async () => {
    mockProduct.count.mockResolvedValue(3);
    mockProduct.findMany.mockResolvedValue([]);

    await getAll({ minRating: 3.5 });

    const where = mockProduct.findMany.mock.calls[0][0].where;
    expect(where.rating).toMatchObject({ gte: 3.5 });
  });
});

// ══════════════════════════════════════════════════════════════
// getBySlug()
// ══════════════════════════════════════════════════════════════
describe("getBySlug()", () => {
  it("✅ return produk jika ditemukan", async () => {
    mockProduct.findFirst.mockResolvedValue(fakeProduct);

    const result = await getBySlug("sepatu-nike");

    expect(result).toMatchObject({ slug: "sepatu-nike" });
    expect(mockProduct.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "sepatu-nike", isActive: true },
      })
    );
  });

  it("❌ throw 404 jika produk tidak ditemukan", async () => {
    mockProduct.findFirst.mockResolvedValue(null);

    await expect(getBySlug("tidak-ada")).rejects.toMatchObject({ status: 404 });
  });

  it("✅ produk tidak aktif tidak dikembalikan (isActive: true di where)", async () => {
    mockProduct.findFirst.mockResolvedValue(null);

    await expect(getBySlug("produk-inactive")).rejects.toMatchObject({ status: 404 });

    const where = mockProduct.findFirst.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// getById()
// ══════════════════════════════════════════════════════════════
describe("getById()", () => {
  it("✅ return produk berdasarkan ID", async () => {
    mockProduct.findUnique.mockResolvedValue(fakeProduct);

    const result = await getById("prod-1");

    expect(result).toMatchObject({ id: "prod-1" });
  });

  it("❌ throw 404 jika ID tidak ditemukan", async () => {
    mockProduct.findUnique.mockResolvedValue(null);

    await expect(getById("ghost-id")).rejects.toMatchObject({ status: 404 });
  });
});

// ══════════════════════════════════════════════════════════════
// search()
// ══════════════════════════════════════════════════════════════
describe("search()", () => {
  it("✅ search meneruskan keyword sebagai q ke getAll()", async () => {
    mockProduct.count.mockResolvedValue(2);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);

    await search("nike");

    const where = mockProduct.findMany.mock.calls[0][0].where;
    expect(where.name).toMatchObject({ contains: "nike" });
  });

  it("✅ search + pagination options berfungsi", async () => {
    mockProduct.count.mockResolvedValue(5);
    mockProduct.findMany.mockResolvedValue([]);

    await search("adidas", { page: 2, limit: 5 });

    const args = mockProduct.findMany.mock.calls[0][0];
    expect(args.skip).toBe(5);   // (2-1)*5
    expect(args.take).toBe(5);
  });
});
