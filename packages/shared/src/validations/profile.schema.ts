import { z } from "zod";

export const updateProfileSchema = z.object({
  name:  z.string().min(2).max(100).optional(),
  phone: z.string().min(9).max(20).optional(),
});

export const addressSchema = z.object({
  label:         z.string().max(100).optional(),
  recipientName: z.string().min(2).max(100),
  phone:         z.string().min(9).max(20),
  address:       z.string().min(5),
  city:          z.string().min(2).max(100),
  province:      z.string().min(2).max(100),
  zipCode:       z.string().min(5).max(10),
  isDefault:     z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressInput        = z.infer<typeof addressSchema>;
