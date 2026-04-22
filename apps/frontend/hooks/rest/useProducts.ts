"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { Product, ProductListParams, PaginatedResponse } from "@/types";

// ── useProductList ─────────────────────────────────────────────
// Mapping camelCase → snake_case untuk sortBy
const SORT_BY_MAP: Record<string, string> = {
  createdAt:  "created_at",
  soldCount:  "sold_count",
  price:      "price",
  rating:     "rating",
};

export function useProductList(params: ProductListParams = {}) {
  return useQuery<PaginatedResponse<Product>>({
    queryKey: queryKeys.products.list(params),
    queryFn: async () => {
      // 1. Bersihkan params dari null, undefined, atau string kosong
      const filteredParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v != null && v !== "")
      );

      // 2. Transform sortBy (pastiin filteredParams ada isinya)
      if (filteredParams.sortBy) {
        filteredParams.sortBy = SORT_BY_MAP[filteredParams.sortBy as string] ?? filteredParams.sortBy;
      }

      console.log("Fetching with params:", filteredParams); // Debug di console browser

      const res = await api.get("/products", { params: filteredParams });
      return res.data;
    },
    staleTime: 60_000,
    enabled: true,
  });
}

// ── useProductDetail ───────────────────────────────────────────
export function useProductDetail(slug: string) {
  return useQuery<Product>({
    queryKey: queryKeys.products.detail(slug),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Product }>(`/products/${slug}`);
      return res.data.data;
    },
    enabled: !!slug,
  });
}

// ── useBestsellers ─────────────────────────────────────────────
export function useBestsellers() {
  return useQuery<Product[]>({
    queryKey: queryKeys.products.bestsellers(),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Product[] }>("/products", {
        params: { sortBy: "sold_count", sortOrder: "desc", limit: 8 },
      });
      return res.data.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── useProductSearch ───────────────────────────────────────────
export function useProductSearch(q: string) {
  return useQuery<Product[]>({
    queryKey: queryKeys.products.search(q),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Product[] }>("/products/search", {
        params: { q },
      });
      return res.data.data;
    },
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}

// ── useNewArrivals ─────────────────────────────────────────────
export function useNewArrivals() {
  return useQuery<Product[]>({
    queryKey: ["products", "newArrivals"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Product[] }>("/products", {
        params: { sortBy: "created_at", sortOrder: "desc", limit: 8 },
      });
      return res.data.data;
    },
    staleTime: 5 * 60_000,
  });
}

// ── useCategoryProducts ────────────────────────────────────────
export function useCategoryProducts(categoryId: string, limit = 12) {
  return useQuery<Product[]>({
    queryKey: ["products", "category", categoryId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Product[] }>("/products", {
        params: { categoryId, limit },
      });
      return res.data.data;
    },
    enabled: !!categoryId,
    staleTime: 60_000,
  });
}
