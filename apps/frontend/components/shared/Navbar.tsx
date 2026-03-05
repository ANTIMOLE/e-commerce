"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ShoppingCart, User, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`${ROUTES.PRODUCTS}?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-4 h-16">

          {/* Logo */}
          <Link href={ROUTES.HOME} className="flex-shrink-0">
            <Image
              src="/zenit-logo.svg"
              alt="Zenit"
              width={100}
              height={32}
              priority
            />
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari produk di Zenit..."
                className="pl-10 pr-4 h-10 bg-gray-50 border-gray-200 focus:border-primary focus:bg-white"
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">

            {/* Cart */}
            <Link href={ROUTES.CART}>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="w-5 h-5" />
                {/* TODO: badge count dari useCart */}
              </Button>
            </Link>

            {/* Auth */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.ORDERS}>Pesanan Saya</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.PROFILE}>Profil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-500 focus:text-red-500"
                    onClick={logout}
                  >
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={ROUTES.LOGIN}>Masuk</Link>
                </Button>
                <Button size="sm" className="bg-gradient-zenit border-0" asChild>
                  <Link href={ROUTES.REGISTER}>Daftar</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearch} className="pb-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="pl-10 h-9 bg-gray-50"
            />
          </div>
        </form>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white px-4 py-4 flex flex-col gap-2">
          {!isAuthenticated && (
            <>
              <Button asChild className="w-full">
                <Link href={ROUTES.LOGIN}>Masuk</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href={ROUTES.REGISTER}>Daftar</Link>
              </Button>
            </>
          )}
          <Link href={ROUTES.ORDERS} className="py-2 text-sm">Pesanan</Link>
          <Link href={ROUTES.PROFILE} className="py-2 text-sm">Profil</Link>
        </div>
      )}
    </header>
  );
}
