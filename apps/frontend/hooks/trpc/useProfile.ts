"use client";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function useProfile() {
  const utils = trpc.useUtils();

  const { data: profile, isLoading, isError } = trpc.profile.get.useQuery(
    undefined,
    { staleTime: 5 * 60_000 }
  );

  const { mutateAsync: updateProfile, isPending: isUpdating } =
    trpc.profile.update.useMutation({
      onSuccess: (updated) => {
        // FIX [High]: setData ke cache tRPC yang benar; invalidate auth.me juga via utils
        utils.profile.get.setData(undefined, updated);
        void utils.auth.me.invalidate();
        toast.success("Profil berhasil diperbarui");
      },
      onError: (err: { message: string }) => toast.error(err.message),
    });

  return { profile, isLoading, isError, updateProfile, isUpdating };
}

export function useAddressManager() {
  const utils = trpc.useUtils();

  const { data: addresses, isLoading } = trpc.profile.getAddresses.useQuery(
    undefined,
    { staleTime: 5 * 60_000 }
  );

  // FIX [High]: invalidate via utils.profile.getAddresses, bukan queryKeys.profile.addresses()
  function invalidate() {
    void utils.profile.getAddresses.invalidate();
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
