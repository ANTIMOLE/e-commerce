"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MapPin, Truck, CreditCard, ChevronRight, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, getImageUrl } from "@/lib/utils";
import { SHIPPING_OPTIONS, PAYMENT_METHODS, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ShippingMethodCode, PaymentMethodCode, AddressInput } from "@/types";
import { useCart } from "@/hooks/useCart";
import { useAddresses, useCheckout, useCheckoutSummary } from "@/hooks/useCheckout";

// ── Add Address Dialog ────────────────────────────────────────
const EMPTY_ADDR: AddressInput = {
  recipientName: "", phone: "", address: "", city: "", province: "", zipCode: "", isDefault: false,
};

function AddAddressDialog({ open, onClose, onSave, isSaving }: {
  open: boolean; onClose: () => void;
  onSave: (input: AddressInput) => Promise<void>;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<AddressInput>(EMPTY_ADDR);
  function f<K extends keyof AddressInput>(key: K, val: AddressInput[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }
  const isValid = !!(form.recipientName && form.phone && form.address && form.city && form.province && form.zipCode);
  function handleClose() { setForm(EMPTY_ADDR); onClose(); }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Tambah Alamat Baru</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Nama Penerima *</Label>
              <Input value={form.recipientName} onChange={e => f("recipientName", e.target.value)} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-1.5"><Label>Nomor HP *</Label>
              <Input type="tel" value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="08xx..." />
            </div>
          </div>
          <div className="space-y-1.5"><Label>Alamat Lengkap *</Label>
            <Input value={form.address} onChange={e => f("address", e.target.value)} placeholder="Jalan, No, RT/RW, Kelurahan" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Kota/Kabupaten *</Label>
              <Input value={form.city} onChange={e => f("city", e.target.value)} placeholder="Yogyakarta" />
            </div>
            <div className="space-y-1.5"><Label>Provinsi *</Label>
              <Input value={form.province} onChange={e => f("province", e.target.value)} placeholder="DI Yogyakarta" />
            </div>
          </div>
          <div className="space-y-1.5"><Label>Kode Pos *</Label>
            <Input value={form.zipCode} onChange={e => f("zipCode", e.target.value)} placeholder="55281" className="max-w-32" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={!!form.isDefault} onChange={e => f("isDefault", e.target.checked)} className="rounded" />
            Jadikan alamat utama
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Batal</Button>
          <Button onClick={async () => { await onSave(form); handleClose(); }} disabled={!isValid || isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan Alamat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: loadingAuth } = useAuth();

  const { cart, isLoading: isLoadingCart, isEmpty, subtotal, tax } = useCart();
  const { data: addresses = [], isLoading: isLoadingAddr } = useAddresses();
  const { confirmCheckout, isConfirming, createAddress, isCreatingAddress } = useCheckout();

  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [selectedShipping,  setSelectedShipping]  = useState<ShippingMethodCode>("regular");
  const [selectedPayment,   setSelectedPayment]   = useState<PaymentMethodCode>("bank_transfer");
  const [showAddAddr,       setShowAddAddr]        = useState(false);

  // Summary dari backend — re-fetch otomatis kalau selectedShipping berubah
  // Fallback ke kalkulasi lokal selama loading agar UI tidak blank
  const { data: summary, isLoading: isLoadingSummary } = useCheckoutSummary(cart?.id, selectedShipping);
  const localShipping   = SHIPPING_OPTIONS.find(s => s.code === selectedShipping)?.price ?? 15_000;
  const displaySubtotal = summary?.subtotal     ?? subtotal;
  const displayTax      = summary?.tax          ?? tax;
  const displayShipping = summary?.shippingCost ?? localShipping;
  const displayTotal    = summary?.total        ?? (subtotal + tax + localShipping);

  const canConfirm = !!selectedAddressId && !isConfirming;

  if (!loadingAuth && !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState emoji="🔒" title="Login dulu"
          description="Kamu perlu login untuk melanjutkan checkout."
          action={{ label: "Login", onClick: () => router.push(ROUTES.LOGIN) }}
        />
      </div>
    );
  }

  if (!isLoadingCart && isEmpty) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState emoji="🛒" title="Keranjang kosong"
          description="Tambahkan produk dulu sebelum checkout."
          action={{ label: "Belanja Sekarang", onClick: () => router.push(ROUTES.PRODUCTS) }}
        />
      </div>
    );
  }

  async function handleConfirm() {
    if (!cart?.id || !selectedAddressId) return;
    try {
      const order = await confirmCheckout({
        cartId:         cart.id,
        addressId:      selectedAddressId,
        shippingMethod: selectedShipping,
        paymentMethod:  selectedPayment,
      });
      router.push(`/checkout/success?orderId=${order.id}&orderNumber=${order.orderNumber}`);
    } catch {
      // error sudah di-toast oleh hook
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Kiri: Form ──────────────────────────────────── */}
        <div className="flex-1 space-y-4">

          {/* 1. Alamat */}
          <Section step={1} icon={<MapPin className="w-4 h-4" />} title="Alamat Pengiriman">
            {isLoadingAddr ? (
              <div className="space-y-2">
                {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">Belum ada alamat tersimpan.</p>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddAddr(true)}>
                  <Plus className="w-3.5 h-3.5" /> Tambah Alamat
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map(addr => (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border-2 transition-all text-sm",
                      selectedAddressId === addr.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{addr.recipientName}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{addr.phone}</p>
                        <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                          {addr.address}, {addr.city}, {addr.province} {addr.zipCode}
                        </p>
                        {addr.isDefault && (
                          <span className="inline-block mt-1.5 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Utama
                          </span>
                        )}
                      </div>
                      {selectedAddressId === addr.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                ))}
                <Button variant="ghost" size="sm" className="w-full gap-1.5 text-gray-500 mt-1" onClick={() => setShowAddAddr(true)}>
                  <Plus className="w-3.5 h-3.5" /> Tambah Alamat Baru
                </Button>
              </div>
            )}
          </Section>

          {/* 2. Pengiriman */}
          <Section step={2} icon={<Truck className="w-4 h-4" />} title="Metode Pengiriman">
            <div className="space-y-2">
              {SHIPPING_OPTIONS.map(opt => (
                <button
                  key={opt.code}
                  onClick={() => setSelectedShipping(opt.code)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border-2 transition-all",
                    selectedShipping === opt.code
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{opt.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-primary">{formatPrice(opt.price)}</span>
                      {selectedShipping === opt.code && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* 3. Pembayaran */}
          <Section step={3} icon={<CreditCard className="w-4 h-4" />} title="Metode Pembayaran">
            <div className="space-y-2">
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.code}
                  onClick={() => setSelectedPayment(method.code)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border-2 transition-all",
                    selectedPayment === method.code
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{method.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{method.description}</p>
                    </div>
                    {selectedPayment === method.code && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                </button>
              ))}
            </div>
          </Section>

        </div>

        {/* ── Kanan: Ringkasan ──────────────────────────────── */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl border shadow-sm p-5 sticky top-20">
            <h2 className="font-semibold text-base mb-4">Ringkasan Order</h2>

            {isLoadingCart ? (
              <div className="space-y-2 mb-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {cart?.items?.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image
                        src={getImageUrl(item.product?.images?.[0])}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                        fill
                        onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder-product.png"; }}
                      />
                    </div>
                    <p className="flex-1 text-gray-700 line-clamp-1">{item.product.name}</p>
                    <p className="font-medium flex-shrink-0">×{item.quantity}</p>
                  </div>
                ))}
              </div>
            )}

            <Separator className="mb-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatPrice(displaySubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">PPN 11%</span>
                <span>{formatPrice(displayTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ongkir</span>
                {/* [FIX] Tampilkan "..." saat summary sedang loading — hindari angka lama */}
                <span>{isLoadingSummary ? "..." : formatPrice(displayShipping)}</span>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between font-bold text-base mb-5">
              <span>Total</span>
              <span className="text-primary">{isLoadingSummary ? "..." : formatPrice(displayTotal)}</span>
            </div>

            <Button
              className="w-full gap-2 bg-gradient-zenit border-0"
              size="lg"
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              {isConfirming ? "Memproses..." : "Buat Pesanan"}
              {!isConfirming && <ChevronRight className="w-4 h-4" />}
            </Button>
            {!selectedAddressId && (
              <p className="text-xs text-center text-gray-400 mt-2">Pilih alamat pengiriman dulu</p>
            )}
          </div>
        </div>

      </div>

      <AddAddressDialog
        open={showAddAddr}
        onClose={() => setShowAddAddr(false)}
        onSave={async (input) => {
          const addr = await createAddress(input);
          setSelectedAddressId(addr.id);
          setShowAddAddr(false);
        }}
        isSaving={isCreatingAddress}
      />
    </div>
  );
}

// ── Section helper ────────────────────────────────────────────
function Section({ step, icon, title, children }: {
  step: number; icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b">
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {step}
        </div>
        <span className="text-primary">{icon}</span>
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
