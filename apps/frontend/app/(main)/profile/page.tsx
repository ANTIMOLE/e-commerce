"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Mail, Phone, Package, KeyRound,
  Edit2, Save, X, ChevronRight, MapPin, Plus, Star, Trash2,
} from "lucide-react";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Label }     from "@/components/ui/label";
import { Skeleton }  from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth }           from "@/hooks/useAuth";
import { useProfile, useAddressManager } from "@/hooks/useProfile";
import { ROUTES }            from "@/lib/constants";
import { formatDate }        from "@/lib/utils";
import { toast }             from "sonner";
import type { Address, AddressInput } from "@/types";

// ── Address form helpers ───────────────────────────────────────
const EMPTY_ADDR: AddressInput = {
  label: "", recipientName: "", phone: "",
  address: "", city: "", province: "", zipCode: "", isDefault: false,
};

function addrToInput(a: Address): AddressInput {
  return {
    label:         a.label ?? "",
    recipientName: a.recipientName,
    phone:         a.phone,
    address:       a.address,
    city:          a.city,
    province:      a.province,
    zipCode:       a.zipCode,
    isDefault:     a.isDefault,
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: loadingAuth, changePassword, isChangePasswordLoading } = useAuth();

  const { profile, isLoading: loadingProfile, updateProfile, isUpdating } = useProfile();
  const {
    addresses, isLoading: loadingAddr, isMutating,
    addAddress, editAddress, deleteAddress, setDefault,
  } = useAddressManager();

  // ── Profile form state ────────────────────────────────────
  const [form,     setForm]     = useState({ name: "", phone: "" });
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (profile) setForm({ name: profile.name ?? "", phone: profile.phone ?? "" });
  }, [profile]);

  const displayUser = profile ?? user;

  async function handleSave() {
    try {
      await updateProfile({ name: form.name, phone: form.phone });
      setEditMode(false);
    } catch { /* toast handled by hook */ }
  }

  function handleCancel() {
    setForm({ name: displayUser?.name ?? "", phone: displayUser?.phone ?? "" });
    setEditMode(false);
  }

  // ── Address dialog state ──────────────────────────────────
  const [addrDialogOpen, setAddrDialogOpen] = useState(false);
  const [editingAddr,    setEditingAddr]    = useState<Address | null>(null);
  const [addrForm,       setAddrForm]       = useState<AddressInput>(EMPTY_ADDR);
  const [deleteAddr,     setDeleteAddr]     = useState<Address | null>(null);

  // ── Change password state ─────────────────────────────────
  const [pwDialogOpen,  setPwDialogOpen]   = useState(false);
  const [pwForm,        setPwForm]         = useState({ old: "", new: "", confirm: "" });
  const [pwError,       setPwError]        = useState("");
  const oldPwRef = useRef<HTMLInputElement>(null);

  function openPwDialog() {
    setPwForm({ old: "", new: "", confirm: "" });
    setPwError("");
    setPwDialogOpen(true);
  }

  async function handleChangePassword() {
    if (pwForm.new !== pwForm.confirm) {
      setPwError("Password baru dan konfirmasi tidak cocok");
      return;
    }
    if (pwForm.new.length < 8) {
      setPwError("Password baru minimal 8 karakter");
      return;
    }
    setPwError("");
    changePassword(
      { oldPassword: pwForm.old, newPassword: pwForm.new },
      { onSuccess: () => setPwDialogOpen(false) }
    );
  }

  function openAddAddr() {
    setEditingAddr(null);
    setAddrForm(EMPTY_ADDR);
    setAddrDialogOpen(true);
  }

  function openEditAddr(a: Address) {
    setEditingAddr(a);
    setAddrForm(addrToInput(a));
    setAddrDialogOpen(true);
  }

  async function handleAddrSubmit() {
    if (!addrForm.recipientName || !addrForm.phone || !addrForm.address ||
        !addrForm.city || !addrForm.province || !addrForm.zipCode) return;
    if (editingAddr) {
      await editAddress({ id: editingAddr.id, data: addrForm });
    } else {
      await addAddress(addrForm);
    }
    setAddrDialogOpen(false);
  }

  function setAddrField(field: keyof AddressInput, value: string | boolean) {
    setAddrForm(f => ({ ...f, [field]: value }));
  }

  // ── Loading ───────────────────────────────────────────────
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

        <div className="p-6 space-y-4">
          {editMode ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Nama Lengkap</Label>
                <Input id="name" value={form.name} className="mt-1"
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nama lengkap kamu" />
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">Nomor Telepon</Label>
                <Input id="phone" value={form.phone} className="mt-1"
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="08xxxxxxxxxx" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={isUpdating} className="gap-1.5">
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
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={() => {
                    setForm({ name: displayUser?.name ?? "", phone: displayUser?.phone ?? "" });
                    setEditMode(true);
                  }}>
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profil
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Alamat Pengiriman ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <p className="font-semibold text-sm">Alamat Pengiriman</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {addresses.length}/5 alamat tersimpan
            </p>
          </div>
          {addresses.length < 5 && (
            <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={openAddAddr}>
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </Button>
          )}
        </div>

        {/* Loading alamat */}
        {loadingAddr && (
          <div className="p-4 space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="rounded-xl border p-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        )}

        {/* Tidak ada alamat */}
        {!loadingAddr && addresses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">Belum ada alamat</p>
            <p className="text-xs text-gray-400 mt-1">Tambah alamat pengiriman untuk checkout lebih cepat</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={openAddAddr}>
              <Plus className="w-3.5 h-3.5" />
              Tambah Alamat Pertama
            </Button>
          </div>
        )}

        {/* List alamat */}
        {!loadingAddr && addresses.length > 0 && (
          <div className="divide-y">
            {addresses.map(addr => (
              <div key={addr.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">
                        {addr.recipientName}
                      </p>
                      {addr.label && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {addr.label}
                        </span>
                      )}
                      {addr.isDefault && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Utama
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{addr.phone}</p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {addr.address}, {addr.city}, {addr.province} {addr.zipCode}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!addr.isDefault && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs text-gray-500 hover:text-primary"
                        disabled={isMutating}
                        onClick={() => setDefault(addr.id)}
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Utamakan
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-gray-700"
                      onClick={() => openEditAddr(addr)}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    {!addr.isDefault && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteAddr(addr)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Aktivitas & Quick Links ─────────────────────────── */}
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

        <button
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          onClick={openPwDialog}
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

      {/* ── Add / Edit Address Dialog ───────────────────────── */}
      <Dialog open={addrDialogOpen} onOpenChange={setAddrDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddr ? "Edit Alamat" : "Tambah Alamat Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Label opsional */}
            <div className="space-y-1.5">
              <Label htmlFor="a-label">Label Alamat</Label>
              <Input id="a-label" value={addrForm.label ?? ""}
                onChange={e => setAddrField("label", e.target.value)}
                placeholder="cth: Rumah, Kantor (opsional)" />
            </div>

            {/* Nama penerima & telepon */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="a-name">Nama Penerima <span className="text-red-500">*</span></Label>
                <Input id="a-name" value={addrForm.recipientName}
                  onChange={e => setAddrField("recipientName", e.target.value)}
                  placeholder="Nama lengkap" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-phone">Telepon <span className="text-red-500">*</span></Label>
                <Input id="a-phone" value={addrForm.phone}
                  onChange={e => setAddrField("phone", e.target.value)}
                  placeholder="08xxxxxxxxxx" />
              </div>
            </div>

            {/* Alamat lengkap */}
            <div className="space-y-1.5">
              <Label htmlFor="a-addr">Alamat Lengkap <span className="text-red-500">*</span></Label>
              <Input id="a-addr" value={addrForm.address}
                onChange={e => setAddrField("address", e.target.value)}
                placeholder="Jl., No., RT/RW, Kelurahan, Kecamatan" />
            </div>

            {/* Kota & Provinsi */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="a-city">Kota <span className="text-red-500">*</span></Label>
                <Input id="a-city" value={addrForm.city}
                  onChange={e => setAddrField("city", e.target.value)}
                  placeholder="Jakarta Selatan" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-prov">Provinsi <span className="text-red-500">*</span></Label>
                <Input id="a-prov" value={addrForm.province}
                  onChange={e => setAddrField("province", e.target.value)}
                  placeholder="DKI Jakarta" />
              </div>
            </div>

            {/* Kode pos */}
            <div className="space-y-1.5">
              <Label htmlFor="a-zip">Kode Pos <span className="text-red-500">*</span></Label>
              <Input id="a-zip" value={addrForm.zipCode}
                onChange={e => setAddrField("zipCode", e.target.value)}
                placeholder="12345" className="max-w-[160px]" />
            </div>

            {/* Set sebagai utama */}
            {!editingAddr?.isDefault && (
              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={!!addrForm.isDefault}
                  onChange={e => setAddrField("isDefault", e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm text-gray-700">Jadikan alamat utama</span>
              </label>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddrDialogOpen(false)}>Batal</Button>
            <Button
              onClick={handleAddrSubmit}
              disabled={isMutating || !addrForm.recipientName || !addrForm.phone ||
                        !addrForm.address || !addrForm.city || !addrForm.province || !addrForm.zipCode}
            >
              {isMutating ? "Menyimpan..." : editingAddr ? "Simpan Perubahan" : "Tambah Alamat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Address Confirmation ─────────────────────── */}
      <Dialog open={!!deleteAddr} onOpenChange={open => !open && setDeleteAddr(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Alamat?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Alamat <span className="font-semibold">"{deleteAddr?.label || deleteAddr?.city}"</span> akan
            dihapus permanen dan tidak bisa dikembalikan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteAddr(null)}>Batal</Button>
            <Button variant="destructive" disabled={isMutating}
              onClick={async () => {
                if (!deleteAddr) return;
                await deleteAddress(deleteAddr.id);
                setDeleteAddr(null);
              }}>
              {isMutating ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Dialog ──────────────────────────── */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ganti Password</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="pw-old">Password Lama <span className="text-red-500">*</span></Label>
              <Input
                id="pw-old"
                ref={oldPwRef}
                type="password"
                value={pwForm.old}
                onChange={e => setPwForm(f => ({ ...f, old: e.target.value }))}
                placeholder="Password saat ini"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-new">Password Baru <span className="text-red-500">*</span></Label>
              <Input
                id="pw-new"
                type="password"
                value={pwForm.new}
                onChange={e => setPwForm(f => ({ ...f, new: e.target.value }))}
                placeholder="Min. 8 karakter"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-confirm">Konfirmasi Password Baru <span className="text-red-500">*</span></Label>
              <Input
                id="pw-confirm"
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
              />
            </div>
            {pwError && (
              <p className="text-xs text-red-500">{pwError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPwDialogOpen(false)}>Batal</Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangePasswordLoading || !pwForm.old || !pwForm.new || !pwForm.confirm}
            >
              {isChangePasswordLoading ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}