import { z }                  from "zod";
import { router, protectedProcedure } from "../trpc/init";
import { serviceCall }        from "../trpc/errors";
import { addCartItemSchema }  from "@ecommerce/shared";
import * as cartService       from "../services/cart.service";

export const cartRouter = router({

  // ── GET /cart ─────────────────────────────────────────────
  // REST:  GET /cart → getCartController
  // tRPC:  trpc.cart.get.useQuery()
  get: protectedProcedure.query(async ({ ctx }) => {
    return serviceCall(() => cartService.getCartByUserId(ctx.userId!));
  }),

  // ── POST /cart ────────────────────────────────────────────
  // REST:  POST /cart  body: { productId, quantity }
  // tRPC:  trpc.cart.addItem.useMutation()
  addItem: protectedProcedure
    .input(addCartItemSchema)
    .mutation(async ({ input, ctx }) => {
      await serviceCall(() =>
        cartService.addItemToCart(ctx.userId!, input.productId, input.quantity)
      );
      // Return updated cart setelah mutasi (konsisten dengan REST response)
      return serviceCall(() => cartService.getCartByUserId(ctx.userId!));
    }),

  // ── PATCH /cart/:itemId ───────────────────────────────────
  // REST:  PATCH /cart/:itemId  body: { quantity }
  // tRPC:  trpc.cart.updateItem.useMutation()
  updateItem: protectedProcedure
    .input(
      z.object({
        itemId:   z.string().uuid(),
        quantity: z.number().int().min(0).max(99),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await serviceCall(() =>
        cartService.updateCartItem(ctx.userId!, input.itemId, input.quantity)
      );
      return serviceCall(() => cartService.getCartByUserId(ctx.userId!));
    }),

  // ── DELETE /cart/:itemId ──────────────────────────────────
  // REST:  DELETE /cart/:itemId
  // tRPC:  trpc.cart.removeItem.useMutation()
  removeItem: protectedProcedure
    .input(z.object({ itemId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await serviceCall(() =>
        cartService.removeCartItem(ctx.userId!, input.itemId)
      );
      return serviceCall(() => cartService.getCartByUserId(ctx.userId!));
    }),

  // ── DELETE /cart (clear all) ──────────────────────────────
  // REST:  DELETE /cart
  // tRPC:  trpc.cart.clear.useMutation()
  clear: protectedProcedure.mutation(async ({ ctx }) => {
    await serviceCall(() => cartService.clearCart(ctx.userId!));
    return { success: true };
  }),
});
