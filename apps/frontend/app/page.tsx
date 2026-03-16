"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShoppingBag, Zap, Shield, Truck, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardSkeleton } from "@/components/shared/ProductCard";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { useBestsellers } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { ROUTES } from "@/lib/constants";
import type { Category } from "@/types";

// =================================================================
// GROUPING LOGIC
// 218 kategori flat dari DB → dikelompokkan jadi ~15 parent group
// berdasarkan prefix slug.
// =================================================================

interface CategoryGroup {
  key:        string;    // key unik group, e.g. "fashion-wanita"
  label:      string;    // nama tampil
  icon:       string;    // emoji
  categories: Category[]; // semua subkategori di group ini
}

// Metadata tampilan per group key
const GROUP_META: Record<string, { label: string; icon: string }> = {
  "fashion-wanita":   { label: "Fashion Wanita",  icon: "👗" },
  "fashion-pria":     { label: "Fashion Pria",     icon: "👔" },
  "fashion-muslim":   { label: "Busana Muslim",    icon: "🕌" },
  "fashion-anak":     { label: "Fashion Anak",     icon: "🧒" },
  "fashion-bayi":     { label: "Pakaian Bayi",     icon: "🍼" },
  "fashion-seragam":  { label: "Seragam",          icon: "🎽" },
  "hp":               { label: "HP & Aksesoris",   icon: "📱" },
  "elektronik":       { label: "Elektronik",       icon: "🔌" },
  "kamera":           { label: "Kamera & Lensa",   icon: "📷" },
  "aksesoris-kamera": { label: "Aksesoris Kamera", icon: "🎞️" },
  "audio":            { label: "Audio",            icon: "🎧" },
  "gaming":           { label: "Gaming",           icon: "🎮" },
  "tablet":           { label: "Tablet",           icon: "📟" },
  "buku":             { label: "Buku",             icon: "📚" },
  "novel":            { label: "Novel",            icon: "📖" },
  "komik":            { label: "Komik & Manga",    icon: "🗯️" },
  "dapur":            { label: "Peralatan Dapur",  icon: "🍳" },
  "film":             { label: "Alat Musik",       icon: "🎸" },
  "lighting":         { label: "Lighting",         icon: "💡" },
};

// Urutan tampil — key yang ada di sini muncul duluan
const GROUP_ORDER = [
  "hp", "elektronik", "fashion-wanita", "fashion-pria", "fashion-muslim",
  "fashion-anak", "fashion-bayi", "fashion-seragam", "kamera",
  "aksesoris-kamera", "audio", "gaming", "tablet",
  "buku", "novel", "komik", "dapur", "film", "lighting",
];

// Mapping alias: key → key tujuan (untuk merge subcategory ke parent)
const KEY_ALIAS: Record<string, string> = {
  "hp-aksesoris": "hp",       // HP Aksesoris masuk grup HP
  "lensa":        "kamera",   // lensa-kamera → kamera
  "drone":        "kamera",   // drone-kamera → kamera
  "al":           "buku",     // al-quran → buku
  "alkitab":      "buku",     // alkitab   → buku
};

/** Ambil group key dari sebuah slug */
function getGroupKey(slug: string): string {
  // Cek prefix 2-kata (fashion-wanita, aksesoris-kamera, hp-aksesoris, dll)
  const parts  = slug.split("-");
  const twoKey = `${parts[0]}-${parts[1]}`;

  if (GROUP_META[twoKey])            return twoKey;  // langsung match META
  if (KEY_ALIAS[twoKey])             return KEY_ALIAS[twoKey];

  const oneKey = parts[0];
  if (KEY_ALIAS[oneKey])             return KEY_ALIAS[oneKey];
  return oneKey;
}

/** Kelompokkan flat array kategori DB → CategoryGroup[] */
function groupCategories(categories: Category[]): CategoryGroup[] {
  const map = new Map<string, Category[]>();

  for (const cat of categories) {
    const key = getGroupKey(cat.slug);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(cat);
  }

  const groups: CategoryGroup[] = [];
  for (const [key, cats] of map.entries()) {
    const meta = GROUP_META[key];
    groups.push({
      key,
      label:      meta?.label ?? key.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      icon:       meta?.icon  ?? "📦",
      categories: cats,
    });
  }

  // Sort sesuai GROUP_ORDER, sisanya alphabetis di akhir
  groups.sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.key);
    const bi = GROUP_ORDER.indexOf(b.key);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.label.localeCompare(b.label, "id");
  });

  return groups;
}

// =================================================================
// PAGE COMPONENT
// =================================================================

export default function HomePage() {
  const { data: products,   isLoading: loadingProducts   } = useBestsellers();
  const { data: categories, isLoading: loadingCategories } = useCategories();

  const groups = categories ? groupCategories(categories) : [];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 flex flex-col gap-0">

        {/* ── Hero ────────────────────────────────────────────── */}
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
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold" asChild>
                  <Link href={ROUTES.PRODUCTS}>
                    Mulai Belanja <ShoppingBag className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white text-black hover:bg-white/10 hover:text-white" asChild>
                  <Link href={ROUTES.REGISTER}>Daftar Gratis</Link>
                </Button>
              </div>
            </div>
            <div className="flex-shrink-0 hidden md:block">
              <div className="w-64 h-64 bg-white/10 rounded-full flex items-center justify-center">
                <Image src="/zenit-icon.svg" alt="Zenit Shopping" width={220} height={220} priority />
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature Badges ──────────────────────────────────── */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { icon: <Truck  className="w-5 h-5" />, label: "Gratis Ongkir",  sub: "Min. belanja 50rb" },
                { icon: <Shield className="w-5 h-5" />, label: "Belanja Aman",   sub: "Garansi uang kembali" },
                { icon: <Zap    className="w-5 h-5" />, label: "Proses Cepat",   sub: "Same day delivery" },
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

        {/* ── Kategori ────────────────────────────────────────── */}
        {/*
          Kategori di-fetch dari DB (bisa ratusan), lalu di-GROUP
          di frontend berdasarkan prefix slug → jadi ~15-20 parent group.
          Tiap group = satu ikon/tombol, klik → products page.
          Tidak ada hardcode nama/ikon per ID — semua dinamis dari DB.
        */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Kategori</h2>
              <Link
                href={ROUTES.PRODUCTS}
                className="text-sm text-primary flex items-center gap-1 hover:underline"
              >
                Semua <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Scroll horizontal, hide scrollbar */}
            <div className="overflow-x-auto pb-2 -mx-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-3 px-1 min-w-max">

                {/* "Semua" selalu pertama */}
                <CategoryBtn
                  href={ROUTES.PRODUCTS}
                  icon="🛍️"
                  label="Semua"
                />

                {/* Skeleton saat loading */}
                {loadingCategories && Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 animate-pulse w-[72px] flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gray-200" />
                    <div className="h-3 w-12 bg-gray-200 rounded" />
                  </div>
                ))}

                {/* Parent groups hasil groupCategories() */}
                {!loadingCategories && groups.map(group => (
                  <CategoryGroupBtn key={group.key} group={group} />
                ))}

              </div>
            </div>
          </div>
        </section>

        {/* ── Promo Banner ────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 pt-8 w-full">
          <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-teal-500 text-white p-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Tag className="w-4 h-4 opacity-80" />
                <p className="text-sm font-medium opacity-80">Promo Hari Ini</p>
              </div>
              <h3 className="text-2xl font-bold mb-2">Diskon s/d 75%! 🎉</h3>
              <p className="text-white/70 text-sm">Belanja sekarang dan hemat lebih banyak</p>
            </div>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold flex-shrink-0" asChild>
              <Link href={`${ROUTES.PRODUCTS}?sortBy=soldCount&sortOrder=desc`}>Lihat Promo</Link>
            </Button>
          </div>
        </section>

        {/* ── Produk Terlaris ─────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 py-8 w-full">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold">Produk Terlaris</h2>
              <p className="text-sm text-gray-500">Pilihan terpopuler dari pembeli Zenit</p>
            </div>
            <Link
              href={`${ROUTES.PRODUCTS}?sortBy=soldCount&sortOrder=desc`}
              className="text-sm text-primary flex items-center gap-1 hover:underline"
            >
              Lihat Semua <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {loadingProducts
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products?.map(p => <ProductCard key={p.id} product={p} />)
            }
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <section className="bg-gray-900 text-white mt-4">
          <div className="max-w-7xl mx-auto px-4 py-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Bergabung dengan Zenit Sekarang</h2>
            <p className="text-gray-400 mb-6">Daftar gratis dan nikmati pengalaman belanja terbaik</p>
            <Button size="lg" className="bg-gradient-to-r from-purple-400 to-blue-400 hover:opacity-90 border-0" asChild>
              <Link href={ROUTES.REGISTER}>Daftar Sekarang — Gratis!</Link>
            </Button>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

// =================================================================
// SUB COMPONENTS
// =================================================================

/** Tombol kategori generik */
function CategoryBtn({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center gap-2 group w-[72px] flex-shrink-0">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl group-hover:bg-primary/20 group-hover:scale-105 transition-all duration-200">
        {icon}
      </div>
      <span className="text-xs text-center text-gray-700 leading-tight w-full line-clamp-2">
        {label}
      </span>
    </Link>
  );
}

/**
 * Tombol untuk satu CategoryGroup.
 *
 * Link logic:
 * - Kalau group punya tepat 1 subkategori → pakai categoryId-nya langsung.
 * - Kalau banyak → pakai categoryId subkategori PERTAMA sebagai hint awal.
 *   User bisa pilih subkategori spesifik dari sidebar di products page.
 *
 * TODO (opsional): ketika backend support multi-categoryId filter,
 * ganti href jadi ?categoryIds=id1,id2,id3 untuk filter semua subkategori sekaligus.
 */
function CategoryGroupBtn({ group }: { group: CategoryGroup }) {
  const firstId = group.categories[0]?.id;
  const href    = firstId
    ? `${ROUTES.PRODUCTS}?categoryId=${firstId}`
    : ROUTES.PRODUCTS;

  return <CategoryBtn href={href} icon={group.icon} label={group.label} />;
}