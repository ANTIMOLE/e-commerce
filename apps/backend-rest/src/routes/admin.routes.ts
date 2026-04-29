import { Router, IRouter } from "express";
import { authenticate }  from "../middlewares/auth.middleware";
import { requireRole }   from "../middlewares/role.middleware";
import { validate }      from "../middlewares/validate.middleware";
import { z }             from "zod";
import {
  getDashboardController,
  getProductsController,
  createProductController,
  updateProductController,
  deleteProductController,
  getOrdersController,
  updateOrderStatusController,
  getUsersController,
} from "../controllers/admin.controller";

// FIX: Schema validasi untuk POST /admin/products.
// Sebelumnya tidak ada validate() middleware → body { name: "" } lolos ke service
// → Prisma constraint error → 500. Sekarang ditolak 400 oleh validate() sebelum masuk service.
// categoryId pakai z.string().min(1) bukan .uuid() karena ID kategori dari seed
// berbentuk "cat_xxx" (bukan UUID murni).
const adminCreateProductSchema = z.object({
  categoryId:  z.string().min(1, "categoryId wajib diisi"),
  name:        z.string().min(1, "name wajib diisi").max(500),
  description: z.string().optional(),
  price:       z.number().positive("price harus angka positif"),
  stock:       z.number().int().min(0).default(0),
  images:      z.array(z.string()).optional(),
  discount:    z.number().int().min(0).max(100).optional(),
});

// FIX: Schema validasi untuk PATCH /admin/products/:id.
// Sebelumnya tidak ada validate() → body rusak masuk ke service → perilaku tak terduga.
// Semua field optional karena ini partial update.
const adminUpdateProductSchema = z.object({
  name:        z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  price:       z.number().positive().optional(),
  stock:       z.number().int().min(0).optional(),
  images:      z.array(z.string()).optional(),
  discount:    z.number().int().min(0).max(100).optional(),
  isActive:    z.boolean().optional(),
  categoryId:  z.string().min(1).optional(),
});

export const adminRoutes: IRouter = Router();

// Semua route admin wajib login + role ADMIN
adminRoutes.use(authenticate, requireRole("ADMIN"));

// ── Dashboard ─────────────────────────────────────────────────
// Query agregasi berat — endpoint utama S-05 testing
adminRoutes.get("/dashboard", getDashboardController);

// ── Products ──────────────────────────────────────────────────
adminRoutes.get   ("/products",     getProductsController);
adminRoutes.post  ("/products",     validate(adminCreateProductSchema), createProductController);
adminRoutes.patch ("/products/:id", validate(adminUpdateProductSchema), updateProductController);
adminRoutes.delete("/products/:id", deleteProductController);

// ── Orders ────────────────────────────────────────────────────
adminRoutes.get  ("/orders",            getOrdersController);
adminRoutes.patch("/orders/:id/status", updateOrderStatusController);

// ── Users (opsional) ─────────────────────────────────────────
adminRoutes.get("/users", getUsersController);
