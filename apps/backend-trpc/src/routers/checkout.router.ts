import { z }                  from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc/init";
import { serviceCall }        from "../trpc/errors";
import { checkoutConfirmSchema } from "@ecommerce/shared";
import * as checkoutService   from "../services/checkout.service";

export const checkoutRouter = router({

  // ── POST /checkout/calculate-summary ─────────────────────
  // REST:  POST /checkout/calculate-summary body: { cartId, shippingMethod }
  // tRPC:  trpc.checkout.calculateSummary.useMutation()
  calculateSummary: protectedProcedure
    .input(
      z.object({
        cartId:         z.string().uuid(),
        shippingMethod: z.enum(["regular", "express"]),
      })
    )
    .mutation(async ({ input }) => {
      return serviceCall(() =>
        checkoutService.calculateCheckoutSummary(input.cartId, input.shippingMethod)
      );
    }),

  // ── POST /checkout/confirm ────────────────────────────────
  // REST:  POST /checkout/confirm body: checkoutConfirmSchema
  // tRPC:  trpc.checkout.confirm.useMutation()
  confirm: protectedProcedure
    .input(checkoutConfirmSchema)
    .mutation(async ({ input, ctx }) => {
      return serviceCall(() =>
        checkoutService.confirmCheckout(
          ctx.userId!,
          input.cartId,
          input.addressId,
          input.paymentMethod,
          input.shippingMethod
        )
      );
    }),

  // ── GET /checkout/summary/:orderNumber ───────────────────
  // REST:  GET /checkout/summary/:orderNumber
  // tRPC:  trpc.checkout.getSummary.useQuery({ orderNumber })
  getSummary: protectedProcedure
    .input(z.object({ orderNumber: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      return serviceCall(() =>
        checkoutService.getCheckoutSummary(ctx.userId!, input.orderNumber)
      );
    }),
});
