/**
 * admin.service.test.ts — Whitebox Unit Test (backend-rest)
 *
 * Letakkan di: backend-rest/src/__tests__/unit/admin.service.test.ts
 *
 * Menguji: getDashboardStats, getAllProducts, createProduct,
 *          updateProduct, deleteProduct (soft-delete),
 *          getAllOrders, updateOrderStatus, getAllUsers
 *
 * Perilaku kritis yang dikunci:
 *  - deleteProduct = soft delete (isActive: false), TIDAK hapus row
 *  - updateOrderStatus = validasi state machine transition
 *  - getDashboardStats = Promise.all 7 query paralel
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/database", () => ({
  prisma: {
    order:   { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
    product: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    user:    { count: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../../config/env", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("@ecommerce/shared/generated/prisma", () => ({
  OrderStatus: {
    pending_payment: "pending_payment",
    confirmed:       "confirmed",
    processing:      "processing",
    shipped:         "shipped",
    delivered:       "delivered",
    cancelled:       "cancelled",
  },
}));

import { prisma } from "../../config/database";
import {
  getDashboardStats,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
  getAllUsers,
} from "../../services/admin.service";

const mockOrder   = prisma.order   as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockProduct = prisma.product as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockUser    = prisma.user    as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => { vi.clearAllMocks(); });

// ─── Fixtures ─────────────────────────────────────────────────
const fakeProduct = {
  id: "prod-1", name: "Produk A", slug: "produk-a",
  price: 100_000, stock: 50, soldCount: 10,
  isActive: true, discount: 0, images: [], createdAt: new Date(),
  category: { id: "cat-1", name: "Elektronik" },
};

const fakeOrder = {
  id: "order-1", orderNumber: "ORD-123",
  status: "pending_payment", total: 150_000,
  createdAt: new Date(),
  user: { id: "user-1", name: "Budi", email: "budi@test.com" },
  items: [],
};

// ══════════════════════════════════════════════════════════════
// getDashboardStats()
// ══════════════════════════════════════════════════════════════
describe("getDashboardStats()", () => {
  function setupDashboardMocks() {
    mockOrder.count
      .mockResolvedValueOnce(5)   // totalOrdersToday
      .mockResolvedValueOnce(100); // totalOrders
    mockOrder.aggregate.mockResolvedValue({ _sum: { total: 5_000_000 } });
    mockOrder.findMany.mockResolvedValue([fakeOrder]);
    mockOrder.groupBy.mockResolvedValue([]);
    mockProduct.count.mockResolvedValue(200);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);
    mockUser.count.mockResolvedValue(50);
  }

  it("✅ return summary + topProducts + recentOrders + salesChart", async () => {
    setupDashboardMocks();

    const result = await getDashboardStats();

    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("topProducts");
    expect(result).toHaveProperty("recentOrders");
    expect(result).toHaveProperty("salesChart");
    expect(result.summary.totalOrdersToday).toBe(5);
    expect(result.summary.weeklyRevenue).toBe(5_000_000);
  });

  it("✅ weeklyRevenue default 0 jika tidak ada order minggu ini", async () => {
    mockOrder.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    mockOrder.aggregate.mockResolvedValue({ _sum: { total: null } }); // null jika tidak ada
    mockOrder.findMany.mockResolvedValue([]);
    mockOrder.groupBy.mockResolvedValue([]);
    mockProduct.count.mockResolvedValue(0);
    mockProduct.findMany.mockResolvedValue([]);
    mockUser.count.mockResolvedValue(0);

    const result = await getDashboardStats();

    expect(result.summary.weeklyRevenue).toBe(0); // Number(null ?? 0) = 0
  });
});

// ══════════════════════════════════════════════════════════════
// getAllProducts()
// ══════════════════════════════════════════════════════════════
describe("getAllProducts()", () => {
  it("✅ return products + metadata pagination", async () => {
    mockProduct.count.mockResolvedValue(100);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);

    const result = await getAllProducts({ page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.totalCount).toBe(100);
    expect(result.totalPages).toBe(5);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPrevPage).toBe(false);
  });

  it("✅ filter by q (search nama produk)", async () => {
    mockProduct.count.mockResolvedValue(1);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);

    await getAllProducts({ q: "Produk A" });

    expect(mockProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "Produk A", mode: "insensitive" },
        }),
      })
    );
  });

  it("✅ filter by categoryId", async () => {
    mockProduct.count.mockResolvedValue(1);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);

    await getAllProducts({ categoryId: "cat-1" });

    expect(mockProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: "cat-1" }),
      })
    );
  });

  it("✅ pagination — skip = (page-1) * limit", async () => {
    mockProduct.count.mockResolvedValue(100);
    mockProduct.findMany.mockResolvedValue([]);

    await getAllProducts({ page: 3, limit: 10 });

    expect(mockProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });
});

// ══════════════════════════════════════════════════════════════
// createProduct()
// ══════════════════════════════════════════════════════════════
describe("createProduct()", () => {
  it("✅ berhasil buat produk + generate slug unik", async () => {
    mockProduct.create.mockResolvedValue({ ...fakeProduct, id: "prod-new" });

    const result = await createProduct({
      categoryId: "cat-1",
      name: "Produk Baru",
      price: 50_000,
      stock: 20,
    });

    expect(mockProduct.create).toHaveBeenCalledOnce();
    const createData = mockProduct.create.mock.calls[0][0].data;
    // Slug harus ada dan berbasis nama
    expect(createData.slug).toContain("produk-baru");
    // Slug harus unique (append timestamp)
    expect(createData.slug).toMatch(/-\d+$/);
    expect(result.id).toBe("prod-new");
  });

  it("✅ images default [] jika tidak disupply", async () => {
    mockProduct.create.mockResolvedValue(fakeProduct);

    await createProduct({ categoryId: "cat-1", name: "X", price: 1000, stock: 1 });

    const createData = mockProduct.create.mock.calls[0][0].data;
    expect(createData.images).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// updateProduct()
// ══════════════════════════════════════════════════════════════
describe("updateProduct()", () => {
  it("✅ berhasil update produk yang ada", async () => {
    mockProduct.findUnique.mockResolvedValue(fakeProduct);
    mockProduct.update.mockResolvedValue({ ...fakeProduct, price: 90_000 });

    const result = await updateProduct("prod-1", { price: 90_000 });

    expect(result.price).toBe(90_000);
    expect(mockProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "prod-1" }, data: { price: 90_000 } })
    );
  });

  it("❌ throw 404 jika produk tidak ditemukan", async () => {
    mockProduct.findUnique.mockResolvedValue(null);

    await expect(updateProduct("ghost", { price: 1 }))
      .rejects.toMatchObject({ status: 404 });

    expect(mockProduct.update).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// deleteProduct() — soft delete
// ══════════════════════════════════════════════════════════════
describe("deleteProduct()", () => {
  it("✅ SOFT DELETE — set isActive: false, tidak hapus row", async () => {
    mockProduct.findUnique.mockResolvedValue(fakeProduct);
    mockProduct.update.mockResolvedValue({ ...fakeProduct, isActive: false });

    const result = await deleteProduct("prod-1");

    // Harus update, bukan delete
    expect(mockProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    );
    expect(result.message).toBe("Produk dinonaktifkan.");
  });

  it("❌ throw 404 jika produk tidak ditemukan", async () => {
    mockProduct.findUnique.mockResolvedValue(null);

    await expect(deleteProduct("ghost")).rejects.toMatchObject({ status: 404 });

    expect(mockProduct.update).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// getAllOrders()
// ══════════════════════════════════════════════════════════════
describe("getAllOrders()", () => {
  it("✅ return orders + metadata pagination", async () => {
    mockOrder.count.mockResolvedValue(50);
    mockOrder.findMany.mockResolvedValue([fakeOrder]);

    const result = await getAllOrders({ page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.totalCount).toBe(50);
  });

  it("✅ filter by status", async () => {
    mockOrder.count.mockResolvedValue(5);
    mockOrder.findMany.mockResolvedValue([]);

    await getAllOrders({ status: "pending_payment" });

    expect(mockOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "pending_payment" }),
      })
    );
  });

  it("✅ filter by q (orderNumber atau email user)", async () => {
    mockOrder.count.mockResolvedValue(1);
    mockOrder.findMany.mockResolvedValue([fakeOrder]);

    await getAllOrders({ q: "ORD-123" });

    expect(mockOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });
});

// ══════════════════════════════════════════════════════════════
// updateOrderStatus()
// ══════════════════════════════════════════════════════════════
describe("updateOrderStatus()", () => {
  it("✅ transition valid: pending_payment → confirmed", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "pending_payment" });
    mockOrder.update.mockResolvedValue({ id: "order-1", orderNumber: "ORD-1", status: "confirmed", updatedAt: new Date() });

    const result = await updateOrderStatus("order-1", "confirmed" as any);

    expect(result.status).toBe("confirmed");
    expect(mockOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "confirmed" } })
    );
  });

  it("✅ transition valid: confirmed → processing", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "confirmed" });
    mockOrder.update.mockResolvedValue({ id: "order-1", status: "processing" });

    await updateOrderStatus("order-1", "processing" as any);

    expect(mockOrder.update).toHaveBeenCalledOnce();
  });

  it("✅ transition valid: processing → shipped → delivered", async () => {
    const statuses = [
      { from: "processing", to: "shipped" },
      { from: "shipped", to: "delivered" },
    ];

    for (const { from, to } of statuses) {
      vi.clearAllMocks();
      mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: from });
      mockOrder.update.mockResolvedValue({ id: "order-1", status: to });

      await updateOrderStatus("order-1", to as any);

      expect(mockOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: to } })
      );
    }
  });

  it("❌ throw 400 untuk transition tidak valid: delivered → confirmed", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "delivered" });

    await expect(updateOrderStatus("order-1", "confirmed" as any))
      .rejects.toMatchObject({ status: 400 });

    expect(mockOrder.update).not.toHaveBeenCalled();
  });

  it("❌ throw 400 untuk transition tidak valid: cancelled → confirmed", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "cancelled" });

    await expect(updateOrderStatus("order-1", "confirmed" as any))
      .rejects.toMatchObject({ status: 400 });
  });

  it("❌ throw 400 untuk transition tidak valid: pending_payment → shipped (lompat state)", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "pending_payment" });

    await expect(updateOrderStatus("order-1", "shipped" as any))
      .rejects.toMatchObject({ status: 400 });
  });

  it("❌ throw 404 jika order tidak ditemukan", async () => {
    mockOrder.findUnique.mockResolvedValue(null);

    await expect(updateOrderStatus("ghost", "confirmed" as any))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ══════════════════════════════════════════════════════════════
// getAllUsers()
// ══════════════════════════════════════════════════════════════
describe("getAllUsers()", () => {
  const fakeUser = {
    id: "user-1", name: "Budi", email: "budi@test.com",
    role: "USER", phone: null, createdAt: new Date(),
    _count: { orders: 3 },
  };

  it("✅ return list user + metadata pagination", async () => {
    mockUser.count.mockResolvedValue(50);
    mockUser.findMany.mockResolvedValue([fakeUser]);

    const result = await getAllUsers({ page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.totalCount).toBe(50);
    expect(result.data[0]).toHaveProperty("_count");
  });

  it("✅ filter by q (name atau email)", async () => {
    mockUser.count.mockResolvedValue(1);
    mockUser.findMany.mockResolvedValue([fakeUser]);

    await getAllUsers({ q: "budi" });

    expect(mockUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });

  it("✅ tidak ada filter jika q kosong", async () => {
    mockUser.count.mockResolvedValue(100);
    mockUser.findMany.mockResolvedValue([]);

    await getAllUsers({});

    expect(mockUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });
});
