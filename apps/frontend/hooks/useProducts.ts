"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { MOCK_PRODUCTS } from "@/lib/mock/products";
import type { Product, ProductListParams, PaginatedResponse } from "@/types";

// ── useProductList ─────────────────────────────────────────────
// Ambil list produk dengan filter & pagination
export function useProductList(params: ProductListParams = {}) {
  return useQuery<PaginatedResponse<Product>>({
    queryKey: queryKeys.products.list(params),
    queryFn: async () => {
      // TODO: ganti dengan api.get("/products", { params }) kalau backend sudah jalan
      await new Promise(r => setTimeout(r, 300)); // simulasi network delay

      let filtered = [...MOCK_PRODUCTS];

      if (params.categoryId)
        filtered = filtered.filter(p => p.categoryId === params.categoryId);
      if (params.q)
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(params.q!.toLowerCase())
        );
      if (params.minPrice)
        filtered = filtered.filter(p => p.price >= params.minPrice!);
      if (params.maxPrice)
        filtered = filtered.filter(p => p.price <= params.maxPrice!);

      // Sort
      if (params.sortBy === "price")
        filtered.sort((a, b) => params.sortOrder === "asc" ? a.price - b.price : b.price - a.price);
      else if (params.sortBy === "rating")
        filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      else if (params.sortBy === "sold_count")
        filtered.sort((a, b) => b.soldCount - a.soldCount);

      // Pagination
      const page  = params.page  ?? 1;
      const limit = params.limit ?? 12;
      const start = (page - 1) * limit;
      const data  = filtered.slice(start, start + limit);

      return {
        data,
        totalCount:  filtered.length,
        page,
        totalPages:  Math.ceil(filtered.length / limit),
        hasNextPage: start + limit < filtered.length,
        hasPrevPage: page > 1,
      };
    },
    staleTime: 60_000,
  });
}

// ── useProductDetail ───────────────────────────────────────────
// Ambil satu produk by slug
export function useProductDetail(slug: string) {
  return useQuery<Product>({
    queryKey: queryKeys.products.detail(slug),
    queryFn: async () => {
      // TODO: ganti dengan api.get(`/products/${slug}`)
      await new Promise(r => setTimeout(r, 200));
      const product = MOCK_PRODUCTS.find(p => p.slug === slug);
      if (!product) throw new Error("Produk tidak ditemukan");
      return product;
    },
    enabled: !!slug,
  });
}

// ── useBestsellers ─────────────────────────────────────────────
export function useBestsellers() {
  return useQuery<Product[]>({
    queryKey: queryKeys.products.bestsellers(),
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 200));
      return MOCK_PRODUCTS.sort((a, b) => b.soldCount - a.soldCount).slice(0, 8);
    },
    staleTime: 5 * 60_000,
  });
}

// ── useProductSearch ───────────────────────────────────────────
export function useProductSearch(q: string) {
  return useQuery<Product[]>({
    queryKey: queryKeys.products.search(q),
    queryFn: async () => {
      // TODO: ganti dengan api.get("/products/search", { params: { q } })
      await new Promise(r => setTimeout(r, 150));
      return MOCK_PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 5);
    },
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}
