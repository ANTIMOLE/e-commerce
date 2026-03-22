"use client";

import Link from "next/link";
import {
  ShoppingCart, Package, Users, TrendingUp,
  ArrowUpRight, DollarSign, Star,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAdminDashboard, useUpdateOrderStatus } from "@/hooks/useAdmin";
import { formatPrice, formatDateTime, getImageUrl } from "@/lib/utils";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Page title ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ringkasan performa toko hari ini</p>
      </div>

      {/* ── Summary cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border p-5">
                <Skeleton className="h-3 w-24 mb-3" />
                <Skeleton className="h-7 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))
          : [
              {
                label:    "Pesanan Hari Ini",
                value:    data?.summary.totalOrdersToday ?? 0,
                sub:      "dari semua status",
                icon:     <ShoppingCart className="w-5 h-5 text-blue-500" />,
                bg:       "bg-blue-50",
                format:   (v: number) => v.toLocaleString("id-ID"),
              },
              {
                label:    "Revenue Mingguan",
                value:    data?.summary.weeklyRevenue ?? 0,
                sub:      "7 hari terakhir",
                icon:     <DollarSign className="w-5 h-5 text-green-500" />,
                bg:       "bg-green-50",
                format:   (v: number) => formatPrice(v),
              },
              {
                label:    "Total Produk",
                value:    data?.summary.totalProducts ?? 0,
                sub:      "produk aktif",
                icon:     <Package className="w-5 h-5 text-purple-500" />,
                bg:       "bg-purple-50",
                format:   (v: number) => v.toLocaleString("id-ID"),
              },
              {
                label:    "Total User",
                value:    data?.summary.totalUsers ?? 0,
                sub:      "pengguna terdaftar",
                icon:     <Users className="w-5 h-5 text-orange-500" />,
                bg:       "bg-orange-50",
                format:   (v: number) => v.toLocaleString("id-ID"),
              },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-2xl border shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-gray-500">{card.label}</p>
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", card.bg)}>
                    {card.icon}
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {card.format(card.value)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
              </div>
            ))
        }
      </div>

      {/* ── Bottom two cols ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top 10 produk terlaris */}
        <div className="bg-white rounded-2xl border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <p className="font-semibold text-sm">Produk Terlaris</p>
            </div>
            <Link href="/admin/products" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Kelola <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {data?.topProducts.slice(0, 8).map((product, rank) => (
                <div key={product.id} className="flex items-center gap-3 px-5 py-3">
                  {/* Rank */}
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    rank === 0 ? "bg-yellow-100 text-yellow-700" :
                    rank === 1 ? "bg-gray-100 text-gray-600" :
                    rank === 2 ? "bg-orange-50 text-orange-600" :
                    "text-gray-400"
                  )}>
                    {rank + 1}
                  </span>
                  {/* Gambar */}
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={getImageUrl(product.images[0])}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{product.name}</p>
                    <p className="text-xs text-gray-400">{product.category.name}</p>
                  </div>
                  {/* Sold + stok */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-gray-700">
                      {product.soldCount.toLocaleString("id-ID")} terjual
                    </p>
                    <p className={cn(
                      "text-xs",
                      product.stock < 10 ? "text-red-500" : "text-gray-400"
                    )}>
                      stok: {product.stock}
                    </p>
                  </div>
                </div>
              ))}
              {!data?.topProducts.length && (
                <p className="text-sm text-gray-400 text-center py-8">Belum ada data produk</p>
              )}
            </div>
          )}
        </div>

        {/* 10 pesanan terbaru */}
        <div className="bg-white rounded-2xl border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <p className="font-semibold text-sm">Pesanan Terbaru</p>
            </div>
            <Link href="/admin/orders" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Semua <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                  <div className="space-y-1 items-end flex flex-col">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {data?.recentOrders.map(order => (
                <Link
                  key={order.id}
                  href={`/admin/orders`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-gray-800 font-mono truncate">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {order.user.name} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full block mb-1",
                      ORDER_STATUS_COLOR[order.status]
                    )}>
                      {ORDER_STATUS_LABEL[order.status] ?? order.status}
                    </span>
                    <p className="text-xs font-semibold text-gray-700">
                      {formatPrice(order.total)}
                    </p>
                  </div>
                </Link>
              ))}
              {!data?.recentOrders.length && (
                <p className="text-sm text-gray-400 text-center py-8">Belum ada pesanan</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}