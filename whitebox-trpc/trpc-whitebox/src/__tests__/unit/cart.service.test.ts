/**
 * cart.service.test.ts — Whitebox Unit Test (backend-trpc)
 *
 * Letakkan di: backend-trpc/src/__tests__/unit/cart.service.test.ts
 *
 * Menguji: getCartByUserId, addItemToCart, updateCartItem,
 *          removeCartItem, clearCart
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── MOCK ─────────────────────────────────────────────────────

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

// Prisma type-only import — mock supaya tidak crash
vi.mock("@ecommerce/shared/generated/prisma", () => ({
  Prisma: {},
}));

// ─── Import setelah mock ──────────────────────────────────────
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
const makeCart = (overrides = {}) => ({
  id: "cart-1", userId: "user-1", status: "active",
  items: [],
  ...overrides,
});

const makeItem = (overrides = {}) => ({
  id: "item-1", productId: "prod-1", quantity: 2,
  priceAtTime: 100000,
  product: {
    name: "Sepatu", images: [], categoryId: "cat-1",
    slug: "sepatu", price: 100000, stock: 10,
    discount: 0, description: "ok",
  },
  ...overrides,
});

// ══════════════════════════════════════════════════════════════
// getCartByUserId()
// ══════════════════════════════════════════════════════════════
describe("getCartByUserId()", () => {
  it("✅ return cart aktif yang sudah ada", async () => {
    const cart = makeCart({ items: [] });
    mockCart.findUnique.mockResolvedValue(cart);

    const result = await getCartByUserId("user-1");

    expect(result.id).toBe("cart-1");
    expect(mockCart.create).not.toHaveBeenCalled();
  });

  it("✅ buat cart baru jika user belum punya cart", async () => {
    mockCart.findUnique.mockResolvedValue(null);
    mockCart.create.mockResolvedValue(makeCart());

    await getCartByUserId("user-1");

    expect(mockCart.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: "user-1", status: "active" } })
    );
  });

  it("✅ reaktivasi cart jika status bukan active", async () => {
    const inactiveCart = makeCart({ status: "checked_out" });
    mockCart.findUnique.mockResolvedValue(inactiveCart);
    mockCart.update.mockResolvedValue(makeCart({ status: "active" }));

    await getCartByUserId("user-1");

    expect(mockCart.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "active" } })
    );
  });

  it("✅ item dengan stock 0 otomatis dihapus dari cart", async () => {
    const outOfStockItem = makeItem({ product: { ...makeItem().product, stock: 0 } });
    const cart = makeCart({ items: [outOfStockItem] });
    mockCart.findUnique.mockResolvedValue(cart);
    mockCart.update.mockResolvedValue(makeCart({ items: [] }));

    await getCartByUserId("user-1");

    // update pertama = hapus item out of stock
    expect(mockCart.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: expect.objectContaining({ deleteMany: expect.any(Object) }),
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

    await expect(addItemToCart("user-1", "ghost", 1)).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika stok tidak cukup", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [] }));
    mockProduct.findUnique.mockResolvedValue({
      id: "prod-1", price: 100000, discount: 0, stock: 2,
    });

    await expect(addItemToCart("user-1", "prod-1", 10)).rejects.toMatchObject({ status: 400 });
  });

  it("✅ harga diskon dihitung dengan benar saat tambah item", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [] }));
    mockProduct.findUnique.mockResolvedValue({
      id: "prod-1", price: 100000, discount: 10, stock: 10,
    });
    mockCartItem.create.mockResolvedValue({});

    await addItemToCart("user-1", "prod-1", 1);

    const createArg = mockCartItem.create.mock.calls[0][0];
    // 100000 * (1 - 10/100) = 90000
    expect(createArg.data.priceAtTime).toBe(90000);
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

  it("✅ hapus item jika quantity = 0", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [makeItem()] }));
    mockCartItem.delete.mockResolvedValue({});

    await updateCartItem("user-1", "item-1", 0);

    expect(mockCartItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } });
    expect(mockCartItem.update).not.toHaveBeenCalled();
  });

  it("❌ throw 404 jika item tidak ada di cart", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [] }));

    await expect(updateCartItem("user-1", "ghost-item", 1)).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika stok kurang dari quantity baru", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [makeItem()] }));
    mockProduct.findUnique.mockResolvedValue({ stock: 3 });

    await expect(updateCartItem("user-1", "item-1", 10)).rejects.toMatchObject({ status: 400 });
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

    await expect(removeCartItem("user-1", "ghost-item")).rejects.toMatchObject({ status: 404 });
  });
});

// ══════════════════════════════════════════════════════════════
// clearCart()
// ══════════════════════════════════════════════════════════════
describe("clearCart()", () => {
  it("✅ hapus semua item di cart", async () => {
    mockCart.findUnique.mockResolvedValue(makeCart({ items: [makeItem()] }));
    mockCartItem.deleteMany.mockResolvedValue({ count: 1 });

    await clearCart("user-1");

    expect(mockCartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: "cart-1" } });
  });
});
