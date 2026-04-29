/**
 * admin.service.test.ts — Whitebox Unit Test (backend-trpc)
 *
 * Letakkan di: backend-trpc/src/__tests__/unit/admin.service.test.ts
 *
 * Menguji: getDashboardStats, getAllProducts, createProduct,
 *          updateProduct, deleteProduct (soft-delete),
 *          getAllOrders, updateOrderStatus, getAllUsers
 *
 * Perilaku kritis yang dikunci:
 *  - deleteProduct = soft delete (isActive: false), TIDAK hapus row
 *  - updateOrderStatus = validasi state machine transition
 *  - getDashboardStats = Promise.all 7 query paralel, return shape dengan `summary`
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/database", () => ({
  prisma: {
    order: {
      count:      vi.fn(),
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      update:     vi.fn(),
      aggregate:  vi.fn(),
      groupBy:    vi.fn(),
    },
    product: {
      count:      vi.fn(),
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      update:     vi.fn(),
      create:     vi.fn(),
    },
    user: {
      count:    vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../config/env", () => ({ env: { NODE_ENV: "test" } }));

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
  id: "prod-1", name: "Produk Admin", slug: "produk-admin",
  price: 100000, stock: 50, isActive: true, soldCount: 10,
  images: [], discount: 0, createdAt: new Date(),
  category: { id: "cat-1", name: "Elektronik" },
};

const fakeOrder = {
  id: "order-1", orderNumber: "ORD-001", status: "pending_payment",
  total: 200000, createdAt: new Date(),
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
    mockOrder.aggregate.mockResolvedValue({ _sum: { total: "5000000" } });
    mockOrder.findMany.mockResolvedValue([fakeOrder]);
    mockOrder.groupBy.mockResolvedValue([]);
    mockProduct.count.mockResolvedValue(200);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);
    mockUser.count.mockResolvedValue(50);
  }

  it("✅ return shape dengan summary, topProducts, recentOrders, salesChart", async () => {
    setupDashboardMocks();

    const result = await getDashboardStats();

    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("topProducts");
    expect(result).toHaveProperty("recentOrders");
    expect(result).toHaveProperty("salesChart");
  });

  it("✅ summary berisi semua field yang dibutuhkan dashboard", async () => {
    setupDashboardMocks();

    const result = await getDashboardStats();

    expect(result.summary).toHaveProperty("totalOrdersToday");
    expect(result.summary).toHaveProperty("weeklyRevenue");
    expect(result.summary).toHaveProperty("totalOrders");
    expect(result.summary).toHaveProperty("totalProducts");
    expect(result.summary).toHaveProperty("totalUsers");
  });

  it("✅ weeklyRevenue dikonversi ke Number (bukan string/Decimal)", async () => {
    setupDashboardMocks();

    const result = await getDashboardStats();

    expect(typeof result.summary.weeklyRevenue).toBe("number");
  });

  it("✅ salesChart adalah array (kosong jika tidak ada transaksi)", async () => {
    setupDashboardMocks();
    mockOrder.groupBy.mockResolvedValue([]);

    const result = await getDashboardStats();

    expect(Array.isArray(result.salesChart)).toBe(true);
  });

  it("✅ salesChart item memiliki date, revenue, dan orders", async () => {
    setupDashboardMocks();
    mockOrder.groupBy.mockResolvedValue([
      { createdAt: new Date(), _sum: { total: "150000" }, _count: { id: 3 } },
    ]);

    const result = await getDashboardStats();

    expect(result.salesChart[0]).toHaveProperty("date");
    expect(result.salesChart[0]).toHaveProperty("revenue");
    expect(result.salesChart[0]).toHaveProperty("orders");
    expect(typeof result.salesChart[0].revenue).toBe("number");
  });

  it("✅ topProducts adalah array produk terlaris", async () => {
    setupDashboardMocks();

    const result = await getDashboardStats();

    expect(Array.isArray(result.topProducts)).toBe(true);
    expect(result.topProducts.length).toBeGreaterThanOrEqual(0);
  });
});

// ══════════════════════════════════════════════════════════════
// getAllProducts()
// ══════════════════════════════════════════════════════════════
describe("getAllProducts()", () => {
  it("✅ return produk dengan pagination default (page 1, limit 20)", async () => {
    mockProduct.count.mockResolvedValue(50);
    mockProduct.findMany.mockResolvedValue([fakeProduct]);

    const result = await getAllProducts({});

    expect(result.data).toHaveLength(1);
    expect(result.totalCount).toBe(50);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(3);
  });

  it("✅ admin bisa melihat produk nonaktif (filter isActive: false)", async () => {
    mockProduct.count.mockResolvedValue(5);
    mockProduct.findMany.mockResolvedValue([{ ...fakeProduct, isActive: false }]);

    await getAllProducts({ isActive: false });

    const where = mockProduct.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ isActive: false });
  });

  it("✅ tanpa filter isActive — tidak menambah constraint isActive ke where", async () => {
    mockProduct.count.mockResolvedValue(10);
    mockProduct.findMany.mockResolvedValue([]);

    await getAllProducts({});

    const where = mockProduct.findMany.mock.calls[0][0].where;
    // Tanpa filter, isActive tidak di-set → bisa aktif maupun nonaktif
    expect(where.isActive).toBeUndefined();
  });

  it("✅ filter by q (search keyword)", async () => {
    mockProduct.count.mockResolvedValue(2);
    mockProduct.findMany.mockResolvedValue([]);

    await getAllProducts({ q: "samsung" });

    const where = mockProduct.findMany.mock.calls[0][0].where;
    expect(where.name).toMatchObject({ contains: "samsung", mode: "insensitive" });
  });

  it("✅ pagination skip dihitung benar", async () => {
    mockProduct.count.mockResolvedValue(100);
    mockProduct.findMany.mockResolvedValue([]);

    await getAllProducts({ page: 3, limit: 10 });

    const args = mockProduct.findMany.mock.calls[0][0];
    expect(args.skip).toBe(20);
    expect(args.take).toBe(10);
  });
});

// ══════════════════════════════════════════════════════════════
// createProduct()
// ══════════════════════════════════════════════════════════════
describe("createProduct()", () => {
  const newProductData = {
    categoryId: "cat-1",
    name:       "Produk Baru",
    price:      150000,
    stock:      100,
    discount:   0,
  };

  it("✅ berhasil membuat produk — slug di-generate otomatis dari name+timestamp", async () => {
    mockProduct.create.mockResolvedValue({ id: "prod-new", ...newProductData, slug: "produk-baru-123" });

    const result = await createProduct(newProductData);

    expect(mockProduct.create).toHaveBeenCalledOnce();
    const createData = mockProduct.create.mock.calls[0][0].data;
    expect(createData.slug).toMatch(/produk-baru-\d+/);    // slug + timestamp
    expect(result.id).toBe("prod-new");
  });

  it("✅ images default ke [] jika tidak disediakan", async () => {
    mockProduct.create.mockResolvedValue({ id: "prod-new", slug: "test", images: [] });

    await createProduct(newProductData);

    const createData = mockProduct.create.mock.calls[0][0].data;
    expect(createData.images).toEqual([]);
  });

  it("✅ menerima images jika disediakan", async () => {
    mockProduct.create.mockResolvedValue({ id: "prod-new", slug: "test", images: ["img1.jpg"] });

    await createProduct({ ...newProductData, images: ["img1.jpg"] });

    const createData = mockProduct.create.mock.calls[0][0].data;
    expect(createData.images).toEqual(["img1.jpg"]);
  });
});

// ══════════════════════════════════════════════════════════════
// updateProduct()
// ══════════════════════════════════════════════════════════════
describe("updateProduct()", () => {
  it("✅ berhasil update produk", async () => {
    mockProduct.findUnique.mockResolvedValue(fakeProduct);
    mockProduct.update.mockResolvedValue({ ...fakeProduct, price: 120000 });

    const result = await updateProduct("prod-1", { price: 120000 });

    expect(mockProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-1" },
        data:  { price: 120000 },
      })
    );
  });

  it("❌ throw 404 jika produk tidak ditemukan", async () => {
    mockProduct.findUnique.mockResolvedValue(null);

    await expect(updateProduct("ghost", { price: 100 }))
      .rejects.toMatchObject({ status: 404 });

    expect(mockProduct.update).not.toHaveBeenCalled();
  });

  it("✅ bisa nonaktifkan produk via isActive: false", async () => {
    mockProduct.findUnique.mockResolvedValue(fakeProduct);
    mockProduct.update.mockResolvedValue({ ...fakeProduct, isActive: false });

    await updateProduct("prod-1", { isActive: false });

    expect(mockProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    );
  });
});

// ══════════════════════════════════════════════════════════════
// deleteProduct() — SOFT DELETE
// ══════════════════════════════════════════════════════════════
describe("deleteProduct()", () => {
  it("✅ soft delete: isActive diset false, TIDAK hapus row dari DB", async () => {
    mockProduct.findUnique.mockResolvedValue(fakeProduct);
    mockProduct.update.mockResolvedValue({ ...fakeProduct, isActive: false });

    const result = await deleteProduct("prod-1");

    // Harus update, bukan delete
    expect(mockProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    );
    // Prisma delete TIDAK boleh dipanggil
    expect((prisma.product as any).delete).toBeUndefined();
    expect(result.message).toBe("Produk dinonaktifkan.");
  });

  it("❌ throw 404 jika produk tidak ditemukan", async () => {
    mockProduct.findUnique.mockResolvedValue(null);

    await expect(deleteProduct("ghost"))
      .rejects.toMatchObject({ status: 404 });

    expect(mockProduct.update).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// getAllOrders()
// ══════════════════════════════════════════════════════════════
describe("getAllOrders()", () => {
  it("✅ return semua order dengan pagination", async () => {
    mockOrder.count.mockResolvedValue(30);
    mockOrder.findMany.mockResolvedValue([fakeOrder]);

    const result = await getAllOrders({});

    expect(result.data).toHaveLength(1);
    expect(result.totalCount).toBe(30);
  });

  it("✅ filter by status", async () => {
    mockOrder.count.mockResolvedValue(5);
    mockOrder.findMany.mockResolvedValue([]);

    await getAllOrders({ status: "pending_payment" as any });

    const where = mockOrder.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ status: "pending_payment" });
  });

  it("✅ filter by q (orderNumber atau email user)", async () => {
    mockOrder.count.mockResolvedValue(1);
    mockOrder.findMany.mockResolvedValue([fakeOrder]);

    await getAllOrders({ q: "ORD-001" });

    const where = mockOrder.findMany.mock.calls[0][0].where;
    expect(where).toHaveProperty("OR");
    expect(where.OR).toBeInstanceOf(Array);
  });
});

// ══════════════════════════════════════════════════════════════
// updateOrderStatus()
// ══════════════════════════════════════════════════════════════
describe("updateOrderStatus()", () => {
  it("✅ berhasil update status: pending_payment → confirmed", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "pending_payment" });
    mockOrder.update.mockResolvedValue({ id: "order-1", status: "confirmed" });

    const result = await updateOrderStatus("order-1", "confirmed" as any);

    expect(mockOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "confirmed" } })
    );
  });

  it("✅ transisi valid: confirmed → processing", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "confirmed" });
    mockOrder.update.mockResolvedValue({ id: "order-1", status: "processing" });

    await updateOrderStatus("order-1", "processing" as any);

    expect(mockOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "processing" } })
    );
  });

  it("✅ transisi valid: processing → shipped", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "processing" });
    mockOrder.update.mockResolvedValue({ id: "order-1", status: "shipped" });

    await updateOrderStatus("order-1", "shipped" as any);

    expect(mockOrder.update).toHaveBeenCalledOnce();
  });

  it("✅ transisi valid: shipped → delivered", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "shipped" });
    mockOrder.update.mockResolvedValue({ id: "order-1", status: "delivered" });

    await updateOrderStatus("order-1", "delivered" as any);

    expect(mockOrder.update).toHaveBeenCalledOnce();
  });

  it("❌ throw 404 jika order tidak ditemukan", async () => {
    mockOrder.findUnique.mockResolvedValue(null);

    await expect(updateOrderStatus("ghost", "confirmed" as any))
      .rejects.toMatchObject({ status: 404 });

    expect(mockOrder.update).not.toHaveBeenCalled();
  });

  it("❌ throw 400 jika transisi tidak valid: delivered → confirmed", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "delivered" });

    await expect(updateOrderStatus("order-1", "confirmed" as any))
      .rejects.toMatchObject({ status: 400 });

    expect(mockOrder.update).not.toHaveBeenCalled();
  });

  it("❌ throw 400 jika transisi tidak valid: cancelled → shipped", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "cancelled" });

    await expect(updateOrderStatus("order-1", "shipped" as any))
      .rejects.toMatchObject({ status: 400 });

    expect(mockOrder.update).not.toHaveBeenCalled();
  });

  it("❌ throw 400 jika transisi skip state: pending_payment → shipped", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "pending_payment" });

    await expect(updateOrderStatus("order-1", "shipped" as any))
      .rejects.toMatchObject({ status: 400 });

    expect(mockOrder.update).not.toHaveBeenCalled();
  });

  it("✅ pesan error menyebut status asal dan tujuan yang tidak valid", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "delivered" });

    await expect(updateOrderStatus("order-1", "confirmed" as any))
      .rejects.toThrow(/delivered/);
  });
});

// ══════════════════════════════════════════════════════════════
// getAllUsers()
// ══════════════════════════════════════════════════════════════
describe("getAllUsers()", () => {
  it("✅ return list user dengan pagination", async () => {
    mockUser.count.mockResolvedValue(50);
    mockUser.findMany.mockResolvedValue([
      { id: "user-1", name: "Budi", email: "budi@test.com", role: "USER", createdAt: new Date() },
    ]);

    const result = await getAllUsers({});

    expect(result.data).toHaveLength(1);
    expect(result.totalCount).toBe(50);
  });

  it("✅ filter by q (name atau email, case-insensitive)", async () => {
    mockUser.count.mockResolvedValue(1);
    mockUser.findMany.mockResolvedValue([]);

    await getAllUsers({ q: "budi" });

    const where = mockUser.findMany.mock.calls[0][0].where;
    expect(where).toHaveProperty("OR");
    const orItems = where.OR as any[];
    expect(orItems.some((c: any) => c.name?.contains === "budi")).toBe(true);
    expect(orItems.some((c: any) => c.email?.contains === "budi")).toBe(true);
  });

  it("✅ return empty jika tidak ada user yang cocok", async () => {
    mockUser.count.mockResolvedValue(0);
    mockUser.findMany.mockResolvedValue([]);

    const result = await getAllUsers({ q: "tidak-ada" });

    expect(result.data).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });
});
