import { z } from "zod";

export const orderItemSchema = z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
});

export const orderCreateSchema = z.object({
    items: z.array(orderItemSchema).min(1),
    shippingAddress: z.object({
        recipientName: z.string().min(2).max(100),
        phone: z.string().min(9).max(20),
        address: z.string().min(5),
        city: z.string().min(2).max(100),
        province: z.string().min(2).max(100),
        zipCode: z.string().min(5).max(10),
    }),
    shippingMethod: z.enum(["regular", "express"]),
    paymentMethod: z.enum(["bank_transfer", "qris", "cod"]),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
