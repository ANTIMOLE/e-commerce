"use client";

// ============================================================
// SOCIAL AUTH BUTTONS
//
// SEKARANG: tampil tombol, klik = alert "Coming Soon"
//
// CARA AKTIFKAN TIAP PROVIDER:
//
// ── GOOGLE ────────────────────────────────────────────────────
// 1. Buka https://console.cloud.google.com
// 2. APIs & Services → Credentials → Create OAuth 2.0 Client ID
// 3. Authorized redirect URIs: http://localhost:3000/api/auth/google/callback
// 4. Dapat CLIENT_ID dan CLIENT_SECRET
// 5. Install: pnpm add passport passport-google-oauth20 (di backend)
// 6. Atau pakai NextAuth.js di frontend: pnpm add next-auth
//
// ── GITHUB ────────────────────────────────────────────────────
// 1. GitHub → Settings → Developer settings → OAuth Apps → New
// 2. Homepage URL: http://localhost:3000
// 3. Callback: http://localhost:3000/api/auth/github/callback
// 4. Dapat CLIENT_ID dan CLIENT_SECRET
// 5. Install: pnpm add passport-github2
//
// ── PHONE (OTP) ───────────────────────────────────────────────
// 1. Daftar di https://www.twilio.com atau https://firebase.google.com
// 2. Firebase: Authentication → Sign-in method → Phone
// 3. Install: pnpm add firebase
// 4. Gunakan Firebase Phone Auth SDK
//
// ── NEXTAUTH (rekomendasi kalau mau banyak provider) ──────────
// pnpm add next-auth
// Buat app/api/auth/[...nextauth]/route.ts
// Support: Google, GitHub, Discord, Facebook, Twitter, dll
// Docs: https://next-auth.js.org
// ============================================================

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface SocialAuthButtonsProps {
  mode: "login" | "register";
}

const label = {
  login:    "Masuk",
  register: "Daftar",
};

export function SocialAuthButtons({ mode }: SocialAuthButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  function handleSocial(provider: string) {
    setLoading(provider);
    // TODO: implementasi OAuth
    // window.location.href = `/api/auth/${provider}`;

    setTimeout(() => {
      setLoading(null);
      toast.info(`${provider} Sign-In belum diaktifkan`, {
        description: "Lihat komentar di SocialAuthButtons.tsx untuk cara setup",
      });
    }, 800);
  }

  return (
    <div className="space-y-3">

      {/* Google */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 font-medium border-gray-300 hover:bg-gray-50"
        onClick={() => handleSocial("google")}
        disabled={loading !== null}
      >
        {loading === "google" ? (
          <span className="animate-spin mr-2">⟳</span>
        ) : (
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        {label[mode]} dengan Google
      </Button>

      {/* GitHub */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 font-medium border-gray-300 hover:bg-gray-50"
        onClick={() => handleSocial("github")}
        disabled={loading !== null}
      >
        {loading === "github" ? (
          <span className="animate-spin mr-2">⟳</span>
        ) : (
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        )}
        {label[mode]} dengan GitHub
      </Button>

      {/* Phone / OTP */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 font-medium border-gray-300 hover:bg-gray-50"
        onClick={() => handleSocial("phone")}
        disabled={loading !== null}
      >
        {loading === "phone" ? (
          <span className="animate-spin mr-2">⟳</span>
        ) : (
          <span className="mr-2">📱</span>
        )}
        {label[mode]} dengan Nomor HP
      </Button>

    </div>
  );
}
