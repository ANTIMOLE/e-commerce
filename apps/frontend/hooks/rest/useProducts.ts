"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { Product, ProductListParams, PaginatedResponse } from "@/types";

// ── useProductList ─────────────────────────────────────────────
export function useProductList(params: ProductListParams = {}) {
  return useQuery<PaginatedResponse<Product>>({
    queryKey: queryKeys.products.list(params),
    queryFn: async () => {
      const res = await api.get("/products", { params });
      return res.data;
    },
    staleTime: 60_000,
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
        params: { sortBy: "soldCount", sortOrder: "desc", limit: 8 },
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
    enabled:   q.length >= 2,
    staleTime: 30_000,
  });
}

// ── useNewArrivals ─────────────────────────────────────────────
export function useNewArrivals() {
  return useQuery<Product[]>({
    queryKey: ["products", "newArrivals"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Product[] }>("/products", {
        params: { sortBy: "createdAt", sortOrder: "desc", limit: 8 },
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
    enabled:   !!categoryId,
    staleTime: 60_000,
  });
}