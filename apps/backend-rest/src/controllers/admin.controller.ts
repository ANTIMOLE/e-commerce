import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import type { OrderStatus } from "@ecommerce/shared/generated/prisma";
import * as adminService from "../services/admin.service";

// ============================================================
// GET /admin/dashboard
// ============================================================
export async function getDashboardController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// GET /admin/products
// ============================================================
export async function getProductsController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const query = {
      page:       req.query.page       ? Number(req.query.page)  : undefined,
      limit:      req.query.limit      ? Number(req.query.limit) : undefined,
      q:          req.query.q          as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
      isActive:   req.query.isActive !== undefined
                    ? req.query.isActive === "true"
                    : undefined,
    };
    const result = await adminService.getAllProducts(query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// POST /admin/products
// ============================================================
export async function createProductController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const product = await adminService.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// PATCH /admin/products/:id
// ============================================================
export async function updateProductController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const product = await adminService.updateProduct(id, req.body);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// DELETE /admin/products/:id  (soft delete → isActive = false)
// ============================================================
export async function deleteProductController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await adminService.deleteProduct(id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// GET /admin/orders
// ============================================================
export async function getOrdersController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const query = {
      page:   req.query.page  ? Number(req.query.page)  : undefined,
      limit:  req.query.limit ? Number(req.query.limit) : undefined,
      status: req.query.status as OrderStatus | undefined,
      q:      req.query.q      as string      | undefined,
    };
    const result = await adminService.getAllOrders(query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// PATCH /admin/orders/:id/status
// ============================================================
export async function updateOrderStatusController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id     = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const status = req.body.status as OrderStatus;
    const order  = await adminService.updateOrderStatus(id, status);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// GET /admin/users  (opsional)
// ============================================================
export async function getUsersController(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const query = {
      page:  req.query.page  ? Number(req.query.page)  : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      q:     req.query.q      as string | undefined,
    };
    const result = await adminService.getAllUsers(query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}