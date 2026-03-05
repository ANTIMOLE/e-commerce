import { z } from "zod";

export const addCartItemSchema = z.object({
  productId: z.string().uuid("ID produk tidak valid"),
  quantity:  z.number().int().min(1, "Quantity minimal 1").max(99),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, "Quantity minimal 1").max(99),
});

export const cartItemIdSchema = z.object({
  cartItemId: z.string().uuid(),
});

export type AddCartItemInput    = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
