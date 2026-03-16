"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Mail, Phone, Package, KeyRound,
  Edit2, Save, X, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: loadingAuth } = useAuth();

  // TODO: sambungkan ke useProfile setelah hook diimplementasi
  // Untuk sekarang pakai data dari useAuth sebagai fallback
  const { profile, isLoading: loadingProfile, updateProfile, isUpdating } = useProfile();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name:  user?.name  ?? "",
    phone: user?.phone ?? "",
  });

  // Sync form saat data user datang
  const displayUser = profile ?? user;

  // ── Submit edit profil ─────────────────────────────────────
  async function handleSave() {
    try {
      await updateProfile({ name: form.name, phone: form.phone });
      setEditMode(false);
      toast.success("Profil berhasil diperbarui");
    } catch {
      toast.error("Gagal memperbarui profil");
    }
  }

  function handleCancel() {
    setForm({ name: displayUser?.name ?? "", phone: displayUser?.phone ?? "" });
    setEditMode(false);
  }

  // ── Loading state ───────────────────────────────────────────
  if (loadingAuth || loadingProfile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="bg-white rounded-2xl border p-6 space-y-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold">Profil Saya</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola informasi akun kamu</p>
      </div>

      {/* ── Info Akun ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border shadow-sm">

        {/* Avatar area */}
        <div className="flex items-center gap-4 p-6 border-b">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
            {(displayUser?.name ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-lg">{displayUser?.name ?? "—"}</p>
            <p className="text-sm text-gray-500">{displayUser?.email ?? "—"}</p>
            {displayUser?.createdAt && (
              <p className="text-xs text-gray-400 mt-0.5">
                Bergabung {formatDate(displayUser.createdAt)}
              </p>
            )}
          </div>
        </div>

        {/* Form / Display */}
        <div className="p-6 space-y-4">

          {editMode ? (
            /* ── Edit Mode ─── */
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="mt-1"
                  placeholder="Nama lengkap kamu"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">Nomor Telepon</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="mt-1"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isUpdating ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button variant="outline" onClick={handleCancel} className="gap-1.5">
                  <X className="w-4 h-4" />
                  Batal
                </Button>
              </div>
            </div>
          ) : (
            /* ── View Mode ─── */
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 w-24 flex-shrink-0">Nama</span>
                <span className="font-medium">{displayUser?.name ?? "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 w-24 flex-shrink-0">Email</span>
                <span className="font-medium">{displayUser?.email ?? "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-600 w-24 flex-shrink-0">Telepon</span>
                <span className="font-medium">{displayUser?.phone ?? "—"}</span>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setForm({ name: displayUser?.name ?? "", phone: displayUser?.phone ?? "" });
                    setEditMode(true);
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profil
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Quick Links ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

        <div className="px-6 py-4 border-b">
          <p className="font-semibold text-sm">Aktivitas Saya</p>
        </div>

        <button
          onClick={() => router.push(ROUTES.ORDERS)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Pesanan Saya</p>
              <p className="text-xs text-gray-500">Lihat semua riwayat pesanan</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        <Separator />

        {/* TODO: tambah navigasi ke halaman change password setelah dibuat */}
        <button
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          onClick={() => toast.info("Fitur ganti password akan segera tersedia")}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Ganti Password</p>
              <p className="text-xs text-gray-500">Ubah kata sandi akun</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

      </div>

    </div>
  );
}