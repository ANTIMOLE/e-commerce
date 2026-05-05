"use client";

// ============================================================
// ImageWithFallback
// Komponen pengganti pola lama: getImageUrl() + <img/Image onError>
//
// Fallback chain:
//   images[0]  (URL tokopedia eksternal)
//   → images[1] (copy lokal di /public/, e.g. "/images/...")
//   → PLACEHOLDER_IMAGE
//
// Usage (menggantikan getImageUrl di semua halaman):
//
//   // LAMA:
//   <img src={getImageUrl(item.images[0])} />
//
//   // BARU (pakai img biasa, misalnya admin/context non-Next):
//   <ImageWithFallback images={item.images} alt={item.name} className="..." />
//
//   // BARU (pakai Next.js Image dengan fill):
//   <ImageWithFallback images={item.images} alt={item.name} fill className="..." />
//
//   // Atau kalau hanya punya satu string URL (misal productImage dari order):
//   <ImageWithFallback images={[productImage]} alt={name} className="..." />
// ============================================================

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";

interface ImageWithFallbackProps extends Omit<ImageProps, "src" | "onError"> {
  // Array gambar dengan priority order: [eksternal, lokal, ...]
  // Boleh juga isi satu elemen: [singleUrl]
  images: (string | null | undefined)[];
  alt:    string;
}

export function ImageWithFallback({ images, alt, ...props }: ImageWithFallbackProps) {
  // Filter null/undefined/empty, lalu ambil raw URL (bukan lewat getImageUrl)
  const validImages = images.filter((u): u is string => !!u && u.trim() !== "");

  const [currentIndex, setCurrentIndex] = useState(0);

  // Bangun src saat ini berdasarkan index
  const rawSrc = validImages[currentIndex] ?? PLACEHOLDER_IMAGE;

  // Path lokal di /public/ harus dimulai dengan "/" — tambahkan kalau perlu
  const src = rawSrc.startsWith("http") || rawSrc.startsWith("/")
    ? rawSrc
    : `/${rawSrc}`;

  const handleError = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < validImages.length) {
      setCurrentIndex(nextIndex);
    } else if (src !== PLACEHOLDER_IMAGE) {
      // Semua validImages sudah dicoba, fallback ke placeholder
      // Paksa re-render dengan placeholder lewat trick state
      setCurrentIndex(validImages.length); // out-of-range → pakai PLACEHOLDER_IMAGE
    }
    // Guard: kalau src sudah PLACEHOLDER_IMAGE, stop — jangan infinite loop
  };

  const finalSrc = currentIndex >= validImages.length ? PLACEHOLDER_IMAGE : src;

  return (
    <Image
      {...props}
      src={finalSrc}
      alt={alt}
      onError={handleError}
      // Nonaktifkan Next.js image optimizer untuk URL eksternal tokopedia
      // agar tidak kena error optimizer saat URL expired/berformat aneh
      unoptimized={finalSrc.startsWith("http")}
    />
  );
}

// ── Varian <img> biasa (untuk admin table / konteks tanpa next/image) ────
// Pakai ini kalau tidak butuh fill/priority/sizes dari Next.js Image
interface ImgWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  images: (string | null | undefined)[];
  alt:    string;
}

export function ImgWithFallback({ images, alt, ...props }: ImgWithFallbackProps) {
  const validImages = images.filter((u): u is string => !!u && u.trim() !== "");
  const [currentIndex, setCurrentIndex] = useState(0);

  const rawSrc = validImages[currentIndex] ?? PLACEHOLDER_IMAGE;
  const src    = rawSrc.startsWith("http") || rawSrc.startsWith("/") ? rawSrc : `/${rawSrc}`;
  const finalSrc = currentIndex >= validImages.length ? PLACEHOLDER_IMAGE : src;

  const handleError = () => {
    const next = currentIndex + 1;
    if (next < validImages.length) {
      setCurrentIndex(next);
    } else if (finalSrc !== PLACEHOLDER_IMAGE) {
      setCurrentIndex(validImages.length);
    }
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={finalSrc}
      alt={alt}
      onError={handleError}
    />
  );
}
