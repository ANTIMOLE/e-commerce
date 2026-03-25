// "use client";

// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { api, getErrorMessage } from "@/lib/api";
// import { queryKeys } from "@/lib/queryClient";
// import type { User, UpdateProfileInput } from "@/types";

// // ── useProfile ─────────────────────────────────────────────────
// // Semua hook yang dibutuhkan halaman profile.
// // TODO: implementasi lengkap setelah endpoint backend siap.
// //
// // Endpoint yang dibutuhkan:
// //   GET    /profile          → data profil lengkap
// //   PATCH  /profile          → update name/phone
// //   GET    /profile/addresses       → list alamat
// //   POST   /profile/addresses       → buat alamat baru
// //   PATCH  /profile/addresses/:id   → edit alamat
// //   DELETE /profile/addresses/:id   → hapus alamat
// //   PATCH  /profile/addresses/:id/default → set default
// // ──────────────────────────────────────────────────────────────

// export function useProfile() {
//   const qc = useQueryClient();

//   // ── GET profile ──────────────────────────────────────────
//   // TODO: ganti endpoint setelah backend siap
//   const {
//     data: profile,
//     isLoading,
//     isError,
//   } = useQuery<User>({
//     queryKey: queryKeys.auth.me,        // sementara pakai query me sampai /profile endpoint ada
//     queryFn: async () => {
//       // TODO: ganti ke /profile saat endpoint sudah ada
//       const res = await api.get<{ success: boolean; data: User }>("/auth/me");
//       return res.data.data;
//     },
//     staleTime: 5 * 60_000,
//   });

//   // ── PATCH /profile ──────────────────────────────────────
//   // TODO: implementasi
//   const { mutateAsync: updateProfile, isPending: isUpdating } = useMutation({
//     mutationFn: async (_: UpdateProfileInput) => {
//       // TODO: uncomment dan sesuaikan saat endpoint siap
//       // const res = await api.patch<{ success: boolean; data: User }>("/profile", input);
//       // return res.data.data;
//       throw new Error("TODO: endpoint /profile belum diimplementasi di backend");
//     },
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: queryKeys.auth.me });
//     },
//     onError: (err) => {
//       console.error("updateProfile error:", getErrorMessage(err));
//     },
//   });

//   return {
//     profile,
//     isLoading,
//     isError,
//     updateProfile,
//     isUpdating,
//   };
// }


"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "sonner";
import type { User, Address, AddressInput, UpdateProfileInput } from "@/types";

// ============================================================
// useProfile — data profil + update
// GET  /profile
// PATCH /profile
// ============================================================
export function useProfile() {
  const qc = useQueryClient();

  // ── GET /profile ──────────────────────────────────────────
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery<User>({
    queryKey: queryKeys.profile.me(),
    queryFn:  async () => {
      const res = await api.get<{ success: boolean; data: User }>("/profile");
      return res.data.data;
    },
    staleTime: 5 * 60_000,
  });

  // ── PATCH /profile ────────────────────────────────────────
  const { mutateAsync: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: async (input: UpdateProfileInput): Promise<User> => {
      const res = await api.patch<{ success: boolean; data: User }>(
        "/profile", input
      );
      return res.data.data;
    },
    onSuccess: (updated) => {
      // Update cache langsung (optimistic-style)
      qc.setQueryData(queryKeys.profile.me(), updated);
      // Invalidate /auth/me juga supaya Navbar ikut update
      qc.invalidateQueries({ queryKey: queryKeys.auth.me });
      toast.success("Profil berhasil diperbarui");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return {
    profile,
    isLoading,
    isError,
    updateProfile,
    isUpdating,
  };
}

// ============================================================
// useAddressManager — CRUD semua alamat dari halaman profile
// Terpisah dari useCheckout supaya tidak double-fetch
// ============================================================
export function useAddressManager() {
  const qc = useQueryClient();

  // ── GET /profile/addresses ────────────────────────────────
  const {
    data: addresses,
    isLoading,
  } = useQuery<Address[]>({
    queryKey: queryKeys.profile.addresses(),
    queryFn:  async () => {
      const res = await api.get<{ success: boolean; data: Address[] }>(
        "/profile/addresses"
      );
      return res.data.data;
    },
    staleTime: 5 * 60_000,
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: queryKeys.profile.addresses() });
  }

  // ── POST /profile/addresses ───────────────────────────────
  const { mutateAsync: addAddress, isPending: isAdding } = useMutation({
    mutationFn: async (input: AddressInput): Promise<Address> => {
      const res = await api.post<{ success: boolean; data: Address }>(
        "/profile/addresses", input
      );
      return res.data.data;
    },
    onSuccess: () => { invalidate(); toast.success("Alamat berhasil ditambahkan"); },
    onError:   (err) => toast.error(getErrorMessage(err)),
  });

  // ── PATCH /profile/addresses/:id ─────────────────────────
  const { mutateAsync: editAddress, isPending: isEditing } = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AddressInput> }): Promise<Address> => {
      const res = await api.patch<{ success: boolean; data: Address }>(
        `/profile/addresses/${id}`, data
      );
      return res.data.data;
    },
    onSuccess: () => { invalidate(); toast.success("Alamat berhasil diperbarui"); },
    onError:   (err) => toast.error(getErrorMessage(err)),
  });

  // ── DELETE /profile/addresses/:id ────────────────────────
  const { mutateAsync: deleteAddress, isPending: isDeleting } = useMutation({
    mutationFn: async (addressId: string) => {
      await api.delete(`/profile/addresses/${addressId}`);
    },
    onSuccess: () => { invalidate(); toast.success("Alamat berhasil dihapus"); },
    onError:   (err) => toast.error(getErrorMessage(err)),
  });

  // ── PATCH /profile/addresses/:id/default ─────────────────
  const { mutateAsync: setDefault, isPending: isSettingDefault } = useMutation({
    mutationFn: async (addressId: string) => {
      await api.patch(`/profile/addresses/${addressId}/default`);
    },
    onSuccess: () => { invalidate(); toast.success("Alamat utama diperbarui"); },
    onError:   (err) => toast.error(getErrorMessage(err)),
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