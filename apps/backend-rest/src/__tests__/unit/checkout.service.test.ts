/**
 * checkout.service.test.ts — Whitebox Unit Test
 *
 * Letakkan di: backend-rest/src/__tests__/unit/checkout.service.test.ts
 *
 * Test logika bisnis paling kritis: perhitungan harga dan checkout.
 * Ini adalah test terpenting dari sisi bisnis karena bug di sini
 * berarti kerugian finansial nyata.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/database", () => ({
  prisma: {
    cart: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    address: {
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    cartItem: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../config/env", () => ({
  env: { NODE_ENV: "test" },
}));

// Mock @ecommerce/shared/generated/prisma enums
vi.mock("@ecommerce/shared/generated/prisma", () => ({
  PaymentMethod: {
    bank_transfer: "bank_transfer",
    qris: "qris",
    cod: "cod",
  },
  ShippingMethod: {
    regular: "regular",
    express: "express",
  },
}));

import { prisma } from "../../config/database";
import {
  calculateCheckoutSummary,
  confirmCheckout,
} from "../../services/checkout.service";
import { AppError } from "../../middlewares/error.middleware";

// ─── Typed mock helpers ───────────────────────────────────────
const mockCartFindUnique = (prisma.cart as any).findUnique as ReturnType<typeof vi.fn>;
const mockOrderCreate = (prisma.order as any).create as ReturnType<typeof vi.fn>;
const mockAddressFindUnique = (prisma.address as any).findUnique as ReturnType<typeof vi.fn>;
const mockProductFindMany = (prisma.product as any).findMany as ReturnType<typeof vi.fn>;
const mockProductFindUnique = (prisma.product as any).findUnique as ReturnType<typeof vi.fn>;
const mockTransaction = (prisma as any).$transaction as ReturnType<typeof vi.fn>;

beforeEach(() => { vi.clearAllMocks(); });

// ══════════════════════════════════════════════════════════════
// calculateCheckoutSummary() — logika perhitungan harga
// ══════════════════════════════════════════════════════════════
describe("calculateCheckoutSummary()", () => {
  it("✅ menghitung subtotal, tax 10%, dan shipping regular (15.000) dengan benar", async () => {
    mockCartFindUnique.mockResolvedValue({
      items: [
        { quantity: 2, priceAtTime: "100000" }, // 2 × 100.000 = 200.000
        { quantity: 1, priceAtTime: "50000" },  // 1 × 50.000  =  50.000
      ],
    });

    const result = await calculateCheckoutSummary("cart-id", "regular");

    expect(result.subtotal).toBe(250_000);
    expect(result.tax).toBe(25_000);        // 10% dari 250.000
    expect(result.shippingCost).toBe(15_000); // regular
    expect(result.total).toBe(290_000);     // 250.000 + 25.000 + 15.000
  });

  it("✅ shipping express = 25.000", async () => {
    mockCartFindUnique.mockResolvedValue({
      items: [{ quantity: 1, priceAtTime: "100000" }],
    });

    const result = await calculateCheckoutSummary("cart-id", "express");

    expect(result.shippingCost).toBe(25_000);
    expect(result.total).toBe(135_000); // 100.000 + 10.000 + 25.000
  });

  it("✅ cart kosong → subtotal 0, total hanya shipping", async () => {
    mockCartFindUnique.mockResolvedValue({ items: [] });

    const result = await calculateCheckoutSummary("cart-id", "regular");

    expect(result.subtotal).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(15_000); // hanya ongkir
  });

  it("🔢 total = subtotal + tax + shippingCost (invariant)", async () => {
    mockCartFindUnique.mockResolvedValue({
      items: [
        { quantity: 3, priceAtTime: "75000" },
        { quantity: 2, priceAtTime: "30000" },
      ],
    });

    const result = await calculateCheckoutSummary("cart-id", "express");

    // Verifikasi invariant matematis
    expect(result.total).toBe(result.subtotal + result.tax + result.shippingCost);
  });
});

// ══════════════════════════════════════════════════════════════
// confirmCheckout() — logika transaksi
// ══════════════════════════════════════════════════════════════
describe("confirmCheckout()", () => {
  const cartId = "cart-uuid";
  const userId = "user-uuid";
  const addressId = "address-uuid";

  const mockCartWithItems = {
    items: [
      { productId: "prod-1", quantity: 2, priceAtTime: "100000" },
    ],
  };

  const mockAddress = {
    id: addressId,
    recipientName: "Test User",
    phone: "0812345678",
    address: "Jl. Test No. 1",
    city: "Yogyakarta",
    province: "DIY",
    zipCode: "55000",
  };

  const mockOrderResult = {
    id: "order-uuid",
    orderNumber: "ORD-1234567890",
    total: 225_000,
    items: [],
  };

  beforeEach(() => {
    mockTransaction.mockResolvedValue([]);
  });

  it("✅ berhasil membuat order dan menjalankan transaction", async () => {
    mockCartFindUnique.mockResolvedValue(mockCartWithItems);
    mockAddressFindUnique.mockResolvedValue(mockAddress);
    mockProductFindUnique.mockResolvedValue({ name: "Produk A" });
    mockProductFindMany.mockResolvedValue([
      { id: "prod-1", stock: 10, name: "Produk A" }, // stok cukup
    ]);
    mockOrderCreate.mockResolvedValue(mockOrderResult);

    const order = await confirmCheckout(
      userId, cartId, addressId, "bank_transfer", "regular"
    );

    expect(order.orderNumber).toBe("ORD-1234567890");
    expect(mockOrderCreate).toHaveBeenCalledOnce();
    // Transaction harus dijalankan (untuk update stok + clear cart)
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it("❌ throw 400 jika cart kosong", async () => {
    mockCartFindUnique.mockResolvedValue({ items: [] });

    await expect(
      confirmCheckout(userId, cartId, addressId, "bank_transfer", "regular")
    ).rejects.toMatchObject({ status: 400 });

    expect(mockOrderCreate).not.toHaveBeenCalled();
  });

  it("❌ throw 404 jika alamat tidak ditemukan", async () => {
    mockCartFindUnique.mockResolvedValue(mockCartWithItems);
    mockAddressFindUnique.mockResolvedValue(null); // alamat tidak ada
    mockProductFindUnique.mockResolvedValue({ name: "Produk A" });
    mockProductFindMany.mockResolvedValue([
      { id: "prod-1", stock: 10, name: "Produk A" },
    ]);

    await expect(
      confirmCheckout(userId, cartId, addressId, "bank_transfer", "regular")
    ).rejects.toMatchObject({ status: 404 });

    expect(mockOrderCreate).not.toHaveBeenCalled();
  });

  it("❌ throw 400 jika stok produk tidak cukup", async () => {
    mockCartFindUnique.mockResolvedValue({
      items: [{ productId: "prod-1", quantity: 99, priceAtTime: "100000" }],
    });
    mockAddressFindUnique.mockResolvedValue(mockAddress);
    mockProductFindUnique.mockResolvedValue({ name: "Produk Terbatas" });
    mockProductFindMany.mockResolvedValue([
      { id: "prod-1", stock: 5, name: "Produk Terbatas" }, // stok hanya 5, order 99
    ]);

    await expect(
      confirmCheckout(userId, cartId, addressId, "bank_transfer", "regular")
    ).rejects.toMatchObject({ status: 400 });

    expect(mockOrderCreate).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("❌ throw Error jika payment method tidak valid", async () => {
    mockCartFindUnique.mockResolvedValue(mockCartWithItems);
    mockProductFindUnique.mockResolvedValue({ name: "Produk A" });
    mockProductFindMany.mockResolvedValue([
      { id: "prod-1", stock: 10, name: "Produk A" },
    ]);

    await expect(
      confirmCheckout(userId, cartId, addressId, "INVALID_METHOD", "regular")
    ).rejects.toThrow();

    expect(mockOrderCreate).not.toHaveBeenCalled();
  });

  it("❌ throw Error jika shipping method tidak valid", async () => {
    mockCartFindUnique.mockResolvedValue(mockCartWithItems);
    mockProductFindUnique.mockResolvedValue({ name: "Produk A" });
    mockProductFindMany.mockResolvedValue([
      { id: "prod-1", stock: 10, name: "Produk A" },
    ]);

    await expect(
      confirmCheckout(userId, cartId, addressId, "bank_transfer", "DRONE")
    ).rejects.toThrow();

    expect(mockOrderCreate).not.toHaveBeenCalled();
  });
});
