/**
 * checkout.service.test.ts — Whitebox Unit Test (backend-trpc)
 *
 * Letakkan di: backend-trpc/src/__tests__/unit/checkout.service.test.ts
 *
 * Menguji: getCheckoutSummary, calculateCheckoutSummary, confirmCheckout
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── MOCK ─────────────────────────────────────────────────────

vi.mock("../../config/database", () => ({
  prisma: {
    order:   { findUnique: vi.fn(), create: vi.fn() },
    cart:    { findUnique: vi.fn(), update: vi.fn() },
    address: { findUnique: vi.fn() },
    product: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    cartItem:{ deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../config/env", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("@ecommerce/shared/generated/prisma", () => ({
  PaymentMethod:  { bank_transfer: "bank_transfer", e_wallet: "e_wallet", cod: "cod" },
  ShippingMethod: { regular: "regular", express: "express" },
}));

// ─── Import setelah mock ──────────────────────────────────────
import { prisma } from "../../config/database";
import {
  getCheckoutSummary,
  calculateCheckoutSummary,
  confirmCheckout,
} from "../../services/checkout.service";

const mockOrder   = prisma.order   as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockCart    = prisma.cart    as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockAddress = prisma.address as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockProduct = prisma.product as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockPrisma  = prisma         as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => { vi.clearAllMocks(); });

// ─── Fixtures ─────────────────────────────────────────────────
const fakeAddress = {
  id: "addr-1", userId: "user-1",
  recipientName: "Budi", phone: "08123456789",
  address: "Jl. Test No 1", city: "Jakarta",
  province: "DKI Jakarta", zipCode: "10110",
};

const fakeCartWithItems = {
  id: "cart-1",
  items: [
    { productId: "prod-1", quantity: 2, priceAtTime: 100000 },
    { productId: "prod-2", quantity: 1, priceAtTime: 200000 },
  ],
};

// ══════════════════════════════════════════════════════════════
// getCheckoutSummary()
// ══════════════════════════════════════════════════════════════
describe("getCheckoutSummary()", () => {
  it("✅ return detail order berdasarkan orderNumber", async () => {
    const fakeOrder = { orderNumber: "ORD-123", status: "pending_payment", total: 450000 };
    mockOrder.findUnique.mockResolvedValue(fakeOrder);

    const result = await getCheckoutSummary("user-1", "ORD-123");

    expect(result.orderNumber).toBe("ORD-123");
    expect(mockOrder.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orderNumber: "ORD-123" } })
    );
  });

  it("❌ throw 404 jika orderNumber tidak ditemukan", async () => {
    mockOrder.findUnique.mockResolvedValue(null);

    await expect(getCheckoutSummary("user-1", "ORD-GHOST")).rejects.toMatchObject({ status: 404 });
  });
});

// ══════════════════════════════════════════════════════════════
// calculateCheckoutSummary()
// ══════════════════════════════════════════════════════════════
describe("calculateCheckoutSummary()", () => {
  it("✅ hitung subtotal, tax 10%, dan shipping regular (15000)", async () => {
    mockCart.findUnique.mockResolvedValue(fakeCartWithItems);

    // subtotal = 2*100000 + 1*200000 = 400000
    // tax      = 400000 * 0.1 = 40000
    // shipping = 15000 (regular)
    // total    = 455000
    const result = await calculateCheckoutSummary("cart-1", "regular");

    expect(result.subtotal).toBe(400000);
    expect(result.tax).toBe(40000);
    expect(result.shippingCost).toBe(15000);
    expect(result.total).toBe(455000);
  });

  it("✅ hitung shipping express (25000)", async () => {
    mockCart.findUnique.mockResolvedValue(fakeCartWithItems);

    const result = await calculateCheckoutSummary("cart-1", "express");

    expect(result.shippingCost).toBe(25000);
  });

  it("✅ subtotal 0 jika cart kosong", async () => {
    mockCart.findUnique.mockResolvedValue({ id: "cart-1", items: [] });

    const result = await calculateCheckoutSummary("cart-1", "regular");

    expect(result.subtotal).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(15000); // hanya shipping
  });
});

// ══════════════════════════════════════════════════════════════
// confirmCheckout()
// ══════════════════════════════════════════════════════════════
describe("confirmCheckout()", () => {
  const setupValidCheckout = () => {
    mockCart.findUnique.mockResolvedValue(fakeCartWithItems);
    mockAddress.findUnique.mockResolvedValue(fakeAddress);
    mockProduct.findUnique
      .mockResolvedValueOnce({ name: "Produk A" })
      .mockResolvedValueOnce({ name: "Produk B" });
    mockProduct.findMany.mockResolvedValue([
      { id: "prod-1", stock: 10, name: "Produk A" },
      { id: "prod-2", stock: 5,  name: "Produk B" },
    ]);
    mockOrder.create.mockResolvedValue({ id: "order-1", orderNumber: "ORD-123", items: [] });
    mockPrisma.$transaction.mockResolvedValue([]);
  };

  it("✅ berhasil buat order dan return data order", async () => {
    setupValidCheckout();

    const result = await confirmCheckout("user-1", "cart-1", "addr-1", "bank_transfer", "regular");

    expect(result.id).toBe("order-1");
    expect(mockOrder.create).toHaveBeenCalledOnce();
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it("❌ throw 400 jika cart kosong", async () => {
    mockCart.findUnique.mockResolvedValue({ id: "cart-1", items: [] });

    await expect(
      confirmCheckout("user-1", "cart-1", "addr-1", "bank_transfer", "regular")
    ).rejects.toMatchObject({ status: 400 });
  });

  it("❌ throw jika paymentMethod tidak valid", async () => {
    mockCart.findUnique.mockResolvedValue(fakeCartWithItems);
    mockAddress.findUnique.mockResolvedValue(fakeAddress);
    mockProduct.findMany.mockResolvedValue([
      { id: "prod-1", stock: 10 }, { id: "prod-2", stock: 5 },
    ]);

    await expect(
      confirmCheckout("user-1", "cart-1", "addr-1", "INVALID_METHOD", "regular")
    ).rejects.toThrow();
  });

  it("❌ throw 404 jika address tidak ditemukan", async () => {
    mockCart.findUnique.mockResolvedValue(fakeCartWithItems);
    mockAddress.findUnique.mockResolvedValue(null);

    await expect(
      confirmCheckout("user-1", "cart-1", "bad-addr", "bank_transfer", "regular")
    ).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika stok produk tidak cukup", async () => {
    mockCart.findUnique.mockResolvedValue(fakeCartWithItems);
    mockAddress.findUnique.mockResolvedValue(fakeAddress);
    mockProduct.findUnique.mockResolvedValue({ name: "Produk A" });
    mockProduct.findMany.mockResolvedValue([
      { id: "prod-1", stock: 1, name: "Produk A" }, // butuh 2, ada 1
      { id: "prod-2", stock: 5, name: "Produk B" },
    ]);

    await expect(
      confirmCheckout("user-1", "cart-1", "addr-1", "bank_transfer", "regular")
    ).rejects.toMatchObject({ status: 400 });
  });
});
