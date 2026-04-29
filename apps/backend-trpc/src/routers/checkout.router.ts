import { z }                  from "zod";
import { router, protectedProcedure } from "../trpc/init";
import { serviceCall }        from "../trpc/errors";
import { checkoutConfirmSchema } from "@ecommerce/shared";
import * as checkoutService   from "../services/checkout.service";

export const checkoutRouter = router({

  // FIX [Critical]: pass ctx.userId ke service supaya kepemilikan cart diverifikasi
  calculateSummary: protectedProcedure
    .input(
      z.object({
        cartId:         z.string().uuid(),
        shippingMethod: z.enum(["regular", "express"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return serviceCall(() =>
        checkoutService.calculateCheckoutSummary(ctx.userId!, input.cartId, input.shippingMethod)
      );
    }),

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

  getSummary: protectedProcedure
    .input(z.object({ orderNumber: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      return serviceCall(() =>
        checkoutService.getCheckoutSummary(ctx.userId!, input.orderNumber)
      );
    }),
});
