"use client";

import { trpc }           from "@/lib/trpc";
import type { ProductListParams } from "@/types";

// sortBy dari ProductListParams (string) → enum yang diterima router
type RouterSortBy = "price" | "rating" | "sold_count" | "created_at";

const sortByMap: Record<string, RouterSortBy> = {
  price:      "price",
  rating:     "rating",
  soldCount:  "sold_count",
  sold_count: "sold_count",
  createdAt:  "created_at",
  created_at: "created_at",
};

function mapParams(params: ProductListParams) {
  return {
    page:       params.page,
    limit:      params.limit,
    categoryId: params.categoryId,
    minPrice:   params.minPrice,
    maxPrice:   params.maxPrice,
    minRating:  params.minRating,
    q:          params.q,
    sortOrder:  params.sortOrder as "asc" | "desc" | undefined,
    sortBy:     params.sortBy
      ? (sortByMap[params.sortBy] ?? "created_at")
      : undefined,
  };
}

// ── useProductList ─────────────────────────────────────────────
export function useProductList(params: ProductListParams = {}) {
  return trpc.product.getAll.useQuery(mapParams(params), {
    staleTime: 60_000,
  });
}

// ── useProductDetail ───────────────────────────────────────────
export function useProductDetail(slug: string) {
  return trpc.product.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );
}

// ── useBestsellers ─────────────────────────────────────────────
export function useBestsellers() {
  return trpc.product.getAll.useQuery(
    { sortBy: "sold_count", sortOrder: "desc", limit: 8 },
    { staleTime: 5 * 60_000 }
  );
}

// ── useProductSearch ───────────────────────────────────────────
export function useProductSearch(q: string) {
  return trpc.product.search.useQuery(
    { q },
    {
      enabled:   q.length >= 2,
      staleTime: 30_000,
    }
  );
}

// ── useNewArrivals ─────────────────────────────────────────────
export function useNewArrivals() {
  return trpc.product.getAll.useQuery(
    { sortBy: "created_at", sortOrder: "desc", limit: 8 },
    { staleTime: 5 * 60_000 }
  );
}

// ── useCategoryProducts ────────────────────────────────────────
export function useCategoryProducts(categoryId: string, limit = 12) {
  return trpc.product.getAll.useQuery(
    { categoryId, limit },
    {
      enabled:   !!categoryId,
      staleTime: 60_000,
    }
  );
}
