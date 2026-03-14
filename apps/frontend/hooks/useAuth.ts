// 

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "../lib/api";
import { queryKeys } from "../lib/queryClient";
import { ROUTES } from "../lib/constants";
import type { User, LoginInput, RegisterInput } from "../types";
import { toast } from "sonner";

export function useAuth() {
  const router = useRouter();
  const qc     = useQueryClient();

  // ── Get current user ────────────────────────────────────
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: queryKeys.auth.me,
    queryFn:  async () => {
      const res = await api.get<{ success: boolean; data: User }>("/auth/me");
      return res.data.data;
    },
    retry:     false,
    staleTime: 5 * 60 * 1000,
  });

  // ── Login ────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await api.post<{ success: boolean; data: User }>("/auth/login", input);
      return res.data.data; // Hanya return data user, token disimpan otomatis via cookie
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.auth.me, data); // Update cache user setelah login
      toast.success(`Selamat datang, ${data.name}!`); 
      const params = new URLSearchParams(window.location.search); // Cek query param "from" untuk redirect setelah login
      router.push(params.get("from") ?? ROUTES.HOME);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // ── Register ─────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const res = await api.post<{ success: boolean; data: User }>("/auth/register", input);
      return res.data.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.auth.me, data);
      toast.success("Akun berhasil dibuat!");
      router.push(ROUTES.HOME);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // ── Logout ───────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Tetap logout meski request gagal
    } finally {
      qc.clear();
      router.push(ROUTES.LOGIN);
    }
  }, [qc, router]);

  // ── changePassword — KAMU YANG LANJUT ───────────────────
  /**
   * TODO:
   * 1. mutationFn: hit PATCH /auth/change-password dengan body { oldPassword, newPassword }
   * 2. onSuccess: toast.success("Password berhasil diubah")
   *
   * HINT: Lihat loginMutation — strukturnya sama persis,
   *       bedanya endpoint PATCH dan body berbeda
   */
  const changePasswordMutation = useMutation({
    mutationFn: async (_input: { oldPassword: string; newPassword: string }) => {
        const res = await api.patch<{ success: boolean }>("/auth/change-password", _input);
        return res.data.success;
    },
    onSuccess: () => {
      toast.success("Password berhasil diubah");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // // ── updateProfile — KAMU YANG LANJUT ────────────────────
  // /**
  //  * TODO:
  //  * 1. mutationFn: hit PATCH /auth/profile dengan body { name?, phone? }
  //  * 2. onSuccess:
  //  *    - qc.invalidateQueries({ queryKey: queryKeys.auth.me })
  //  *    - toast.success("Profil berhasil diperbarui")
  //  *
  //  * HINT: Invalidate supaya data user di header/navbar ikut update
  //  */
  // const updateProfileMutation = useMutation({
  //   mutationFn: async (_input: { name?: string; phone?: string }) => {
  //     const res = await api.patch<{ success: boolean }>("/auth/profile", _input);
  //     return res.data.success;
  //   },
  //   onSuccess: () => {
  //     qc.invalidateQueries({ queryKey: queryKeys.auth.me });
  //     toast.success("Profil berhasil diperbarui");
  //   },
  //   onError: (err) => toast.error(getErrorMessage(err)),
  // });

  return {
    user,
    isLoading,
    isAuthenticated:         !!user && !isError,
    login:                   loginMutation.mutate,
    loginAsync:              loginMutation.mutateAsync,
    isLoginLoading:          loginMutation.isPending,
    register:                registerMutation.mutate,
    isRegisterLoading:       registerMutation.isPending,
    logout,
    changePassword:          changePasswordMutation.mutate,
    isChangePasswordLoading: changePasswordMutation.isPending,
    // updateProfile:           updateProfileMutation.mutate,
    // isUpdateProfileLoading:  updateProfileMutation.isPending,
  };
}