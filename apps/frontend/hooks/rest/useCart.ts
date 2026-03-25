"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// ── Types untuk raw cart dari backend ─────────────────────────
// Backend mengembalikan bentuk ini (dari cart.service.ts cartSelect)
interface RawCartItem {
  id:          string;
  productId:   string;
  quantity:    number;
  priceAtTime: string | number;  // Prisma Decimal → string
  product: {
    name:        string;
    images:      string[];
    categoryId:  string;
    slug:        string;
    price:       string | number;
    stock:       number;
    discount:    number | null;
    description: string | null;
  };
}

interface RawCart {
  id:     string;
  userId: string;
  status: string;
  items:  RawCartItem[];
}

// ── Helper: hitung derived values ─────────────────────────────
function computeCartSummary(cart: RawCart | undefined) {
  if (!cart) return { subtotal: 0, tax: 0, total: 0, itemCount: 0 };
  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.priceAtTime) * item.quantity, 0
  );
  const tax   = Math.round(subtotal * 0.1);
  const total = subtotal + tax;
  return { subtotal, tax, total, itemCount: cart.items.length };
}

// ============================================================
// useCart — semua operasi keranjang belanja
// ============================================================
export function useCart() {
  const qc                               = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // ── GET /cart ────────────────────────────────────────────
  const {
    data: rawCart,
    isLoading: isLoadingCart,
    isError,
  } = useQuery<RawCart>({
    queryKey: queryKeys.cart.current(),
    queryFn:  async () => {
      const res = await api.get<{ success: boolean; data: RawCart }>("/cart");
      return res.data.data;
    },
    // Hanya fetch kalau user sudah login
    enabled:   isAuthenticated && !authLoading,
    staleTime: 30_000,
    retry:     1,
  });

  const { subtotal, tax, total, itemCount } = computeCartSummary(rawCart);
  const isEmpty  = !rawCart || rawCart.items.length === 0;
  const isLoading = isLoadingCart || authLoading;

  // ── POST /cart/items ─────────────────────────────────────
  const { mutateAsync: addItem, isPending: isAddingItem } = useMutation({
    mutationFn: async (input: { productId: string; quantity: number }) => {
      const res = await api.post<{ success: boolean; message: string }>(
        "/cart", input
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cart.all });
      toast.success("Produk ditambahkan ke keranjang");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // ── PATCH /cart/items/:cartItemId ─────────────────────────
  const { mutateAsync: updateItem, isPending: isUpdatingItem } = useMutation({
    mutationFn: async ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) => {
      const res = await api.patch<{ success: boolean }>(
        `/cart/${cartItemId}`, { quantity }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // ── DELETE /cart/items/:cartItemId ────────────────────────
  const { mutateAsync: removeItem, isPending: isRemovingItem } = useMutation({
    mutationFn: async (cartItemId: string) => {
      await api.delete(`/cart/${cartItemId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cart.all });
      toast.success("Item dihapus dari keranjang");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // ── DELETE /cart (clear all) ──────────────────────────────
  const { mutateAsync: clearCart, isPending: isClearing } = useMutation({
    mutationFn: async () => {
      await api.delete("/cart");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cart.all });
      toast.success("Keranjang dikosongkan");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const isMutating = isAddingItem || isUpdatingItem || isRemovingItem || isClearing;

  return {
    cart:           rawCart,
    isLoading,
    isError,
    isEmpty,
    itemCount,
    subtotal,
    tax,
    total,
    isMutating,
    // mutations
    addItem,        isAddingItem,
    updateItem,     isUpdatingItem,
    removeItem,     isRemovingItem,
    clearCart,      isClearing,
  };
}