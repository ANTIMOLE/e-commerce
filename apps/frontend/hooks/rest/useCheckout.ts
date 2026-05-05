"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "sonner";
import type { Address, AddressInput, Order, ShippingMethodCode, PaymentMethodCode } from "@/types";

// ============================================================
// useAddresses — ambil list alamat user untuk checkout page
// GET /profile/addresses
// ============================================================
export function useAddresses() {
  return useQuery<Address[]>({
    queryKey: queryKeys.profile.addresses(),
    queryFn:  async () => {
      const res = await api.get<{ success: boolean; data: Address[] }>(
        "/profile/addresses"
      );
      return res.data.data;
    },
    staleTime: 5 * 60_000,
  });
}


// ============================================================
// useCheckoutSummary — [FIX] ambil total dari backend, bukan kalkulasi lokal
// POST /checkout/calculate-summary
//
// Re-fetch otomatis kalau cartId atau shippingMethod berubah via queryKey.
// Menghilangkan logic drift risk kalau pajak/ongkir/rounding berubah di backend.
// ============================================================
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
  return useQuery<CheckoutSummaryResult>({
    queryKey: ["checkout", "summary", cartId, shippingMethod],
    queryFn:  async () => {
      const res = await api.post<{ success: boolean; data: CheckoutSummaryResult }>(
        "/checkout/calculate-summary",
        { cartId, shippingMethod }
      );
      return res.data.data;
    },
    enabled:   !!cartId,
    staleTime: 30_000,
  });
}

// ============================================================
// useCheckout — konfirmasi order + buat alamat baru
// POST /checkout/confirm
// POST /profile/addresses
// ============================================================
export function useCheckout() {
  const qc = useQueryClient();

  // ── POST /checkout/confirm ────────────────────────────────
  const { mutateAsync: confirmCheckout, isPending: isConfirming } = useMutation({
    mutationFn: async (input: {
      cartId:         string;
      addressId:      string;
      shippingMethod: ShippingMethodCode;
      paymentMethod:  PaymentMethodCode;
    }): Promise<Order> => {
      const res = await api.post<{ success: boolean; data: Order }>(
        "/checkout/confirm", input
      );
      return res.data.data;
    },
    onSuccess: () => {
      // Cart kosong setelah checkout → invalidate
      qc.invalidateQueries({ queryKey: queryKeys.cart.all });
      // Orders list perlu diupdate
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // ── POST /profile/addresses ───────────────────────────────
  // Buat alamat baru dari halaman checkout (jika user belum punya)
  const { mutateAsync: createAddress, isPending: isCreatingAddress } = useMutation({
    mutationFn: async (input: AddressInput): Promise<Address> => {
      const res = await api.post<{ success: boolean; data: Address }>(
        "/profile/addresses", input
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile.addresses() });
      toast.success("Alamat berhasil disimpan");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return {
    confirmCheckout,  isConfirming,
    createAddress,    isCreatingAddress,
  };
}
