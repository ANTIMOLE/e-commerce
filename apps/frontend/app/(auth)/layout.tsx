import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple header */}
      <header className="bg-white border-b px-6 py-4">
        <Link href="/">
          <Image src="/zenit-logo.svg" alt="Zenit" width={90} height={28} />
        </Link>
      </header>

      {/* Centered content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
        © 2025 Zenit Marketplace
      </footer>
    </div>
  );
}
