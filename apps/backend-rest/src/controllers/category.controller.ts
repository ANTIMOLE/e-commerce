import type { Request, Response, NextFunction } from "express";
import * as categoryService from "../services/category.service";

// GET /categories
export async function getAllController(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await categoryService.getAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

// GET /categories/:slug
export async function getBySlugController(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const category = await categoryService.getBySlug(slug);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}