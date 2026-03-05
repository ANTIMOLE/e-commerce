"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ShieldCheck, Check, X } from "lucide-react";
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

const registerSchema = z.object({
  name:            z.string().min(2, "Nama minimal 2 karakter"),
  email:           z.string().email("Format email tidak valid"),
  password:        z.string()
    .min(8, "Minimal 8 karakter")
    .regex(/[A-Z]/, "Harus ada huruf besar")
    .regex(/[a-z]/, "Harus ada huruf kecil")
    .regex(/[0-9]/, "Harus ada angka"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Password tidak cocok",
  path:    ["confirmPassword"],
});
type RegisterForm = z.infer<typeof registerSchema>;

// ── Password strength checker ──────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const rules = [
    { label: "Minimal 8 karakter",  ok: password.length >= 8 },
    { label: "Ada huruf besar",      ok: /[A-Z]/.test(password) },
    { label: "Ada huruf kecil",      ok: /[a-z]/.test(password) },
    { label: "Ada angka",            ok: /[0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1">
      {rules.map(r => (
        <li key={r.label} className={cn("flex items-center gap-1.5 text-xs", r.ok ? "text-green-600" : "text-gray-400")}>
          {r.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {r.label}
        </li>
      ))}
    </ul>
  );
}

export default function RegisterPage() {
  const { register: registerUser, isRegisterLoading } = useAuth();
  const [showPass, setShowPass]           = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [captchaDone, setCaptchaDone]     = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const passwordValue = watch("password", "");

  function onSubmit(data: RegisterForm) {
    if (!captchaDone) return;
    registerUser({ name: data.name, email: data.email, password: data.password });
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Buat Akun Zenit</h1>
          <p className="text-gray-500 text-sm mt-1">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>

        {/* Social Auth */}
        <SocialAuthButtons mode="register" />

        <div className="relative my-6">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-400">
            atau daftar dengan email
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Nama */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input
              id="name"
              placeholder="Nama kamu"
              {...register("name")}
              className={cn(errors.name && "border-red-400")}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@email.com"
              {...register("email")}
              className={cn(errors.email && "border-red-400")}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                placeholder="Buat password"
                {...register("password")}
                className={cn("pr-10", errors.password && "border-red-400")}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={passwordValue} />
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Ulangi password"
                {...register("confirmPassword")}
                className={cn("pr-10", errors.confirmPassword && "border-red-400")}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* reCAPTCHA */}
          <RecaptchaWidget
            onVerify={() => setCaptchaDone(true)}
            onExpire={() => setCaptchaDone(false)}
          />

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center">
            Dengan mendaftar, kamu menyetujui{" "}
            <span className="text-primary cursor-pointer hover:underline">Syarat & Ketentuan</span>
            {" "}dan{" "}
            <span className="text-primary cursor-pointer hover:underline">Kebijakan Privasi</span>
            {" "}Zenit.
          </p>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-gradient-zenit border-0 h-11 font-semibold"
            disabled={isRegisterLoading || !captchaDone}
          >
            {isRegisterLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
            ) : (
              "Daftar Sekarang"
            )}
          </Button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          Dilindungi reCAPTCHA — Privasi & Syarat berlaku
        </p>
      </div>
    </div>
  );
}
