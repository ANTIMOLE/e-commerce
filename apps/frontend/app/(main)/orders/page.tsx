"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/EmptyState";
import { Pagination } from "@/components/shared/Pagination";
import { useOrders } from "@/hooks/useOrders";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const STATUS_TABS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "Semua",     value: "all" },
  { label: "Dibayar",   value: "pending_payment" },
  { label: "Dikonfirmasi", value: "confirmed" },
  { label: "Diproses",  value: "processing" },
  { label: "Dikirim",   value: "shipped" },
  { label: "Selesai",   value: "delivered" },
  { label: "Dibatalkan",value: "cancelled" },
];

export default function OrdersPage() {
  const router = useRouter();
  const [activeStatus, setActiveStatus] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useOrders({
    page,
    limit: 10,
    status: activeStatus === "all" ? undefined : activeStatus,
  });

  function handleTabChange(status: OrderStatus | "all") {
    setActiveStatus(status);
    setPage(1);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Pesanan Saya</h1>
        <p className="text-sm text-gray-500 mt-1">Riwayat dan status semua pesananmu</p>
      </div>

      {/* Status tabs — scroll horizontal di mobile */}
      <div className="overflow-x-auto -mx-4 px-4 mb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-1 min-w-max">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                activeStatus === tab.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border p-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24" />
              <Separator />
              <div className="flex gap-3">
                <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && data?.data.length === 0 && (
        <EmptyState
          emoji="📦"
          title="Belum ada pesanan"
          description={
            activeStatus === "all"
              ? "Kamu belum pernah melakukan pembelian. Yuk mulai belanja!"
              : `Tidak ada pesanan dengan status "${ORDER_STATUS_LABEL[activeStatus]}".`
          }
          action={{ label: "Mulai Belanja", onClick: () => router.push(ROUTES.PRODUCTS) }}
        />
      )}

      {/* Order list */}
      {!isLoading && (data?.data.length ?? 0) > 0 && (
        <div className="space-y-3">
          {data?.data.map(order => (
            <Link
              key={order.id}
              href={ROUTES.ORDER_DETAIL(order.id)}
              className="block bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                {/* Top row: order number + status */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-800 font-mono">
                      {order.orderNumber}
                    </span>
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    ORDER_STATUS_COLOR[order.status]
                  )}>
                    {ORDER_STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mb-3 ml-6">
                  {formatDateTime(order.createdAt)}
                </p>

                <Separator className="mb-3" />

                {/* Item preview — maks 2 item */}
                <div className="space-y-2 mb-3">
                  {order.items.slice(0, 2).map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{item.productName}</p>
                        <p className="text-xs text-gray-500">
                          {item.quantity} × {formatPrice(item.unitPrice)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(order.items.length ?? 0) > 2 && (
                    <p className="text-xs text-gray-400 ml-13">
                      +{order.items.length - 2} produk lainnya
                    </p>
                  )}
                </div>

                {/* Bottom row: total + detail link */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500">Total: </span>
                    <span className="text-sm font-bold text-primary">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary font-medium">
                    Lihat Detail <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Pagination */}
          {(data?.totalPages ?? 0) > 1 && (
            <Pagination
              className="mt-6"
              currentPage={page}
              totalPages={data!.totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}