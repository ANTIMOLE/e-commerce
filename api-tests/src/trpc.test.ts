/**
 * trpc.test.ts — Blackbox Functional Test: tRPC API
 *
 * Port dari functional_trpc.js (k6) ke Vitest.
 * Semua test dijalankan BERURUTAN karena 1 sesi stateful end-to-end.
 *
 * FIX:
 *  - Hilangkan false-green: if (!S.X) return → expect(S.X).not.toBeNull()
 *  - toBeDefined() → toBeTruthy() / toMatch() untuk ID stateful
 *  - Change-password: tambah positive path (sukses → login baru berhasil → lama gagal)
 *  - Admin: tambah 403 non-admin consumer biasa
 *  - Tambah assertion payload shape pada read endpoint penting
 *
 * Run: pnpm test:trpc
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createTrpcSession, trpcData, isTrpcError } from "./helpers/trpc";
import { TRPC_URL, ADMIN_EMAIL, ADMIN_PASSWORD, TEST_PASSWORD } from "./config";

const S = {
  product: null as null | {
    id: string;
    name: string;
    slug: string;
    stock: number;
  },
  categoryId: null as null | string,
  categorySlug: null as null | string,
  userEmail: null as null | string,
  user: createTrpcSession(TRPC_URL),
  addressId: null as null | string,
  cartId: null as null | string,
  cartItemId: null as null | string,
  orderId: null as null | string,
  orderNumber: null as null | string,
  admin: createTrpcSession(TRPC_URL),
  testProductId: null as null | string,
  newPassword: "NewPass456!" as string,
};

const ORIGIN = TRPC_URL.match(/^https?:\/\/[^/]+/)![0];

function isOk(status: number) {
  return status >= 200 && status < 300;
}

describe.sequential("tRPC API — Functional Blackbox Test", () => {
  // ────────────────────────────────────────────────────────
  // 01 product.* [public]
  // ────────────────────────────────────────────────────────
  describe("01 product.* [public]", () => {
    it("product.getAll 200 — list produk + payload shape valid", async () => {
      const res = await S.user.query("product.getAll", { page: 1, limit: 50 });
      expect(isOk(res.status), `status=${res.status}`).toBe(true);

      const d = trpcData<{
        data: Array<{ id: string; name: string; slug: string; stock: number }>;
      }>(res);
      const list = d?.data ?? [];
      expect(Array.isArray(list), "data harus array").toBe(true);
      S.product = list.find((p) => p.stock > 0) ?? list[0] ?? null;
      expect(S.product, "Harus ada minimal 1 produk").not.toBeNull();
      expect(S.product).toHaveProperty("id");
      expect(S.product).toHaveProperty("slug");
    });

    it("product.getAll?sort — harga terurut ascending saat sortBy=price,asc", async () => {
      const res = await S.user.query("product.getAll", {
        page: 1,
        limit: 10,
        sortBy: "price",
        sortOrder: "asc",
      });
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<{ data: Array<{ price: number | string }> }>(res);
      const list = d?.data ?? [];
      // Harus ada item — kalau kosong, endpoint mungkin ignore param atau data seed kosong
      expect(list.length, "Sort result tidak boleh kosong").toBeGreaterThan(0);
      // Harga harus terurut ascending
      const prices = list.map((p) => Number(p.price));
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
      // Metadata pagination harus ada
      const meta = trpcData<{ totalCount?: number }>(res);
      expect(meta).toHaveProperty("totalCount");
    });

    it("product.getAll?price range — semua item dalam range harga", async () => {
      const MIN = 10_000;
      const MAX = 9_999_999;
      const res = await S.user.query("product.getAll", {
        minPrice: MIN,
        maxPrice: MAX,
        limit: 10,
      });
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<{ data: Array<{ price: number | string }> }>(res);
      const list = d?.data ?? [];
      // Harus ada item — kalau kosong, filter mungkin diabaikan
      expect(
        list.length,
        "Filter harga result tidak boleh kosong (range 10rb–10jt)",
      ).toBeGreaterThan(0);
      for (const item of list) {
        const price = Number(item.price);
        expect(price, `price ${price} harus >= ${MIN}`).toBeGreaterThanOrEqual(
          MIN,
        );
        expect(price, `price ${price} harus <= ${MAX}`).toBeLessThanOrEqual(
          MAX,
        );
      }
      expect(trpcData<{ totalCount?: number }>(res)).toHaveProperty(
        "totalCount",
      );
    });

    it("product.search — hasil match keyword, bukan status-only", async () => {
      // Pakai substring dari S.product.name agar tidak bergantung dataset
      expect(
        S.product?.name,
        "S.product harus ada dari test pertama",
      ).toBeTruthy();
      const keyword = S.product!.name.split(" ")[0].slice(0, 4).toLowerCase();
      const res = await S.user.query("product.search", {
        q: keyword,
        limit: 10,
      });
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<{ data: Array<{ name: string }> }>(res);
      const list = d?.data ?? [];
      // Harus ada hasil — kalau kosong, search mungkin diabaikan
      expect(
        list.length,
        `Search "${keyword}" tidak boleh return kosong`,
      ).toBeGreaterThan(0);
      // Setiap item yang balik harus mengandung keyword di name
      for (const item of list) {
        expect(
          item.name.toLowerCase(),
          `name "${item.name}" harus mengandung keyword "${keyword}"`,
        ).toContain(keyword);
      }
      expect(trpcData<{ totalCount?: number }>(res)).toHaveProperty(
        "totalCount",
      );
    });

    it("product.getBySlug 200 — detail produk + payload shape lengkap", async () => {
      expect(S.product?.slug, "product.slug harus ada").toBeTruthy();
      const res = await S.user.query("product.getBySlug", {
        slug: S.product!.slug,
      });
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<any>(res);
      // Core fields
      expect(d).toHaveProperty("id");
      expect(d).toHaveProperty("name");
      expect(d).toHaveProperty("slug");
      expect(d).toHaveProperty("price");
      expect(d).toHaveProperty("stock");
      // Consumer-facing fields yang pernah drift
      expect(d).toHaveProperty("description");
      expect(d).toHaveProperty("images");
      expect(Array.isArray(d?.images), "images harus array").toBe(true);
      // Kalau ada isi, tiap item harus string (URL/path yang usable oleh consumer)
      if ((d?.images as unknown[]).length > 0) {
        expect(typeof d.images[0], "images[0] harus string").toBe("string");
        expect(
          (d.images[0] as string).length,
          "images[0] tidak boleh string kosong",
        ).toBeGreaterThan(0);
      }
      expect(d).toHaveProperty("category");
      expect(d?.category).toHaveProperty("id");
      expect(d?.category).toHaveProperty("name");
      // Field sensitif tidak boleh bocor
      expect(d?.passwordHash).toBeUndefined();
    });

    it("product.getBySlug 404 — slug tidak ada", async () => {
      const res = await S.user.query("product.getBySlug", {
        slug: "slug-pasti-tidak-ada-xyz-999",
      });
      expect(isTrpcError(res, 404), `status=${res.status}`).toBe(true);
    });

    it("product.getById 200 — payload shape penuh (parity dengan getBySlug)", async () => {
      expect(S.product?.id, "product.id harus ada").toBeTruthy();
      const res = await S.user.query("product.getById", { id: S.product!.id });
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<any>(res);
      // Core fields
      expect(d).toHaveProperty("id");
      expect(d?.id).toBe(S.product!.id);
      expect(d).toHaveProperty("name");
      expect(d).toHaveProperty("slug");
      expect(d).toHaveProperty("price");
      expect(d).toHaveProperty("stock");
      // Parity dengan getBySlug: consumer-facing fields harus ada
      expect(d).toHaveProperty("description");
      expect(d).toHaveProperty("images");
      expect(Array.isArray(d?.images), "images harus array").toBe(true);
      if ((d?.images as unknown[]).length > 0) {
        expect(typeof d.images[0], "images[0] harus string").toBe("string");
        expect(
          (d.images[0] as string).length,
          "images[0] tidak boleh kosong",
        ).toBeGreaterThan(0);
      }
      expect(d).toHaveProperty("category");
      expect(d?.category).toHaveProperty("id");
      expect(d?.category).toHaveProperty("name");
      // Field sensitif tidak boleh bocor
      expect(d?.passwordHash).toBeUndefined();
    });
  });

  // ────────────────────────────────────────────────────────
  // 02 category.* [public]
  // ────────────────────────────────────────────────────────
  describe("02 category.* [public]", () => {
    it("category.getAll 200 — list kategori", async () => {
      const res = await S.user.query("category.getAll");
      expect(isOk(res.status)).toBe(true);

      const list = trpcData<Array<{ id: string; slug: string }>>(res) ?? [];
      expect(
        Array.isArray(list) ? list.length : 0,
        "Harus ada kategori",
      ).toBeGreaterThan(0);
      S.categorySlug = list[0].slug;
      S.categoryId = list[0].id;
      expect(S.categoryId).toBeTruthy();
    });

    it("category.getBySlug 200 — shape valid", async () => {
      expect(S.categorySlug, "categorySlug harus ada").toBeTruthy();
      const res = await S.user.query("category.getBySlug", {
        slug: S.categorySlug!,
      });
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<any>(res);
      expect(d).toHaveProperty("id");
      expect(d).toHaveProperty("slug");
    });

    it("category.getBySlug 404 — slug tidak ada", async () => {
      const res = await S.user.query("category.getBySlug", {
        slug: "tidak-ada-xyz",
      });
      expect(isTrpcError(res, 404)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // 03 auth.register
  // ────────────────────────────────────────────────────────
  describe("03 auth.register", () => {
    beforeAll(() => {
      S.userEmail = `trpc_functest_${Date.now()}@vitest.dev`;
    });

    it("auth.register 200 — register valid", async () => {
      const res = await S.user.mutate("auth.register", {
        name: "tRPC Func Test",
        email: S.userEmail,
        password: TEST_PASSWORD,
      });
      expect(isOk(res.status), `status=${res.status}`).toBe(true);
    });

    it("auth.register 409 — email duplikat", async () => {
      const res = await S.user.mutate("auth.register", {
        name: "Dup",
        email: S.userEmail,
        password: TEST_PASSWORD,
      });
      expect(isTrpcError(res, 409)).toBe(true);
    });

    it("auth.register 400 — email tidak valid", async () => {
      const res = await S.user.mutate("auth.register", {
        name: "X",
        email: "bukan-email",
        password: TEST_PASSWORD,
      });
      expect(isTrpcError(res, 400)).toBe(true);
    });

    it("auth.register 400 — password lemah", async () => {
      const res = await S.user.mutate("auth.register", {
        name: "X",
        email: `weak_${Date.now()}@vitest.dev`,
        password: "123",
      });
      expect(isTrpcError(res, 400)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // 04 auth.login / me / refresh
  // ────────────────────────────────────────────────────────
  describe("04 auth.login / me / refresh", () => {
    it("auth.login 401 — password salah", async () => {
      const res = await S.user.mutate("auth.login", {
        email: S.userEmail,
        password: "WrongPass999!",
      });
      expect(isTrpcError(res, 401)).toBe(true);
    });

    it("auth.login 200 — login valid + cookie set", async () => {
      const res = await S.user.mutate("auth.login", {
        email: S.userEmail,
        password: TEST_PASSWORD,
      });
      expect(isOk(res.status), `status=${res.status}`).toBe(true);
      expect(
        S.user.cookie("accessToken", ORIGIN),
        "accessToken cookie harus ada",
      ).toBeTruthy();
      expect(
        S.user.cookie("refreshToken", ORIGIN),
        "refreshToken cookie harus ada",
      ).toBeTruthy();
    });

    it("auth.me 200 — shape: id/name/email/role/phone ada, passwordHash tidak ada", async () => {
      const res = await S.user.query("auth.me");
      expect(isOk(res.status)).toBe(true);
      const u = res.data?.result?.data ?? res.data?.result ?? res.data;
      expect(u).toHaveProperty("id");
      expect(u).toHaveProperty("name");
      expect(u).toHaveProperty("email");
      // Parity dengan REST: role harus ada di response auth.me
      expect(u).toHaveProperty("role");
      expect(["USER", "ADMIN"]).toContain(u?.role);
      // Regression: phone harus ada di response auth.me (pernah hilang)
      expect(u).toHaveProperty("phone");
      expect(u?.passwordHash).toBeUndefined();
    });

    it("auth.me 401 — tanpa auth", async () => {
      const anon = createTrpcSession(TRPC_URL);
      const res = await anon.query("auth.me");
      expect(isTrpcError(res, 401)).toBe(true);
    });

    it("auth.refresh 200 — token baru usable + rotation terbukti (cookie berubah)", async () => {
      // Ambil cookie lama sebelum refresh
      const cookieBefore = S.user.cookie("accessToken", ORIGIN);

      // JWT iat resolusinya detik — tunggu 1 detik supaya token baru benar-benar berbeda
      await new Promise((r) => setTimeout(r, 1100));

      const res = await S.user.mutate("auth.refresh", {});
      expect(isOk(res.status)).toBe(true);

      const cookieAfter = S.user.cookie("accessToken", ORIGIN);
      expect(
        cookieAfter,
        "accessToken cookie harus ada setelah refresh",
      ).toBeTruthy();
      expect(
        cookieAfter,
        "accessToken harus berubah setelah refresh (token rotation)",
      ).not.toBe(cookieBefore);

      // Post-condition: token baru harus bisa akses protected procedure
      const meRes = await S.user.query("auth.me");
      expect(isOk(meRes.status)).toBe(true);
      expect(trpcData<any>(meRes)).toHaveProperty("id");
    });
  });

  // ────────────────────────────────────────────────────────
  // 05 profile.*
  // ────────────────────────────────────────────────────────
  describe("05 profile.*", () => {
    it("profile.get 200 + shape valid: id/email/phone ada", async () => {
      const res = await S.user.query("profile.get");
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<any>(res);
      expect(d).toHaveProperty("id");
      expect(d).toHaveProperty("email");
      // Regression: phone harus ada (pernah missing dari response)
      expect(d).toHaveProperty("phone");
    });

    it("profile.get 401 — tanpa auth", async () => {
      const anon = createTrpcSession(TRPC_URL);
      const res = await anon.query("profile.get");
      expect(isTrpcError(res, 401)).toBe(true);
    });

    it("profile.update 200 — response tidak ada passwordHash, name terupdate", async () => {
      const res = await S.user.mutate("profile.update", {
        name: "tRPC Updated Name",
      });
      expect(isOk(res.status), `status=${res.status}`).toBe(true);
      const d = res.data?.result?.data ?? res.data?.result ?? res.data;
      expect(d?.passwordHash).toBeUndefined();
      // Strict: name harus benar-benar berubah ke nilai yang dikirim
      const nameVal = d?.name ?? d?.data?.name;
      expect(nameVal).toBe("tRPC Updated Name");
    });

    it("profile.getAddresses 200", async () => {
      const res = await S.user.query("profile.getAddresses");
      expect(isOk(res.status)).toBe(true);
    });

    it("profile.addAddress 200 — tambah alamat + dapat addressId", async () => {
      const res = await S.user.mutate("profile.addAddress", {
        label: "Rumah tRPC",
        recipientName: "tRPC Func User",
        phone: "081234567890",
        address: "Jl. tRPC Func No. 1 RT 01/01",
        city: "Yogyakarta",
        province: "DI Yogyakarta",
        zipCode: "55000",
        isDefault: true,
      });
      expect(isOk(res.status), `status=${res.status}`).toBe(true);
      S.addressId = trpcData<{ id: string }>(res)?.id ?? null;
      // FIX: harus ada, tidak boleh skip diam-diam
      expect(
        S.addressId,
        "addressId harus ada setelah addAddress",
      ).not.toBeNull();
    });

    it("profile.addAddress 400 — body tidak lengkap", async () => {
      const res = await S.user.mutate("profile.addAddress", {
        recipientName: "X",
      } as any);
      expect(isTrpcError(res, 400)).toBe(true);
    });

    it("profile.updateAddress 200 — partial update: hanya city, label lama tetap utuh", async () => {
      expect(S.addressId, "Butuh addressId").not.toBeNull();
      // Kirim HANYA city — label tidak dikirim (partial update regression test)
      const res = await S.user.mutate("profile.updateAddress", {
        addressId: S.addressId!,
        data: { city: "Sleman" },
      });
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<any>(res);
      // City harus terupdate
      expect(d?.city).toBe("Sleman");
      // Label lama ("Rumah tRPC") HARUS tetap ada — tidak boleh di-wipe
      expect(d?.label).toBe("Rumah tRPC");
    });

    it("profile.setDefaultAddress 200", async () => {
      expect(S.addressId, "Butuh addressId").not.toBeNull();
      const res = await S.user.mutate("profile.setDefaultAddress", {
        addressId: S.addressId!,
      });
      expect(isOk(res.status)).toBe(true);
    });

    // FIX: deleteAddress dipindah ke cleanup setelah checkout
  });

  // ────────────────────────────────────────────────────────
  // 06 cart.*
  // ────────────────────────────────────────────────────────
  describe("06 cart.*", () => {
    it("cart.get 401 — tanpa auth", async () => {
      const anon = createTrpcSession(TRPC_URL);
      const res = await anon.query("cart.get");
      expect(isTrpcError(res, 401)).toBe(true);
    });

    it("cart.get 200 — shape: id dan items", async () => {
      const res = await S.user.query("cart.get");
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<{ id: string; items: any[] }>(res);
      expect(d).toHaveProperty("id");
      expect(Array.isArray(d?.items)).toBe(true);
      S.cartId = d?.id ?? null;
    });

    it("cart.clear 200", async () => {
      const res = await S.user.mutate("cart.clear", {});
      expect(isOk(res.status)).toBe(true);
    });

    it("cart.addItem 400 — tanpa productId", async () => {
      const res = await S.user.mutate("cart.addItem", { quantity: 1 } as any);
      expect(isTrpcError(res, 400)).toBe(true);
    });

    it("cart.addItem 200 — tambah item + dapat cartId dan cartItemId", async () => {
      expect(S.product?.id, "Butuh product.id").toBeTruthy();
      expect(S.product!.stock, "Produk harus punya stock").toBeGreaterThan(0);

      const res = await S.user.mutate("cart.addItem", {
        productId: S.product!.id,
        quantity: 1,
      });
      expect(isOk(res.status), `status=${res.status}`).toBe(true);
      const d = trpcData<{ id: string; items: Array<{ id: string }> }>(res);
      S.cartId = d?.id ?? null;
      S.cartItemId = d?.items?.[0]?.id ?? null;
      // FIX: tidak boleh null diam-diam
      expect(S.cartId, "cartId harus ada setelah addItem").not.toBeNull();
      expect(
        S.cartItemId,
        "cartItemId harus ada setelah addItem",
      ).not.toBeNull();
    });

    it("cart.updateItem 200 — update quantity", async () => {
      expect(S.cartItemId, "Butuh cartItemId").not.toBeNull();
      const res = await S.user.mutate("cart.updateItem", {
        itemId: S.cartItemId!,
        quantity: 2,
      });
      expect(isOk(res.status)).toBe(true);
    });

    it("cart.updateItem 400 — quantity = 0 harus reject (bukan hapus diam-diam)", async () => {
      expect(S.cartItemId, "Butuh cartItemId").not.toBeNull();
      const res = await S.user.mutate("cart.updateItem", {
        itemId: S.cartItemId!,
        quantity: 0,
      });
      // Strict: qty=0 HARUS 400. Kalau backend masih return 200, test ini MERAH.
      expect(
        isTrpcError(res, 400),
        `status=${res.status} — qty=0 harus return 400`,
      ).toBe(true);
    });

    it("cart.removeItem 200 — hapus item", async () => {
      expect(
        S.cartItemId,
        "Butuh cartItemId — jika null, test cart.updateItem qty=0 gagal duluan",
      ).not.toBeNull();
      const res = await S.user.mutate("cart.removeItem", {
        itemId: S.cartItemId!,
      });
      expect(isOk(res.status)).toBe(true);
    });

    it("cart.addItem 200 — re-add item untuk checkout", async () => {
      expect(S.product?.id, "Butuh product.id").toBeTruthy();
      const res = await S.user.mutate("cart.addItem", {
        productId: S.product!.id,
        quantity: 1,
      });
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<{ id: string; items: Array<{ id: string }> }>(res);
      S.cartId = d?.id ?? null;
      S.cartItemId = d?.items?.[0]?.id ?? null;
      expect(S.cartId, "cartId harus ada setelah re-add").not.toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────
  // 07 checkout.*
  // ────────────────────────────────────────────────────────
  describe("07 checkout.*", () => {
    it("checkout.calculateSummary 200 — shape + invariant matematis", async () => {
      expect(S.cartId, "Butuh cartId").not.toBeNull();
      const res = await S.user.mutate("checkout.calculateSummary", {
        cartId: S.cartId!,
        shippingMethod: "regular",
      });
      expect(isOk(res.status), `status=${res.status}`).toBe(true);
      const d = trpcData<{
        subtotal: number;
        tax: number;
        shippingCost: number;
        total: number;
      }>(res);
      expect(d).toHaveProperty("subtotal");
      expect(d).toHaveProperty("tax");
      expect(d).toHaveProperty("shippingCost");
      expect(d).toHaveProperty("total");
      expect(typeof d?.total).toBe("number");
      // Invariant matematis
      expect(d!.total).toBeCloseTo(d!.subtotal + d!.tax + d!.shippingCost, 2);
    });

    it("checkout.confirm 400 — body kosong", async () => {
      const res = await S.user.mutate("checkout.confirm", {} as any);
      expect(isTrpcError(res, 400)).toBe(true);
    });

    it("checkout.confirm 200 — checkout valid + dapat orderId dan orderNumber", async () => {
      // FIX: jika null → GAGAL eksplisit
      expect(S.cartId, "Butuh cartId dari cart flow").not.toBeNull();
      expect(S.addressId, "Butuh addressId dari profile flow").not.toBeNull();

      const res = await S.user.mutate("checkout.confirm", {
        cartId: S.cartId!,
        addressId: S.addressId!,
        shippingMethod: "regular",
        paymentMethod: "bank_transfer",
      });
      expect(isOk(res.status), `status=${res.status}`).toBe(true);
      const b = trpcData<any>(res);
      S.orderId = b?.id ?? b?.order?.id ?? null;
      S.orderNumber = b?.orderNumber ?? b?.order?.orderNumber ?? null;

      expect(S.orderId, "orderId harus ada setelah checkout").not.toBeNull();
      expect(
        S.orderNumber,
        "orderNumber harus ada setelah checkout",
      ).not.toBeNull();
    });

    it("checkout.getSummary 200 — shape valid + orderNumber cocok", async () => {
      expect(S.orderNumber, "Butuh orderNumber").not.toBeNull();
      const res = await S.user.query("checkout.getSummary", {
        orderNumber: S.orderNumber!,
      });
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<any>(res);
      expect(d).toHaveProperty("orderNumber");
      expect(d).toHaveProperty("total");
      expect(d).toHaveProperty("subtotal");
      expect(d).toHaveProperty("tax");
      expect(d).toHaveProperty("shippingCost");
      expect(d?.orderNumber).toBe(S.orderNumber);

      // Regression lock: field uang harus number (bukan string Prisma Decimal)
      expect(typeof d?.total, "total harus number").toBe("number");
      expect(typeof d?.subtotal, "subtotal harus number").toBe("number");
      expect(typeof d?.tax, "tax harus number").toBe("number");
      expect(typeof d?.shippingCost, "shippingCost harus number").toBe(
        "number",
      );

      // Regression lock: items[].unitPrice dan items[].subtotal juga harus number
      expect(Array.isArray(d?.items), "items harus array").toBe(true);
      if (Array.isArray(d?.items) && d.items.length > 0) {
        const item = d.items[0];
        expect(typeof item?.unitPrice, "items[0].unitPrice harus number").toBe(
          "number",
        );
        expect(typeof item?.subtotal, "items[0].subtotal harus number").toBe(
          "number",
        );
      }
    });
  });

  // ────────────────────────────────────────────────────────
  // 08 order.*
  // ────────────────────────────────────────────────────────
  describe("08 order.*", () => {
    it("order.getAll 401 — tanpa auth", async () => {
      const anon = createTrpcSession(TRPC_URL);
      const res = await anon.query("order.getAll");
      expect(isTrpcError(res, 401)).toBe(true);
    });

    it("order.getAll 200 — shape valid", async () => {
      const res = await S.user.query("order.getAll", { page: 1 });
      expect(isOk(res.status)).toBe(true);

      // Shape: serviceCall return { orders: [...], total } langsung
      const payload = trpcData<{ orders: any[]; total: number }>(res);
      expect(Array.isArray(payload?.orders), "orders harus array").toBe(true);

      // Flow test selalu buat 1 order — tidak boleh kosong
      expect(
        payload?.orders.length,
        "harus ada minimal 1 order setelah checkout",
      ).toBeGreaterThan(0);

      // Regression lock: field uang harus number
      const order = payload!.orders[0];
      expect(typeof order?.total, "orders[0].total harus number").toBe(
        "number",
      );
      if (Array.isArray(order?.items) && order.items.length > 0) {
        const item = order.items[0];
        expect(typeof item?.unitPrice, "items[0].unitPrice harus number").toBe(
          "number",
        );
        expect(typeof item?.subtotal, "items[0].subtotal harus number").toBe(
          "number",
        );
      }
    });

    it("order.getAll?status 200 — filter status", async () => {
      const res = await S.user.query("order.getAll", {
        page: 1,
        status: "pending_payment",
      });
      expect(isOk(res.status)).toBe(true);

      const payload = trpcData<{ orders: any[]; total: number }>(res);
      expect(Array.isArray(payload?.orders), "orders harus array").toBe(true);

      // Test ini jalan SEBELUM confirm/ship/deliver (section 08 belum mulai),
      // jadi order dari checkout masih pending_payment — hasil tidak boleh kosong.
      expect(
        payload?.orders.length,
        "harus ada minimal 1 order pending_payment",
      ).toBeGreaterThan(0);

      // Lock filter: semua item yang balik harus pending_payment
      for (const order of payload?.orders ?? []) {
        expect(order?.status, `order ${order?.id} harus pending_payment`).toBe(
          "pending_payment",
        );
      }
    });

    it("order.getById 200 — detail order + shape", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.user.query("order.getById", { orderId: S.orderId! });
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<any>(res);
      expect(d).toHaveProperty("id");
      expect(d).toHaveProperty("orderNumber");
      expect(d).toHaveProperty("status");
      expect(d).toHaveProperty("total");

      // Regression lock: field uang di detail order harus number
      expect(typeof d?.total, "total harus number").toBe("number");
      expect(typeof d?.subtotal, "subtotal harus number").toBe("number");
      expect(typeof d?.tax, "tax harus number").toBe("number");
      expect(typeof d?.shippingCost, "shippingCost harus number").toBe(
        "number",
      );

      // Regression lock: items[].unitPrice dan items[].subtotal juga harus number
      if (Array.isArray(d?.items) && d.items.length > 0) {
        const item = d.items[0];
        expect(typeof item?.unitPrice, "items[0].unitPrice harus number").toBe(
          "number",
        );
        expect(typeof item?.subtotal, "items[0].subtotal harus number").toBe(
          "number",
        );
      }
    });

    it("order.getById 404 — UUID tidak ditemukan", async () => {
      const res = await S.user.query("order.getById", {
        orderId: "00000000-0000-0000-0000-000000000000",
      });
      expect(isTrpcError(res, 404)).toBe(true);
    });

    it("order.confirm 404 — UUID valid tapi tidak ada", async () => {
      const res = await S.user.mutate("order.confirm", {
        orderId: "00000000-0000-0000-0000-000000000000",
      });
      expect(isTrpcError(res, 404)).toBe(true);
    });

    it("order.cancel 404 — UUID valid tapi tidak ada", async () => {
      const res = await S.user.mutate("order.cancel", {
        orderId: "00000000-0000-0000-0000-000000000000",
      });
      expect(isTrpcError(res, 404)).toBe(true);
    });

    it("order.confirm 200 — konfirmasi pembayaran", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.user.mutate("order.confirm", { orderId: S.orderId! });
      expect(isOk(res.status)).toBe(true);
    });

    it("order.cancel 400 — tidak bisa cancel order yang sudah confirmed", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.user.mutate("order.cancel", { orderId: S.orderId! });
      expect(isTrpcError(res, 400)).toBe(true);
    });

    it("order.ship 200 — order dikirim", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.user.mutate("order.ship", { orderId: S.orderId! });
      expect(isOk(res.status)).toBe(true);
    });

    it("order.deliver 200 — order delivered", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.user.mutate("order.deliver", { orderId: S.orderId! });
      expect(isOk(res.status)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // 09 auth.changePassword — full positive + negative
  // ────────────────────────────────────────────────────────
  describe("09 auth.changePassword", () => {
    it("auth.changePassword 400 — password lama salah", async () => {
      const res = await S.user.mutate("auth.changePassword", {
        oldPassword: "WrongOldPass!",
        newPassword: "NewPass123!",
      });
      expect(isTrpcError(res, 400)).toBe(true);
    });

    it("auth.changePassword 200 — berhasil ganti password", async () => {
      const res = await S.user.mutate("auth.changePassword", {
        oldPassword: TEST_PASSWORD,
        newPassword: S.newPassword,
      });
      expect(isOk(res.status), `status=${res.status}`).toBe(true);
    });

    it("auth.login 401 — password LAMA tidak bisa dipakai lagi", async () => {
      const freshSession = createTrpcSession(TRPC_URL);
      const res = await freshSession.mutate("auth.login", {
        email: S.userEmail!,
        password: TEST_PASSWORD, // password lama
      });
      expect(isTrpcError(res, 401)).toBe(true);
    });

    it("auth.login 200 — login dengan password BARU berhasil", async () => {
      const freshSession = createTrpcSession(TRPC_URL);
      const res = await freshSession.mutate("auth.login", {
        email: S.userEmail!,
        password: S.newPassword,
      });
      expect(isOk(res.status), `status=${res.status}`).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // 10 auth.logout
  // ────────────────────────────────────────────────────────
  describe("10 auth.logout", () => {
    it("auth.logout 200", async () => {
      const res = await S.user.mutate("auth.logout", {});
      expect(isOk(res.status)).toBe(true);
    });

    it("auth.me 401 — setelah logout", async () => {
      const res = await S.user.query("auth.me");
      expect(isTrpcError(res, 401)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // 11 Admin — Login
  // ────────────────────────────────────────────────────────
  describe("11 Admin — Login", () => {
    it("auth.login 200 — login sebagai admin", async () => {
      const res = await S.admin.mutate("auth.login", {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
      expect(isOk(res.status), `status=${res.status}`).toBe(true);
      expect(
        S.admin.cookie("accessToken", ORIGIN),
        "Admin accessToken harus ada",
      ).toBeTruthy();
    });
  });

  // ────────────────────────────────────────────────────────
  // 12 admin.* — Reads
  // ────────────────────────────────────────────────────────
  describe("12 admin.* — Reads", () => {
    it("admin.getDashboard 401 — tanpa auth", async () => {
      const anon = createTrpcSession(TRPC_URL);
      const res = await anon.query("admin.getDashboard");
      expect(isTrpcError(res, 401)).toBe(true);
    });

    it("admin.getDashboard 403 — user biasa (non-admin) tidak bisa akses", async () => {
      // FIX: user biasa harus dapat 403
      const userSession = createTrpcSession(TRPC_URL);
      await userSession.mutate("auth.login", {
        email: S.userEmail!,
        password: S.newPassword,
      });
      const res = await userSession.query("admin.getDashboard");
      expect(
        isTrpcError(res, 403),
        `status=${res.status} — user biasa harus 403`,
      ).toBe(true);
    });

    it("admin.getDashboard 200 — shape valid: summary dengan semua field", async () => {
      const res = await S.admin.query("admin.getDashboard");
      expect(isOk(res.status)).toBe(true);
      const d = trpcData<Record<string, unknown>>(res);
      expect(d).toHaveProperty("summary");
      const summary = (d as any)?.summary;
      expect(summary).toHaveProperty("totalOrdersToday");
      expect(summary).toHaveProperty("weeklyRevenue");
      expect(summary).toHaveProperty("totalOrders");
      expect(summary).toHaveProperty("totalProducts");
      expect(summary).toHaveProperty("totalUsers");
      expect(typeof summary?.weeklyRevenue).toBe("number");
      expect(Array.isArray((d as any)?.topProducts)).toBe(true);
    });

    it("admin.getProducts 200", async () => {
      const res = await S.admin.query("admin.getProducts", {
        page: 1,
        limit: 5,
      });
      expect(isOk(res.status)).toBe(true);
    });

    it("admin.getOrders 200", async () => {
      const res = await S.admin.query("admin.getOrders", { page: 1 });
      expect(isOk(res.status)).toBe(true);
    });

    it("admin.getUsers 200", async () => {
      const res = await S.admin.query("admin.getUsers", { page: 1 });
      expect(isOk(res.status)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // 13 admin.* — Product CRUD
  // ────────────────────────────────────────────────────────
  describe("13 admin.* — Product CRUD", () => {
    it("admin.createProduct 400 — body tidak valid", async () => {
      expect(S.categoryId, "Butuh categoryId").not.toBeNull();
      const res = await S.admin.mutate("admin.createProduct", {
        name: "",
      } as any);
      expect(isTrpcError(res, 400)).toBe(true);
    });

    it("admin.createProduct 200 — buat produk baru + dapat testProductId", async () => {
      expect(S.categoryId, "Butuh categoryId").not.toBeNull();
      const res = await S.admin.mutate("admin.createProduct", {
        categoryId: S.categoryId!,
        name: `Vitest Func Product tRPC ${Date.now()}`,
        description: "Produk test dari Vitest functional test tRPC",
        price: 99_000,
        stock: 100,
        discount: 0,
      });
      expect(isOk(res.status), `status=${res.status}`).toBe(true);
      S.testProductId = trpcData<{ id: string }>(res)?.id ?? null;
      expect(S.testProductId, "Harus dapat product id").not.toBeNull();
    });

    it("admin.updateProduct 400 — body tidak valid", async () => {
      expect(S.testProductId, "Butuh testProductId").not.toBeNull();
      // price harus positif — kirim negatif untuk trigger validasi schema
      const res = await S.admin.mutate("admin.updateProduct", {
        id: S.testProductId!,
        price: -999,
      });
      expect(isTrpcError(res, 400), `status=${res.status}`).toBe(true);
    });

    it("admin.updateProduct 200 — update produk", async () => {
      expect(S.testProductId, "Butuh testProductId").not.toBeNull();
      const res = await S.admin.mutate("admin.updateProduct", {
        id: S.testProductId!,
        price: 89_000,
        stock: 50,
      });
      expect(isOk(res.status)).toBe(true);
    });

    it("admin.updateProduct 404 — id tidak ditemukan", async () => {
      const res = await S.admin.mutate("admin.updateProduct", {
        id: "00000000-0000-0000-0000-000000000000",
        stock: 1,
      });
      expect(isTrpcError(res, 404)).toBe(true);
    });

    it("admin.deleteProduct 200 — hapus produk test", async () => {
      expect(S.testProductId, "Butuh testProductId").not.toBeNull();
      const res = await S.admin.mutate("admin.deleteProduct", {
        id: S.testProductId!,
      });
      expect(isOk(res.status)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // 14 admin.updateOrderStatus
  // ────────────────────────────────────────────────────────
  describe("14 admin.updateOrderStatus", () => {
    it("admin.updateOrderStatus 400 — status tidak valid", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.admin.mutate("admin.updateOrderStatus", {
        orderId: S.orderId!,
        status: "bukan_status",
      });
      expect(isTrpcError(res, 400)).toBe(true);
    });

    it("admin.updateOrderStatus 400 — order sudah final (delivered), tidak bisa ke confirmed", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.admin.mutate("admin.updateOrderStatus", {
        orderId: S.orderId!,
        status: "confirmed",
      });
      // order sudah delivered — transisi tidak valid → harus 400
      expect(isTrpcError(res, 400)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // 15 Cleanup — Delete Address
  // ────────────────────────────────────────────────────────
  describe("15 Cleanup", () => {
    it("profile.deleteAddress 200 — hapus alamat test (hard assertion)", async () => {
      // Hard assertion: addressId harus ada — kalau null berarti section 05 gagal duluan
      expect(
        S.addressId,
        "addressId harus ada dari section 05 — jika null, flow sebelumnya broken",
      ).not.toBeNull();

      const cleanupSession = createTrpcSession(TRPC_URL);
      const loginRes = await cleanupSession.mutate("auth.login", {
        email: S.userEmail!,
        password: S.newPassword,
      });
      // Hard assertion: login ulang harus berhasil
      expect(
        isOk(loginRes.status),
        "Login ulang dengan password baru harus sukses",
      ).toBe(true);

      const res = await cleanupSession.mutate("profile.deleteAddress", {
        addressId: S.addressId!,
      });
      expect(isOk(res.status)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // 16 Admin — Logout
  // ────────────────────────────────────────────────────────
  describe("16 Admin — Logout", () => {
    it("auth.logout 200 — admin logout", async () => {
      const res = await S.admin.mutate("auth.logout", {});
      expect(isOk(res.status)).toBe(true);
    });
  });
});
