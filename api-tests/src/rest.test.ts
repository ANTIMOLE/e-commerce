/**
 * rest.test.ts — Blackbox Functional Test: REST API
 *
 * Port dari functional_rest.js (k6) ke Vitest.
 * Semua test dijalankan BERURUTAN dan berbagi state S,
 * karena ini adalah 1 sesi end-to-end yang stateful.
 *
 * FIX:
 *  - Hilangkan false-green: if (!S.X) return → expect(S.X).not.toBeNull() agar
 *    test GAGAL secara eksplisit daripada skip diam-diam
 *  - Ganti toBeDefined() menjadi toBeTruthy() / toMatch(...) untuk ID stateful
 *  - Change-password: tambah positive path (sukses → login baru berhasil → login lama gagal)
 *  - Admin: tambah 403 non-admin test
 *  - Hapus test PATCH /profile/change-password (endpoint sudah dihapus)
 *  - Tambah assertion payload shape pada read endpoint penting
 *
 * Run: pnpm test:rest
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createRestSession, body } from "./helpers/rest";
import { REST_URL, ADMIN_EMAIL, ADMIN_PASSWORD, TEST_PASSWORD } from "./config";

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
  user: createRestSession(REST_URL),
  addressId: null as null | string,
  cartId: null as null | string,
  cartItemId: null as null | string,
  orderId: null as null | string,
  orderNumber: null as null | string,
  admin: createRestSession(REST_URL),
  testProductId: null as null | string,
  // Untuk change-password positive path
  newPassword: "NewPass456!" as string,
};

const ORIGIN = REST_URL.match(/^https?:\/\/[^/]+/)![0];

describe.sequential("REST API — Functional Blackbox Test", () => {
  // ────────────────────────────────────────────────────────
  // 01 Products [public]
  // ────────────────────────────────────────────────────────
  describe("01 Products [public]", () => {
    it("GET /products 200 — list produk tersedia + payload shape valid", async () => {
      const res = await S.user.client.get("/products", {
        params: { page: 1, limit: 50 },
      });
      expect(res.status).toBe(200);

      const data = body<{
        data: Array<{ id: string; name: string; slug: string; stock: number }>;
      }>(res);
      const list = data?.data ?? [];
      expect(Array.isArray(list), "data harus array").toBe(true);
      S.product = list.find((p) => p.stock > 0) ?? list[0] ?? null;
      expect(
        S.product,
        "Harus ada minimal 1 produk di database",
      ).not.toBeNull();
      // Shape check
      expect(S.product).toHaveProperty("id");
      expect(S.product).toHaveProperty("slug");
      expect(typeof S.product!.stock).toBe("number");
    });

    it("GET /products?sortBy=price,asc — harga terurut ascending", async () => {
      const res = await S.user.client.get("/products", {
        params: { page: 1, limit: 10, sortBy: "price", sortOrder: "asc" },
      });
      expect(res.status).toBe(200);
      const list: Array<{ price: number | string }> =
        body<{ data: Array<{ price: number | string }> }>(res)?.data ?? [];
      // Harus ada item — kalau kosong, endpoint mungkin ignore filter atau data seed kosong
      expect(list.length, "Sort result tidak boleh kosong").toBeGreaterThan(0);
      // Harga harus terurut ascending
      const prices = list.map((p) => Number(p.price));
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
      // Metadata pagination harus ada
      const b = body<{ totalCount?: number; page?: number }>(res);
      expect(b).toHaveProperty("totalCount");
    });

    it("GET /products?minPrice&maxPrice — semua item dalam range harga", async () => {
      const MIN = 10_000;
      const MAX = 9_999_999;
      const res = await S.user.client.get("/products", {
        params: { minPrice: MIN, maxPrice: MAX, limit: 10 },
      });
      expect(res.status).toBe(200);
      const list: Array<{ price: number | string }> =
        body<{ data: Array<{ price: number | string }> }>(res)?.data ?? [];
      // Harus ada item dalam range ini — kalau kosong, filter mungkin diabaikan
      expect(
        list.length,
        "Filter harga result tidak boleh kosong (range 10rb–10jt)",
      ).toBeGreaterThan(0);
      // Setiap item yang dikembalikan harus dalam range
      for (const item of list) {
        const price = Number(item.price);
        expect(price, `price ${price} harus >= ${MIN}`).toBeGreaterThanOrEqual(
          MIN,
        );
        expect(price, `price ${price} harus <= ${MAX}`).toBeLessThanOrEqual(
          MAX,
        );
      }
      // Metadata harus ada
      expect(body<{ totalCount?: number }>(res)).toHaveProperty("totalCount");
    });

    it("GET /products?q=<keyword> — search hasil match keyword, bukan status-only", async () => {
      // Pakai substring dari nama produk yang sudah ada (S.product dari test pertama)
      // Supaya tidak hardcode "samsung" yang bergantung dataset
      expect(
        S.product?.name,
        "S.product harus ada dari test pertama",
      ).toBeTruthy();
      const keyword = S.product!.name.split(" ")[0].slice(0, 4).toLowerCase();
      const res = await S.user.client.get("/products", {
        params: { q: keyword, limit: 10 },
      });
      expect(res.status).toBe(200);
      const list: Array<{ name: string }> =
        body<{ data: Array<{ name: string }> }>(res)?.data ?? [];
      // Harus ada hasil — kalau kosong, search mungkin diabaikan atau keyword tidak match
      expect(
        list.length,
        `Search "${keyword}" tidak boleh return kosong`,
      ).toBeGreaterThan(0);
      // Setiap item yang balik harus mengandung keyword di name (case-insensitive)
      for (const item of list) {
        expect(
          item.name.toLowerCase(),
          `name "${item.name}" harus mengandung keyword "${keyword}"`,
        ).toContain(keyword);
      }
      // Metadata harus ada
      expect(body<{ totalCount?: number }>(res)).toHaveProperty("totalCount");
    });

    it("GET /products/:slug 200 — detail produk + payload shape lengkap", async () => {
      expect(
        S.product?.slug,
        "product.slug harus ada dari test sebelumnya",
      ).toBeTruthy();
      const res = await S.user.client.get(`/products/${S.product!.slug}`);
      expect(res.status).toBe(200);
      const d = res.data?.data;
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

    it("GET /products/:slug 404 — slug tidak ada", async () => {
      const res = await S.user.client.get(
        "/products/slug-pasti-tidak-ada-xyz-999",
      );
      expect(res.status).toBe(404);
    });
  });

  // ────────────────────────────────────────────────────────
  // 02 Categories [public]
  // ────────────────────────────────────────────────────────
  describe("02 Categories [public]", () => {
    it("GET /categories 200 — list kategori + shape valid", async () => {
      const res = await S.user.client.get("/categories");
      expect(res.status).toBe(200);

      const data = body<{ data?: Array<{ id: string; slug: string }> }>(res);
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? (data as unknown as Array<{ id: string; slug: string }>)
          : [];
      expect(list.length, "Harus ada minimal 1 kategori").toBeGreaterThan(0);
      S.categorySlug = list[0].slug;
      S.categoryId = list[0].id;
      expect(S.categoryId).toBeTruthy();
      expect(S.categorySlug).toBeTruthy();
    });

    it("GET /categories/:slug 200 — detail kategori + shape valid", async () => {
      expect(S.categorySlug, "categorySlug harus ada").toBeTruthy();
      const res = await S.user.client.get(`/categories/${S.categorySlug}`);
      expect(res.status).toBe(200);
      const d = res.data?.data ?? res.data;
      expect(d).toHaveProperty("id");
      expect(d).toHaveProperty("name");
      expect(d).toHaveProperty("slug");
    });

    it("GET /categories/:slug 404 — slug tidak ada", async () => {
      const res = await S.user.client.get("/categories/tidak-ada-xyz-999");
      expect(res.status).toBe(404);
    });
  });

  // ────────────────────────────────────────────────────────
  // 03 Auth — Register
  // ────────────────────────────────────────────────────────
  describe("03 Auth — Register", () => {
    beforeAll(() => {
      S.userEmail = `functest_${Date.now()}@vitest.dev`;
    });

    it("POST /auth/register 200/201 — register valid", async () => {
      const res = await S.user.client.post("/auth/register", {
        name: "Func Test User",
        email: S.userEmail,
        password: TEST_PASSWORD,
      });
      expect([200, 201]).toContain(res.status);
    });

    it("POST /auth/register 409 — email duplikat", async () => {
      const res = await S.user.client.post("/auth/register", {
        name: "Dup",
        email: S.userEmail,
        password: TEST_PASSWORD,
      });
      expect(res.status).toBe(409);
    });

    it("POST /auth/register 400 — email tidak valid", async () => {
      const res = await S.user.client.post("/auth/register", {
        name: "X",
        email: "bukan-email",
        password: TEST_PASSWORD,
      });
      expect(res.status).toBe(400);
    });

    it("POST /auth/register 400 — password terlalu lemah", async () => {
      const res = await S.user.client.post("/auth/register", {
        name: "X",
        email: `weak_${Date.now()}@vitest.dev`,
        password: "123",
      });
      expect(res.status).toBe(400);
    });
  });

  // ────────────────────────────────────────────────────────
  // 04 Auth — Login / Me / Refresh
  // ────────────────────────────────────────────────────────
  describe("04 Auth — Login / Me / Refresh", () => {
    it("POST /auth/login 401 — password salah", async () => {
      const res = await S.user.client.post("/auth/login", {
        email: S.userEmail,
        password: "WrongPass999!",
      });
      expect(res.status).toBe(401);
    });

    it("POST /auth/login 200 — login valid + cookie set", async () => {
      const res = await S.user.client.post("/auth/login", {
        email: S.userEmail,
        password: TEST_PASSWORD,
      });
      expect(res.status).toBe(200);
      expect(
        S.user.cookie("accessToken", ORIGIN),
        "accessToken cookie harus ada",
      ).toBeTruthy();
      expect(
        S.user.cookie("refreshToken", ORIGIN),
        "refreshToken cookie harus ada",
      ).toBeTruthy();
    });

    it("GET /auth/me 200 — shape: id/name/email/role/phone ada, passwordHash tidak ada", async () => {
      const res = await S.user.client.get("/auth/me");
      expect(res.status).toBe(200);
      const u = res.data?.data;
      expect(u).toHaveProperty("id");
      expect(u).toHaveProperty("name");
      expect(u).toHaveProperty("email");
      expect(u).toHaveProperty("role");
      // Regression: phone harus ada di response /auth/me (pernah hilang)
      expect(u).toHaveProperty("phone");
      expect(u?.passwordHash).toBeUndefined();
    });

    it("GET /auth/me 401 — tanpa auth (sesi baru)", async () => {
      const anon = createRestSession(REST_URL);
      const res = await anon.client.get("/auth/me");
      expect(res.status).toBe(401);
    });

    it("POST /auth/refresh 200 — token baru usable + rotation terbukti (cookie berubah)", async () => {
      // Ambil cookie lama sebelum refresh
      const cookieBefore = S.user.cookie("accessToken", ORIGIN);

      // JWT payload berisi `iat` (issued-at) dalam resolusi DETIK.
      // Kalau refresh dipanggil dalam detik yang sama dengan login,
      // token baru punya payload identik → string token sama → test palsu.
      // Tunggu 1 detik supaya iat berbeda dan token benar-benar berubah.
      await new Promise((r) => setTimeout(r, 1100));

      const res = await S.user.client.post("/auth/refresh", {});
      expect(res.status).toBe(200);

      const cookieAfter = S.user.cookie("accessToken", ORIGIN);
      expect(
        cookieAfter,
        "accessToken cookie harus ada setelah refresh",
      ).toBeTruthy();
      expect(
        cookieAfter,
        "accessToken harus berubah setelah refresh (token rotation)",
      ).not.toBe(cookieBefore);

      // Post-condition: token baru harus bisa akses protected endpoint
      const meRes = await S.user.client.get("/auth/me");
      expect(meRes.status).toBe(200);
      expect(meRes.data?.data ?? meRes.data).toHaveProperty("id");
    });
  });

  // ────────────────────────────────────────────────────────
  // 05 Profile
  // ────────────────────────────────────────────────────────
  describe("05 Profile", () => {
    it("GET /profile 200 + shape valid: id/email/phone ada", async () => {
      const res = await S.user.client.get("/profile");
      expect(res.status).toBe(200);
      const d = res.data?.data ?? res.data;
      expect(d).toHaveProperty("id");
      expect(d).toHaveProperty("email");
      // Regression: phone harus ada (pernah missing dari response)
      expect(d).toHaveProperty("phone");
    });

    it("GET /profile 401 — tanpa auth", async () => {
      const anon = createRestSession(REST_URL);
      const res = await anon.client.get("/profile");
      expect(res.status).toBe(401);
    });

    it("PATCH /profile 200 — update nama + response tidak ada passwordHash, name terupdate", async () => {
      const res = await S.user.client.patch("/profile", {
        name: "Updated Test Name",
      });
      expect(res.status).toBe(200);
      expect(res.data?.data?.passwordHash).toBeUndefined();
      // Strict: name harus benar-benar berubah ke nilai yang dikirim
      expect(res.data?.data?.name).toBe("Updated Test Name");
    });

    it("GET /profile/addresses 200", async () => {
      const res = await S.user.client.get("/profile/addresses");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data?.data ?? res.data)).toBe(true);
    });

    it("POST /profile/addresses 200/201 — tambah alamat + dapat addressId", async () => {
      const res = await S.user.client.post("/profile/addresses", {
        label: "Rumah",
        recipientName: "Func Test User",
        phone: "081234567890",
        address: "Jl. Functest No. 1 RT 01/01",
        city: "Yogyakarta",
        province: "DI Yogyakarta",
        zipCode: "55000",
        isDefault: true,
      });
      expect([200, 201]).toContain(res.status);
      S.addressId = body<{ data?: { id: string } }>(res)?.data?.id ?? null;
      // FIX: jika null → test gagal eksplisit, bukan skip diam-diam
      expect(
        S.addressId,
        "addressId harus ada setelah POST alamat",
      ).not.toBeNull();
      expect(S.addressId).toMatch(/^[0-9a-f-]{36}$/i); // UUID format
    });

    it("POST /profile/addresses 400 — body tidak lengkap", async () => {
      const res = await S.user.client.post("/profile/addresses", {
        recipientName: "X",
      });
      expect(res.status).toBe(400);
    });

    it("PATCH /profile/addresses/:id 200 — partial update: hanya city, label lama tetap utuh", async () => {
      expect(
        S.addressId,
        "Butuh addressId dari test sebelumnya",
      ).not.toBeNull();
      // Kirim HANYA city — label tidak dikirim (partial update regression test)
      const res = await S.user.client.patch(
        `/profile/addresses/${S.addressId}`,
        {
          city: "Sleman",
        },
      );
      expect(res.status).toBe(200);
      const d = res.data?.data ?? res.data;
      // City harus terupdate
      expect(d?.city).toBe("Sleman");
      // Label lama ("Rumah") HARUS tetap ada — tidak boleh di-wipe karena tidak dikirim
      expect(d?.label).toBe("Rumah");
    });

    it("PATCH /profile/addresses/:id/default 200 — set default", async () => {
      expect(S.addressId, "Butuh addressId").not.toBeNull();
      const res = await S.user.client.patch(
        `/profile/addresses/${S.addressId}/default`,
        {},
      );
      expect(res.status).toBe(200);
    });

    // ── FIX: DELETE dihapus dari sini supaya addressId tetap ada untuk checkout flow ──
    // addressId akan dihapus di bagian akhir (section tersendiri setelah checkout)
  });

  // ────────────────────────────────────────────────────────
  // 06 Cart
  // ────────────────────────────────────────────────────────
  describe("06 Cart", () => {
    it("GET /cart 401 — tanpa auth", async () => {
      const anon = createRestSession(REST_URL);
      const res = await anon.client.get("/cart");
      expect(res.status).toBe(401);
    });

    it("GET /cart 200 — dengan auth + shape: id dan items", async () => {
      const res = await S.user.client.get("/cart");
      expect(res.status).toBe(200);
      const d = res.data?.data;
      expect(d).toHaveProperty("id");
      expect(Array.isArray(d?.items)).toBe(true);
      S.cartId = d?.id ?? null;
    });

    it("DELETE /cart 200 — clear cart", async () => {
      const res = await S.user.client.delete("/cart");
      expect(res.status).toBe(200);
    });

    it("POST /cart 400 — tanpa productId", async () => {
      const res = await S.user.client.post("/cart", { quantity: 1 });
      expect(res.status).toBe(400);
    });

    it("POST /cart + GET /cart 200 — tambah item → dapat cartId dan cartItemId", async () => {
      expect(S.product?.id, "Butuh product.id dari test Products").toBeTruthy();
      expect(S.product!.stock, "Produk harus punya stock").toBeGreaterThan(0);

      const addRes = await S.user.client.post("/cart", {
        productId: S.product!.id,
        quantity: 1,
      });
      expect(addRes.status).toBe(200);

      const cartRes = await S.user.client.get("/cart");
      expect(cartRes.status).toBe(200);
      const cartData = body<{
        data?: { id: string; items: Array<{ id: string }> };
      }>(cartRes)?.data;
      S.cartId = cartData?.id ?? null;
      S.cartItemId = cartData?.items?.[0]?.id ?? null;

      // FIX: harus ada, tidak boleh null diam-diam
      expect(S.cartId, "cartId harus ada setelah add item").not.toBeNull();
      expect(
        S.cartItemId,
        "cartItemId harus ada setelah add item",
      ).not.toBeNull();
    });

    it("PATCH /cart/:itemId 200 — update quantity", async () => {
      expect(S.cartItemId, "Butuh cartItemId").not.toBeNull();
      const res = await S.user.client.patch(`/cart/${S.cartItemId}`, {
        quantity: 2,
      });
      expect(res.status).toBe(200);
    });

    it("PATCH /cart/:itemId 400 — quantity = 0", async () => {
      expect(S.cartItemId, "Butuh cartItemId").not.toBeNull();
      const res = await S.user.client.patch(`/cart/${S.cartItemId}`, {
        quantity: 0,
      });
      expect(res.status).toBe(400);
    });

    it("DELETE /cart/:itemId 200 — hapus item", async () => {
      expect(S.cartItemId, "Butuh cartItemId").not.toBeNull();
      const res = await S.user.client.delete(`/cart/${S.cartItemId}`);
      expect(res.status).toBe(200);
    });

    it("POST /cart + GET /cart 200 — re-add item untuk checkout", async () => {
      expect(S.product?.id, "Butuh product.id").toBeTruthy();

      const addRes = await S.user.client.post("/cart", {
        productId: S.product!.id,
        quantity: 1,
      });
      expect(addRes.status).toBe(200);

      const cartRes = await S.user.client.get("/cart");
      expect(cartRes.status).toBe(200);
      const cartData = body<{
        data?: { id: string; items: Array<{ id: string }> };
      }>(cartRes)?.data;
      S.cartId = cartData?.id ?? null;
      S.cartItemId = cartData?.items?.[0]?.id ?? null;
      expect(S.cartId, "cartId harus ada setelah re-add").not.toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────
  // 07 Checkout
  // ────────────────────────────────────────────────────────
  describe("07 Checkout", () => {
    it("POST /checkout/calculate-summary 200 — response shape + invariant matematis", async () => {
      expect(S.cartId, "Butuh cartId").not.toBeNull();
      const res = await S.user.client.post("/checkout/calculate-summary", {
        cartId: S.cartId,
        shippingMethod: "regular",
      });
      expect(res.status).toBe(200);
      const d = body<{
        data?: {
          subtotal: number;
          tax: number;
          shippingCost: number;
          total: number;
        };
      }>(res)?.data;
      expect(d).toHaveProperty("subtotal");
      expect(d).toHaveProperty("tax");
      expect(d).toHaveProperty("shippingCost");
      expect(d).toHaveProperty("total");
      expect(typeof d?.total).toBe("number");
      // Invariant matematis
      expect(d!.total).toBeCloseTo(d!.subtotal + d!.tax + d!.shippingCost, 2);
    });

    it("POST /checkout/confirm 400 — body kosong", async () => {
      const res = await S.user.client.post("/checkout/confirm", {});
      expect(res.status).toBe(400);
    });

    it("POST /checkout/confirm 200/201 — checkout valid + dapat orderId dan orderNumber", async () => {
      // FIX: jika cartId atau addressId null, GAGAL eksplisit
      expect(S.cartId, "Butuh cartId dari cart flow").not.toBeNull();
      expect(S.addressId, "Butuh addressId dari profile flow").not.toBeNull();

      const res = await S.user.client.post("/checkout/confirm", {
        cartId: S.cartId,
        addressId: S.addressId,
        shippingMethod: "regular",
        paymentMethod: "bank_transfer",
      });
      expect([200, 201]).toContain(res.status);

      const b = body<{ data?: any }>(res)?.data;
      S.orderId = b?.id ?? b?.order?.id ?? null;
      S.orderNumber = b?.orderNumber ?? b?.order?.orderNumber ?? null;

      // FIX: tidak cukup toBeDefined() — harus ada isinya
      expect(S.orderId, "orderId harus ada setelah checkout").not.toBeNull();
      expect(
        S.orderNumber,
        "orderNumber harus ada setelah checkout",
      ).not.toBeNull();
    });

    it("GET /checkout/summary/:orderNumber 200 — response shape valid", async () => {
      expect(S.orderNumber, "Butuh orderNumber dari checkout").not.toBeNull();
      const res = await S.user.client.get(`/checkout/summary/${S.orderNumber}`);
      expect(res.status).toBe(200);

      const d = body<{ data?: any }>(res)?.data;
      expect(d).toHaveProperty("orderNumber");
      expect(d).toHaveProperty("subtotal");
      expect(d).toHaveProperty("tax");
      expect(d).toHaveProperty("shippingCost");
      expect(d).toHaveProperty("total");

      // Regression lock: semua field uang harus number, bukan string (Prisma Decimal)
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

      // Ownership: orderNumber harus cocok
      expect(d?.orderNumber).toBe(S.orderNumber);
    });
  });

  // ────────────────────────────────────────────────────────
  // 08 Orders
  // ────────────────────────────────────────────────────────
  describe("08 Orders", () => {
    it("GET /orders 401 — tanpa auth", async () => {
      const anon = createRestSession(REST_URL);
      const res = await anon.client.get("/orders");
      expect(res.status).toBe(401);
    });

    it("GET /orders 200 — list order + array shape", async () => {
      const res = await S.user.client.get("/orders", {
        params: { page: 1, limit: 10 },
      });
      expect(res.status).toBe(200);

      // Shape: res.data.data = { orders: [...], total: number } — BUKAN array langsung
      const payload = res.data?.data as
        | { orders: any[]; total: number }
        | undefined;
      expect(Array.isArray(payload?.orders), "data.orders harus array").toBe(
        true,
      );

      // Flow test selalu buat 1 order di section 07 — list tidak boleh kosong
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

    it("GET /orders?status=pending_payment 200 — filter status", async () => {
      const res = await S.user.client.get("/orders", {
        params: { page: 1, limit: 10, status: "pending_payment" },
      });
      expect(res.status).toBe(200);

      const payload = res.data?.data as
        | { orders: any[]; total: number }
        | undefined;
      expect(Array.isArray(payload?.orders), "data.orders harus array").toBe(
        true,
      );

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

    it("GET /orders/:orderId 200 — detail order + shape", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.user.client.get(`/orders/${S.orderId}`);
      expect(res.status).toBe(200);
      const d = res.data?.data;
      expect(d).toHaveProperty("id");
      expect(d).toHaveProperty("orderNumber");
      expect(d).toHaveProperty("status");
      expect(d).toHaveProperty("total");

      // Regression lock: semua field uang di detail order harus number, bukan string
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

    it("GET /orders/bukan-uuid 400 — ID format tidak valid", async () => {
      const res = await S.user.client.get("/orders/bukan-uuid");
      expect(res.status).toBe(400);
    });

    it("POST /orders/:orderId/confirm 404 — UUID valid tapi tidak ada", async () => {
      const res = await S.user.client.post(
        "/orders/00000000-0000-0000-0000-000000000000/confirm",
      );
      expect(res.status).toBe(404);
    });

    it("POST /orders/:orderId/cancel 404 — UUID valid tapi tidak ada", async () => {
      const res = await S.user.client.post(
        "/orders/00000000-0000-0000-0000-000000000000/cancel",
      );
      expect(res.status).toBe(404);
    });

    it("POST /orders/:orderId/confirm 200 — konfirmasi pembayaran", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.user.client.post(`/orders/${S.orderId}/confirm`);
      expect(res.status).toBe(200);
    });

    it("POST /orders/:orderId/cancel 400 — tidak bisa cancel order yang sudah confirmed", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.user.client.post(`/orders/${S.orderId}/cancel`);
      expect(res.status).toBe(400);
    });

    it("POST /orders/:orderId/ship 200 — order dikirim", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.user.client.post(`/orders/${S.orderId}/ship`);
      expect(res.status).toBe(200);
    });

    it("POST /orders/:orderId/deliver 200 — order delivered", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.user.client.post(`/orders/${S.orderId}/deliver`);
      expect(res.status).toBe(200);
    });
  });

  // ────────────────────────────────────────────────────────
  // 09 Auth — Change Password (full positive + negative)
  // ────────────────────────────────────────────────────────
  describe("09 Auth — Change Password", () => {
    it("PATCH /auth/change-password 400 — password lama salah", async () => {
      const res = await S.user.client.patch("/auth/change-password", {
        oldPassword: "WrongOldPass!",
        newPassword: "NewPass123!",
      });
      expect(res.status).toBe(400);
    });

    it("PATCH /auth/change-password 200 — berhasil ganti password", async () => {
      const res = await S.user.client.patch("/auth/change-password", {
        oldPassword: TEST_PASSWORD,
        newPassword: S.newPassword,
      });
      expect(res.status).toBe(200);
    });

    it("POST /auth/login 401 — password LAMA sudah tidak bisa dipakai", async () => {
      // Buat sesi baru agar tidak pakai cookie lama
      const freshSession = createRestSession(REST_URL);
      const res = await freshSession.client.post("/auth/login", {
        email: S.userEmail,
        password: TEST_PASSWORD, // password lama
      });
      expect(res.status).toBe(401);
    });

    it("POST /auth/login 200 — login dengan password BARU berhasil", async () => {
      const freshSession = createRestSession(REST_URL);
      const res = await freshSession.client.post("/auth/login", {
        email: S.userEmail,
        password: S.newPassword,
      });
      expect(res.status).toBe(200);
    });
  });

  // ────────────────────────────────────────────────────────
  // 10 Auth — Logout
  // ────────────────────────────────────────────────────────
  describe("10 Auth — Logout", () => {
    it("POST /auth/logout 200", async () => {
      const res = await S.user.client.post("/auth/logout", {});
      expect(res.status).toBe(200);
    });

    it("GET /auth/me 401 — setelah logout", async () => {
      const res = await S.user.client.get("/auth/me");
      expect(res.status).toBe(401);
    });
  });

  // ────────────────────────────────────────────────────────
  // 11 Admin — Login
  // ────────────────────────────────────────────────────────
  describe("11 Admin — Login", () => {
    it("POST /auth/login 200 — login sebagai admin", async () => {
      const res = await S.admin.client.post("/auth/login", {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
      expect(res.status).toBe(200);
      expect(
        S.admin.cookie("accessToken", ORIGIN),
        "Admin accessToken harus ada",
      ).toBeTruthy();
    });
  });

  // ────────────────────────────────────────────────────────
  // 12 Admin — Dashboard & Lists
  // ────────────────────────────────────────────────────────
  describe("12 Admin — Dashboard & Lists", () => {
    it("GET /admin/dashboard 401 — tanpa auth", async () => {
      const anon = createRestSession(REST_URL);
      const res = await anon.client.get("/admin/dashboard");
      expect(res.status).toBe(401);
    });

    it("GET /admin/dashboard 403 — user biasa (non-admin) tidak bisa akses", async () => {
      // FIX: user biasa harus dapat 403, bukan cuma 401
      // Login ulang sebagai user biasa dengan password baru
      const userSession = createRestSession(REST_URL);
      await userSession.client.post("/auth/login", {
        email: S.userEmail,
        password: S.newPassword,
      });
      const res = await userSession.client.get("/admin/dashboard");
      expect(res.status).toBe(403);
    });

    it("GET /admin/dashboard 200 — response shape valid: summary dengan semua field", async () => {
      const res = await S.admin.client.get("/admin/dashboard");
      expect(res.status).toBe(200);
      const d = body<{ data?: Record<string, unknown> }>(res)?.data;
      // summary harus ada dan berisi semua field
      expect(d).toHaveProperty("summary");
      const summary = (d as any)?.summary;
      expect(summary).toHaveProperty("totalOrdersToday");
      expect(summary).toHaveProperty("weeklyRevenue");
      expect(summary).toHaveProperty("totalOrders");
      expect(summary).toHaveProperty("totalProducts");
      expect(summary).toHaveProperty("totalUsers");
      expect(typeof summary?.weeklyRevenue).toBe("number");
      // topProducts harus array
      expect(Array.isArray((d as any)?.topProducts)).toBe(true);
    });

    it("GET /admin/products 200 — response memiliki data array", async () => {
      const res = await S.admin.client.get("/admin/products", {
        params: { page: 1, limit: 5 },
      });
      expect(res.status).toBe(200);
      const d = body<{ data?: unknown[] }>(res);
      const list = Array.isArray(d?.data)
        ? d!.data
        : Array.isArray(d)
          ? d
          : null;
      expect(list, "harus array").not.toBeNull();
    });

    it("GET /admin/orders 200", async () => {
      const res = await S.admin.client.get("/admin/orders", {
        params: { page: 1 },
      });
      expect(res.status).toBe(200);
    });

    it("GET /admin/users 200", async () => {
      const res = await S.admin.client.get("/admin/users", {
        params: { page: 1 },
      });
      expect(res.status).toBe(200);
    });

    it("GET /auth/profile 200 — alias /auth/me: payload identik (id/email/role/phone sama persis)", async () => {
      // Hit /auth/me dulu untuk dapat referensi
      const meRes = await S.admin.client.get("/auth/me");
      expect(meRes.status).toBe(200);
      const me = meRes.data?.data ?? meRes.data;

      // Hit alias /auth/profile pada sesi yang sama
      const res = await S.admin.client.get("/auth/profile");
      expect(res.status).toBe(200);
      const d = res.data?.data ?? res.data;

      // Bukan sekadar "field-nya ada" — nilainya harus identik dengan /auth/me
      expect(d?.id).toBe(me?.id);
      expect(d?.email).toBe(me?.email);
      expect(d?.role).toBe(me?.role);
      expect(d?.phone).toBe(me?.phone);
      expect(d?.passwordHash).toBeUndefined();
    });
  });

  // ────────────────────────────────────────────────────────
  // 13 Admin — Product CRUD
  // ────────────────────────────────────────────────────────
  describe("13 Admin — Product CRUD", () => {
    it("POST /admin/products 400 — body tidak valid", async () => {
      expect(S.categoryId, "Butuh categoryId").not.toBeNull();
      const res = await S.admin.client.post("/admin/products", { name: "" });
      expect(res.status).toBe(400);
    });

    it("POST /admin/products 200/201 — buat produk baru + dapat productId", async () => {
      expect(S.categoryId, "Butuh categoryId").not.toBeNull();
      const res = await S.admin.client.post("/admin/products", {
        categoryId: S.categoryId,
        name: `Vitest Func Product REST ${Date.now()}`,
        description: "Produk test dari Vitest functional test REST",
        price: 99_000,
        stock: 100,
        discount: 0,
      });
      expect([200, 201]).toContain(res.status);
      S.testProductId = body<{ data?: { id: string } }>(res)?.data?.id ?? null;
      expect(S.testProductId, "Harus dapat product id").not.toBeNull();
    });

    it("PATCH /admin/products/:id 400 — body tidak valid", async () => {
      expect(S.testProductId, "Butuh testProductId").not.toBeNull();
      // price harus positif — kirim negatif untuk trigger validasi
      const res = await S.admin.client.patch(
        `/admin/products/${S.testProductId}`,
        { price: -999 },
      );
      expect(res.status).toBe(400);
    });

    it("PATCH /admin/products/:id 200 — update produk", async () => {
      expect(S.testProductId, "Butuh testProductId").not.toBeNull();
      const res = await S.admin.client.patch(
        `/admin/products/${S.testProductId}`,
        {
          price: 89_000,
          stock: 50,
        },
      );
      expect(res.status).toBe(200);
    });

    it("PATCH /admin/products/:id 404 — id tidak ditemukan", async () => {
      const res = await S.admin.client.patch(
        "/admin/products/00000000-0000-0000-0000-000000000000",
        { stock: 1 },
      );
      expect(res.status).toBe(404);
    });

    it("DELETE /admin/products/:id 200 — hapus produk test", async () => {
      expect(S.testProductId, "Butuh testProductId").not.toBeNull();
      const res = await S.admin.client.delete(
        `/admin/products/${S.testProductId}`,
      );
      expect(res.status).toBe(200);
    });
  });

  // ────────────────────────────────────────────────────────
  // 14 Admin — Update Order Status
  // ────────────────────────────────────────────────────────
  describe("14 Admin — Order Status Update", () => {
    it("PATCH /admin/orders/:id/status 400 — order sudah final (delivered)", async () => {
      expect(S.orderId, "Butuh orderId").not.toBeNull();
      const res = await S.admin.client.patch(
        `/admin/orders/${S.orderId}/status`,
        {
          status: "confirmed",
        },
      );
      // order sudah delivered, transisi ke confirmed tidak valid
      expect(res.status).toBe(400);
    });
  });

  // ────────────────────────────────────────────────────────
  // 15 Cleanup — Delete Address
  // ────────────────────────────────────────────────────────
  describe("15 Cleanup", () => {
    it("DELETE /profile/addresses/:addressId 200 — hapus alamat test (hard assertion)", async () => {
      // Hard assertion: addressId harus ada — kalau null berarti section 05 gagal duluan
      expect(
        S.addressId,
        "addressId harus ada dari section 05 — jika null, flow sebelumnya broken",
      ).not.toBeNull();

      // Login ulang dengan password baru (setelah change-password di section 09)
      const cleanupSession = createRestSession(REST_URL);
      const loginRes = await cleanupSession.client.post("/auth/login", {
        email: S.userEmail,
        password: S.newPassword,
      });
      // Hard assertion: login ulang harus berhasil
      expect(
        loginRes.status,
        "Login ulang dengan password baru harus 200",
      ).toBe(200);

      const res = await cleanupSession.client.delete(
        `/profile/addresses/${S.addressId}`,
      );
      expect(res.status).toBe(200);
    });
  });

  // ────────────────────────────────────────────────────────
  // 16 Admin — Logout
  // ────────────────────────────────────────────────────────
  describe("16 Admin — Logout", () => {
    it("POST /auth/logout 200 — admin logout", async () => {
      const res = await S.admin.client.post("/auth/logout", {});
      expect(res.status).toBe(200);
    });
  });
});
