"use client";

import { useQueryClient }  from "@tanstack/react-query";
import { trpc }            from "@/lib/trpc";
import { queryKeys }       from "@/lib/queryClient";
import { toast }           from "sonner";
import { useAuth }         from "@/hooks/useAuth";

// Shape returned by cart.service getCartByUserId (cartSelect)
interface RawCartProduct {
  name:        string;
  images:      string[];
  categoryId:  string;
  slug:        string;
  price:       string | number;
  stock:       number;
  discount:    number | null;
  description: string | null;
}

interface RawCartItem {
  id:          string;
  productId:   string;
  quantity:    number;
  priceAtTime: string | number;
  product:     RawCartProduct;
}

interface RawCart {
  id:     string;
  userId: string;
  status: string;
  items:  RawCartItem[];
}

function computeCartSummary(cart: RawCart | null | undefined) {
  if (!cart) return { subtotal: 0, tax: 0, total: 0, itemCount: 0 };
  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.priceAtTime) * item.quantity, 0
  );
  const tax   = Math.round(subtotal * 0.11);
  const total = subtotal + tax;
  return { subtotal, tax, total, itemCount: cart.items.length };
}

export function useCart() {
  const qc                                          = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    data:      rawCart,
    isLoading: isLoadingCart,
    isError,
  } = trpc.cart.get.useQuery(undefined, {
    enabled:   isAuthenticated && !authLoading,
    staleTime: 30_000,
    retry:     1,
  });

  // tRPC returns the exact RawCart shape from cart.service — cast once here
  const typedCart = rawCart as RawCart | undefined;
  const { subtotal, tax, total, itemCount } = computeCartSummary(typedCart);
  const isEmpty   = !typedCart || typedCart.items.length === 0;
  const isLoading = isLoadingCart || authLoading;

  // ganti di dalam useCart():
  const utils = trpc.useUtils();

  // FIX [High]: invalidate cache key tRPC cart.get, bukan queryKeys.cart.all (REST key)
  function invalidateCart() {
    void utils.cart.get.invalidate();
  }

  const { mutateAsync: addItem, isPending: isAddingItem } =
    trpc.cart.addItem.useMutation({
      onSuccess: () => { invalidateCart(); toast.success("Produk ditambahkan ke keranjang"); },
      onError:   (err: { message: string }) => toast.error(err.message),
    });

  const { mutateAsync: updateItem, isPending: isUpdatingItem } =
    trpc.cart.updateItem.useMutation({
      onSuccess: () => invalidateCart(),
      onError:   (err: { message: string }) => toast.error(err.message),
    });

  const { mutateAsync: removeItem, isPending: isRemovingItem } =
    trpc.cart.removeItem.useMutation({
      onSuccess: () => { invalidateCart(); toast.success("Item dihapus dari keranjang"); },
      onError:   (err: { message: string }) => toast.error(err.message),
    });

  const { mutateAsync: clearCart, isPending: isClearing } =
    trpc.cart.clear.useMutation({
      onSuccess: () => { invalidateCart(); toast.success("Keranjang dikosongkan"); },
      onError:   (err: { message: string }) => toast.error(err.message),
    });

  const isMutating = isAddingItem || isUpdatingItem || isRemovingItem || isClearing;

  return {
    cart:      typedCart,
    isLoading,
    isError,
    isEmpty,
    itemCount,
    subtotal,
    tax,
    total,
    isMutating,
    addItem,    isAddingItem,
    updateItem, isUpdatingItem,
    removeItem, isRemovingItem,
    clearCart,  isClearing,
  };
}
