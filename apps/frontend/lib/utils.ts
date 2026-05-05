import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCY, LOCALE, PLACEHOLDER_IMAGE } from "./constants";

// ── Tailwind className merger ─────────────────────────────────
// Pake ini SELALU untuk gabungin className, bukan string biasa
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency Formatter ────────────────────────────────────────
export function formatPrice(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(LOCALE, {
    style:    "currency",
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// ── Sold Count Formatter ──────────────────────────────────────
// Output: "1.2rb", "50rb+", "1jt+"
export function formatSoldCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}jt+`;
  if (count >= 1_000)     return `${(count / 1_000).toFixed(1)}rb+`;
  return count.toString();
}

// ── Date Formatter ────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day:   "numeric",
    month: "long",
    year:  "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day:    "numeric",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// ── Slug Generator ────────────────────────────────────────────
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// ── Image URL Handler ─────────────────────────────────────────
// [FIX] Hapus x-expires check — check ini menyebabkan fungsi return PLACEHOLDER_IMAGE
// sebelum browser sempat mencoba fetch URL. Akibatnya onError di Image/img tidak
// pernah firing, sehingga fallback chain ke images[1] lokal tidak pernah berjalan.
//
// Sekarang: return url mentah, biarkan browser yang mencoba. Kalau gagal (expired/404),
// browser trigger onError di element — caller harus pasang onError untuk fallback.
// Null/empty tetap return PLACEHOLDER_IMAGE karena tidak ada URL yang bisa dicoba.
export function getImageUrl(url: string | null | undefined): string {
  if (!url || url.trim() === "") return PLACEHOLDER_IMAGE;
  return url;
}

// ── Tax Calculator ────────────────────────────────────────────
export function calculateTax(subtotal: number, rate = 0.11): number {
  return Math.round(subtotal * rate);
}

export function calculateTotal(subtotal: number, tax: number, shipping: number): number {
  return subtotal + tax + shipping;
}

// ── Order Number Generator ────────────────────────────────────
export function generateOrderNumber(): string {
  const date   = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${date}-${random}`;
}

// ── Pagination Helper ─────────────────────────────────────────
export function getPaginationRange(current: number, total: number, delta = 2): (number | "...")[] {
  const range: (number | "...")[] = [];
  const left  = current - delta;
  const right = current + delta;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= left && i <= right)) {
      range.push(i);
    } else if (i === left - 1 || i === right + 1) {
      range.push("...");
    }
  }
  return range;
}

// ── Parse Sort Param ──────────────────────────────────────────
export function parseSortParam(sort: string): { field: string; order: "asc" | "desc" } {
  const [field, order] = sort.split(":");
  return { field, order: (order ?? "desc") as "asc" | "desc" };
}

// ── Truncate Text ─────────────────────────────────────────────
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

// ── Safe JSON Parse ───────────────────────────────────────────
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

// ── Debounce ──────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
