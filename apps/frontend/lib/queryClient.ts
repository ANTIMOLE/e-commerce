// ============================================================
// TANSTACK QUERY — queryClient.ts
//
// KONSEP SINGKAT untuk yang belum pernah pakai:
//
// TanStack Query itu "server state manager" — dia yang
// handle fetching, caching, refetching, loading/error state.
//
// Cara kerja simpelnya:
//   useQuery(key, fetchFn)  → GET data (otomatis cache)
//   useMutation(fetchFn)    → POST/PUT/DELETE data
//
// QueryClient = "otak" yang nyimpen semua cache & config.
// QueryClientProvider = wrapper di _app/layout yang kasih
// akses queryClient ke semua komponen.
// ============================================================

import { QueryClient } from "@tanstack/react-query";

// ── Default Config ────────────────────────────────────────────
// Ini setting global untuk SEMUA query di seluruh app.
// Bisa di-override per query kalau perlu.

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Berapa lama data dianggap "fresh" (tidak perlu refetch)
      // 60 detik — cocok untuk data produk yang tidak berubah cepat
      staleTime: 60 * 1000,

      // Berapa lama cache disimpan setelah komponen unmount
      // 5 menit — user bisa back ke halaman produk tanpa refetch
      gcTime: 5 * 60 * 1000,

      // Retry otomatis kalau query gagal — maksimal 1x
      // (default 3x, terlalu banyak untuk penelitian)
      retry: 1,

      // Jangan refetch saat user kembali ke tab browser
      // (bisa bikin metric testing tidak konsisten)
      refetchOnWindowFocus: false,

      // Refetch kalau koneksi internet reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Jangan retry mutation yang gagal
      // (POST/DELETE tidak boleh double-execute)
      retry: false,
    },
  },
});

// ── Query Keys ────────────────────────────────────────────────
// Centralize semua query keys di satu tempat.
// Penting buat invalidateQueries yang presisi.
//
// Pattern: [scope, identifier, params]
// Contoh:  ["products", "list", { page: 1, category: "xyz" }]

export const queryKeys = {
  // Auth
  auth: {
    me: ["auth", "me"] as const,
  },

  // Products
  products: {
    all:         ["products"] as const,
    lists:       () => [...queryKeys.products.all, "list"] as const,
    list:        (params: object) => [...queryKeys.products.lists(), params] as const,
    details:     () => [...queryKeys.products.all, "detail"] as const,
    detail:      (slug: string) => [...queryKeys.products.details(), slug] as const,
    related:     (id: string) => [...queryKeys.products.all, "related", id] as const,
    bestsellers: () => [...queryKeys.products.all, "bestsellers"] as const,
    search:      (q: string) => [...queryKeys.products.all, "search", q] as const,
  },

  // Categories
  categories: {
    all:    ["categories"] as const,
    list:   () => [...queryKeys.categories.all, "list"] as const,
    detail: (id: string) => [...queryKeys.categories.all, id] as const,
  },

  // Cart
  cart: {
    all:     ["cart"] as const,
    current: () => [...queryKeys.cart.all, "current"] as const,
  },

  // Orders
  orders: {
    all:    ["orders"] as const,
    lists:  () => [...queryKeys.orders.all, "list"] as const,
    list:   (params: object) => [...queryKeys.orders.lists(), params] as const,
    detail: (id: string) => [...queryKeys.orders.all, id] as const,
  },

  // Profile
  profile: {
    all:       ["profile"] as const,
    me:        () => [...queryKeys.profile.all, "me"] as const,
    addresses: () => [...queryKeys.profile.all, "addresses"] as const,
  },

  // Checkout
  checkout: {
    all:      ["checkout"] as const,
    shipping: () => [...queryKeys.checkout.all, "shipping"] as const,
    payment:  () => [...queryKeys.checkout.all, "payment"] as const,
  },
} as const;

// ── Invalidation Helpers ──────────────────────────────────────
// Shortcut untuk invalidate cache setelah mutation sukses.
// Dipanggil di onSuccess callback mutation.

export const invalidateQueries = {
  // Setelah tambah/hapus/update cart item
  cart: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),

  // Setelah checkout sukses — invalidate cart + orders
  afterCheckout: () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
    ]),

  // Setelah update profil atau tambah alamat
  profile: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.all }),

  // Setelah update stok produk (kalau ada fitur admin nanti)
  products: () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
};