"use client";

import { useState } from "react";
import {
  Search, Plus, Pencil, Trash2,
  ChevronLeft, ChevronRight, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAdminProducts, useCreateProduct,
  useUpdateProduct, useDeleteProduct,
} from "@/hooks/useAdmin";
import type { AdminProduct } from "@/hooks/useAdmin";
import { useCategories } from "@/hooks/useCategories";
import { formatPrice, getImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Image from "next/image";

// ── Form state ─────────────────────────────────────────────────
interface ProductForm {
  name:        string;
  description: string;
  price:       string;
  stock:       string;
  discount:    string;
  categoryId:  string;
  images:      string;
}

const EMPTY_FORM: ProductForm = {
  name: "", description: "", price: "", stock: "",
  discount: "0", categoryId: "", images: "",
};

function formToPayload(f: ProductForm) {
  return {
    name:        f.name.trim(),
    description: f.description.trim() || undefined,
    price:       parseFloat(f.price),
    stock:       parseInt(f.stock, 10),
    discount:    parseInt(f.discount, 10) || 0,
    categoryId:  f.categoryId,
    images:      f.images.split("\n").map(s => s.trim()).filter(Boolean),
  };
}

function productToForm(p: AdminProduct): ProductForm {
  return {
    name:        p.name,
    description: "",
    price:       String(p.price),
    stock:       String(p.stock),
    discount:    String(p.discount ?? 0),
    categoryId:  p.category.id,
    images:      (p.images ?? []).join("\n"),
  };
}

// ── Page ───────────────────────────────────────────────────────

// ── AdminProductThumb ─────────────────────────────────────────
// Komponen kecil yang kelola fallback gambar via React state.
// React-safe: tidak mutasi DOM, tidak pakai innerHTML.
function AdminProductThumb({ src, alt }: { src?: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);
  if (!imgSrc) {
    return (
      <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-gray-300 text-lg">
        📷
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
      <img
        src={imgSrc}
        alt={alt}
        width={40}
        height={40}
        className="w-full h-full object-cover"
        onError={() => setImgSrc(undefined)}
      />
    </div>
  );
}

export default function AdminProductsPage() {
  const [page,         setPage]         = useState(1);
  const [qInput,       setQInput]       = useState("");
  const [q,            setQ]            = useState("");
  const [catFilter,    setCatFilter]    = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [editing,      setEditing]      = useState<AdminProduct | null>(null);
  const [form,         setForm]         = useState<ProductForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);

  const { data, isLoading } = useAdminProducts({
    page, limit: 15,
    q:          q || undefined,
    categoryId: catFilter !== "all" ? catFilter : undefined,
    isActive:   activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); }
  function openEdit(p: AdminProduct) { setEditing(p); setForm(productToForm(p)); setDialogOpen(true); }
  function setField(field: keyof ProductForm, value: string) { setForm(f => ({ ...f, [field]: value })); }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(qInput.trim());
    setPage(1);
  }

  async function handleSubmit() {
    const payload = formToPayload(form);
    if (!payload.name || !payload.categoryId || isNaN(payload.price) || isNaN(payload.stock)) return;
    if (editing) {
      await updateProduct.mutateAsync({ id: editing.id, data: payload });
    } else {
      await createProduct.mutateAsync(payload);
    }
    setDialogOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteProduct.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const isSaving = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="space-y-5 max-w-6xl">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kelola Produk</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data ? `${data.totalCount.toLocaleString("id-ID")} produk total` : ""}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5 flex-shrink-0">
          <Plus className="w-4 h-4" />
          Tambah Produk
        </Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={qInput}
              onChange={e => setQInput(e.target.value)}
              placeholder="Cari nama produk..."
              className="pl-9 h-9"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-9">Cari</Button>
        </form>

        <div className="flex gap-2">
          <Select value={catFilter} onValueChange={v => { setCatFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue placeholder="Semua kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeFilter} onValueChange={v => { setActiveFilter(v as typeof activeFilter); setPage(1); }}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px_120px] gap-3 px-5 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Produk</span><span>Kategori</span><span>Harga</span>
          <span>Stok</span><span>Status</span><span>Aksi</span>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_80px_120px] gap-3 items-center px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                  <Skeleton className="h-3.5 w-36" />
                </div>
                {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} className="h-3.5 w-20" />)}
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && (data?.data.length ?? 0) === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-sm font-medium text-gray-500">Tidak ada produk ditemukan</p>
            <p className="text-xs text-gray-400 mt-1">Coba ubah filter atau tambah produk baru</p>
          </div>
        )}

        {/* Rows */}
        {!isLoading && (data?.data.length ?? 0) > 0 && (
          <div className="divide-y">
            {data?.data.map(product => (
              <div key={product.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_80px_120px] gap-3 items-center px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                {/* Produk */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* [FIX] AdminProductThumb kelola fallback via React state — tidak mutasi DOM */}
                  <AdminProductThumb src={product.images?.[0]} alt={product.name} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                    {product.discount > 0 && (
                      <span className="text-xs text-orange-500 font-medium">{product.discount}% off</span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-500 truncate">{product.category.name}</p>
                <p className="text-sm font-semibold text-gray-800">{formatPrice(product.price)}</p>

                <p className={cn(
                  "text-sm font-medium",
                  product.stock === 0 ? "text-red-500" :
                  product.stock < 10  ? "text-orange-500" : "text-gray-700"
                )}>
                  {product.stock.toLocaleString("id-ID")}
                </p>

                <div>
                  {product.isActive ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">Aktif</Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-400 border-gray-200 bg-gray-50 text-xs">Nonaktif</Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700"
                    onClick={() => openEdit(product)} title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700"
                    onClick={() => updateProduct.mutate({ id: product.id, data: { isActive: !product.isActive } })}
                    title={product.isActive ? "Nonaktifkan" : "Aktifkan"}>
                    {product.isActive
                      ? <ToggleRight className="w-4 h-4 text-green-500" />
                      : <ToggleLeft className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteTarget(product)} title="Hapus">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {(data?.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">Halaman {page} dari {data!.totalPages}</p>
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

      {/* ── Create / Edit Dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nama Produk <span className="text-red-500">*</span></Label>
              <Input id="p-name" value={form.name}
                onChange={e => setField("name", e.target.value)} placeholder="Nama produk" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Deskripsi</Label>
              <Textarea id="p-desc" value={form.description}
                onChange={e => setField("description", e.target.value)}
                placeholder="Deskripsi produk (opsional)" rows={3} className="resize-none" />
            </div>

            <div className="space-y-1.5">
              <Label>Kategori <span className="text-red-500">*</span></Label>
              <Select value={form.categoryId} onValueChange={v => setField("categoryId", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Harga (Rp) <span className="text-red-500">*</span></Label>
                <Input id="p-price" type="number" min="0" value={form.price}
                  onChange={e => setField("price", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-stock">Stok <span className="text-red-500">*</span></Label>
                <Input id="p-stock" type="number" min="0" value={form.stock}
                  onChange={e => setField("stock", e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-discount">Diskon (%)</Label>
              <Input id="p-discount" type="number" min="0" max="100" value={form.discount}
                onChange={e => setField("discount", e.target.value)} placeholder="0" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-images">URL Gambar</Label>
              <Textarea id="p-images" value={form.images}
                onChange={e => setField("images", e.target.value)}
                placeholder={"https://example.com/img1.jpg\nhttps://example.com/img2.jpg"}
                rows={3} className="resize-none text-xs font-mono" />
              <p className="text-xs text-gray-400">Satu URL per baris, maks. 5 gambar</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit}
              disabled={isSaving || !form.name || !form.categoryId || !form.price || !form.stock}>
              {isSaving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Buat Produk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Produk?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Produk <span className="font-semibold">"{deleteTarget?.name}"</span> akan dinonaktifkan
            dan tidak muncul di katalog. Tindakan ini dapat dibalik dengan mengaktifkan kembali.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="destructive" disabled={deleteProduct.isPending} onClick={handleDelete}>
              {deleteProduct.isPending ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
