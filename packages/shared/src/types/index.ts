// ============================================================
// SHARED TYPES
// Dipakai oleh backend-rest dan backend-trpc
// ============================================================

// ── Pagination ───────────────────────────────────────────────
export interface PaginationParams {
  page?:  number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data:        T[];
  totalCount:  number;
  page:        number;
  totalPages:  number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ── Product Query Params ──────────────────────────────────────
export interface ProductQueryParams extends PaginationParams {
  categoryId?: string;
  minPrice?:   number;
  maxPrice?:   number;
  minRating?:  number;
  q?:          string;
  sortBy?:     "price" | "rating" | "sold_count" | "created_at";
  sortOrder?:  "asc" | "desc";
}

// ── Auth ──────────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  email:  string;
  role:   "USER" | "ADMIN";  // ← added
  iat?:   number;
  exp?:   number;
}

export interface TokenPair {
  accessToken:  string;
  refreshToken: string;
}

// ── Order ─────────────────────────────────────────────────────
export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentMethodCode  = "bank_transfer" | "qris" | "cod";
export type ShippingMethodCode = "regular" | "express";

export interface ShippingOption {
  code:          ShippingMethodCode;
  name:          string;
  description:   string;
  estimatedDays: string;
  price:         number;
}

export interface PaymentOption {
  code:        PaymentMethodCode;
  name:        string;
  description: string;
}

// ── Shipping & Payment Constants ──────────────────────────────
export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    code:          "regular",
    name:          "Regular",
    description:   "Estimasi 3-5 hari kerja",
    estimatedDays: "3-5",
    price:         15_000,
  },
  {
    code:          "express",
    name:          "Express",
    description:   "Estimasi 1-2 hari kerja",
    estimatedDays: "1-2",
    price:         35_000,
  },
];

export const PAYMENT_OPTIONS: PaymentOption[] = [
  { code: "bank_transfer", name: "Transfer Bank",          description: "BCA, Mandiri, BNI, BRI" },
  { code: "qris",          name: "QRIS",                   description: "Scan QR dari semua aplikasi dompet digital" },
  { code: "cod",           name: "COD (Bayar di Tempat)",  description: "Bayar saat paket tiba" },
];

export const TAX_RATE = 0.11;

// ── User ──────────────────────────────────────────────────────
export interface User {
  id:        string;
  name:      string;
  email:     string;
  role:      "USER" | "ADMIN";
  phone?:    string | null;
  createdAt: string;
}

// ── Input Types ───────────────────────────────────────────────
// export interface LoginInput {
//   email:        string;
//   password:     string;
//   captchaToken?: string;
// }

// export interface RegisterInput {
//   name:     string;
//   email:    string;
//   password: string;
// }
