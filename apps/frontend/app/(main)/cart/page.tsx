"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, getImageUrl } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import type { Cart } from "@/types";

// ─────────────────────────────────────────────────────────────
// HOOKS YANG DIBUTUHKAN (belum ada, buat setelah UI selesai):
//
//   useCart()  →  hooks/rest/useCart.ts
//     - cart           : Cart | undefined
//     - isLoading      : boolean
//     - isEmpty        : boolean
//     - subtotal       : number
//     - tax            : number
//     - total          : number
//     - updateItem(cartItemId, quantity)   : void
//     - removeItem(cartItemId)             : void
//     - isUpdatingItem : boolean
//     - isRemovingItem : boolean
//
//   Endpoints yang dibutuhkan:
//     GET    /cart
//     PATCH  /cart/items/:cartItemId   { quantity }
//     DELETE /cart/items/:cartItemId
// ─────────────────────────────────────────────────────────────

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: loadingAuth } = useAuth();

  // TODO: ganti ini dengan: const { cart, isLoading, isEmpty, ... } = useCart();
  const isLoading      = false;

  const subtotal       = 0;
  const tax            = 0;
  const total          = 0;

  const isUpdatingItem = false;
  const isRemovingItem = false;
  const updateItem     = (_id: string, _qty: number) => {};
  const removeItem     = (_id: string) => {};

  const isEmpty        = true as boolean;       // hindari literal narrowing
const cart           = null as unknown as Cart;

  // ── Belum login ─────────────────────────────────────────────
  if (!loadingAuth && !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          emoji="🔒"
          title="Login dulu yuk"
          description="Kamu perlu login untuk melihat keranjang belanja."
          action={{ label: "Login Sekarang", onClick: () => router.push(ROUTES.LOGIN) }}
        />
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────
  if (isLoading || loadingAuth) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border p-4 flex gap-4">
                <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="w-full lg:w-72 h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Kosong ──────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          emoji="🛒"
          title="Keranjang kamu kosong"
          description="Yuk mulai belanja dan tambahkan produk favoritmu."
          action={{ label: "Mulai Belanja", onClick: () => router.push(ROUTES.PRODUCTS) }}
        />
      </div>
    );
  }

  const isBusy = isUpdatingItem || isRemovingItem;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        Keranjang Belanja
        <span className="ml-2 text-sm font-normal text-gray-500">
          ({cart?.items?.length ?? 0} item)
        </span>
      </h1>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── List Item ─────────────────────────────────────── */}
        <div className="flex-1 space-y-3">
          {cart?.items?.map(item => {
            const imgUrl = getImageUrl(item.product?.images?.[0]);
            return (
              <div key={item.id} className="bg-white rounded-2xl border shadow-sm p-4 flex gap-4">
                {/* Gambar */}
                <Link href={ROUTES.PRODUCT_DETAIL(item.product.slug)} className="flex-shrink-0">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border">
                    <Image
                      src={imgUrl}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={ROUTES.PRODUCT_DETAIL(item.product.slug)}>
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 hover:text-primary transition-colors">
                      {item.product.name}
                    </p>
                  </Link>
                  <p className="text-base font-bold text-primary mt-1">
                    {formatPrice(item.priceAtTime)}
                  </p>
                  {item.product.stock < item.quantity && (
                    <p className="text-xs text-red-500 mt-0.5">
                      Stok tersisa {item.product.stock}
                    </p>
                  )}

                  {/* Qty control + hapus */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center border rounded-lg overflow-hidden">
                      <button
                        disabled={isBusy || item.quantity <= 1}
                        onClick={() => updateItem(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        disabled={isBusy || item.quantity >= item.product.stock}
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      disabled={isBusy}
                      onClick={() => removeItem(item.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  </div>
                </div>

                {/* Subtotal per item */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-800">
                    {formatPrice(item.priceAtTime * item.quantity)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Ringkasan Order ───────────────────────────────── */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl border shadow-sm p-5 sticky top-20">
            <h2 className="font-semibold text-base mb-4">Ringkasan Belanja</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Subtotal ({cart?.items?.length} item)
                </span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">PPN 10%</span>
                <span className="font-medium">{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Ongkir</span>
                <span>Dihitung saat checkout</span>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between font-bold text-base mb-5">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
            <Button
              className="w-full gap-2 bg-gradient-zenit border-0"
              size="lg"
              onClick={() => router.push("/checkout")}
            >
              Lanjut Checkout <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" className="w-full mt-2 text-sm text-gray-500" asChild>
              <Link href={ROUTES.PRODUCTS}>
                <ShoppingBag className="w-4 h-4 mr-1.5" /> Lanjut Belanja
              </Link>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}