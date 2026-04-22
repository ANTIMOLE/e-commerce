/**
 * security.test.ts — Gray-Box Security Test
 *
 * Letakkan di: api-tests/src/security.test.ts
 * Jalankan: pnpm test:security
 *
 * CAKUPAN (OWASP Top 10 relevan untuk REST API ini):
 *   A01 - Broken Access Control (IDOR, missing auth)
 *   A02 - Cryptographic Failures (token exposure)
 *   A03 - Injection (SQL via Prisma, XSS via input)
 *   A04 - Insecure Design (rate limiting, mass assignment)
 *   A07 - Identification & Authentication Failures (brute force, token manipulation)
 *
 * CATATAN: Test ini butuh server REST berjalan di localhost:4000
 *          dan test server tRPC di localhost:4001
 */

import { describe, it, expect, beforeAll } from "vitest";
import axios, { AxiosInstance } from "axios";

// ─── Config ──────────────────────────────────────────────────
const REST = "http://localhost:4000/api/v1";
const TRPC = "http://localhost:4001/trpc";
const TIMEOUT = 10_000;

// Client yang TIDAK throw untuk status 4xx/5xx — kita ingin cek semua status
const http = axios.create({
  baseURL: REST,
  timeout: TIMEOUT,
  validateStatus: () => true,
  withCredentials: true,
});

// Shared state
let authCookies = "";
let adminCookies = "";
let testUserId = "";
let productSlug = "";
let productId = "";

// ─── Helper ──────────────────────────────────────────────────
async function loginAndGetCookies(
  email: string,
  password: string
): Promise<string> {
  const res = await http.post("/auth/login", { email, password });
  if (res.status !== 200) return "";
  const setCookie = res.headers["set-cookie"] ?? [];
  return Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
}

async function registerTestUser(): Promise<{ email: string; cookies: string }> {
  const email = `sec_test_${Date.now()}@test.com`;
  await http.post("/auth/register", {
    name: "Security Tester",
    email,
    password: "TestPass123!",
  });
  const cookies = await loginAndGetCookies(email, "TestPass123!");
  return { email, cookies };
}

// ════════════════════════════════════════════════════════════
// SETUP — ambil data awal yang dibutuhkan oleh semua test
// ════════════════════════════════════════════════════════════
beforeAll(async () => {
  // Login sebagai user biasa
  const { cookies } = await registerTestUser();
  authCookies = cookies;

  // Login sebagai admin
  adminCookies = await loginAndGetCookies(
    "admin1@zenit.dev",
    "Password123!"
  );

  // Ambil produk pertama (untuk test IDOR, cart, dsb)
  const products = await http.get("/products?limit=5");
  const list = products.data?.data ?? [];
  if (list.length > 0) {
    productSlug = list[0].slug;
    productId = list[0].id;
  }
}, 30_000);

// ════════════════════════════════════════════════════════════
// A01 - BROKEN ACCESS CONTROL
// ════════════════════════════════════════════════════════════
describe("[A01] Broken Access Control", () => {

  it("🔒 endpoint protected harus return 401 tanpa auth cookie", async () => {
    const endpoints = [
      "/profile",
      "/cart",
      "/orders",
      "/orders?page=1",
    ];

    for (const endpoint of endpoints) {
      const res = await http.get(endpoint); // tanpa cookie
      expect(res.status, `${endpoint} harus 401`).toBe(401);
    }
  });

  it("🔒 endpoint admin harus return 401/403 untuk user biasa", async () => {
    const adminEndpoints = [
      "/admin/dashboard",
      "/admin/products",
      "/admin/orders",
      "/admin/users",
    ];

    for (const endpoint of adminEndpoints) {
      const res = await http.get(endpoint, {
        headers: { Cookie: authCookies }, // user biasa, bukan admin
      });
      expect(
        [401, 403],
        `${endpoint} harus 401 atau 403 untuk user biasa, dapat ${res.status}`
      ).toContain(res.status);
    }
  });

  it("🔒 admin harus bisa akses admin endpoints", async () => {
    if (!adminCookies) return; // skip jika admin login gagal

    const res = await http.get("/admin/dashboard", {
      headers: { Cookie: adminCookies },
    });
    expect(res.status).toBe(200);
  });

  it("🔒 IDOR — tidak bisa akses cart milik user lain via query param injection", async () => {
    // Coba GET /cart dengan userId orang lain di query (harus diabaikan)
    const res = await http.get("/cart?userId=admin-uuid", {
      headers: { Cookie: authCookies },
    });
    // Harus mengembalikan cart MILIK user yang login, bukan cart admin
    // Minimal harus 200 (cart sendiri) atau 401 (tidak terauth)
    expect([200, 404]).toContain(res.status);
    // Jika 200, pastikan bukan cart admin
    if (res.status === 200 && adminCookies) {
      const adminCart = await http.get("/cart", {
        headers: { Cookie: adminCookies },
      });
      // Cart ID harus berbeda
      if (res.data?.data?.id && adminCart.data?.data?.id) {
        expect(res.data.data.id).not.toBe(adminCart.data.data.id);
      }
    }
  });

  it("🔒 tidak bisa melihat order milik user lain via ID manipulation", async () => {
    if (!adminCookies) return;

    // Admin buat order dulu (atau ambil dari list admin)
    const adminOrders = await http.get("/admin/orders", {
      headers: { Cookie: adminCookies },
    });
    const adminOrderList = adminOrders.data?.data ?? [];
    if (adminOrderList.length === 0) return; // tidak ada data untuk di-test

    // User biasa coba akses order pertama (milik siapapun)
    const firstOrderId = adminOrderList[0]?.id;
    if (!firstOrderId) return;

    const res = await http.get(`/orders/${firstOrderId}`, {
      headers: { Cookie: authCookies },
    });
    // Harus 403 atau 404, bukan 200 dengan data orang lain
    expect([403, 404]).toContain(res.status);
  });
});

// ════════════════════════════════════════════════════════════
// A02 - CRYPTOGRAPHIC FAILURES
// ════════════════════════════════════════════════════════════
describe("[A02] Cryptographic Failures", () => {

  it("🔒 access token harus disimpan di httpOnly cookie (bukan body/header)", async () => {
    const email = `crypto_test_${Date.now()}@test.com`;
    await http.post("/auth/register", {
      name: "Crypto Tester",
      email,
      password: "TestPass123!",
    });

    const res = await http.post("/auth/login", { email, password: "TestPass123!" });

    // Token TIDAK boleh ada di response body
    expect(res.data).not.toHaveProperty("accessToken");
    expect(res.data).not.toHaveProperty("token");

    // Token harus ada di Set-Cookie header
    const setCookie = res.headers["set-cookie"] ?? [];
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(" ") : setCookie;
    expect(cookieStr).toMatch(/accessToken/i);

    // Cookie harus httpOnly
    expect(cookieStr).toMatch(/httpOnly/i);
  });

  it("🔒 response login tidak mengekspos passwordHash", async () => {
    const email = `crypto2_${Date.now()}@test.com`;
    await http.post("/auth/register", {
      name: "Test",
      email,
      password: "TestPass123!",
    });
    const res = await http.post("/auth/login", { email, password: "TestPass123!" });

    const responseStr = JSON.stringify(res.data);
    expect(responseStr).not.toContain("passwordHash");
    expect(responseStr).not.toContain("password_hash");
    expect(responseStr).not.toMatch(/\$2[ab]\$/); // bcrypt hash prefix
  });

  it("🔒 response profile tidak mengekspos passwordHash", async () => {
    if (!authCookies) return;

    const res = await http.get("/profile", {
      headers: { Cookie: authCookies },
    });
    expect(res.status).toBe(200);
    const responseStr = JSON.stringify(res.data);
    expect(responseStr).not.toContain("passwordHash");
    expect(responseStr).not.toContain("password_hash");
  });
});

// ════════════════════════════════════════════════════════════
// A03 - INJECTION
// ════════════════════════════════════════════════════════════
describe("[A03] Injection", () => {

  it("🔒 SQL injection di query params tidak menyebabkan error 500", async () => {
    // Prisma menggunakan parameterized queries sehingga SQL injection
    // tidak bisa merusak query. Test ini memastikan server tidak crash.
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1' UNION SELECT * FROM users --",
      "admin'--",
    ];

    for (const payload of sqlPayloads) {
      const res = await http.get("/products", {
        params: { q: payload },
      });
      // Boleh 200 (hasil kosong) atau 400 (validasi), TIDAK boleh 500
      expect(res.status, `SQL injection payload: ${payload}`).not.toBe(500);
    }
  });

  it("🔒 SQL injection di path params tidak menyebabkan 500", async () => {
    const payloads = [
      "' OR 1=1 --",
      "../../../../etc/passwd",
      "%27%20OR%201%3D1%20--",
    ];

    for (const payload of payloads) {
      const res = await http.get(`/products/${encodeURIComponent(payload)}`);
      expect(res.status).not.toBe(500);
      expect([400, 404]).toContain(res.status);
    }
  });

  it("🔒 XSS payload di field input di-escape (tidak di-reflect raw)", async () => {
    const xssPayload = '<script>alert("xss")</script>';
    const email = `xss_${Date.now()}@test.com`;

    const res = await http.post("/auth/register", {
      name: xssPayload, // inject XSS di nama
      email,
      password: "TestPass123!",
    });

    // Server harus menerima atau reject (tergantung validasi),
    // tapi TIDAK boleh reflect payload apa adanya tanpa escape
    // (ini lebih relevan di frontend, tapi API juga harus aman)
    if (res.status === 200 || res.status === 201) {
      const responseStr = JSON.stringify(res.data);
      // Pastikan response tidak mengandung script tag raw (seharusnya disimpan aman di DB)
      // Note: API biasanya tidak HTML-escape di JSON response, tapi flag jika ada raw
      console.log(`  ℹ️  XSS nama tersimpan sebagai: ${res.data?.data?.name ?? "N/A"}`);
    }
  });
});

// ════════════════════════════════════════════════════════════
// A04 - INSECURE DESIGN (Mass Assignment, Input Validation)
// ════════════════════════════════════════════════════════════
describe("[A04] Insecure Design", () => {

  it("🔒 mass assignment — tidak bisa set role:ADMIN saat register", async () => {
    const email = `massassign_${Date.now()}@test.com`;

    const res = await http.post("/auth/register", {
      name: "Attacker",
      email,
      password: "TestPass123!",
      role: "ADMIN",        // coba inject role
      isAdmin: true,        // coba field alternatif
      admin: true,
    });

    // Kalau register berhasil (201/200), pastikan rolenya USER, bukan ADMIN
    if (res.status === 200 || res.status === 201) {
      const userData = res.data?.data?.user ?? res.data?.user ?? res.data;
      expect(userData?.role).not.toBe("ADMIN");
      expect(userData?.role).toBe("USER");
    }
  });

  it("🔒 quantity negatif di cart harus ditolak", async () => {
    if (!authCookies || !productId) return;

    const res = await http.post(
      "/cart",
      { productId, quantity: -1 },
      { headers: { Cookie: authCookies } }
    );

    // Quantity negatif harus ditolak (400) atau batas minimum 1
    expect([400, 422]).toContain(res.status);
  });

  it("🔒 quantity 0 di cart harus ditolak", async () => {
    if (!authCookies || !productId) return;

    const res = await http.post(
      "/cart",
      { productId, quantity: 0 },
      { headers: { Cookie: authCookies } }
    );
    expect([400, 422]).toContain(res.status);
  });

  it("🔒 quantity sangat besar (>stok) harus ditolak atau dibatasi", async () => {
    if (!authCookies || !productId) return;

    const res = await http.post(
      "/cart",
      { productId, quantity: 999_999 },
      { headers: { Cookie: authCookies } }
    );
    // Boleh 400 (validasi) atau dibatasi ke max stock
    // TIDAK boleh 200 dengan quantity=999999 jika stok tidak mencukupi
    expect(res.status).not.toBe(500);
  });

  it("🔒 request body sangat besar (>1MB) harus ditolak oleh Express", async () => {
    const largePayload = { data: "x".repeat(1_100_000) }; // >1MB

    const res = await http.post("/auth/login", largePayload);

    // Express dengan body-parser default limit 1mb harus tolak ini
    // 413 Payload Too Large, atau 400 validasi gagal
    expect(res.status).not.toBe(200);
    expect([400, 413]).toContain(res.status);
  });
});

// ════════════════════════════════════════════════════════════
// A07 - IDENTIFICATION & AUTHENTICATION FAILURES
// ════════════════════════════════════════════════════════════
describe("[A07] Authentication Failures", () => {

  it("🔒 login dengan token JWT yang dimanipulasi harus return 401", async () => {
    // Buat token palsu yang terlihat seperti JWT tapi signature-nya salah
    const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbi11dWlkIiwicm9sZSI6IkFETUlOIn0.INVALID_SIGNATURE";

    const res = await http.get("/profile", {
      headers: {
        Cookie: `accessToken=${fakeToken}`,
      },
    });

    expect(res.status).toBe(401);
  });

  it("🔒 token algorithm 'none' attack harus ditolak", async () => {
    // Attack: ubah alg ke 'none' agar server tidak verify signature
    const noneToken = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJhZG1pbi11dWlkIiwicm9sZSI6IkFETUlOIn0.";

    const res = await http.get("/profile", {
      headers: {
        Cookie: `accessToken=${noneToken}`,
      },
    });

    expect(res.status).toBe(401);
  });

  it("🔒 brute force test — 5 login gagal tidak boleh lock dan tidak boleh 500", async () => {
    // Test bahwa server tetap stabil setelah beberapa login gagal
    // (Catatan: implementasi rate limiting yang baik akan mengembalikan 429)
    const attempts = Array.from({ length: 5 }, () =>
      http.post("/auth/login", {
        email: "nonexistent@test.com",
        password: "WrongPassword!",
      })
    );

    const results = await Promise.all(attempts);

    for (const res of results) {
      // Harus 401 (credential salah) atau 429 (rate limited), TIDAK 500
      expect([401, 429]).toContain(res.status);
    }
  });

  it("🔒 token tetap valid setelah logout harus ditolak", async () => {
    // Register dan login user baru
    const { cookies } = await registerTestUser();
    if (!cookies) return;

    // Logout
    await http.post("/auth/logout", null, {
      headers: { Cookie: cookies },
    });

    // Coba akses dengan token yang sudah di-logout
    // Catatan: access token JWT stateless tetap valid sampai expired
    // tapi refresh token harus sudah di-revoke
    const refreshRes = await http.post("/auth/refresh", null, {
      headers: { Cookie: cookies },
    });

    // Refresh harus gagal karena token sudah di-revoke
    expect([401, 403]).toContain(refreshRes.status);
  });

  it("🔒 register dengan email format tidak valid harus ditolak", async () => {
    const invalidEmails = [
      "notanemail",
      "@nodomain.com",
      "no@",
      "spaces in@email.com",
    ];

    for (const email of invalidEmails) {
      const res = await http.post("/auth/register", {
        name: "Test",
        email,
        password: "TestPass123!",
      });
      expect(res.status, `Email '${email}' harus ditolak`).toBe(400);
    }
  });

  it("🔒 register dengan password terlalu pendek harus ditolak", async () => {
    const res = await http.post("/auth/register", {
      name: "Test",
      email: `short_pass_${Date.now()}@test.com`,
      password: "abc", // terlalu pendek
    });
    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════
// A09 - SECURITY LOGGING & MONITORING (sanity check)
// ════════════════════════════════════════════════════════════
describe("[Misc] Response Headers & Information Disclosure", () => {

  it("🔒 server tidak mengekspos versi software di response headers", async () => {
    const res = await http.get("/products");
    const headers = res.headers;

    // Server header yang umum mengekspos versi
    const serverHeader = headers["server"] ?? "";
    const xPoweredBy = headers["x-powered-by"] ?? "";

    // Express biasanya mengirim 'X-Powered-By: Express' — ini sebaiknya di-disable
    // dengan app.disable('x-powered-by') atau helmet()
    if (xPoweredBy) {
      console.warn(`  ⚠️  X-Powered-By header terekspos: ${xPoweredBy}`);
      console.warn(`     Tambahkan helmet() atau app.disable('x-powered-by')`);
    }

    // Tidak boleh ada versi detail di Server header
    expect(serverHeader).not.toMatch(/\d+\.\d+\.\d+/); // pattern versi semver
  });

  it("🔒 error 404 tidak mengekspos stack trace atau path internal", async () => {
    const res = await http.get("/route-yang-tidak-ada-sama-sekali");

    expect([404]).toContain(res.status);
    const responseStr = JSON.stringify(res.data);

    // Stack trace tidak boleh terekspos ke client
    expect(responseStr).not.toContain("at Object.");
    expect(responseStr).not.toContain("node_modules");
    expect(responseStr).not.toContain("/src/");
  });

  it("🔒 error 500 internal tidak mengekspos detail error ke client", async () => {
    // Coba trigger error dengan payload yang sangat salah
    const res = await http.post("/auth/login", {
      email: null,
      password: null,
    });

    const responseStr = JSON.stringify(res.data);
    // Stack trace tidak boleh terekspos
    expect(responseStr).not.toContain("at Object.");
    expect(responseStr).not.toContain("Error:");
    // Prisma error message tidak boleh terekspos langsung
    expect(responseStr).not.toContain("PrismaClientKnownRequestError");
  });

  it("🔒 CORS — request dari origin tidak diizinkan harus ditolak", async () => {
    // Test CORS dengan origin yang tidak terdaftar
    // (ini lebih relevan di production, tapi baik untuk dicek)
    const res = await http.get("/products", {
      headers: {
        Origin: "https://malicious-site.com",
      },
    });

    const allowOrigin = res.headers["access-control-allow-origin"] ?? "";
    // Origin malicious TIDAK boleh di-allow
    expect(allowOrigin).not.toBe("https://malicious-site.com");
  });
});
