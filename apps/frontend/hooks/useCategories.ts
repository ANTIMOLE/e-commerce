"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { MOCK_CATEGORIES } from "@/lib/mock/categories";
import type { Category } from "@/types";

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: queryKeys.categories.list(),
    queryFn: async () => {
      // TODO: ganti dengan api.get("/categories")
      await new Promise(r => setTimeout(r, 100));
      return MOCK_CATEGORIES;
    },
    staleTime: 10 * 60_000, // kategori jarang berubah
  });
}
