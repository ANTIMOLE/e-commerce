/**
 * order.service.test.ts — Whitebox Unit Test (backend-rest)
 *
 * Letakkan di: backend-rest/src/__tests__/unit/order.service.test.ts
 *
 * Menguji: getOrders, getOrderById, cancelOrder, confirmOrder,
 *          shipOrder, deliverOrder
 *
 * State machine yang dikunci:
 *  - cancel   : hanya pending_payment → cancelled
 *  - confirm  : hanya pending_payment → processing → confirmed
 *  - ship     : hanya confirmed → shipped
 *  - deliver  : hanya shipped  → delivered
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/database", () => ({
  prisma: {
    order: {
      count:      vi.fn(),
      findMany:   vi.fn(),
      findFirst:  vi.fn(),
      findUnique: vi.fn(),
      update:     vi.fn(),
    },
  },
}));

vi.mock("../../config/env", () => ({
  env: { NODE_ENV: "test" },
}));

import { prisma } from "../../config/database";
import {
  getOrders,
  getOrderById,
  cancelOrder,
  confirmOrder,
  shipOrder,
  deliverOrder,
} from "../../services/order.service";

const mockOrder = prisma.order as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => { vi.clearAllMocks(); });

// ─── Fixtures ─────────────────────────────────────────────────
const makeOrder = (status = "pending_payment", overrides = {}) => ({
  id: "order-1", orderNumber: "ORD-123", status,
  total: 150_000, subtotal: 100_000, tax: 11_000, shippingCost: 15_000,
  createdAt: new Date(), updatedAt: new Date(),
  items: [],
  ...overrides,
});

// ══════════════════════════════════════════════════════════════
// getOrders()
// ══════════════════════════════════════════════════════════════
describe("getOrders()", () => {
  it("✅ return list order + total milik user", async () => {
    mockOrder.count.mockResolvedValue(2);
    mockOrder.findMany.mockResolvedValue([makeOrder(), makeOrder("confirmed")]);

    const result = await getOrders("user-1", { page: 1, limit: 20 });

    expect(result.orders).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(mockOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    );
  });

  it("✅ filter by status bekerja", async () => {
    mockOrder.count.mockResolvedValue(1);
    mockOrder.findMany.mockResolvedValue([makeOrder("pending_payment")]);

    await getOrders("user-1", { page: 1, limit: 20, status: "pending_payment" });

    expect(mockOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "pending_payment" }),
      })
    );
  });

  it("✅ pagination — skip dan take dihitung dari page & limit", async () => {
    mockOrder.count.mockResolvedValue(50);
    mockOrder.findMany.mockResolvedValue([]);

    await getOrders("user-1", { page: 3, limit: 10 });

    expect(mockOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });

  it("✅ return array kosong jika tidak ada order", async () => {
    mockOrder.count.mockResolvedValue(0);
    mockOrder.findMany.mockResolvedValue([]);

    const result = await getOrders("user-1", {});

    expect(result.orders).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// getOrderById()
// ══════════════════════════════════════════════════════════════
describe("getOrderById()", () => {
  it("✅ return detail order milik user", async () => {
    mockOrder.findFirst.mockResolvedValue(makeOrder());

    const result = await getOrderById("user-1", "order-1");

    expect(result.id).toBe("order-1");
    expect(mockOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "order-1", userId: "user-1" } })
    );
  });

  it("❌ throw 404 jika order tidak ditemukan atau bukan milik user", async () => {
    mockOrder.findFirst.mockResolvedValue(null);

    await expect(getOrderById("user-1", "ghost-order"))
      .rejects.toMatchObject({ status: 404 });
  });
});

// ══════════════════════════════════════════════════════════════
// cancelOrder()
// ══════════════════════════════════════════════════════════════
describe("cancelOrder()", () => {
  it("✅ berhasil cancel order yang pending_payment", async () => {
    mockOrder.findFirst.mockResolvedValue(makeOrder("pending_payment"));
    mockOrder.update.mockResolvedValue(makeOrder("cancelled"));

    const result = await cancelOrder("user-1", "order-1");

    expect(mockOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "cancelled" } })
    );
    expect(result.message).toBe("Order dibatalkan.");
  });

  it("❌ throw 404 jika order tidak ditemukan", async () => {
    mockOrder.findFirst.mockResolvedValue(null);

    await expect(cancelOrder("user-1", "ghost"))
      .rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika status bukan pending_payment (e.g. confirmed)", async () => {
    mockOrder.findFirst.mockResolvedValue(makeOrder("confirmed"));

    await expect(cancelOrder("user-1", "order-1"))
      .rejects.toMatchObject({ status: 400 });

    expect(mockOrder.update).not.toHaveBeenCalled();
  });

  it("❌ throw 400 jika status shipped — tidak bisa dibatalkan", async () => {
    mockOrder.findFirst.mockResolvedValue(makeOrder("shipped"));

    await expect(cancelOrder("user-1", "order-1"))
      .rejects.toMatchObject({ status: 400 });
  });
});

// ══════════════════════════════════════════════════════════════
// confirmOrder()
// ══════════════════════════════════════════════════════════════
describe("confirmOrder()", () => {
  it("✅ berhasil konfirmasi order — status akhir confirmed", async () => {
    mockOrder.findFirst.mockResolvedValue(makeOrder("pending_payment"));
    // Service memanggil update 2x: → processing → confirmed
    mockOrder.update
      .mockResolvedValueOnce(makeOrder("processing"))
      .mockResolvedValueOnce(makeOrder("confirmed"));

    const result = await confirmOrder("user-1", "order-1");

    expect(mockOrder.update).toHaveBeenCalledTimes(2);
    expect(result.message).toBe("Order dikonfirmasi.");
  });

  it("❌ throw 404 jika order tidak ditemukan", async () => {
    mockOrder.findFirst.mockResolvedValue(null);

    await expect(confirmOrder("user-1", "ghost"))
      .rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika status bukan pending_payment", async () => {
    mockOrder.findFirst.mockResolvedValue(makeOrder("confirmed"));

    await expect(confirmOrder("user-1", "order-1"))
      .rejects.toMatchObject({ status: 400 });

    expect(mockOrder.update).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// shipOrder()
// ══════════════════════════════════════════════════════════════
describe("shipOrder()", () => {
  it("✅ berhasil ship order yang confirmed → shipped", async () => {
    mockOrder.findUnique.mockResolvedValue(makeOrder("confirmed"));
    mockOrder.update.mockResolvedValue(makeOrder("shipped"));

    const result = await shipOrder("order-1");

    expect(mockOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "shipped" } })
    );
    expect(result.message).toBe("Order dikirim.");
  });

  it("❌ throw 404 jika order tidak ditemukan", async () => {
    mockOrder.findUnique.mockResolvedValue(null);

    await expect(shipOrder("ghost")).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika status bukan confirmed (e.g. pending_payment)", async () => {
    mockOrder.findUnique.mockResolvedValue(makeOrder("pending_payment"));

    await expect(shipOrder("order-1")).rejects.toMatchObject({ status: 400 });

    expect(mockOrder.update).not.toHaveBeenCalled();
  });

  it("❌ throw 400 jika status sudah shipped (tidak bisa ship ulang)", async () => {
    mockOrder.findUnique.mockResolvedValue(makeOrder("shipped"));

    await expect(shipOrder("order-1")).rejects.toMatchObject({ status: 400 });
  });
});

// ══════════════════════════════════════════════════════════════
// deliverOrder()
// ══════════════════════════════════════════════════════════════
describe("deliverOrder()", () => {
  it("✅ berhasil deliver order yang shipped → delivered", async () => {
    mockOrder.findUnique.mockResolvedValue(makeOrder("shipped"));
    mockOrder.update.mockResolvedValue(makeOrder("delivered"));

    const result = await deliverOrder("order-1");

    expect(mockOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "delivered" } })
    );
    expect(result.message).toBe("Order delivered.");
  });

  it("❌ throw 404 jika order tidak ditemukan", async () => {
    mockOrder.findUnique.mockResolvedValue(null);

    await expect(deliverOrder("ghost")).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika status bukan shipped (e.g. confirmed)", async () => {
    mockOrder.findUnique.mockResolvedValue(makeOrder("confirmed"));

    await expect(deliverOrder("order-1")).rejects.toMatchObject({ status: 400 });

    expect(mockOrder.update).not.toHaveBeenCalled();
  });

  it("❌ throw 400 jika status sudah delivered", async () => {
    mockOrder.findUnique.mockResolvedValue(makeOrder("delivered"));

    await expect(deliverOrder("order-1")).rejects.toMatchObject({ status: 400 });
  });
});
