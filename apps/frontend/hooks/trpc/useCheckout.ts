"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { ShippingMethodCode } from "@/types";

export function useAddresses() {
  return trpc.profile.getAddresses.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
}

// ── useCheckoutSummary ────────────────────────────────────────
// Race condition guard yang benar untuk TanStack Query v5.
//
// CARA SALAH (versi sebelumnya):
//   Mengirim requestId lewat `meta` pada mutate() lalu baca dari
//   argumen ketiga `context` di onSuccess. Ini tidak bekerja di
//   TanStack Query v5 karena argumen ketiga callback useMutation
//   bukan object meta — bisa undefined dan langsung crash.
//
// CARA BENAR (versi ini):
//   Pakai per-call callbacks di argumen kedua mutate().
//   Di TanStack Query v5, mutate(vars, { onSuccess, onError })
//   menerima callback per-call yang jalan sebagai closure — sehingga
//   requestId dari scope useEffect langsung ter-capture tanpa perlu
//   dikirim lewat meta atau context.
// ─────────────────────────────────────────────────────────────
export interface CheckoutSummaryResult {
  subtotal:     number;
  tax:          number;
  shippingCost: number;
  total:        number;
}

export function useCheckoutSummary(
  cartId: string | undefined,
  shippingMethod: ShippingMethodCode
) {
  const [data,      setData]      = useState<CheckoutSummaryResult | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Counter request — hanya disimpan di ref, tidak trigger re-render
  const latestRequestId = useRef(0);

  const mutation = trpc.checkout.calculateSummary.useMutation();

  useEffect(() => {
    if (!cartId) return;

    // Naikkan counter dan capture nilai saat ini di closure
    const requestId = ++latestRequestId.current;
    setIsLoading(true);
    // [FIX] Clear stale data segera saat shipping berubah — hindari displayTotal
    // menampilkan angka lama selama request baru masih jalan
    setData(undefined);

    // Per-call callbacks — requestId ter-capture via closure, tidak perlu dikirim lewat meta
    mutation.mutate(
      { cartId, shippingMethod },
      {
        onSuccess: (result) => {
          // Kalau requestId sudah tidak cocok, ada call yang lebih baru — buang response ini
          if (requestId !== latestRequestId.current) return;
          setData(result);
          setIsLoading(false);
        },
        onError: () => {
          if (requestId !== latestRequestId.current) return;
          setIsLoading(false);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartId, shippingMethod]);

  return { data, isLoading };
}

// ── useCheckout ───────────────────────────────────────────────
export function useCheckout() {
  const utils = trpc.useUtils();

  const confirmMutation = trpc.checkout.confirm.useMutation({
    onSuccess: () => {
      void utils.cart.get.invalidate();
      void utils.order.getAll.invalidate();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const createAddressMutation = trpc.profile.addAddress.useMutation({
    onSuccess: () => {
      void utils.profile.getAddresses.invalidate();
      toast.success("Alamat berhasil disimpan");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  return {
    confirmCheckout:   confirmMutation.mutateAsync,
    isConfirming:      confirmMutation.isPending,
    createAddress:     createAddressMutation.mutateAsync,
    isCreatingAddress: createAddressMutation.isPending,
  };
}
