"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { Category } from "@/types";

// ── useCategories ──────────────────────────────────────────────
// GET /categories → list semua kategori
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: queryKeys.categories.list(),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Category[] }>("/categories");
      return res.data.data;
    },
    staleTime: 10 * 60_000, // 10 menit — kategori jarang berubah
  });
}

// ── useCategoryDetail ──────────────────────────────────────────
// GET /categories/:slug → detail satu kategori
export function useCategoryDetail(slug: string) {
  return useQuery<Category>({
    queryKey: queryKeys.categories.detail(slug),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Category }>(`/categories/${slug}`);
      return res.data.data;
    },
    enabled: !!slug,
  });
}