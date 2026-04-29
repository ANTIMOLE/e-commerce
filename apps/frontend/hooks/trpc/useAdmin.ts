"use client";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Re-use type definitions from REST hook (same shape, same backend service)
// Only re-export *types*, not the conflicting interface declarations
export type {
  OrderStatus,
  AdminDashboardStats,
  AdminProduct,
  AdminOrder,
  PaginatedAdmin,
  AdminUser,
  adminKeys,
} from "../rest/useAdmin";

// ── param interfaces (local, no conflict) ─────────────────────
interface ProductParams {
  page?: number; limit?: number; q?: string;
  categoryId?: string; isActive?: boolean;
}
interface OrderParams {
  page?: number; limit?: number; status?: string; q?: string;
}
interface UserParams {
  page?: number; limit?: number; q?: string;
}

// ============================================================
// DASHBOARD
// ============================================================
export function useAdminDashboard() {
  return trpc.admin.getDashboard.useQuery(undefined, {
    staleTime: 2 * 60_000,
  });
}

// ============================================================
// PRODUCTS
// ============================================================
export function useAdminProducts(params: ProductParams = {}) {
  return trpc.admin.getProducts.useQuery(
    { page: params.page, limit: params.limit, q: params.q,
      categoryId: params.categoryId, isActive: params.isActive },
    { staleTime: 60_000 }
  );
}

export function useCreateProduct() {
  const utils = trpc.useUtils();
  return trpc.admin.createProduct.useMutation({
    onSuccess: () => {
      // FIX [High]: invalidate via tRPC utils, bukan qc.invalidateQueries(adminQueryKeys/queryKeys)
      void utils.admin.getProducts.invalidate();
      // invalidate public product cache juga supaya storefront ikut segar
      void utils.product.getAll.invalidate();
      toast.success("Produk berhasil dibuat");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateProduct() {
  const utils = trpc.useUtils();
  return trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      // FIX [High]: sama — utils tRPC
      void utils.admin.getProducts.invalidate();
      void utils.product.getAll.invalidate();
      toast.success("Produk berhasil diperbarui");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteProduct() {
  const utils = trpc.useUtils();
  return trpc.admin.deleteProduct.useMutation({
    onSuccess: () => {
      // FIX [High]: sama — utils tRPC
      void utils.admin.getProducts.invalidate();
      void utils.product.getAll.invalidate();
      toast.success("Produk dinonaktifkan");
    },
    onError: (err) => toast.error(err.message),
  });
}

// ============================================================
// ORDERS
// ============================================================
export function useAdminOrders(params: OrderParams = {}) {
  return trpc.admin.getOrders.useQuery(
    {
      page:   params.page,
      limit:  params.limit,
      q:      params.q,
      status: params.status as
        | "pending_payment" | "confirmed" | "processing"
        | "shipped" | "delivered" | "cancelled"
        | undefined,
    },
    { staleTime: 30_000 }
  );
}

export function useUpdateOrderStatus() {
  const utils = trpc.useUtils();
  return trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      // FIX [High]: invalidate admin orders dan user-facing orders via utils tRPC
      void utils.admin.getOrders.invalidate();
      void utils.order.getAll.invalidate();
      toast.success("Status pesanan diperbarui");
    },
    onError: (err) => toast.error(err.message),
  });
}

// ============================================================
// USERS
// ============================================================
export function useAdminUsers(params: UserParams = {}) {
  return trpc.admin.getUsers.useQuery(
    { page: params.page, limit: params.limit, q: params.q },
    { staleTime: 60_000 }
  );
}
