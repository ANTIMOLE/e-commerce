// ============================================================
// CONSTANTS
// All hardcoded values in one place — change here, applies everywhere
// ============================================================

// ── API ──────────────────────────────────────────────────────
export const API_BASE_URL = process.env.NEXT_PUBLIC_REST_API_URL ?? "http://localhost:4000/api/v1";
export const TRPC_BASE_URL = process.env.NEXT_PUBLIC_TRPC_API_URL ?? "http://localhost:4001/trpc";

// ── Pagination ───────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

// ── Cart ─────────────────────────────────────────────────────
export const MAX_CART_ITEMS = 20;
export const MAX_ITEM_QUANTITY = 99;

// ── Tax & Shipping ────────────────────────────────────────────
export const TAX_RATE = 0.11; // 11%

export const SHIPPING_OPTIONS = [
  {
    code: "regular",
    name: "Regular",
    description: "Estimasi 3-5 hari kerja",
    estimatedDays: "3-5",
    price: 15_000,
  },
  {
    code: "express",
    name: "Express",
    description: "Estimasi 1-2 hari kerja",
    estimatedDays: "1-2",
    price: 35_000,
  },
] as const;

export const PAYMENT_METHODS = [
  {
    code: "bank_transfer",
    name: "Transfer Bank",
    description: "BCA, Mandiri, BNI, BRI",
  },
  {
    code: "qris",
    name: "QRIS",
    description: "Scan QR dari semua aplikasi dompet digital",
  },
  {
    code: "cod",
    name: "COD (Bayar di Tempat)",
    description: "Bayar saat paket tiba",
  },
] as const;

// ── Order Status ─────────────────────────────────────────────
export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Menunggu Pembayaran",
  confirmed:       "Dikonfirmasi",
  processing:      "Diproses",
  shipped:         "Dikirim",
  delivered:       "Selesai",
  cancelled:       "Dibatalkan",
};

export const ORDER_STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  confirmed:       "bg-blue-100 text-blue-800",
  processing:      "bg-purple-100 text-purple-800",
  shipped:         "bg-indigo-100 text-indigo-800",
  delivered:       "bg-green-100 text-green-800",
  cancelled:       "bg-red-100 text-red-800",
};

// ── Sort Options ──────────────────────────────────────────────
export const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Terbaru" },
  { value: "sold_count:desc", label: "Terlaris" },
  { value: "rating:desc",     label: "Rating Tertinggi" },
  { value: "price:asc",       label: "Harga Terendah" },
  { value: "price:desc",      label: "Harga Tertinggi" },
] as const;

// ── Auth ──────────────────────────────────────────────────────
export const ACCESS_TOKEN_KEY  = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const TOKEN_EXPIRY_BUFFER = 60; // seconds — refresh 60 detik sebelum expire

// ── Routes ────────────────────────────────────────────────────
export const ROUTES = {
  HOME:            "/",
  PRODUCTS:        "/products",
  PRODUCT_DETAIL:  (slug: string) => `/products/${slug}`,
  CART:            "/cart",
  CHECKOUT: {
    ADDRESS:  "/checkout/address",
    SHIPPING: "/checkout/shipping",
    PAYMENT:  "/checkout/payment",
    // FIX [Medium]: success page membaca params via useSearchParams() (query string),
    // bukan route param. Helper lama menunjuk ke path yang tidak ada.
    SUCCESS:  (orderId: string, orderNumber?: string) =>
      `/checkout/success?orderId=${orderId}${orderNumber ? `&orderNumber=${orderNumber}` : ""}`,
  },
  ORDERS:       "/orders",
  ORDER_DETAIL: (id: string) => `/orders/${id}`,
  PROFILE:      "/profile",
  LOGIN:        "/login",
  REGISTER:     "/register",
} as const;

// ── Misc ──────────────────────────────────────────────────────
export const PLACEHOLDER_IMAGE = "/images/placeholder-product.png";
export const CURRENCY = "IDR";
export const LOCALE   = "id-ID";
