"use client";

import { trpc } from "@/lib/trpc";

// ── useCategories ──────────────────────────────────────────────
// Mirrors rest/useCategories.useCategories()
export function useCategories() {
  return trpc.category.getAll.useQuery(undefined, {
    staleTime: 10 * 60_000,
  });
}

// ── useCategoryDetail ──────────────────────────────────────────
// Mirrors rest/useCategories.useCategoryDetail()
export function useCategoryDetail(slug: string) {
  return trpc.category.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );
}
