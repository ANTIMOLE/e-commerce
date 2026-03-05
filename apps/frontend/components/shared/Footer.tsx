import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Image src="/zenit-logo.svg" alt="Zenit" width={90} height={28} className="mb-3" />
            <p className="text-sm text-gray-500 leading-relaxed">
              Platform belanja online terpercaya dengan jutaan produk pilihan.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Belanja</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/products" className="hover:text-primary">Semua Produk</Link></li>
              <li><Link href="/products?sortBy=sold_count" className="hover:text-primary">Terlaris</Link></li>
              <li><Link href="/products?sortBy=created_at" className="hover:text-primary">Terbaru</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Akun</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/login"   className="hover:text-primary">Masuk</Link></li>
              <li><Link href="/register" className="hover:text-primary">Daftar</Link></li>
              <li><Link href="/orders"  className="hover:text-primary">Pesanan Saya</Link></li>
              <li><Link href="/profile" className="hover:text-primary">Profil</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Bantuan</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><span className="hover:text-primary cursor-pointer">Pusat Bantuan</span></li>
              <li><span className="hover:text-primary cursor-pointer">Kebijakan Privasi</span></li>
              <li><span className="hover:text-primary cursor-pointer">Syarat & Ketentuan</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100 mt-8 pt-6 text-center text-xs text-gray-400">
          © 2025 Zenit Marketplace. Hak cipta dilindungi.
        </div>
      </div>
    </footer>
  );
}
