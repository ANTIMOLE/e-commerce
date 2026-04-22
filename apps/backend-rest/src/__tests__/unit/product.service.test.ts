/**
 * product.service.test.ts — Whitebox Unit Test
 *
 * Letakkan di: backend-rest/src/__tests__/unit/product.service.test.ts
 *
 * Test query builder logic di product service:
 *   - filter, sorting, pagination
 *   - slug / id lookup
 *   - 404 handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/database", () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("../../config/env", () => ({ env: { NODE_ENV: "test" } }));

import { prisma } from "../../config/database";
import * as productService from "../../services/product.service";
import { AppError } from "../../middlewares/error.middleware";

const mockFindMany = (prisma.product as any).findMany as ReturnType<typeof vi.fn>;
const mockFindFirst = (prisma.product as any).findFirst as ReturnType<typeof vi.fn>;
const mockFindUnique = (prisma.product as any).findUnique as ReturnType<typeof vi.fn>;
const mockCount = (prisma.product as any).count as ReturnType<typeof vi.fn>;

const sampleProduct = {
  id: "prod-uuid",
  name: "Samsung Galaxy S24",
  slug: "samsung-galaxy-s24",
  price: "8999000",
  images: ["img1.jpg"],
  rating: "4.5",
  soldCount: 100,
  location: "Jakarta",
  discount: 10,
  stock: 50,
  category: { id: "cat-uuid", name: "Handphone", slug: "handphone" },
};

beforeEach(() => { vi.clearAllMocks(); });

// ══════════════════════════════════════════════════════════════
// getAll()
// ══════════════════════════════════════════════════════════════
describe("productService.getAll()", () => {
  it("✅ query dasar mengembalikan produk dan metadata pagination", async () => {
    mockCount.mockResolvedValue(25);
    mockFindMany.mockResolvedValue([sampleProduct]);

    const result = await productService.getAll({ page: 1, limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.totalCount).toBe(25);
    expect(result.totalPages).toBe(3); // Math.ceil(25/10)
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPrevPage).toBe(false);
  });

  it("✅ memfilter hanya produk isActive:true", async () => {
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);

    await productService.getAll({});

    const countCall = mockCount.mock.calls[0][0];
    expect(countCall.where).toMatchObject({ isActive: true });

    const findCall = mockFindMany.mock.calls[0][0];
    expect(findCall.where).toMatchObject({ isActive: true });
  });

  it("✅ filter categoryId ditambahkan ke where clause", async () => {
    mockCount.mockResolvedValue(5);
    mockFindMany.mockResolvedValue([]);

    await productService.getAll({ categoryId: "cat-uuid" });

    const findCall = mockFindMany.mock.calls[0][0];
    expect(findCall.where).toMatchObject({ categoryId: "cat-uuid" });
  });

  it("✅ filter harga (minPrice dan maxPrice) ke where.price", async () => {
    mockCount.mockResolvedValue(3);
    mockFindMany.mockResolvedValue([]);

    await productService.getAll({ minPrice: 1_000_000, maxPrice: 5_000_000 });

    const findCall = mockFindMany.mock.calls[0][0];
    expect(findCall.where.price).toMatchObject({
      gte: 1_000_000,
      lte: 5_000_000,
    });
  });

  it("✅ sort field snake_case di-map ke camelCase Prisma", async () => {
    mockCount.mockResolvedValue(1);
    mockFindMany.mockResolvedValue([]);

    // "sold_count" harus di-map ke "soldCount" agar Prisma bisa pakai
    await productService.getAll({ sortBy: "sold_count", sortOrder: "desc" });

    const findCall = mockFindMany.mock.calls[0][0];
    expect(findCall.orderBy).toHaveProperty("soldCount", "desc");
    expect(findCall.orderBy).not.toHaveProperty("sold_count");
  });

  it("✅ pagination: skip = (page-1) * limit", async () => {
    mockCount.mockResolvedValue(100);
    mockFindMany.mockResolvedValue([]);

    await productService.getAll({ page: 3, limit: 12 });

    const findCall = mockFindMany.mock.calls[0][0];
    expect(findCall.skip).toBe(24); // (3-1) * 12
    expect(findCall.take).toBe(12);
  });

  it("✅ search keyword 'q' menambahkan filter name contains (case-insensitive)", async () => {
    mockCount.mockResolvedValue(2);
    mockFindMany.mockResolvedValue([]);

    await productService.getAll({ q: "samsung" });

    const findCall = mockFindMany.mock.calls[0][0];
    expect(findCall.where.name).toMatchObject({
      contains: "samsung",
      mode: "insensitive",
    });
  });

  it("✅ halaman terakhir: hasNextPage = false, hasPrevPage = true", async () => {
    mockCount.mockResolvedValue(15);
    mockFindMany.mockResolvedValue([]);

    const result = await productService.getAll({ page: 3, limit: 5 });

    expect(result.hasNextPage).toBe(false);
    expect(result.hasPrevPage).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// getBySlug()
// ══════════════════════════════════════════════════════════════
describe("productService.getBySlug()", () => {
  it("✅ mengembalikan produk yang ditemukan", async () => {
    mockFindFirst.mockResolvedValue(sampleProduct);

    const result = await productService.getBySlug("samsung-galaxy-s24");

    expect(result.slug).toBe("samsung-galaxy-s24");
    // Query harus filter isActive: true juga
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ slug: "samsung-galaxy-s24", isActive: true }),
      })
    );
  });

  it("❌ throw 404 jika produk tidak ditemukan", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(productService.getBySlug("tidak-ada")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("❌ produk inactive tidak dikembalikan (isActive: true di where)", async () => {
    // Jika prisma.findFirst mengembalikan null (karena filter isActive),
    // service harus throw 404 — bukan mengembalikan produk
    mockFindFirst.mockResolvedValue(null);

    await expect(productService.getBySlug("inactive-product")).rejects.toThrow(AppError);
  });
});

// ══════════════════════════════════════════════════════════════
// getById()
// ══════════════════════════════════════════════════════════════
describe("productService.getById()", () => {
  it("✅ mengembalikan produk berdasarkan ID", async () => {
    mockFindUnique.mockResolvedValue(sampleProduct);

    const result = await productService.getById("prod-uuid");

    expect(result.id).toBe("prod-uuid");
  });

  it("❌ throw 404 jika ID tidak ditemukan", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(productService.getById("ghost-uuid")).rejects.toMatchObject({
      status: 404,
    });
  });
});
