"use client";

import { useQueryClient } from "@tanstack/react-query";
import { trpc }           from "@/lib/trpc";
import { queryKeys }      from "@/lib/queryClient";
import { toast }          from "sonner";

// ── useAddresses ───────────────────────────────────────────────
export function useAddresses() {
  return trpc.profile.getAddresses.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
}

// ── useCheckout ────────────────────────────────────────────────
export function useCheckout() {
  const qc = useQueryClient();

  const confirmMutation = trpc.checkout.confirm.useMutation({
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.cart.all });
      void qc.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const createAddressMutation = trpc.profile.addAddress.useMutation({
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.profile.addresses() });
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
