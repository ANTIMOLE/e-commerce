/**
 * checkout.service.test.ts — Whitebox Unit Test (backend-rest)
 *
 * Letakkan di: backend-rest/src/__tests__/unit/checkout.service.test.ts
 *
 * FIX:
 *  - calculateCheckoutSummary sekarang 3 argumen (userId, cartId, shippingMethod)
 *    dan memverifikasi kepemilikan cart via cart.userId
 *  - confirmCheckout memakai CALLBACK $transaction — mock harus execute callback
 *    dengan tx object, bukan mockResolvedValue biasa
 *  - Tax 11%, express 35.000 (match service terbaru)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── MOCK: harus sebelum import ──────────────────────────────
vi.mock("../../config/database", () => ({
  prisma: {
    cart:     { findUnique: vi.fn(), update: vi.fn() },
    order:    { create: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    address:  { findUnique: vi.fn() },
    product:  { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../config/env", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("@ecommerce/shared/generated/prisma", () => ({
  PaymentMethod:  { bank_transfer: "bank_transfer", qris: "qris", cod: "cod" },
  ShippingMethod: { regular: "regular", express: "express" },
}));

import { prisma } from "../../config/database";
import {
  calculateCheckoutSummary,
  confirmCheckout,
} from "../../services/checkout.service";

// ─── Typed helpers ────────────────────────────────────────────
const mockCartFU        = (prisma.cart    as any).findUnique  as ReturnType<typeof vi.fn>;
const mockAddressFU     = (prisma.address as any).findUnique  as ReturnType<typeof vi.fn>;
const mockTransaction   = (prisma         as any).$transaction as ReturnType<typeof vi.fn>;

// ── Tx-level mocks (persistent, dipakai oleh callback $transaction) ───
// clearAllMocks() akan clear .mock.calls tapi TIDAK reset mockImplementation,
// sehingga $transaction tetap mengeksekusi callback setiap test.
const txCartFU    = vi.fn();   // tx.cart.findUnique
const txCartU     = vi.fn();   // tx.cart.update
const txProdFM    = vi.fn();   // tx.product.findMany
const txProdU     = vi.fn();   // tx.product.update (per-item via Promise.all)
const txOrdC      = vi.fn();   // tx.order.create
const txCIDelM    = vi.fn();   // tx.cartItem.deleteMany

// Setup $transaction callback executor — SEKALI, sebelum beforeEach
mockTransaction.mockImplementation(async (cb: Function) =>
  cb({
    cart:     { findUnique: txCartFU, update: txCartU },
    product:  { findMany: txProdFM,   update: txProdU },
    order:    { create: txOrdC },
    cartItem: { deleteMany: txCIDelM },
  })
);

beforeEach(() => {
  vi.clearAllMocks();
  // Re-setup $transaction setelah clearAllMocks (tidak reset impl, tapi aman untuk di-re-set)
  mockTransaction.mockImplementation(async (cb: Function) =>
    cb({
      cart:     { findUnique: txCartFU, update: txCartU },
      product:  { findMany: txProdFM,   update: txProdU },
      order:    { create: txOrdC },
      cartItem: { deleteMany: txCIDelM },
    })
  );
});

// ─── Fixtures ─────────────────────────────────────────────────
const USER_ID    = "user-uuid";
const CART_ID    = "cart-uuid";
const ADDRESS_ID = "address-uuid";

const mockAddress = {
  id: ADDRESS_ID, userId: USER_ID,
  recipientName: "Test User", phone: "0812345678",
  address: "Jl. Test No. 1", city: "Yogyakarta",
  province: "DIY", zipCode: "55000",
};

const mockOrderResult = {
  id: "order-uuid",
  orderNumber: "ORD-1234567890",
  total: 225_000,
  items: [],
};

// ══════════════════════════════════════════════════════════════
// calculateCheckoutSummary(userId, cartId, shippingMethod)
// ══════════════════════════════════════════════════════════════
describe("calculateCheckoutSummary()", () => {
  it("✅ menghitung subtotal, tax 11%, dan shipping regular (15.000)", async () => {
    mockCartFU.mockResolvedValue({
      userId: USER_ID,
      items: [
        { quantity: 2, priceAtTime: "100000" }, // 200.000
        { quantity: 1, priceAtTime: "50000"  }, //  50.000
      ],
    });

    const result = await calculateCheckoutSummary(USER_ID, CART_ID, "regular");

    expect(result.subtotal).toBe(250_000);
    expect(result.tax).toBe(27_500);           // 11% × 250.000
    expect(result.shippingCost).toBe(15_000);
    expect(result.total).toBe(292_500);        // 250.000 + 27.500 + 15.000
  });

  it("✅ tax 11% — bukan 10%", async () => {
    mockCartFU.mockResolvedValue({
      userId: USER_ID,
      items: [{ quantity: 1, priceAtTime: "100000" }],
    });

    const result = await calculateCheckoutSummary(USER_ID, CART_ID, "regular");

    expect(result.tax).toBe(11_000);           // 11%, BUKAN 10.000
    expect(result.total).toBe(126_000);        // 100.000 + 11.000 + 15.000
  });

  it("✅ express shipping = 35.000 (bukan 25.000)", async () => {
    mockCartFU.mockResolvedValue({
      userId: USER_ID,
      items: [{ quantity: 1, priceAtTime: "100000" }],
    });

    const result = await calculateCheckoutSummary(USER_ID, CART_ID, "express");

    expect(result.shippingCost).toBe(35_000);
    expect(result.total).toBe(146_000);        // 100.000 + 11.000 + 35.000
  });

  it("✅ cart kosong → subtotal 0, total hanya ongkir", async () => {
    mockCartFU.mockResolvedValue({ userId: USER_ID, items: [] });

    const result = await calculateCheckoutSummary(USER_ID, CART_ID, "regular");

    expect(result.subtotal).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(15_000);
  });

  it("🔢 invariant: total = subtotal + tax + shippingCost selalu berlaku", async () => {
    mockCartFU.mockResolvedValue({
      userId: USER_ID,
      items: [
        { quantity: 3, priceAtTime: "75000" },
        { quantity: 2, priceAtTime: "30000" },
      ],
    });

    const result = await calculateCheckoutSummary(USER_ID, CART_ID, "express");

    expect(result.total).toBe(result.subtotal + result.tax + result.shippingCost);
  });

  it("❌ throw 404 jika cart tidak ditemukan", async () => {
    mockCartFU.mockResolvedValue(null);

    await expect(
      calculateCheckoutSummary(USER_ID, CART_ID, "regular")
    ).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 404 jika cart bukan milik userId (ownership check)", async () => {
    mockCartFU.mockResolvedValue({
      userId: "other-user-uuid", // bukan USER_ID
      items: [{ quantity: 1, priceAtTime: "100000" }],
    });

    await expect(
      calculateCheckoutSummary(USER_ID, CART_ID, "regular")
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ══════════════════════════════════════════════════════════════
// confirmCheckout(userId, cartId, addressId, paymentMethod, shippingMethod)
// ══════════════════════════════════════════════════════════════
describe("confirmCheckout()", () => {
  const cartWithItems = {
    userId: USER_ID,
    items: [{ productId: "prod-1", quantity: 2, priceAtTime: "100000" }],
  };

  const productsWithStock = [
    { id: "prod-1", stock: 10, name: "Produk A" },
  ];

  function setupHappyPath() {
    mockAddressFU.mockResolvedValue(mockAddress);
    txCartFU.mockResolvedValue(cartWithItems);
    txProdFM.mockResolvedValue(productsWithStock);
    txOrdC.mockResolvedValue(mockOrderResult);
    txProdU.mockResolvedValue({});
    txCIDelM.mockResolvedValue({ count: 1 });
    txCartU.mockResolvedValue({});
  }

  it("✅ berhasil membuat order — transaction dieksekusi sebagai callback", async () => {
    setupHappyPath();

    const order = await confirmCheckout(USER_ID, CART_ID, ADDRESS_ID, "bank_transfer", "regular");

    expect(order.orderNumber).toBe("ORD-1234567890");
    // address dicek sebelum tx
    expect(mockAddressFU).toHaveBeenCalledWith({ where: { id: ADDRESS_ID } });
    // tx harus dipanggil (sebagai callback, bukan value)
    expect(mockTransaction).toHaveBeenCalledOnce();
    // order dibuat di dalam tx
    expect(txOrdC).toHaveBeenCalledOnce();
    // stok dikurangi di dalam tx
    expect(txProdU).toHaveBeenCalled();
    // cart items dibersihkan
    expect(txCIDelM).toHaveBeenCalledWith({ where: { cartId: CART_ID } });
  });

  it("❌ throw 404 jika address tidak ditemukan", async () => {
    mockAddressFU.mockResolvedValue(null); // tidak ada

    await expect(
      confirmCheckout(USER_ID, CART_ID, ADDRESS_ID, "bank_transfer", "regular")
    ).rejects.toMatchObject({ status: 404 });

    // tx tidak boleh dipanggil kalau address gagal
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("❌ throw 404 jika address milik user lain (ownership check)", async () => {
    mockAddressFU.mockResolvedValue({ ...mockAddress, userId: "other-user" });

    await expect(
      confirmCheckout(USER_ID, CART_ID, ADDRESS_ID, "bank_transfer", "regular")
    ).rejects.toMatchObject({ status: 404 });

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("❌ throw 400 jika cart kosong (dicek di dalam tx)", async () => {
    mockAddressFU.mockResolvedValue(mockAddress);
    txCartFU.mockResolvedValue({ userId: USER_ID, items: [] });

    await expect(
      confirmCheckout(USER_ID, CART_ID, ADDRESS_ID, "bank_transfer", "regular")
    ).rejects.toMatchObject({ status: 400 });

    expect(txOrdC).not.toHaveBeenCalled();
  });

  it("❌ throw 404 jika cart di dalam tx bukan milik userId", async () => {
    mockAddressFU.mockResolvedValue(mockAddress);
    txCartFU.mockResolvedValue({ userId: "other-user", items: [{ productId: "p", quantity: 1, priceAtTime: "1000" }] });

    await expect(
      confirmCheckout(USER_ID, CART_ID, ADDRESS_ID, "bank_transfer", "regular")
    ).rejects.toMatchObject({ status: 404 });

    expect(txOrdC).not.toHaveBeenCalled();
  });

  it("❌ throw 400 jika stok produk tidak cukup", async () => {
    mockAddressFU.mockResolvedValue(mockAddress);
    txCartFU.mockResolvedValue({
      userId: USER_ID,
      items: [{ productId: "prod-1", quantity: 99, priceAtTime: "100000" }],
    });
    txProdFM.mockResolvedValue([
      { id: "prod-1", stock: 5, name: "Produk Terbatas" }, // butuh 99, ada 5
    ]);

    await expect(
      confirmCheckout(USER_ID, CART_ID, ADDRESS_ID, "bank_transfer", "regular")
    ).rejects.toMatchObject({ status: 400 });

    expect(txOrdC).not.toHaveBeenCalled();
  });

  it("❌ throw jika paymentMethod tidak valid (sebelum address check)", async () => {
    await expect(
      confirmCheckout(USER_ID, CART_ID, ADDRESS_ID, "BITCOIN", "regular")
    ).rejects.toThrow();

    expect(mockAddressFU).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("❌ throw jika shippingMethod tidak valid", async () => {
    await expect(
      confirmCheckout(USER_ID, CART_ID, ADDRESS_ID, "bank_transfer", "DRONE")
    ).rejects.toThrow();

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("✅ tax 11% dan shipping regular 15.000 dihitung benar di dalam tx", async () => {
    setupHappyPath();
    // Capture data yang dikirim ke order.create
    txOrdC.mockImplementation(async ({ data }: any) => ({
      id: "order-uuid",
      orderNumber: "ORD-TEST",
      ...data,
      items: [],
    }));

    await confirmCheckout(USER_ID, CART_ID, ADDRESS_ID, "bank_transfer", "regular");

    const createData = txOrdC.mock.calls[0][0].data;
    // cart: 2 × 100.000 = 200.000 subtotal
    expect(Number(createData.subtotal)).toBe(200_000);
    expect(Number(createData.tax)).toBeCloseTo(22_000, 0);   // 11%
    expect(Number(createData.shippingCost)).toBe(15_000);
    expect(Number(createData.total)).toBeCloseTo(237_000, 0);
  });
});
