"use client";

// ============================================================
// RECAPTCHA WIDGET
//
// SEKARANG: mode demo (simulasi klik checkbox)
//
// CARA AKTIFKAN RECAPTCHA ASLI:
// 1. Daftar di https://www.google.com/recaptcha/admin
// 2. Pilih reCAPTCHA v2 "I'm not a robot" atau v3 (invisible)
// 3. Dapat SITE_KEY dan SECRET_KEY
// 4. Tambah di .env.local:
//      NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lc...
// 5. Install: pnpm add react-google-recaptcha
// 6. Uncomment kode di bawah, hapus DemoRecaptcha
// ============================================================

import { useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ── UNCOMMENT INI kalau sudah dapat API key ───────────────────
// import ReCAPTCHA from "react-google-recaptcha";
//
// export function RecaptchaWidget({ onVerify, onExpire }: RecaptchaProps) {
//   return (
//     <ReCAPTCHA
//       sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
//       onChange={(token) => token && onVerify(token)}
//       onExpired={onExpire}
//       hl="id"
//     />
//   );
// }

interface RecaptchaProps {
  onVerify:  (token: string) => void;
  onExpire:  () => void;
}

// ── DEMO Recaptcha (tidak butuh API key) ──────────────────────
export function RecaptchaWidget({ onVerify, onExpire }: RecaptchaProps) {
  const [state, setState] = useState<"idle" | "loading" | "verified">("idle");

  function handleClick() {
    if (state === "verified") {
      // Reset
      setState("idle");
      onExpire();
      return;
    }
    if (state !== "idle") return;

    setState("loading");
    // Simulasi verifikasi 1.2 detik
    setTimeout(() => {
      setState("verified");
      onVerify("demo-captcha-token-" + Date.now());
    }, 1200);
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between",
        "border rounded-lg px-4 py-3 cursor-pointer select-none",
        "transition-colors duration-150",
        state === "verified"
          ? "border-green-300 bg-green-50"
          : "border-gray-300 bg-gray-50 hover:bg-gray-100"
      )}
      onClick={handleClick}
      role="checkbox"
      aria-checked={state === "verified"}
    >
      {/* Left: checkbox + label */}
      <div className="flex items-center gap-3">
        {state === "idle" && (
          <div className="w-5 h-5 border-2 border-gray-400 rounded" />
        )}
        {state === "loading" && (
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
        )}
        {state === "verified" && (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        )}
        <span className={cn(
          "text-sm",
          state === "verified" ? "text-green-700 font-medium" : "text-gray-700"
        )}>
          {state === "verified" ? "Terverifikasi" : "Saya bukan robot"}
        </span>
      </div>

      {/* Right: reCAPTCHA branding */}
      <div className="text-right hidden sm:block">
        <div className="text-[10px] text-gray-400 leading-tight">
          <span className="text-sm">🛡️</span><br />
          reCAPTCHA<br />
          Privasi · Syarat
        </div>
      </div>
    </div>
  );
}
