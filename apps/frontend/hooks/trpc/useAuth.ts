"use client";

import { useCallback }    from "react";
import { useRouter }      from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { trpc }           from "@/lib/trpc";
import { queryKeys }      from "@/lib/queryClient";
import { ROUTES }         from "@/lib/constants";
import { toast }          from "sonner";

export function useAuth() {
  const router = useRouter();
  const qc     = useQueryClient();

  // ── GET current user ──────────────────────────────────────
  const { data: user, isLoading, isError } = trpc.auth.me.useQuery(undefined, {
    retry:     false,
    staleTime: 5 * 60 * 1000,
  });

  // ── Login ─────────────────────────────────────────────────
  // Server sets accessToken + refreshToken as httpOnly cookies.
  // No localStorage involved — browser sends cookies automatically.
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.auth.me, data.user);
      toast.success(`Selamat datang, ${data.user.name}!`);
      const params = new URLSearchParams(window.location.search);
      router.push(params.get("from") ?? ROUTES.HOME);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Register ──────────────────────────────────────────────
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.auth.me, data.user);
      toast.success("Akun berhasil dibuat!");
      router.push(ROUTES.HOME);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Logout ────────────────────────────────────────────────
  // Server clears both cookies. QueryClient cache also cleared.
  const logoutMutation = trpc.auth.logout.useMutation({
    onSettled: () => {
      qc.clear();
      router.push(ROUTES.LOGIN);
    },
  });

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  // ── Change Password ───────────────────────────────────────
  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => toast.success("Password berhasil diubah"),
    onError:   (err) => toast.error(err.message),
  });

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
  };
}
