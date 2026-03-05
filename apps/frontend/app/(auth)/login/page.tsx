"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { RecaptchaWidget } from "@/components/shared/RecaptchaWidget";
import { SocialAuthButtons } from "@/components/shared/SocialAuthButtons";
import { cn } from "@/lib/utils";

// ── Validation Schema ─────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password tidak boleh kosong"),
});
type LoginForm = z.infer<typeof loginSchema>;

// ── Login Page ────────────────────────────────────────────────
export default function LoginPage() {
  const { login, isLoginLoading } = useAuth();
  const [showPass, setShowPass]       = useState(false);
  const [captchaDone, setCaptchaDone] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  function onSubmit(data: LoginForm) {
    if (!captchaDone) return;
    // captchaToken dikirim ke backend untuk verifikasi server-side
    login({ ...data, captchaToken });
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Masuk ke Zenit</h1>
          <p className="text-gray-500 text-sm mt-1">
            Belum punya akun?{" "}
            <Link href="/register" className="text-primary font-medium hover:underline">
              Daftar gratis
            </Link>
          </p>
        </div>

        {/* ── Social Auth ──────────────────────────────────── */}
        <SocialAuthButtons mode="login" />

        <div className="relative my-6">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-400">
            atau masuk dengan email
          </span>
        </div>

        {/* ── Form ─────────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@email.com"
              autoComplete="email"
              {...register("email")}
              className={cn(errors.email && "border-red-400 focus-visible:ring-red-400")}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Lupa password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                placeholder="Masukkan password"
                autoComplete="current-password"
                {...register("password")}
                className={cn(
                  "pr-10",
                  errors.password && "border-red-400 focus-visible:ring-red-400"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* reCAPTCHA */}
          <RecaptchaWidget
            onVerify={(token) => {
              setCaptchaDone(true);
              setCaptchaToken(token);
            }}
            onExpire={() => {
              setCaptchaDone(false);
              setCaptchaToken(null);
            }}
          />

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-gradient-zenit border-0 h-11 font-semibold"
            disabled={isLoginLoading || !captchaDone}
          >
            {isLoginLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
            ) : (
              "Masuk"
            )}
          </Button>

        </form>

        {/* Security note */}
        <p className="text-xs text-gray-400 text-center mt-4 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          Dilindungi reCAPTCHA — Privasi & Syarat berlaku
        </p>
      </div>
    </div>
  );
}
