import { z }                   from "zod";
import { router, publicProcedure } from "../trpc/init";
import { serviceCall }         from "../trpc/errors";
import { productQuerySchema }  from "@ecommerce/shared";
import * as productService     from "../services/product.service";
import type { ProductQuery }   from "../services/product.service";

// ── sortBy mapper ─────────────────────────────────────────────
// productQuerySchema (shared) uses snake_case to match REST URL query params
// ProductQuery / Prisma orderBy uses camelCase field names
const sortByMap: Record<string, ProductQuery["sortBy"]> = {
  sold_count: "soldCount",
  created_at: "createdAt",
  price:      "price",
  rating:     "rating",
};

function mapInput(raw: z.infer<typeof productQuerySchema>): ProductQuery {
  return {
    ...raw,
    sortBy: raw.sortBy ? (sortByMap[raw.sortBy] ?? "createdAt") : "createdAt",
  } as ProductQuery;
}

export const productRouter = router({

  // ── GET /products ─────────────────────────────────────────
  getAll: publicProcedure
    .input(productQuerySchema.optional())
    .query(async ({ input }) => {
      return serviceCall(() => productService.getAll(input ? mapInput(input) : {}));
    }),

  // ── GET /products/search ──────────────────────────────────
  search: publicProcedure
    .input(
      productQuerySchema.extend({
        q: z.string().min(1, "Keyword minimal 1 karakter"),
      })
    )
    .query(async ({ input }) => {
      const { q, ...rest } = mapInput(input as z.infer<typeof productQuerySchema>);
      return serviceCall(() => productService.search(input.q, rest));
    }),

  // ── GET /products/:slug ───────────────────────────────────
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      return serviceCall(() => productService.getBySlug(input.slug));
    }),

  // ── GET /products (by id, admin util) ────────────────────
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return serviceCall(() => productService.getById(input.id));
    }),
});
