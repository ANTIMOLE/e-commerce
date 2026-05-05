import { z }                  from "zod";
import { serviceCall }        from "../trpc/errors";
import * as orderService      from "../services/order.service";
import { router, protectedProcedure, adminProcedure } from "../trpc/init";

const orderStatusEnum = z.enum([
  "pending_payment", "confirmed", "processing",
  "shipped", "delivered", "cancelled",
]);

export const orderRouter = router({

  // ── GET /orders ───────────────────────────────────────────
  // REST:  GET /orders?page=&limit=&status=
  // tRPC:  trpc.order.getAll.useQuery(params)
  getAll: protectedProcedure
    .input(
      z.object({
        page:   z.number().int().min(1).default(1),
        limit:  z.number().int().min(1).max(50).default(20),
        status: orderStatusEnum.optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      return serviceCall(() =>
        orderService.getOrders(ctx.userId!, input ?? {})
      );
    }),

  // ── GET /orders/:orderId ──────────────────────────────────
  // REST:  GET /orders/:orderId
  // tRPC:  trpc.order.getById.useQuery({ orderId })
  getById: protectedProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return serviceCall(() =>
        orderService.getOrderById(ctx.userId!, input.orderId)
      );
    }),

  // ── POST /orders/:orderId/cancel ──────────────────────────
  // REST:  POST /orders/:orderId/cancel
  // tRPC:  trpc.order.cancel.useMutation()
  cancel: protectedProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return serviceCall(() =>
        orderService.cancelOrder(ctx.userId!, input.orderId)
      );
    }),

  // ── POST /orders/:orderId/confirm ─────────────────────────
  // REST:  POST /orders/:orderId/confirm
  // tRPC:  trpc.order.confirm.useMutation()
  confirm: protectedProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return serviceCall(() =>
        orderService.confirmOrder(ctx.userId!, input.orderId)
      );
    }),

  // ── POST /orders/:orderId/ship ────────────────────────────
  // REST:  POST /orders/:orderId/ship
  // tRPC:  trpc.order.ship.useMutation()
ship: adminProcedure
  .input(z.object({ orderId: z.string().uuid() }))
  .mutation(async ({ input }) => {
    return serviceCall(() => orderService.shipOrder(input.orderId));
  }),

  // ── POST /orders/:orderId/deliver ─────────────────────────
  // REST:  POST /orders/:orderId/deliver
  // tRPC:  trpc.order.deliver.useMutation()
deliver: adminProcedure
  .input(z.object({ orderId: z.string().uuid() }))
  .mutation(async ({ input }) => {
    return serviceCall(() => orderService.deliverOrder(input.orderId));
  }),
});
