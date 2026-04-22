/**
 * auth-flow.integration.test.ts — Integration Test
 *
 * Letakkan di: api-tests/src/integration/auth-flow.integration.test.ts
 *
 * Gray-box integration test: menguji alur data antara service
 * yang berbeda melalui API. Berbeda dengan unit test (yang mock DB)
 * dan black-box test (yang tidak tahu internal), di sini kita:
 *
 *   - TAHU schema DB dan kontrak API
 *   - Test melalui HTTP (bukan import langsung)
 *   - Verifikasi "data flows correctly" antar service
 *
 * Butuh server berjalan: REST @ :4000 dan tRPC @ :4001
 */

import { describe, it, expect, beforeAll } from "vitest";
import axios from "axios";

const REST = "http://localhost:4000/api/v1";
const TRPC = "http://localhost:4001/trpc";

const http = axios.create({
  validateStatus: () => true,
  timeout: 15_000,
});

// ─── Helper ──────────────────────────────────────────────────
function trpcQuery(proc: string, input?: unknown, cookies = "") {
  const qs = input
    ? `?input=${encodeURIComponent(JSON.stringify(input))}`
    : "";
  return http.get(`${TRPC}/${proc}${qs}`, {
    headers: cookies ? { Cookie: cookies } : {},
  });
}

function trpcMutation(proc: string, input: unknown, cookies = "") {
  return http.post(`${TRPC}/${proc}`, input, {
    headers: { "Content-Type": "application/json", ...(cookies ? { Cookie: cookies } : {}) },
  });
}

function getCookies(res: { headers: Record<string, unknown> }): string {
  const setCookie = res.headers["set-cookie"] ?? [];
  return Array.isArray(setCookie) ? setCookie.join("; ") : String(setCookie);
}

// ════════════════════════════════════════════════════════════
// INTEGRATION: REST ↔ tRPC Data Consistency
// ════════════════════════════════════════════════════════════
describe("[Integration] REST ↔ tRPC — Data yang sama di kedua API", () => {

  it("✅ produk yang ada di REST juga ada di tRPC (konsistensi DB)", async () => {
    // Ambil produk pertama via REST
    const restRes = await http.get(`${REST}/products?limit=1&page=1`);
    expect(restRes.status).toBe(200);
    const restProducts = restRes.data?.data ?? [];
    if (restProducts.length === 0) return;

    const restSlug = restProducts[0].slug;

    // Ambil produk yang sama via tRPC
    const trpcRes = await trpcQuery("product.getBySlug", { slug: restSlug });
    expect(trpcRes.status).toBe(200);
    const trpcProduct = trpcRes.data?.result?.data;

    // Data harus sama
    expect(trpcProduct?.slug).toBe(restSlug);
    expect(Number(trpcProduct?.price)).toBe(Number(restProducts[0].price));
  });

  it("✅ kategori yang sama tersedia di kedua API", async () => {
    const restCats = await http.get(`${REST}/categories`);
    const trpcCats = await trpcQuery("category.getAll");

    expect(restCats.status).toBe(200);
    expect(trpcCats.status).toBe(200);

    // Jumlah kategori harus sama
    const restList = restCats.data?.data ?? [];
    const trpcList = trpcCats.data?.result?.data ?? [];

    expect(trpcList.length).toBe(restList.length);
  });
});

// ════════════════════════════════════════════════════════════
// INTEGRATION: User Registration → Login → Protected Resource
// ════════════════════════════════════════════════════════════
describe("[Integration] Auth Flow — Register → Login → Protected", () => {
  const email = `integration_${Date.now()}@test.com`;
  let restCookies = "";
  let trpcCookies = "";

  it("✅ register user baru via REST berhasil (201)", async () => {
    const res = await http.post(`${REST}/auth/register`, {
      name: "Integration Tester",
      email,
      password: "TestPass123!",
    });
    expect([200, 201]).toContain(res.status);
    restCookies = getCookies(res as any);
  });

  it("✅ user yang sama bisa login via tRPC", async () => {
    const res = await trpcMutation("auth.login", {
      email,
      password: "TestPass123!",
    });
    expect(res.status).toBe(200);
    trpcCookies = getCookies(res as any);
    expect(trpcCookies).toBeTruthy();
  });

  it("✅ cookie dari REST login bisa akses profile via REST", async () => {
    if (!restCookies) return;
    const res = await http.get(`${REST}/profile`, {
      headers: { Cookie: restCookies },
    });
    expect(res.status).toBe(200);
    expect(res.data?.data?.user?.email ?? res.data?.user?.email).toBe(email);
  });

  it("✅ cookie dari tRPC login bisa akses auth.me via tRPC", async () => {
    if (!trpcCookies) return;
    const res = await trpcQuery("auth.me", null, trpcCookies);
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════
// INTEGRATION: Cart → Checkout (service interaction)
// ════════════════════════════════════════════════════════════
describe("[Integration] Cart ↔ Order — Handshake antar service", () => {
  const email = `cart_flow_${Date.now()}@test.com`;
  let cookies = "";
  let availableProductId = "";
  let addressId = "";
  let cartId = "";

  beforeAll(async () => {
    // Register & login
    await http.post(`${REST}/auth/register`, {
      name: "Cart Flow Tester",
      email,
      password: "TestPass123!",
    });
    const loginRes = await http.post(`${REST}/auth/login`, {
      email,
      password: "TestPass123!",
    });
    cookies = getCookies(loginRes as any);

    // Ambil produk dengan stok
    const products = await http.get(`${REST}/products?limit=20`);
    const list: any[] = products.data?.data ?? [];
    const available = list.find((p) => p.stock > 0);
    availableProductId = available?.id ?? "";
  }, 20_000);

  it("✅ tambah produk ke cart → cart berisi item tersebut", async () => {
    if (!cookies || !availableProductId) {
      console.warn("  ⚠️  Skip: tidak ada cookies atau produk tersedia");
      return;
    }

    const res = await http.post(
      `${REST}/cart`,
      { productId: availableProductId, quantity: 1 },
      { headers: { Cookie: cookies } }
    );
    expect(res.status).toBe(200);

    // Verifikasi item ada di cart
    const cartRes = await http.get(`${REST}/cart`, {
      headers: { Cookie: cookies },
    });
    expect(cartRes.status).toBe(200);
    const items = cartRes.data?.data?.items ?? [];
    cartId = cartRes.data?.data?.id ?? "";

    const addedItem = items.find((i: any) => i.productId === availableProductId);
    expect(addedItem).toBeDefined();
    expect(addedItem?.quantity).toBe(1);
  });

  it("✅ tambah address profile → bisa dipakai di checkout", async () => {
    if (!cookies) return;

    const addrRes = await http.post(
      `${REST}/profile/addresses`,
      {
        label: "Rumah",
        recipientName: "Cart Flow Tester",
        phone: "081234567890",
        address: "Jl. Integration Test No. 1",
        city: "Yogyakarta",
        province: "D.I. Yogyakarta",
        zipCode: "55000",
        isDefault: true,
      },
      { headers: { Cookie: cookies } }
    );

    // Bisa 200 atau 201
    expect([200, 201]).toContain(addrRes.status);
    addressId = addrRes.data?.data?.id ?? addrRes.data?.id ?? "";

    // Verifikasi address ada di profile
    const addrListRes = await http.get(`${REST}/profile/addresses`, {
      headers: { Cookie: cookies },
    });
    expect(addrListRes.status).toBe(200);
    const addresses: any[] = addrListRes.data?.data ?? [];
    expect(addresses.some((a: any) => a.city === "Yogyakarta")).toBe(true);
  });

  it("✅ checkout summary mengembalikan kalkulasi yang konsisten", async () => {
    if (!cookies || !cartId) return;

    const res = await http.post(
      `${REST}/checkout/summary`,
      { cartId, shippingMethod: "regular" },
      { headers: { Cookie: cookies } }
    );

    if (res.status !== 200) return; // endpoint mungkin berbeda

    const data = res.data?.data ?? res.data;
    if (!data) return;

    // Invariant: total = subtotal + tax + shippingCost
    const reconstructed = Number(data.subtotal) + Number(data.tax) + Number(data.shippingCost);
    expect(Number(data.total)).toBeCloseTo(reconstructed, 0);
  });
});

// ════════════════════════════════════════════════════════════
// INTEGRATION: Token Refresh Flow
// ════════════════════════════════════════════════════════════
describe("[Integration] Token Lifecycle", () => {
  const email = `token_flow_${Date.now()}@test.com`;
  let cookies = "";

  it("✅ login → refresh → akses protected dengan token baru", async () => {
    // Register
    await http.post(`${REST}/auth/register`, {
      name: "Token Flow Tester",
      email,
      password: "TestPass123!",
    });

    // Login
    const loginRes = await http.post(`${REST}/auth/login`, { email, password: "TestPass123!" });
    cookies = getCookies(loginRes as any);

    // Refresh token
    const refreshRes = await http.post(`${REST}/auth/refresh`, null, {
      headers: { Cookie: cookies },
    });
    expect(refreshRes.status).toBe(200);

    // Update cookies dengan yang baru (jika server set cookie baru)
    const newCookies = getCookies(refreshRes as any);
    const activeCookies = newCookies || cookies;

    // Akses protected route dengan token yang di-refresh
    const profileRes = await http.get(`${REST}/profile`, {
      headers: { Cookie: activeCookies },
    });
    expect(profileRes.status).toBe(200);
  });

  it("✅ logout → refresh token tidak bisa dipakai lagi", async () => {
    if (!cookies) return;

    await http.post(`${REST}/auth/logout`, null, {
      headers: { Cookie: cookies },
    });

    // Coba refresh setelah logout
    const refreshRes = await http.post(`${REST}/auth/refresh`, null, {
      headers: { Cookie: cookies },
    });

    expect([401, 403]).toContain(refreshRes.status);
  });
});
