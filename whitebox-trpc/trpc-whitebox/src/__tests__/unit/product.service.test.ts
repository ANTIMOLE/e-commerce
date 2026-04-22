/**
 * product.service.test.ts — Whitebox Unit Test (backend-trpc)
 *
 * Letakkan di: backend-trpc/src/__tests__/unit/product.service.test.ts
 *
 * Menguji: getAll, getBySlug, getById, search
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── MOCK ─────────────────────────────────────────────────────

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

vi.mock("../../config/env", () => ({
  env: { NODE_ENV: "test" },
}));

// ─── Import setelah mock ──────────────────────────────────────
import { prisma }                         from "../../config/database";
import { getAll, getBySlug, getById, search } from "../../services/product.service";

const mockProduct = prisma.product as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => { vi.clearAllMocks(); });

// ─── Data fixture ─────────────────────────────────────────────
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
    expect(result.totalPages).toBe(2); // ceil(25/20)
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPrevPage).toBe(false);
  });

  it("✅ filter by categoryId diteruskan ke prisma where", async () => {
    mockProduct.count.mockResolvedValue(5);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);

    await getAll({ categoryId: "cat-1" });

    const whereArg = mockProduct.findMany.mock.calls[0][0].where;
    expect(whereArg).toMatchObject({ categoryId: "cat-1", isActive: true });
  });

  it("✅ filter by q (search keyword) diteruskan ke prisma where", async () => {
    mockProduct.count.mockResolvedValue(3);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);

    await getAll({ q: "nike" });

    const whereArg = mockProduct.findMany.mock.calls[0][0].where;
    expect(whereArg.name).toMatchObject({ contains: "nike" });
  });

  it("✅ filter by minPrice dan maxPrice", async () => {
    mockProduct.count.mockResolvedValue(2);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);

    await getAll({ minPrice: 100000, maxPrice: 600000 });

    const whereArg = mockProduct.findMany.mock.calls[0][0].where;
    expect(whereArg.price).toMatchObject({ gte: 100000, lte: 600000 });
  });

  it("✅ pagination: skip dihitung dari (page-1)*limit", async () => {
    mockProduct.count.mockResolvedValue(100);
    mockProduct.findMany.mockResolvedValue([]);

    await getAll({ page: 3, limit: 10 });

    const findArg = mockProduct.findMany.mock.calls[0][0];
    expect(findArg.skip).toBe(20); // (3-1)*10
    expect(findArg.take).toBe(10);
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

    const whereArg = mockProduct.findFirst.mock.calls[0][0].where;
    expect(whereArg.isActive).toBe(true);
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

    const whereArg = mockProduct.findMany.mock.calls[0][0].where;
    expect(whereArg.name).toMatchObject({ contains: "nike" });
  });

  it("✅ search bisa dikombinasikan dengan options tambahan (page, limit)", async () => {
    mockProduct.count.mockResolvedValue(5);
    mockProduct.findMany.mockResolvedValue([]);

    await search("adidas", { page: 2, limit: 5 });

    const findArg = mockProduct.findMany.mock.calls[0][0];
    expect(findArg.skip).toBe(5); // (2-1)*5
    expect(findArg.take).toBe(5);
  });
});
