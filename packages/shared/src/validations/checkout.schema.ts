import { z } from "zod";


export const checkoutConfirmSchema = z.object({
  cartId:         z.string().uuid(),
  addressId:      z.string().uuid(),
  shippingMethod: z.enum(["regular", "express"]),
  paymentMethod:  z.enum(["bank_transfer", "qris", "cod"]),
});



export type CheckoutConfirmInput  = z.infer<typeof checkoutConfirmSchema>;
