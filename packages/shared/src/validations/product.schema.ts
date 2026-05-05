import { z } from "zod";

export const productQuerySchema = z.object({
  page:       z.coerce.number().min(1).default(1),
  limit:      z.coerce.number().min(1).max(50).default(12),
  categoryId: z.string().min(1).optional(),
  minPrice:   z.coerce.number().min(0).optional(),
  maxPrice:   z.coerce.number().min(0).optional(),
  minRating:  z.coerce.number().min(0).max(5).optional(),
  q:          z.string().min(2).max(200).optional(),
  sortBy:     z.enum(["price", "rating", "sold_count", "created_at"]).default("created_at"),
  sortOrder:  z.enum(["asc", "desc"]).default("desc"),
});

export const productIdSchema = z.object({
  id: z.string().min(1).optional(),
});

export const productSlugSchema = z.object({
  slug: z.string().min(1),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;
