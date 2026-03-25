// import { z }              from "zod";
// import { router, adminProcedure } from "../trpc/init";
// import * as adminService  from "../services/admin.service";
// import type { OrderStatus } from "@ecommerce/shared";

// export const adminRouter = router({

//   // Mirrors GET /admin/dashboard
//   getDashboardStats: adminProcedure
//     .query(() => adminService.getDashboardStats()),

//   // Mirrors GET /admin/products
//   getProducts: adminProcedure
//     .input(z.object({
//       page:       z.number().min(1).default(1),
//       limit:      z.number().min(1).max(100).default(20),
//       q:          z.string().optional(),
//       categoryId: z.string().optional(),
//       isActive:   z.boolean().optional(),
//     }))
//     .query(({ input }) => adminService.getAllProducts(input)),

//   // Mirrors POST /admin/products
//   createProduct: adminProcedure
//     .input(z.object({
//       categoryId:  z.string().uuid(),
//       name:        z.string().min(1),
//       description: z.string().optional(),
//       price:       z.number().positive(),
//       stock:       z.number().int().min(0),
//       images:      z.array(z.string()).optional(),
//       discount:    z.number().int().min(0).max(100).optional(),
//     }))
//     .mutation(({ input }) => adminService.createProduct(input)),

//   // Mirrors PATCH /admin/products/:id
//   updateProduct: adminProcedure
//     .input(z.object({
//       id:   z.string().uuid(),
//       data: z.object({
//         name:        z.string().optional(),
//         description: z.string().optional(),
//         price:       z.number().positive().optional(),
//         stock:       z.number().int().min(0).optional(),
//         images:      z.array(z.string()).optional(),
//         discount:    z.number().int().min(0).max(100).optional(),
//         isActive:    z.boolean().optional(),
//         categoryId:  z.string().uuid().optional(),
//       }),
//     }))
//     .mutation(({ input }) => adminService.updateProduct(input.id, input.data)),

//   // Mirrors DELETE /admin/products/:id
//   deleteProduct: adminProcedure
//     .input(z.object({ id: z.string().uuid() }))
//     .mutation(({ input }) => adminService.deleteProduct(input.id)),

//   // Mirrors GET /admin/orders
//   getOrders: adminProcedure
//     .input(z.object({
//       page:   z.number().min(1).default(1),
//       limit:  z.number().min(1).max(100).default(20),
//       status: z.enum(['pending_payment','confirmed','processing','shipped','delivered','cancelled']).optional(),
//       q:      z.string().optional(),
//     }))
//     .query(({ input }) => adminService.getAllOrders(input)),

//   // Mirrors PATCH /admin/orders/:id/status
//   updateOrderStatus: adminProcedure
//     .input(z.object({
//       orderId: z.string().uuid(),
//       status:  z.enum(['pending_payment','confirmed','processing','shipped','delivered','cancelled']),
//     }))
//     .mutation(({ input }) => adminService.updateOrderStatus(input.orderId, input.status as OrderStatus)),

//   // Mirrors GET /admin/users
//   getUsers: adminProcedure
//     .input(z.object({
//       page:  z.number().min(1).default(1),
//       limit: z.number().min(1).max(100).default(20),
//       q:     z.string().optional(),
//     }))
//     .query(({ input }) => adminService.getAllUsers(input)),
// });

// ============================================================
// ADMIN ROUTER — tRPC
//
// PERBEDAAN UTAMA tRPC vs REST:
//
// REST:                          tRPC:
// ─────────────────────────      ─────────────────────────────
// route file (path + method)  →  procedure name dalam router
// controller function         →  resolver (bagian .query/.mutation)
// validate middleware         →  input: z.object({...}) inline
// authenticate middleware     →  protectedProcedure
// role middleware              →  adminProcedure (custom middleware)
// req.user.id                 →  ctx.userId
// res.json(data)              →  return data  ← tRPC handle sendiri
// throw AppError(msg, 404)    →  throw new TRPCError({ code: "NOT_FOUND" })
//
// Tidak ada controller terpisah — logika langsung di router.
// Type safety end-to-end: frontend tau persis shape response ini.
// ============================================================

import { z }           from "zod";
import { TRPCError }   from "@trpc/server";
import { router, protectedProcedure, middleware } from "../trpc/init";
import { prisma }      from "../config/database";
import * as adminService from "../services/admin.service";
import type { OrderStatus } from "@ecommerce/shared/generated/prisma";

// ── isAdmin middleware ────────────────────────────────────────
// Equivalent ke role.middleware.ts di REST.
// Di tRPC, middleware di-chain langsung ke procedure.
const isAdmin = middleware(async ({ ctx, next }) => {
  // ctx.userId sudah di-set oleh isAuthenticated di protectedProcedure
  const user = await prisma.user.findUnique({
    where:  { id: ctx.userId! },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    throw new TRPCError({
      code:    "FORBIDDEN",
      message: "Akses ditolak. Hanya admin yang bisa mengakses ini.",
    });
  }

  return next({ ctx });
});

// adminProcedure = protectedProcedure (harus login) + isAdmin (harus ADMIN)
// Ini equivalent ke: authenticate + requireRole("ADMIN") di REST
const adminProcedure = protectedProcedure.use(isAdmin);

// ── Router ────────────────────────────────────────────────────
export const adminRouter = router({

  // ── GET /admin/dashboard ─────────────────────────────────
  // REST:  GET /admin/dashboard → getDashboardController
  // tRPC:  adminRouter.getDashboard.useQuery()
  getDashboard: adminProcedure
    .query(async () => {
      // Tidak ada input — langsung query
      return adminService.getDashboardStats();
    }),

  // ── GET /admin/products ───────────────────────────────────
  // REST:  GET /admin/products?page=1&q=xxx
  // tRPC:  adminRouter.getProducts.useQuery({ page: 1, q: "xxx" })
  getProducts: adminProcedure
    .input(
      z.object({
        page:       z.number().int().min(1).default(1),
        limit:      z.number().int().min(1).max(100).default(20),
        q:          z.string().optional(),
        categoryId: z.string().uuid().optional(),
        isActive:   z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return adminService.getAllProducts(input);
    }),

  // ── POST /admin/products ──────────────────────────────────
  // REST:  POST /admin/products  body: { name, price, ... }
  // tRPC:  adminRouter.createProduct.useMutation()
  createProduct: adminProcedure
    .input(
      z.object({
        categoryId:  z.string().uuid(),
        name:        z.string().min(1).max(500),
        description: z.string().optional(),
        price:       z.number().positive(),
        stock:       z.number().int().min(0),
        images:      z.array(z.string().url()).optional(),
        discount:    z.number().int().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return adminService.createProduct(input);
    }),

  // ── PATCH /admin/products/:id ─────────────────────────────
  // REST:  PATCH /admin/products/:id
  // tRPC:  adminRouter.updateProduct.useMutation()
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
      return adminService.updateProduct(id, data);
    }),

  // ── DELETE /admin/products/:id ────────────────────────────
  deleteProduct: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return adminService.deleteProduct(input.id);
    }),

  // ── GET /admin/orders ─────────────────────────────────────
  getOrders: adminProcedure
    .input(
      z.object({
        page:   z.number().int().min(1).default(1),
        limit:  z.number().int().min(1).max(100).default(15),
        status: z.enum(["pending_payment","confirmed","processing","shipped","delivered","cancelled"]).optional(),
        q:      z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return adminService.getAllOrders(input as any);
    }),

  // ── PATCH /admin/orders/:id/status ───────────────────────
  // REST:  PATCH /admin/orders/:id/status  body: { status }
  // tRPC:  adminRouter.updateOrderStatus.useMutation()
  updateOrderStatus: adminProcedure
    .input(
      z.object({
        orderId: z.string().uuid(),
        status:  z.enum(["pending_payment","confirmed","processing","shipped","delivered","cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      return adminService.updateOrderStatus(input.orderId, input.status as OrderStatus);
    }),

  // ── GET /admin/users ─────────────────────────────────────
  getUsers: adminProcedure
    .input(
      z.object({
        page:  z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        q:     z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return adminService.getAllUsers(input);
    }),
});