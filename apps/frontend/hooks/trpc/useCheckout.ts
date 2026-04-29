"use client";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function useAddresses() {
  return trpc.profile.getAddresses.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });
}

export function useCheckout() {
  const utils = trpc.useUtils();

  const confirmMutation = trpc.checkout.confirm.useMutation({
    onSuccess: () => {
      // FIX [High]: invalidate cart dan orders via tRPC utils, bukan queryKeys.*
      void utils.cart.get.invalidate();
      void utils.order.getAll.invalidate();
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const createAddressMutation = trpc.profile.addAddress.useMutation({
    onSuccess: () => {
      // FIX [High]: invalidate via utils.profile.getAddresses
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
