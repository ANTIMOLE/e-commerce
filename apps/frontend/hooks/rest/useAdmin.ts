/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "sonner";

// ============================================================
// useAdmin — semua hook untuk modul Admin
// Endpoint: GET|POST|PATCH|DELETE /admin/*
// Semua butuh role ADMIN, axios sudah kirim cookie otomatis
// ============================================================

// ── Types ─────────────────────────────────────────────────────
export type OrderStatus =
  | "pending_payment" | "confirmed" | "processing"
  | "shipped" | "delivered" | "cancelled";

export interface AdminDashboardStats {
  summary: {
    totalOrdersToday: number;
    weeklyRevenue:    number;
    totalOrders:      number;
    totalProducts:    number;
    totalUsers:       number;
  };
  topProducts: {
    id: string; name: string; slug: string;
    price: number; stock: number; soldCount: number;
    images: string[]; category: { name: string };
  }[];
  recentOrders: {
    id: string; orderNumber: string; status: OrderStatus;
    total: number; createdAt: string;
    user: { name: string; email: string };
  }[];
  salesChart: { date: string; revenue: number; orders: number }[];
}

export interface AdminProduct {
  id: string; name: string; slug: string; price: number;
  stock: number; soldCount: number; isActive: boolean;
  discount: number; images: string[]; createdAt: string;
  category: { id: string; name: string };
}

export interface AdminOrder {
  id: string; orderNumber: string; status: OrderStatus;
  total: number; createdAt: string;
  paymentMethod: string; shippingMethod: string;
  user: { id: string; name: string; email: string };
  items: { id: string; productName: string; quantity: number; unitPrice: number }[];
}

export interface PaginatedAdmin<T> {
  data: T[]; totalCount: number; page: number;
  totalPages: number; hasNextPage: boolean; hasPrevPage: boolean;
}

// ── queryKeys admin ───────────────────────────────────────────
// Tambahkan ini di queryClient.ts juga (lihat catatan di bawah)
export const adminKeys = {
  all:       ["admin"] as const,
  dashboard: () => ["admin", "dashboard"] as const,
  products:  (params?: object) => ["admin", "products", params ?? {}] as const,
  orders:    (params?: object) => ["admin", "orders",   params ?? {}] as const,
  users:     (params?: object) => ["admin", "users",    params ?? {}] as const,
};

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

export function useAdminDashboard() {
  return useQuery<AdminDashboardStats>({
    queryKey: adminKeys.dashboard(),
    queryFn:  async () => {
      const res = await api.get<{ success: boolean; data: AdminDashboardStats }>(
        "/admin/dashboard"
      );
      return res.data.data;
    },
    staleTime: 2 * 60_000, // 2 menit — dashboard data cukup fresh
  });
}

// ═══════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════

export interface AdminProductParams {
  page?: number; limit?: number; q?: string;
  categoryId?: string; isActive?: boolean;
}

export function useAdminProducts(params: AdminProductParams = {}) {
  return useQuery<PaginatedAdmin<AdminProduct>>({
    queryKey: adminKeys.products(params),
    queryFn:  async () => {
      const res = await api.get<{ success: boolean } & PaginatedAdmin<AdminProduct>>(
        "/admin/products", { params }
      );
      // response shape: { success, data, totalCount, page, ... }
      const { success: _, ...rest } = res.data;
      return rest as PaginatedAdmin<AdminProduct>;
    },
    staleTime: 60_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      categoryId: string; name: string; description?: string;
      price: number; stock: number; images?: string[]; discount?: number;
    }) => {
      const res = await api.post<{ success: boolean; data: AdminProduct }>(
        "/admin/products", data
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.products() });
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("Produk berhasil dibuat");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: Partial<{
        name: string; description: string; price: number;
        stock: number; images: string[]; discount: number;
        isActive: boolean; categoryId: string;
      }>;
    }) => {
      const res = await api.patch<{ success: boolean; data: AdminProduct }>(
        `/admin/products/${id}`, data
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.products() });
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("Produk berhasil diperbarui");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/products/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.products() });
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("Produk dinonaktifkan");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

// ═══════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════

export interface AdminOrderParams {
  page?: number; limit?: number;
  status?: OrderStatus; q?: string;
}

export function useAdminOrders(params: AdminOrderParams = {}) {
  return useQuery<PaginatedAdmin<AdminOrder>>({
    queryKey: adminKeys.orders(params),
    queryFn:  async () => {
      const res = await api.get<{ success: boolean } & PaginatedAdmin<AdminOrder>>(
        "/admin/orders", { params }
      );
      const { success: _, ...rest } = res.data;
      return rest as PaginatedAdmin<AdminOrder>;
    },
    staleTime: 30_000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const res = await api.patch<{ success: boolean; data: AdminOrder }>(
        `/admin/orders/${id}/status`, { status }
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.orders() });
      // Invalidate user-facing orders juga supaya status sync
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success("Status pesanan diperbarui");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

// ═══════════════════════════════════════════════════════════════
// USERS (opsional)
// ═══════════════════════════════════════════════════════════════

export interface AdminUser {
  id: string; name: string; email: string; role: string;
  phone?: string; createdAt: string;
  _count: { orders: number };
}

export function useAdminUsers(params: { page?: number; limit?: number; q?: string } = {}) {
  return useQuery<PaginatedAdmin<AdminUser>>({
    queryKey: adminKeys.users(params),
    queryFn:  async () => {
      const res = await api.get<{ success: boolean } & PaginatedAdmin<AdminUser>>(
        "/admin/users", { params }
      );
      const { success: _, ...rest } = res.data;
      return rest as PaginatedAdmin<AdminUser>;
    },
    staleTime: 60_000,
  });
}