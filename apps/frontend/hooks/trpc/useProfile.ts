"use client";

import { useQueryClient } from "@tanstack/react-query";
import { trpc }           from "@/lib/trpc";
import { queryKeys }      from "@/lib/queryClient";
import { toast }          from "sonner";

// ── useProfile ─────────────────────────────────────────────────
export function useProfile() {
  const qc = useQueryClient();

  const { data: profile, isLoading, isError } = trpc.profile.get.useQuery(
    undefined,
    { staleTime: 5 * 60_000 }
  );

  const { mutateAsync: updateProfile, isPending: isUpdating } =
    trpc.profile.update.useMutation({
      onSuccess: (updated) => {
        qc.setQueryData(queryKeys.profile.me(), updated);
        void qc.invalidateQueries({ queryKey: queryKeys.auth.me });
        toast.success("Profil berhasil diperbarui");
      },
      onError: (err: { message: string }) => toast.error(err.message),
    });

  return { profile, isLoading, isError, updateProfile, isUpdating };
}

// ── useAddressManager ──────────────────────────────────────────
export function useAddressManager() {
  const qc = useQueryClient();

  const { data: addresses, isLoading } = trpc.profile.getAddresses.useQuery(
    undefined,
    { staleTime: 5 * 60_000 }
  );

  function invalidate() {
    void qc.invalidateQueries({ queryKey: queryKeys.profile.addresses() });
  }

  const { mutateAsync: addAddress, isPending: isAdding } =
    trpc.profile.addAddress.useMutation({
      onSuccess: () => { invalidate(); toast.success("Alamat berhasil ditambahkan"); },
      onError:   (err: { message: string }) => toast.error(err.message),
    });

  const { mutateAsync: editAddress, isPending: isEditing } =
    trpc.profile.updateAddress.useMutation({
      onSuccess: () => { invalidate(); toast.success("Alamat berhasil diperbarui"); },
      onError:   (err: { message: string }) => toast.error(err.message),
    });

  const { mutateAsync: deleteAddress, isPending: isDeleting } =
    trpc.profile.deleteAddress.useMutation({
      onSuccess: () => { invalidate(); toast.success("Alamat berhasil dihapus"); },
      onError:   (err: { message: string }) => toast.error(err.message),
    });

  const { mutateAsync: setDefault, isPending: isSettingDefault } =
    trpc.profile.setDefaultAddress.useMutation({
      onSuccess: () => { invalidate(); toast.success("Alamat utama diperbarui"); },
      onError:   (err: { message: string }) => toast.error(err.message),
    });

  const isMutating = isAdding || isEditing || isDeleting || isSettingDefault;

  return {
    addresses:  addresses ?? [],
    isLoading,
    isMutating,
    addAddress,    isAdding,
    editAddress,   isEditing,
    deleteAddress, isDeleting,
    setDefault,    isSettingDefault,
  };
}
