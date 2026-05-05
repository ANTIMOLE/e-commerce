"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCard, ProductCardSkeleton } from "@/components/shared/ProductCard";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { useProductList } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { SORT_OPTIONS, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ProductListParams } from "@/types";


// [FIX] parseNumParam: aman untuk nilai 0
// Number("") === 0 dan Number(null) === 0, keduanya falsish → || undefined gagal untuk nilai 0.
// Cek string kosong/null terlebih dahulu sebelum konversi.
function parseNumParam(s: string | null | undefined): number | undefined {
  if (s === null || s === undefined || s.trim() === "") return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

export default function ProductsPage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  // ── Baca params dari URL ────────────────────────────────────
  const [params, setParams] = useState<ProductListParams>({
    page:       Number(searchParams.get("page"))       || 1,
    limit:      DEFAULT_PAGE_SIZE,
    categoryId: searchParams.get("categoryId")         || undefined,
    q:          searchParams.get("q")                  || undefined,
    minPrice:   parseNumParam(searchParams.get("minPrice")),
    maxPrice:   parseNumParam(searchParams.get("maxPrice")),
    minRating: parseNumParam(searchParams.get("minRating")),
    sortBy:     (searchParams.get("sortBy") as ProductListParams["sortBy"]) || "createdAt",
    sortOrder:  (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
  });

  const [searchInput, setSearchInput] = useState(params.q ?? "");
  const [minPriceInput, setMinPriceInput] = useState(params.minPrice?.toString() ?? "");
  const [maxPriceInput, setMaxPriceInput] = useState(params.maxPrice?.toString() ?? "");

  const { data: result,     isLoading } = useProductList(params);
  const { data: categories, isLoading: loadingCats } = useCategories();

  // ── Update URL saat params berubah ─────────────────────────
  useEffect(() => {
    const p = new URLSearchParams();
    if (params.page && params.page > 1)  p.set("page", String(params.page));
    if (params.categoryId)               p.set("categoryId", params.categoryId);
    if (params.q)                        p.set("q", params.q);
    if (params.minPrice != null)         p.set("minPrice", String(params.minPrice));
    if (params.maxPrice != null)         p.set("maxPrice", String(params.maxPrice));
    if (params.minRating != null) p.set("minRating", String(params.minRating));
    if (params.sortBy && params.sortBy !== "createdAt") p.set("sortBy", params.sortBy);
    if (params.sortOrder && params.sortOrder !== "desc") p.set("sortOrder", params.sortOrder);
    router.replace(`/products${p.toString() ? `?${p.toString()}` : ""}`, { scroll: false });
  }, [params, router]);

  // ── Helpers ────────────────────────────────────────────────
  function setParam<K extends keyof ProductListParams>(key: K, value: ProductListParams[K]) {
    setParams(prev => ({ ...prev, [key]: value, page: 1 }));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setParam("q", searchInput.trim() || undefined);
  }

  function applyPriceFilter() {
    setParams(prev => ({
      ...prev,
      minPrice: parseNumParam(minPriceInput),
      maxPrice: parseNumParam(maxPriceInput),
      page: 1,
    }));
  }

  function clearAllFilters() {
    setParams({ page: 1, limit: DEFAULT_PAGE_SIZE, sortBy: "createdAt", sortOrder: "desc" });
    setSearchInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
  }

  function handleSortChange(value: string) {
    const [sortBy, sortOrder] = value.split(":") as [ProductListParams["sortBy"], "asc" | "desc"];
    setParams(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
  }

  const sortValue    = `${params.sortBy ?? "createdAt"}:${params.sortOrder ?? "desc"}`;
  const activeFilters = [
    params.categoryId && categories?.find(c => c.id === params.categoryId)?.name,
    params.q          && `"${params.q}"`,
    (params.minPrice != null || params.maxPrice != null) && `Rp ${params.minPrice?.toLocaleString("id-ID") ?? "0"} – ${params.maxPrice?.toLocaleString("id-ID") ?? "∞"}`,
    params.minRating != null && `⭐ ${params.minRating}+`,
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {params.q
              ? `Hasil pencarian: "${params.q}"`
              : params.categoryId
                ? (categories?.find(c => c.id === params.categoryId)?.name ?? "Produk")
                : "Semua Produk"
            }
          </h1>
          {result && (
            <p className="text-sm text-gray-500">
              {result.totalCount.toLocaleString("id-ID")} produk ditemukan
            </p>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <Select value={sortValue} onValueChange={handleSortChange}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filter
            {activeFilters.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFilters.length}
              </Badge>
            )}
            <ChevronDown className={cn("w-3 h-3 transition-transform", showFilters && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* ── Active filters chips ─────────────────────────────── */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((f, i) => (
            <Badge key={i} variant="secondary" className="gap-1 pl-2 pr-1 py-1 text-xs">
              {f}
            </Badge>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-xs text-red-500 hover:underline flex items-center gap-0.5"
          >
            <X className="w-3 h-3" /> Hapus semua
          </button>
        </div>
      )}

      <div className="flex gap-6">

        {/* ── Sidebar Filter ──────────────────────────────────── */}
        {showFilters && (
          <aside className="w-60 flex-shrink-0 space-y-6">

            {/* Search */}
            <div>
              <p className="text-sm font-semibold mb-2">Cari Produk</p>
              <form onSubmit={handleSearch} className="flex gap-1.5">
                <Input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Nama produk..."
                  className="h-8 text-sm"
                />
                <Button type="submit" size="icon" className="h-8 w-8 flex-shrink-0">
                  <Search className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>

            {/* Kategori */}
            <div>
              <p className="text-sm font-semibold mb-2">Kategori</p>
              <div className="space-y-1">
                <button
                  onClick={() => setParam("categoryId", undefined)}
                  className={cn(
                    "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                    !params.categoryId
                      ? "bg-primary text-white font-medium"
                      : "hover:bg-gray-100 text-gray-700"
                  )}
                >
                  Semua Kategori
                </button>
                {loadingCats
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-7 bg-gray-100 rounded-md animate-pulse" />
                    ))
                  : categories?.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setParam("categoryId", cat.id)}
                        className={cn(
                          "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                          params.categoryId === cat.id
                            ? "bg-primary text-white font-medium"
                            : "hover:bg-gray-100 text-gray-700"
                        )}
                      >
                        {cat.name}
                        {cat.productCount !== undefined && (
                          <span className="ml-1 text-xs opacity-60">({cat.productCount})</span>
                        )}
                      </button>
                    ))
                }
              </div>
            </div>

            {/* Harga */}
            <div>
              <p className="text-sm font-semibold mb-2">Rentang Harga</p>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Harga minimum"
                  value={minPriceInput}
                  onChange={e => setMinPriceInput(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  placeholder="Harga maksimum"
                  value={maxPriceInput}
                  onChange={e => setMaxPriceInput(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs"
                  onClick={applyPriceFilter}
                >
                  Terapkan
                </Button>
              </div>
            </div>

            {/* Rating */}
            <div>
              <p className="text-sm font-semibold mb-2">Rating Minimum</p>
              <div className="space-y-1">
                {[null, 4, 3, 2].map(r => (
                  <button
                    key={r ?? "all"}
                    onClick={() => setParam("minRating", r ?? undefined)}
                    className={cn(
                      "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                      params.minRating === r
                        ? "bg-primary text-white font-medium"
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    {r ? `⭐ ${r}+` : "Semua Rating"}
                  </button>
                ))}
              </div>
            </div>

          </aside>
        )}

        {/* ── Product Grid ────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {isLoading ? (
            <div className={cn(
              "grid gap-4",
              showFilters
                ? "grid-cols-2 sm:grid-cols-3"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
            )}>
              {Array.from({ length: DEFAULT_PAGE_SIZE }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : !result?.data?.length ? (
            <EmptyState
              emoji="🔍"
              title="Produk tidak ditemukan"
              description="Coba ubah kata kunci atau filter pencarian kamu."
              action={{ label: "Reset Filter", onClick: clearAllFilters }}
            />
          ) : (
            <>
              <div className={cn(
                "grid gap-4",
                showFilters
                  ? "grid-cols-2 sm:grid-cols-3"
                  : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
              )}>
                {result.data.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {result.totalPages > 1 && (
                <Pagination
                  className="mt-8"
                  currentPage={params.page ?? 1}
                  totalPages={result.totalPages}
                  onPageChange={page => setParams(prev => ({ ...prev, page }))}
                />
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
