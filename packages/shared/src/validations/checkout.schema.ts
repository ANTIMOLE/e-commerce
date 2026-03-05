import { z } from "zod";

export const addressSchema = z.object({
  label:         z.string().max(50).optional(),
  recipientName: z.string().min(2).max(100),
  phone:         z.string().min(9).max(20),
  address:       z.string().min(5),
  city:          z.string().min(2).max(100),
  province:      z.string().min(2).max(100),
  zipCode:       z.string().min(5).max(10),
  isDefault:     z.boolean().default(false),
});

export const checkoutConfirmSchema = z.object({
  cartId:         z.string().uuid(),
  addressId:      z.string().uuid(),
  shippingMethod: z.enum(["regular", "express"]),
  paymentMethod:  z.enum(["bank_transfer", "qris", "cod"]),
});

export const updateProfileSchema = z.object({
  name:  z.string().min(2).max(100).optional(),
  phone: z.string().min(9).max(20).optional(),
});

export type AddressInput          = z.infer<typeof addressSchema>;
export type CheckoutConfirmInput  = z.infer<typeof checkoutConfirmSchema>;
export type UpdateProfileInput    = z.infer<typeof updateProfileSchema>;
