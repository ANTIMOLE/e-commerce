import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Protected Routes ──────────────────────────────────────────
// Route yang butuh login — redirect ke /login kalau belum auth
const PROTECTED_ROUTES = [
  "/cart",
  "/checkout",
  "/orders",
  "/profile",
  "/admin"
];

// Route yang tidak boleh diakses kalau sudah login
const AUTH_ROUTES = ["/login", "/register"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Cek token dari cookie (untuk SSR)
  // Token juga disimpan di localStorage untuk client-side
  const token = req.cookies.get("accessToken")?.value;

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isProtected && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && token) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Jalankan middleware di semua route kecuali static files & API
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
