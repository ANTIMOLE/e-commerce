"use client";

import { useCallback }  from "react";
import { useRouter }    from "next/navigation";
import { trpc }         from "@/lib/trpc";
import { ROUTES }       from "@/lib/constants";
import { toast }        from "sonner";

export function useAuth() {
  const router = useRouter();
  const utils  = trpc.useUtils();

  const { data: user, isLoading, isError } = trpc.auth.me.useQuery(undefined, {
    retry:     false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      void utils.auth.me.invalidate();
      toast.success(`Selamat datang, ${data.user.name}!`);
      const params = new URLSearchParams(window.location.search);
      router.push(params.get("from") ?? ROUTES.HOME);
    },
    onError: (err) => toast.error(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate();
      toast.success("Akun berhasil dibuat!");
      router.push(ROUTES.HOME);
    },
    onError: (err) => toast.error(err.message),
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSettled: () => {
      // invalidate semua cache tRPC sekaligus, lalu redirect
      void utils.invalidate();
      router.push(ROUTES.LOGIN);
    },
  });

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

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
