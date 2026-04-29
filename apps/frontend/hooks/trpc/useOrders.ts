"use client";

import { useQueryClient }                from "@tanstack/react-query";
import { trpc }                          from "@/lib/trpc";
import { queryKeys }                     from "@/lib/queryClient";
import { toast }                         from "sonner";
// import type { Order, OrderListParams, PaginatedResponse, OrderStatus } from "@/types";
import type { Order, OrderListParams, PaginatedResponse } from "@/types";

// Shape returned by order.service getOrders
interface OrdersServiceResponse {
  orders: Order[];
  total:  number;
}

// ── useOrders ──────────────────────────────────────────────────
export function useOrders(params: OrderListParams = {}) {
  const { page = 1, limit = 20, status } = params;

  const query = trpc.order.getAll.useQuery(
    {
      page,
      limit,
      status: status as
        | "pending_payment" | "confirmed" | "processing"
        | "shipped" | "delivered" | "cancelled"
        | undefined,
    },
    { staleTime: 30_000 }
  );

  // Reshape service response to PaginatedResponse<Order>
  const serviceData = query.data as OrdersServiceResponse | undefined;
  const paginated: PaginatedResponse<Order> | undefined = serviceData
    ? {
        data:        serviceData.orders,
        totalCount:  serviceData.total,
        page,
        totalPages:  Math.ceil(serviceData.total / limit),
        hasNextPage: page < Math.ceil(serviceData.total / limit),
        hasPrevPage: page > 1,
      }
    : undefined;

  return { ...query, data: paginated };
}

// ── useOrderDetail ─────────────────────────────────────────────
export function useOrderDetail(orderId: string) {
  return trpc.order.getById.useQuery(
    { orderId },
    { enabled: !!orderId }
  );
}

// ── useCancelOrder ─────────────────────────────────────────────
export function useCancelOrder() {
  const utils = trpc.useUtils();
  return trpc.order.cancel.useMutation({
    onSuccess: () => {
      // FIX [High]: invalidate order cache via tRPC utils
      void utils.order.getAll.invalidate();
      toast.success("Pesanan berhasil dibatalkan");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });
}
