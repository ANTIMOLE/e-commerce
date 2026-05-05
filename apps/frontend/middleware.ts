import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Protected Routes ──────────────────────────────────────────
// Route yang butuh login — redirect ke /login kalau belum auth
const PROTECTED_ROUTES = [
  "/cart",
  "/checkout",
  "/orders",
  "/profile",
  "/admin",
];

// Route yang tidak boleh diakses kalau sudah login
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Cek token dari httpOnly cookie (satu-satunya storage yang dipakai)
  // [FIX] Hapus komentar stale "token juga disimpan di localStorage" —
  // model auth sekarang cookie-only, localStorage tidak dipakai.
  const token = req.cookies.get("accessToken")?.value;

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Belum login tapi akses route protected → redirect ke login
  if (isProtected && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Sudah login tapi akses auth route → redirect ke home
  if (isAuthRoute && token) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // ── Kenapa middleware tidak cek role ADMIN? ───────────────
  // Next.js middleware berjalan di Edge Runtime yang tidak mendukung
  // library Node.js seperti jsonwebtoken. Verifikasi JWT butuh secret key
  // yang tidak aman untuk di-expose ke edge. Solusi alternatif (jose library)
  // ada tapi menambah kompleksitas yang tidak sepadan untuk skripsi ini.
  //
  // Trade-off yang dipilih:
  //   - Middleware: cek ada/tidaknya cookie → cegah redirect loop & proteksi dasar
  //   - app/(admin)/layout.tsx: cek user.role setelah /auth/me → guard role aktual
  //
  // Non-admin yang sudah login memang bisa masuk /admin sesaat sebelum
  // layout redirect ke home. Backend API tetap aman karena semua endpoint
  // admin punya middleware requireAdmin tersendiri di server.
  return NextResponse.next();
}

export const config = {
  // Jalankan middleware di semua route kecuali static files & API
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
