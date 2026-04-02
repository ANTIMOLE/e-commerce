"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminUsers } from "@/hooks/useAdmin";
import { formatDate }    from "@/lib/utils";

export default function AdminUsersPage() {
  const [page,   setPage]   = useState(1);
  const [qInput, setQInput] = useState("");
  const [q,      setQ]      = useState("");

  const { data, isLoading } = useAdminUsers({ page, limit: 20, q: q || undefined });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(qInput.trim());
    setPage(1);
  }

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold">Kelola Pengguna</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {data ? `${data.totalCount.toLocaleString("id-ID")} pengguna terdaftar` : ""}
        </p>
      </div>

      {/* ── Search ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              placeholder="Cari nama atau email..."
              className="pl-9 h-9"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-9">Cari</Button>
        </form>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 px-5 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Nama</span>
          <span>Email</span>
          <span>Role</span>
          <span>Pesanan</span>
          <span>Bergabung</span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 items-center px-5 py-3.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-3.5 w-full max-w-[120px]" />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && (data?.data.length ?? 0) === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">Tidak ada pengguna ditemukan</p>
          </div>
        )}

        {/* Rows */}
        {!isLoading && (data?.data.length ?? 0) > 0 && (
          <div className="divide-y">
            {data?.data.map(user => (
              <div
                key={user.id}
                className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 items-center px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {user.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                </div>

                <p className="text-sm text-gray-500 truncate">{user.email}</p>

                <div>
                  {user.role === "ADMIN" ? (
                    <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 text-xs">
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50 text-xs">
                      User
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-gray-600 font-medium">
                  {user._count.orders.toLocaleString("id-ID")}
                </p>

                <p className="text-xs text-gray-400">{formatDate(user.createdAt)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {(data?.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">
              Halaman {page} dari {data!.totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8"
                disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8"
                disabled={page >= data!.totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}