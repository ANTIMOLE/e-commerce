"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "sonner";
import type { Order, OrderListParams, PaginatedResponse } from "@/types";

// ── useOrders ──────────────────────────────────────────────────
// GET /orders?page=&limit=&status=
export function useOrders(params: OrderListParams = {}) {
  return useQuery<PaginatedResponse<Order>>({
    queryKey: queryKeys.orders.list(params),
    queryFn: async () => {
      const res = await api.get<{
        success: boolean;
        data: { orders: Order[]; total: number };
      }>("/orders", { params });
      const { orders, total } = res.data.data;
      const page  = params.page  ?? 1;
      const limit = params.limit ?? 20;
      return {
        data:        orders,
        totalCount:  total,
        page,
        totalPages:  Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      };
    },
    staleTime: 30_000,
  });
}

// ── useOrderDetail ─────────────────────────────────────────────
// GET /orders/:id
export function useOrderDetail(orderId: string) {
  return useQuery<Order>({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Order }>(`/orders/${orderId}`);
      return res.data.data;
    },
    enabled: !!orderId,
  });
}

// ── useCancelOrder ─────────────────────────────────────────────
// POST /orders/:id/cancel
export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post<{ success: boolean; message: string }>(
        `/orders/${orderId}/cancel`
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast.success("Pesanan berhasil dibatalkan");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}