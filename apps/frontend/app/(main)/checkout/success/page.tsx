"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Package, ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/constants";

// Dicapai setelah checkout berhasil.
// orderId dan orderNumber dipass via query param dari checkout/page.tsx:
//   router.push(`/checkout/success?orderId=xxx&orderNumber=ORD-xxx`)

export default function CheckoutSuccessPage() {
  const searchParams  = useSearchParams();
  const orderId       = searchParams.get("orderId");
  const orderNumber   = searchParams.get("orderNumber");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">

        {/* Checkmark */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-50 duration-500">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pesanan Berhasil! 🎉</h1>
        <p className="text-gray-500 mb-6">
          Terima kasih sudah berbelanja di Zenit. Pesanan kamu sedang kami proses.
        </p>

        {/* Nomor order */}
        {orderNumber && (
          <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-left">
            <p className="text-xs text-gray-500 mb-1">Nomor Pesanan</p>
            <p className="font-mono font-bold text-lg text-gray-800">{orderNumber}</p>
            <p className="text-xs text-gray-400 mt-1">
              Simpan nomor ini untuk melacak status pesananmu.
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="bg-white border rounded-2xl p-5 mb-6 text-left space-y-3">
          {[
            { icon: "✅", label: "Pesanan diterima",     sub: "Kami sudah menerima pesananmu" },
            { icon: "📦", label: "Dikemas",              sub: "Pesanan sedang disiapkan" },
            { icon: "🚚", label: "Dikirim ke alamatmu", sub: "Estimasi 1-5 hari kerja" },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xl">{s.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-800">{s.label}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <Separator className="mb-6" />

        {/* CTA */}
        <div className="flex flex-col gap-3">
          {orderId && (
            <Button className="w-full gap-2 bg-gradient-zenit border-0" size="lg" asChild>
              <Link href={ROUTES.ORDER_DETAIL(orderId)}>
                <Package className="w-4 h-4" />
                Lihat Detail Pesanan
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          )}
          <Button variant="outline" className="w-full gap-2" asChild>
            <Link href={ROUTES.ORDERS}>Semua Pesanan Saya</Link>
          </Button>
          <Button variant="ghost" className="w-full gap-2 text-gray-500" asChild>
            <Link href={ROUTES.PRODUCTS}>
              <ShoppingBag className="w-4 h-4" /> Lanjut Belanja
            </Link>
          </Button>
        </div>

      </div>
    </div>
  );
}