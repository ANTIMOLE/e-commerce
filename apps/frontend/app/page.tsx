"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag, Zap, Shield, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardSkeleton } from "@/components/shared/ProductCard";
import { useBestsellers } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { ROUTES } from "@/lib/constants";
import { Input } from "@/components/ui/input";

// ── Category icon map ─────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  "elektronik":       "📱",
  "fashion-wanita":   "👗",
  "fashion-pria":     "👔",
  "makanan-minuman":  "🍜",
  "kesehatan":        "💊",
  "rumah-tangga":     "🏠",
  "kecantikan":       "💄",
  "olahraga":         "⚽",
  "bayi-anak":        "🍼",
  "otomotif":         "🔧",
};

export default function HomePage() {
  const { data: products, isLoading: loadingProducts } = useBestsellers();
  const { data: categories, isLoading: loadingCategories } = useCategories();

  return (
    <div className="flex flex-col gap-0">

      {/* ── Hero Banner ────────────────────────────────────── */}
      <section className="bg-gradient-zenit text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              Belanja Lebih Mudah,<br />
              Harga Lebih Hemat
            </h1>
            <p className="text-white/80 text-lg mb-8">
              Jutaan produk pilihan dari ribuan penjual terpercaya di seluruh Indonesia.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold hover" asChild>
                <Link href={ROUTES.PRODUCTS}>
                  Mulai Belanja
                  <ShoppingBag className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-black hover:bg-white/10 hover:text-white" asChild>
                <Link href={ROUTES.REGISTER}>Daftar Gratis</Link>
              </Button>
            </div>
          </div>
          {/* Ilustrasi sederhana */}
          <div className="flex-shrink-0 text-center hidden md:block">
            <div className="w-64 h-64 bg-white/10 rounded-full flex items-center justify-center text-8xl">
              🛍️
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Badges ─────────────────────────────────── */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: <Truck className="w-5 h-5" />,   label: "Gratis Ongkir",    sub: "Min. belanja 50rb" },
              { icon: <Shield className="w-5 h-5" />,  label: "Belanja Aman",     sub: "Garansi uang kembali" },
              { icon: <Zap className="w-5 h-5" />,     label: "Proses Cepat",     sub: "Same day delivery" },
            ].map((f, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center justify-center gap-2 py-2">
                <span className="text-primary">{f.icon}</span>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold">{f.label}</p>
                  <p className="text-xs text-gray-500">{f.sub}</p>
                </div>
                <p className="text-xs font-medium md:hidden">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Search  ───────────────────────────────── */}
      <section>
        <div className="flex-wrap mx-30 mt-5">
          <div className="relative">
            <Input placeholder="Cari produk..." className="bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:bg-gray-100" />
          </div>
        </div>
      </section>
      
      {/* ── Kategori Populer ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">Kategori Populer</h2>
          <Link href={ROUTES.PRODUCTS} className="text-sm text-primary flex items-center gap-1 hover:underline">
            Lihat Semua <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loadingCategories ? (
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="h-3 w-14 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {categories?.map(cat => (
              <Link
                key={cat.id}
                href={`${ROUTES.PRODUCTS}?categoryId=${cat.id}`}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl group-hover:bg-primary/20 transition-colors">
                  {CATEGORY_ICONS[cat.slug] ?? "📦"}
                </div>
                <span className="text-xs text-center text-gray-700 leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Promo Banner ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 w-full">
        <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-teal-500 text-white p-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium opacity-80 mb-1">Promo Hari Ini</p>
            <h3 className="text-2xl font-bold mb-2">Diskon s/d 75%! 🎉</h3>
            <p className="text-white/70 text-sm">Belanja sekarang dan hemat lebih banyak</p>
          </div>
          <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold flex-shrink-0" asChild>
            <Link href={`${ROUTES.PRODUCTS}?sortBy=sold_count`}>
              Lihat Promo
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Produk Terlaris ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold">Produk Terlaris</h2>
            <p className="text-sm text-gray-500">Pilihan terpopuler dari pembeli Zenit</p>
          </div>
          <Link
            href={`${ROUTES.PRODUCTS}?sortBy=sold_count&sortOrder=desc`}
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            Lihat Semua <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {loadingProducts
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products?.map(p => <ProductCard key={p.id} product={p} />)
          }
        </div>
      </section>

      {/* ── CTA Register ───────────────────────────────────── */}
      <section className="bg-gray-900 text-white mt-8">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Bergabung dengan Zenit Sekarang</h2>
          <p className="text-gray-400 mb-6">Daftar gratis dan nikmati pengalaman belanja terbaik</p>
          <Button size="lg" className="bg-linear-to-r
    from-purple-300 to-blue-400
    hover:from-amber-300 hover:to-purple-300
    border-0" asChild>
            <Link href={ROUTES.REGISTER}>Daftar Sekarang — Gratis!</Link>
          </Button>
        </div>
      </section>

    </div>
  );
}
