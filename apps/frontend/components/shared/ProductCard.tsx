"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { cn, formatPrice, formatSoldCount, getImageUrl, truncate } from "@/lib/utils";
import { PLACEHOLDER_IMAGE, ROUTES } from "@/lib/constants";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  // Fallback chain: images[0] (tokopedia URL) → images[1] (local /public/) → placeholder
  const [imgSrc, setImgSrc] = useState(() => getImageUrl(product.images[0]));

  const handleImageError = () => {
    const localPath = product.images[1]; // e.g. "images/category/slug.jpg"
    if (localPath && imgSrc !== `/${localPath}`) {
      // Try local copy served from /public/
      setImgSrc(`/${localPath}`);
    } else {
      setImgSrc(PLACEHOLDER_IMAGE);
    }
  };

  return (
    <Link
      href={ROUTES.PRODUCT_DETAIL(product.slug)}
      className={cn(
        "group flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden",
        "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <Image
          src={imgSrc}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onError={handleImageError}
        />
        {/* Discount badge */}
        {product.discount && product.discount > 0 ? (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            {product.discount}%
          </span>
        ) : null}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3">
        {/* Name */}
        <p className="text-sm text-gray-800 leading-snug line-clamp-2">
          {truncate(product.name, 60)}
        </p>

        {/* Price */}
        <p className="text-base font-bold text-primary mt-0.5">
          {formatPrice(product.price)}
        </p>

        {/* Rating + Sold */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {product.rating ? (
            <>
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{product.rating}</span>
              <span>·</span>
            </>
          ) : null}
          <span>{formatSoldCount(product.soldCount)} terjual</span>
        </div>

        {/* Location */}
        {product.location ? (
          <p className="text-xs text-gray-400 truncate">{product.location}</p>
        ) : null}
      </div>
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mt-1" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}
