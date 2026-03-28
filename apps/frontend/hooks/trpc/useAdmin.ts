"use client";

import { useQueryClient } from "@tanstack/react-query";
import { trpc }           from "@/lib/trpc";
import { queryKeys }      from "@/lib/queryClient";
import { toast }          from "sonner";

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

// ── query key helpers ─────────────────────────────────────────
// Keep local to avoid re-export conflicts with rest/useAdmin
const adminQueryKeys = {
  all:       ["admin"] as const,
  dashboard: () => ["admin", "dashboard"] as const,
  products:  (params?: object) => ["admin", "products", params ?? {}] as const,
  orders:    (params?: object) => ["admin", "orders",   params ?? {}] as const,
  users:     (params?: object) => ["admin", "users",    params ?? {}] as const,
};

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
  const qc = useQueryClient();
  return trpc.admin.createProduct.useMutation({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminQueryKeys.all });
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("Produk berhasil dibuat");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminQueryKeys.all });
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("Produk berhasil diperbarui");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return trpc.admin.deleteProduct.useMutation({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminQueryKeys.all });
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
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
      // cast status: router validates it as enum, we pass string from UI
      status: params.status as
        | "pending_payment" | "confirmed" | "processing"
        | "shipped" | "delivered" | "cancelled"
        | undefined,
    },
    { staleTime: 30_000 }
  );
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminQueryKeys.all });
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
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
