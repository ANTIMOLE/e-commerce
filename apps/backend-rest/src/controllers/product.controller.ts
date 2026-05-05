import type { Request, Response, NextFunction } from "express";
import * as productService from "../services/product.service";

// ============================================================
// GET /products
// ============================================================
export async function getAllController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Query params otomatis string, cast manual
    const query = {
      page:       req.query.page      ? Number(req.query.page)      : undefined,
      limit:      req.query.limit      ? Number(req.query.limit)     : undefined,
      categoryId: req.query.categoryId as string | undefined,
      q:          req.query.q          as string | undefined,
      minPrice:   req.query.minPrice   ? Number(req.query.minPrice)  : undefined,
      maxPrice:   req.query.maxPrice   ? Number(req.query.maxPrice)  : undefined,
      minRating:  req.query.minRating  ? Number(req.query.minRating) : undefined,
      sortBy:     req.query.sortBy     as any,
      sortOrder:  req.query.sortOrder  as any,
    };

    const result = await productService.getAll(query);

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// GET /products/:slug
// ============================================================
export async function getBySlugController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const product = await productService.getBySlug(req.params.slug as string);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}


/**
 * TODO:
 * 1. Ambil keyword dari req.query.q
 * 2. Kalau kosong → return 400
 * 3. Panggil productService.search(keyword)
 * 4. Return hasilnya
 *
 * HINT: Lihat getAllController — pattern sama,
 *       bedanya ambil satu query param saja
 */
export async function searchController(req: Request, res: Response, next: NextFunction) {
  try {
    const keyword = req.query.q as string | undefined;
    if (!keyword) {
      return res.status(400).json({ success: false, message: "Query parameter 'q' is required" });
    }
    // FIX: forward semua filter tambahan ke service.search() sama seperti getAllController
    const query = {
      page:       req.query.page      ? Number(req.query.page)      : undefined,
      limit:      req.query.limit     ? Number(req.query.limit)     : undefined,
      categoryId: req.query.categoryId as string | undefined,
      minPrice:   req.query.minPrice  ? Number(req.query.minPrice)  : undefined,
      maxPrice:   req.query.maxPrice  ? Number(req.query.maxPrice)  : undefined,
      minRating:  req.query.minRating ? Number(req.query.minRating) : undefined,
      sortBy:     req.query.sortBy    as any,
      sortOrder:  req.query.sortOrder as any,
    };
    const result = await productService.search(keyword, query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}