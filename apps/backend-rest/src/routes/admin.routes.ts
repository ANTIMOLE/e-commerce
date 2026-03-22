import { Router, IRouter } from "express";
import { authenticate }  from "../middlewares/auth.middleware";
import { requireRole }   from "../middlewares/role.middleware";
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

export const adminRoutes: IRouter = Router();

// Semua route admin wajib login + role ADMIN
adminRoutes.use(authenticate, requireRole("ADMIN"));

// ── Dashboard ─────────────────────────────────────────────────
// Query agregasi berat — endpoint utama S-05 testing
adminRoutes.get("/dashboard", getDashboardController);

// ── Products ──────────────────────────────────────────────────
adminRoutes.get   ("/products",     getProductsController);
adminRoutes.post  ("/products",     createProductController);
adminRoutes.patch ("/products/:id", updateProductController);
adminRoutes.delete("/products/:id", deleteProductController);

// ── Orders ────────────────────────────────────────────────────
adminRoutes.get  ("/orders",            getOrdersController);
adminRoutes.patch("/orders/:id/status", updateOrderStatusController);

// ── Users (opsional) ─────────────────────────────────────────
adminRoutes.get("/users", getUsersController);