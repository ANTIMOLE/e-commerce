"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, MapPin, Package, Tag, ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useProductDetail } from "@/hooks/useProducts";
import { formatPrice, formatSoldCount, getImageUrl } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { useCart } from "@/hooks/useCart";

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { slug } = use(params);
  const router   = useRouter();
  const { addItem, isAddingItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading, isError } = useProductDetail(slug);

  // ── Loading ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <Skeleton className="w-full md:w-96 aspect-square rounded-2xl" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 flex-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error / Not Found ───────────────────────────────────────
  if (isError || !product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <EmptyState
          emoji="😕"
          title="Produk tidak ditemukan"
          description="Produk ini mungkin sudah tidak tersedia atau linknya salah."
          action={{ label: "Kembali Belanja", onClick: () => router.push(ROUTES.PRODUCTS) }}
        />
      </div>
    );
  }

  const imageUrl    = getImageUrl(product.images[0]);
  const isAvailable = product.stock > 0;
  const discountedPrice = product.discount && product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali
        </button>
        <span>/</span>
        <Link href={ROUTES.PRODUCTS} className="hover:text-primary transition-colors">
          Produk
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              href={`${ROUTES.PRODUCTS}?categoryId=${product.category.id}`}
              className="hover:text-primary transition-colors"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-800 truncate max-w-48">{product.name}</span>
      </nav>

      <div className="flex flex-col md:flex-row gap-8">

        {/* ── Image ───────────────────────────────────────────── */}
        <div className="w-full md:w-96 flex-shrink-0">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 384px"
              priority
            />
            {product.discount && product.discount > 0 ? (
              <span className="absolute top-3 left-3 bg-red-500 text-white text-sm font-bold px-2 py-1 rounded-lg">
                -{product.discount}%
              </span>
            ) : null}
          </div>
        </div>

        {/* ── Info ────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-4">

          {/* Kategori badge */}
          {product.category && (
            <Link href={`${ROUTES.PRODUCTS}?categoryId=${product.category.id}`}>
              <Badge variant="secondary" className="hover:bg-primary/10 transition-colors cursor-pointer">
                {product.category.name}
              </Badge>
            </Link>
          )}

          {/* Nama */}
          <h1 className="text-2xl font-bold leading-snug text-gray-900">
            {product.name}
          </h1>

          {/* Rating + terjual */}
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {product.rating ? (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-gray-700">{product.rating}</span>
              </div>
            ) : null}
            <span>·</span>
            <span>{formatSoldCount(product.soldCount)} terjual</span>
            {product.location && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {product.location}
                </span>
              </>
            )}
          </div>

          {/* Harga */}
          <div className="flex items-end gap-2">
            <p className="text-3xl font-bold text-primary">
              {discountedPrice ? formatPrice(discountedPrice) : formatPrice(product.price)}
            </p>
            {discountedPrice && (
              <p className="text-base text-gray-400 line-through mb-0.5">
                {formatPrice(product.price)}
              </p>
            )}
          </div>

          {/* Stok */}
          <div className={`flex items-center gap-2 text-sm font-medium ${isAvailable ? "text-green-600" : "text-red-500"}`}>
            <Package className="w-4 h-4" />
            {isAvailable ? `Stok tersedia (${product.stock})` : "Stok habis"}
          </div>

          {/* Deskripsi */}
          {product.description && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Deskripsi Produk</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* CTA Buttons */}
          {/* TODO: sambungkan ke useCart setelah hook siap */}
          <div className="flex gap-3 pt-2">


            <Button
              disabled={!isAvailable || isAddingItem}
              onClick={() => addItem({ productId: product.id, quantity })}
            >
              {isAddingItem ? "Menambahkan..." : "Tambah ke Keranjang"}
            </Button>
            <Button
              className="flex-1 gap-2 bg-gradient-zenit border-0"
              disabled={!isAvailable}
            >
              <Zap className="w-4 h-4" />
              Beli Sekarang
            </Button>
          </div>

          {!isAvailable && (
            <p className="text-xs text-red-400 text-center">
              Produk ini sedang habis stok. Coba produk lain yang serupa.
            </p>
          )}

          {/* Info tambahan */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <span>Harga sudah termasuk pajak</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span>Pengiriman ke seluruh Indonesia</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}