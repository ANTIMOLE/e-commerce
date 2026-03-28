import { z }             from "zod";
import { router, publicProcedure } from "../trpc/init";
import { serviceCall }  from "../trpc/errors";
import * as categoryService from "../services/category.service";

export const categoryRouter = router({

  // ── GET /categories ───────────────────────────────────────
  // REST:  GET /categories
  // tRPC:  trpc.category.getAll.useQuery()
  getAll: publicProcedure.query(async () => {
    return serviceCall(() => categoryService.getAll());
  }),

  // ── GET /categories/:slug ─────────────────────────────────
  // REST:  GET /categories/:slug
  // tRPC:  trpc.category.getBySlug.useQuery({ slug })
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      return serviceCall(() => categoryService.getBySlug(input.slug));
    }),
});
