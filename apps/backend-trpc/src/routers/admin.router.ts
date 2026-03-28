import { z }           from "zod";
import { router, adminProcedure } from "../trpc/init";
import { serviceCall }  from "../trpc/errors";
import * as adminService from "../services/admin.service";
import type { OrderStatus } from "@ecommerce/shared/generated/prisma";

const orderStatusEnum = z.enum([
  "pending_payment", "confirmed", "processing",
  "shipped", "delivered", "cancelled",
]);

export const adminRouter = router({

  // ── GET /admin/dashboard ──────────────────────────────────
  // REST:  GET /admin/dashboard → getDashboardController
  // tRPC:  trpc.admin.getDashboard.useQuery()
  getDashboard: adminProcedure.query(async () => {
    return serviceCall(() => adminService.getDashboardStats());
  }),

  // ── GET /admin/products ───────────────────────────────────
  // REST:  GET /admin/products?page=&q=&categoryId=&isActive=
  // tRPC:  trpc.admin.getProducts.useQuery(params)
  getProducts: adminProcedure
    .input(
      z.object({
        page:       z.number().int().min(1).default(1),
        limit:      z.number().int().min(1).max(100).default(20),
        q:          z.string().optional(),
        categoryId: z.string().uuid().optional(),
        isActive:   z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return serviceCall(() => adminService.getAllProducts(input ?? {}));
    }),

  // ── POST /admin/products ──────────────────────────────────
  // REST:  POST /admin/products
  // tRPC:  trpc.admin.createProduct.useMutation()
  createProduct: adminProcedure
    .input(
      z.object({
        categoryId:  z.string().uuid(),
        name:        z.string().min(1).max(500),
        description: z.string().optional(),
        price:       z.number().positive(),
        stock:       z.number().int().min(0),
        images:      z.array(z.string()).optional(),
        discount:    z.number().int().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return serviceCall(() => adminService.createProduct(input));
    }),

  // ── PATCH /admin/products/:id ─────────────────────────────
  // REST:  PATCH /admin/products/:id
  // tRPC:  trpc.admin.updateProduct.useMutation()
  updateProduct: adminProcedure
    .input(
      z.object({
        id:          z.string().uuid(),
        name:        z.string().min(1).max(500).optional(),
        description: z.string().optional(),
        price:       z.number().positive().optional(),
        stock:       z.number().int().min(0).optional(),
        images:      z.array(z.string()).optional(),
        discount:    z.number().int().min(0).max(100).optional(),
        isActive:    z.boolean().optional(),
        categoryId:  z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return serviceCall(() => adminService.updateProduct(id, data));
    }),

  // ── DELETE /admin/products/:id ────────────────────────────
  // REST:  DELETE /admin/products/:id (soft delete)
  // tRPC:  trpc.admin.deleteProduct.useMutation()
  deleteProduct: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return serviceCall(() => adminService.deleteProduct(input.id));
    }),

  // ── GET /admin/orders ─────────────────────────────────────
  // REST:  GET /admin/orders?page=&status=&q=
  // tRPC:  trpc.admin.getOrders.useQuery(params)
  getOrders: adminProcedure
    .input(
      z.object({
        page:   z.number().int().min(1).default(1),
        limit:  z.number().int().min(1).max(100).default(20),
        status: orderStatusEnum.optional(),
        q:      z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return serviceCall(() => adminService.getAllOrders((input ?? {}) as any));
    }),

  // ── PATCH /admin/orders/:id/status ───────────────────────
  // REST:  PATCH /admin/orders/:id/status  body: { status }
  // tRPC:  trpc.admin.updateOrderStatus.useMutation()
  updateOrderStatus: adminProcedure
    .input(
      z.object({
        orderId: z.string().uuid(),
        status:  orderStatusEnum,
      })
    )
    .mutation(async ({ input }) => {
      return serviceCall(() =>
        adminService.updateOrderStatus(input.orderId, input.status as OrderStatus)
      );
    }),

  // ── GET /admin/users ──────────────────────────────────────
  // REST:  GET /admin/users?page=&limit=&q=
  // tRPC:  trpc.admin.getUsers.useQuery(params)
  getUsers: adminProcedure
    .input(
      z.object({
        page:  z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        q:     z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return serviceCall(() => adminService.getAllUsers(input ?? {}));
    }),
});
