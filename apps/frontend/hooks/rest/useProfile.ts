"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import type { User, UpdateProfileInput } from "@/types";

// ── useProfile ─────────────────────────────────────────────────
// Semua hook yang dibutuhkan halaman profile.
// TODO: implementasi lengkap setelah endpoint backend siap.
//
// Endpoint yang dibutuhkan:
//   GET    /profile          → data profil lengkap
//   PATCH  /profile          → update name/phone
//   GET    /profile/addresses       → list alamat
//   POST   /profile/addresses       → buat alamat baru
//   PATCH  /profile/addresses/:id   → edit alamat
//   DELETE /profile/addresses/:id   → hapus alamat
//   PATCH  /profile/addresses/:id/default → set default
// ──────────────────────────────────────────────────────────────

export function useProfile() {
  const qc = useQueryClient();

  // ── GET profile ──────────────────────────────────────────
  // TODO: ganti endpoint setelah backend siap
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery<User>({
    queryKey: queryKeys.auth.me,        // sementara pakai query me sampai /profile endpoint ada
    queryFn: async () => {
      // TODO: ganti ke /profile saat endpoint sudah ada
      const res = await api.get<{ success: boolean; data: User }>("/auth/me");
      return res.data.data;
    },
    staleTime: 5 * 60_000,
  });

  // ── PATCH /profile ──────────────────────────────────────
  // TODO: implementasi
  const { mutateAsync: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: async (_: UpdateProfileInput) => {
      // TODO: uncomment dan sesuaikan saat endpoint siap
      // const res = await api.patch<{ success: boolean; data: User }>("/profile", input);
      // return res.data.data;
      throw new Error("TODO: endpoint /profile belum diimplementasi di backend");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
    onError: (err) => {
      console.error("updateProfile error:", getErrorMessage(err));
    },
  });

  return {
    profile,
    isLoading,
    isError,
    updateProfile,
    isUpdating,
  };
}