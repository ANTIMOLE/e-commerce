/**
 * cart.service.test.ts — Whitebox Unit Test (backend-trpc)
 *
 * Letakkan di: backend-trpc/src/__tests__/unit/cart.service.test.ts
 *
 * FIX:
 *  - checked_out cart → CREATE cart baru (bukan update status: active)
 *  - Tambah test: quantity cap, price sync, total quantity guard
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/database", () => ({
  prisma: {
    cart:     { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    cartItem: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    product:  { findUnique: vi.fn() },
  },
}));

vi.mock("../../config/env", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("@ecommerce/shared/generated/prisma", () => ({
  Prisma: {},
}));

import { prisma } from "../../config/database";
import {
  getCartByUserId,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "../../services/cart.service";

const mockCart     = prisma.cart     as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockCartItem = prisma.cartItem as unknown as Record<string, ReturnType<typeof vi.fn>>;
const mockProduct  = prisma.product  as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => { vi.clearAllMocks(); });

// ─── Fixtures ─────────────────────────────────────────────────
const makeProduct = (overrides = {}) => ({
  name: "Sepatu", images: [], categoryId: "cat-1",
  slug: "sepatu", price: 100000, stock: 10,
  discount: 0, description: "ok",
  ...overrides,
});

const makeItem = (overrides = {}) => ({
  id: "item-1", productId: "prod-1", quantity: 2,
  priceAtTime: 100000,
  product: makeProduct(),
  ...overrides,
});

const makeCart = (overrides = {}) => ({
  id: "cart-1", userId: "user-1", status: "active",
  items: [],
  ...overrides,
});

// ══════════════════════════════════════════════════════════════
// getCartByUserId()
// ══════════════════════════════════════════════════════════════
describe("getCartByUserId()", () => {
  it("✅ return cart aktif yang sudah ada", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart());

    const result = await getCartByUserId("user-1");

    expect(result.id).toBe("cart-1");
    expect(mockCart.create).not.toHaveBeenCalled();
    expect(mockCart.update).not.toHaveBeenCalled();
  });

  it("✅ buat cart baru jika user belum punya cart", async () => {
    mockCart.findUnique.mockResolvedValue(null);
    mockCart.create.mockResolvedValue(makeCart());

    await getCartByUserId("user-1");

    expect(mockCart.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: "user-1", status: "active" } })
    );
  });

  it("✅ buat cart BARU jika status checked_out — BUKAN reaktivasi via update", async () => {
    // FIX: service terbaru CREATE cart baru, bukan update status → active
    const checkedOutCart = makeCart({ status: "checked_out" });
    const newCart = makeCart({ id: "cart-2", status: "active" });
    mockCart.findUnique.mockResolvedValue(checkedOutCart);
    mockCart.create.mockResolvedValue(newCart);

    const result = await getCartByUserId("user-1");

    // Harus CREATE — checked_out jadi audit trail yang valid
    expect(mockCart.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: "user-1", status: "active" } })
    );
    expect(result.id).toBe("cart-2");
    // update TIDAK boleh dipanggil untuk reaktivasi
    expect(mockCart.update).not.toHaveBeenCalled();
  });

  it("✅ item dengan stock 0 otomatis dihapus dari cart", async () => {
    const outOfStockItem = makeItem({ product: makeProduct({ stock: 0 }) });
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [outOfStockItem] }));
    mockCart.update.mockResolvedValue(makeCart({ items: [] }));

    await getCartByUserId("user-1");

    expect(mockCart.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: expect.objectContaining({ deleteMany: expect.any(Object) }),
        }),
      })
    );
  });

  it("✅ item quantity > stock di-cap ke nilai stock", async () => {
    const overQtyItem = makeItem({ quantity: 20, product: makeProduct({ stock: 5 }) });
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [overQtyItem] }));
    mockCart.update
      .mockResolvedValueOnce(makeCart({ items: [makeItem({ quantity: 5 })] }))
      .mockResolvedValueOnce(makeCart({ items: [makeItem({ quantity: 5 })] }));

    await getCartByUserId("user-1");

    expect(mockCart.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: expect.objectContaining({ updateMany: expect.any(Array) }),
        }),
      })
    );
  });
});

// ══════════════════════════════════════════════════════════════
// addItemToCart()
// ══════════════════════════════════════════════════════════════
describe("addItemToCart()", () => {
  it("✅ tambah item baru ke cart", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [] }));
    mockProduct.findUnique.mockResolvedValue({
      id: "prod-1", price: 100000, discount: 0, stock: 10,
    });
    mockCartItem.create.mockResolvedValue({});

    await addItemToCart("user-1", "prod-1", 1);

    expect(mockCartItem.create).toHaveBeenCalledOnce();
  });

  it("✅ update quantity jika produk sudah ada di cart", async () => {
    const existingItem = makeItem({ quantity: 2 });
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [existingItem] }));
    mockProduct.findUnique.mockResolvedValue({
      id: "prod-1", price: 100000, discount: 0, stock: 10,
    });
    mockCartItem.update.mockResolvedValue({});

    await addItemToCart("user-1", "prod-1", 3);

    expect(mockCartItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantity: 5 } }) // 2 + 3
    );
    expect(mockCartItem.create).not.toHaveBeenCalled();
  });

  it("❌ throw 404 jika produk tidak ditemukan", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [] }));
    mockProduct.findUnique.mockResolvedValue(null);

    await expect(addItemToCart("user-1", "ghost", 1))
      .rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika stok tidak cukup untuk total quantity", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [] }));
    mockProduct.findUnique.mockResolvedValue({
      id: "prod-1", price: 100000, discount: 0, stock: 2,
    });

    await expect(addItemToCart("user-1", "prod-1", 10))
      .rejects.toMatchObject({ status: 400 });
  });

  it("❌ throw 400 jika total (existing + baru) > stock", async () => {
    const existingItem = makeItem({ quantity: 8 });
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [existingItem] }));
    mockProduct.findUnique.mockResolvedValue({
      id: "prod-1", price: 100000, discount: 0, stock: 10,
    });

    await expect(addItemToCart("user-1", "prod-1", 5)) // 8 + 5 = 13 > 10
      .rejects.toMatchObject({ status: 400 });
  });

  it("✅ harga diskon dihitung benar (price × (1 - discount/100))", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [] }));
    mockProduct.findUnique.mockResolvedValue({
      id: "prod-1", price: 100000, discount: 10, stock: 10,
    });
    mockCartItem.create.mockResolvedValue({});

    await addItemToCart("user-1", "prod-1", 1);

    const createArg = mockCartItem.create.mock.calls[0][0];
    expect(createArg.data.priceAtTime).toBe(90000); // 100000 * 0.9
  });

  it("✅ harga tanpa diskon = price asli", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [] }));
    mockProduct.findUnique.mockResolvedValue({
      id: "prod-1", price: 150000, discount: 0, stock: 10,
    });
    mockCartItem.create.mockResolvedValue({});

    await addItemToCart("user-1", "prod-1", 1);

    const createArg = mockCartItem.create.mock.calls[0][0];
    expect(createArg.data.priceAtTime).toBe(150000);
  });
});

// ══════════════════════════════════════════════════════════════
// updateCartItem()
// ══════════════════════════════════════════════════════════════
describe("updateCartItem()", () => {
  it("✅ update quantity item", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [makeItem()] }));
    mockProduct.findUnique.mockResolvedValue({ stock: 10 });
    mockCartItem.update.mockResolvedValue({});

    await updateCartItem("user-1", "item-1", 5);

    expect(mockCartItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1" }, data: { quantity: 5 } })
    );
  });

  it("✅ hapus item jika quantity = 0 (auto-remove via delete)", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [makeItem()] }));
    mockCartItem.delete.mockResolvedValue({});

    await updateCartItem("user-1", "item-1", 0);

    expect(mockCartItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } });
    expect(mockCartItem.update).not.toHaveBeenCalled();
  });

  it("❌ throw 404 jika item tidak ada di cart", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [] }));

    await expect(updateCartItem("user-1", "ghost-item", 1))
      .rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika stok kurang dari quantity baru", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [makeItem()] }));
    mockProduct.findUnique.mockResolvedValue({ stock: 3 });

    await expect(updateCartItem("user-1", "item-1", 10))
      .rejects.toMatchObject({ status: 400 });
  });
});

// ══════════════════════════════════════════════════════════════
// removeCartItem()
// ══════════════════════════════════════════════════════════════
describe("removeCartItem()", () => {
  it("✅ hapus item dari cart", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [makeItem()] }));
    mockCartItem.delete.mockResolvedValue({});

    await removeCartItem("user-1", "item-1");

    expect(mockCartItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } });
  });

  it("❌ throw 404 jika item tidak ada di cart user", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [] }));

    await expect(removeCartItem("user-1", "ghost-item"))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ══════════════════════════════════════════════════════════════
// clearCart()
// ══════════════════════════════════════════════════════════════
describe("clearCart()", () => {
  it("✅ hapus semua item di cart via deleteMany", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [makeItem()] }));
    mockCartItem.deleteMany.mockResolvedValue({ count: 1 });

    await clearCart("user-1");

    expect(mockCartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: "cart-1" } });
  });

  it("✅ cart kosong — deleteMany tetap dipanggil", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [] }));
    mockCartItem.deleteMany.mockResolvedValue({ count: 0 });

    await clearCart("user-1");

    expect(mockCartItem.deleteMany).toHaveBeenCalledOnce();
  });
});
