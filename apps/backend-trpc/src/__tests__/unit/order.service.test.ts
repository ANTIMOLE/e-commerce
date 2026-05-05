/**
 * order.service.test.ts — Whitebox Unit Test (backend-trpc)
 *
 * Letakkan di: backend-trpc/src/__tests__/unit/order.service.test.ts
 *
 * Menguji: getOrders, getOrderById, cancelOrder, confirmOrder,
 *          shipOrder, deliverOrder
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
/**
 * COVERAGE NOTE (D-03):
 * Unit test ini menguji logika state-machine service (business rules, status transitions)
 * secara terisolasi dengan semua dependency di-mock.
 * Guard admin untuk ship/deliver ada di ROUTER layer (order.router.ts → adminProcedure),
 * bukan di service layer — ini by design.
 * Coverage guard admin secara end-to-end ada di: api-tests/src/trpc.test.ts section 08.
 */
// ─── MOCK ─────────────────────────────────────────────────────

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

// ─── Import setelah mock ──────────────────────────────────────
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
const fakeOrder = (status = "pending_payment") => ({
  id: "order-1", orderNumber: "ORD-123", userId: "user-1",
  status, total: 455000, createdAt: new Date(), items: [],
});

// ══════════════════════════════════════════════════════════════
// getOrders()
// ══════════════════════════════════════════════════════════════
describe("getOrders()", () => {
  it("✅ return list order dengan total", async () => {
    mockOrder.count.mockResolvedValue(3);
    mockOrder.findMany.mockResolvedValue([fakeOrder()]);

    const result = await getOrders("user-1", {});

    expect(result.orders).toHaveLength(1);
    expect(result.total).toBe(3);
  });

  it("✅ filter by status jika diberikan", async () => {
    mockOrder.count.mockResolvedValue(1);
    mockOrder.findMany.mockResolvedValue([fakeOrder("shipped")]);

    await getOrders("user-1", { status: "shipped" });

    const whereArg = mockOrder.findMany.mock.calls[0][0].where;
    expect(whereArg).toMatchObject({ userId: "user-1", status: "shipped" });
  });

  it("✅ tidak ada filter status jika tidak diberikan", async () => {
    mockOrder.count.mockResolvedValue(2);
    mockOrder.findMany.mockResolvedValue([]);

    await getOrders("user-1", {});

    const whereArg = mockOrder.findMany.mock.calls[0][0].where;
    expect(whereArg).not.toHaveProperty("status");
  });

  it("✅ pagination: skip = (page-1)*limit", async () => {
    mockOrder.count.mockResolvedValue(50);
    mockOrder.findMany.mockResolvedValue([]);

    await getOrders("user-1", { page: 3, limit: 10 });

    const findArg = mockOrder.findMany.mock.calls[0][0];
    expect(findArg.skip).toBe(20);
    expect(findArg.take).toBe(10);
  });

  it("✅ hanya mengambil order milik userId yang benar", async () => {
    mockOrder.count.mockResolvedValue(0);
    mockOrder.findMany.mockResolvedValue([]);

    await getOrders("user-1", {});

    expect(mockOrder.findMany.mock.calls[0][0].where).toMatchObject({ userId: "user-1" });
  });
});

// ══════════════════════════════════════════════════════════════
// getOrderById()
// ══════════════════════════════════════════════════════════════
describe("getOrderById()", () => {
  it("✅ return detail order", async () => {
    mockOrder.findFirst.mockResolvedValue(fakeOrder());

    const result = await getOrderById("user-1", "order-1");

    expect(result).toMatchObject({ id: "order-1" });
    expect(mockOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "order-1", userId: "user-1" } })
    );
  });

  it("❌ throw 404 jika order tidak ditemukan / bukan milik user", async () => {
    mockOrder.findFirst.mockResolvedValue(null);

    await expect(getOrderById("user-1", "ghost-order")).rejects.toMatchObject({
      status: 404,
      message: "Order tidak ditemukan.",
    });
  });
});

// ══════════════════════════════════════════════════════════════
// cancelOrder()
// ══════════════════════════════════════════════════════════════
describe("cancelOrder()", () => {
  it("✅ berhasil batalkan order pending_payment", async () => {
    mockOrder.findFirst.mockResolvedValue({ id: "order-1", status: "pending_payment" });
    mockOrder.update.mockResolvedValue({});

    const result = await cancelOrder("user-1", "order-1");

    expect(result.message).toBe("Order dibatalkan.");
    expect(mockOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "cancelled" } })
    );
  });

  it("❌ throw 404 jika order tidak ditemukan", async () => {
    mockOrder.findFirst.mockResolvedValue(null);

    await expect(cancelOrder("user-1", "ghost")).rejects.toMatchObject({ status: 404 });
    expect(mockOrder.update).not.toHaveBeenCalled();
  });

  it("❌ throw 400 jika order sudah bukan pending_payment", async () => {
    mockOrder.findFirst.mockResolvedValue({ id: "order-1", status: "processing" });

    await expect(cancelOrder("user-1", "order-1")).rejects.toMatchObject({
      status:  400,
      message: "Order tidak bisa dibatalkan.",
    });
  });
});

// ══════════════════════════════════════════════════════════════
// confirmOrder()
// ══════════════════════════════════════════════════════════════
describe("confirmOrder()", () => {
  it("✅ berhasil konfirmasi order dan status jadi confirmed", async () => {
    mockOrder.findFirst.mockResolvedValue({ id: "order-1", status: "pending_payment" });
    mockOrder.update.mockResolvedValue({});

    const result = await confirmOrder("user-1", "order-1");

    expect(result.message).toBe("Order dikonfirmasi.");
    // Dipanggil 2x: processing → confirmed
    expect(mockOrder.update).toHaveBeenCalledTimes(2);
  });

  it("❌ throw 404 jika order tidak ditemukan", async () => {
    mockOrder.findFirst.mockResolvedValue(null);

    await expect(confirmOrder("user-1", "ghost")).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika order bukan pending_payment", async () => {
    mockOrder.findFirst.mockResolvedValue({ id: "order-1", status: "shipped" });

    await expect(confirmOrder("user-1", "order-1")).rejects.toMatchObject({
      status:  400,
      message: "Order tidak bisa dikonfirmasi.",
    });
  });
});

// ══════════════════════════════════════════════════════════════
// shipOrder()
// ══════════════════════════════════════════════════════════════
describe("shipOrder()", () => {
  it("✅ berhasil ubah status ke shipped dari confirmed", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "confirmed" });
    mockOrder.update.mockResolvedValue({});

    const result = await shipOrder("order-1");

    expect(result.message).toBe("Order dikirim.");
    expect(mockOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "shipped" } })
    );
  });

  it("❌ throw 404 jika order tidak ditemukan", async () => {
    mockOrder.findUnique.mockResolvedValue(null);

    await expect(shipOrder("ghost")).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika status bukan confirmed", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "pending_payment" });

    await expect(shipOrder("order-1")).rejects.toMatchObject({
      status:  400,
      message: "Order tidak bisa dikirim.",
    });
  });
});

// ══════════════════════════════════════════════════════════════
// deliverOrder()
// ══════════════════════════════════════════════════════════════
describe("deliverOrder()", () => {
  it("✅ berhasil ubah status ke delivered dari shipped", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "shipped" });
    mockOrder.update.mockResolvedValue({});

    const result = await deliverOrder("order-1");

    expect(result.message).toBe("Order delivered.");
    expect(mockOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "delivered" } })
    );
  });

  it("❌ throw 404 jika order tidak ditemukan", async () => {
    mockOrder.findUnique.mockResolvedValue(null);

    await expect(deliverOrder("ghost")).rejects.toMatchObject({ status: 404 });
  });

  it("❌ throw 400 jika status bukan shipped", async () => {
    mockOrder.findUnique.mockResolvedValue({ id: "order-1", status: "confirmed" });

    await expect(deliverOrder("order-1")).rejects.toMatchObject({ status: 400 });
  });
});
