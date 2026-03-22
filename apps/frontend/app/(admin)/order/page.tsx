"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminOrders, useUpdateOrderStatus } from "@/hooks/useAdmin";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/hooks/useAdmin";

// ─────────────────────────────────────────────────────────────
// HOOKS YANG DIBUTUHKAN:
//
//   useAdminOrders(params)      →  hooks/rest/useAdmin.ts  ✅
//     - data     : PaginatedAdmin<AdminOrder>
//     - isLoading: boolean
//
//   useUpdateOrderStatus()      →  hooks/rest/useAdmin.ts  ✅
//     - mutate({ id, status })
//     - isPending: boolean
//
//   Endpoints:
//     GET   /admin/orders?page=&limit=&status=&q=
//     PATCH /admin/orders/:id/status  { status }
// ─────────────────────────────────────────────────────────────

// Transisi status yang valid (sesuai backend)
const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending_payment: "confirmed",
  confirmed:       "processing",
  processing:      "shipped",
  shipped:         "delivered",
  delivered:       null,
  cancelled:       null,
};

const FILTER_OPTIONS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "Semua",            value: "all" },
  { label: "Menunggu Bayar",  value: "pending_payment" },
  { label: "Dikonfirmasi",    value: "confirmed" },
  { label: "Diproses",        value: "processing" },
  { label: "Dikirim",         value: "shipped" },
  { label: "Selesai",         value: "delivered" },
  { label: "Dibatalkan",      value: "cancelled" },
];

export default function AdminOrdersPage() {
  const [page,        setPage]        = useState(1);
  const [filterStatus,setFilterStatus]= useState<OrderStatus | "all">("all");
  const [qInput,      setQInput]      = useState("");
  const [q,           setQ]           = useState("");

  const { data, isLoading } = useAdminOrders({
    page,
    limit:  15,
    status: filterStatus === "all" ? undefined : filterStatus,
    q:      q || undefined,
  });

  const updateStatus = useUpdateOrderStatus();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(qInput.trim());
    setPage(1);
  }

  function handleStatusFilter(val: string) {
    setFilterStatus(val as OrderStatus | "all");
    setPage(1);
  }

  return (
    <div className="space-y-5 max-w-6xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Kelola Pesanan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {data ? `${data.totalCount.toLocaleString("id-ID")} pesanan total` : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              placeholder="Cari nomor pesanan / email..."
              className="pl-9 h-9"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-9">Cari</Button>
        </form>
        <Select value={filterStatus} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        {/* Header */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_160px] gap-3 px-5 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>No. Pesanan</span>
          <span>Pembeli</span>
          <span>Waktu</span>
          <span>Total</span>
          <span>Status</span>
          <span>Aksi</span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_160px] gap-3 items-center px-5 py-3.5">
                {Array.from({ length: 6 }).map((_, j) => (
                  <Skeleton key={j} className="h-3.5 w-full max-w-[120px]" />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && data?.data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-500">Tidak ada pesanan ditemukan</p>
          </div>
        )}

        {/* Rows */}
        {!isLoading && (data?.data.length ?? 0) > 0 && (
          <div className="divide-y">
            {data?.data.map(order => {
              const nextStatus = NEXT_STATUS[order.status];
              return (
                <div
                  key={order.id}
                  className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_160px] gap-3 items-center px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  {/* No. pesanan */}
                  <p className="text-sm font-mono font-semibold text-gray-800 truncate">
                    {order.orderNumber}
                  </p>

                  {/* Pembeli */}
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">{order.user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{order.user.email}</p>
                  </div>

                  {/* Waktu */}
                  <p className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>

                  {/* Total */}
                  <p className="text-sm font-semibold text-gray-800">{formatPrice(order.total)}</p>

                  {/* Status */}
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full inline-block",
                    ORDER_STATUS_COLOR[order.status]
                  )}>
                    {ORDER_STATUS_LABEL[order.status] ?? order.status}
                  </span>

                  {/* Aksi — update ke status berikutnya */}
                  <div>
                    {nextStatus ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: order.id, status: nextStatus })}
                      >
                        → {ORDER_STATUS_LABEL[nextStatus]}
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {(data?.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">
              Halaman {page} dari {data!.totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline" size="icon" className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline" size="icon" className="h-8 w-8"
                disabled={page >= data!.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}