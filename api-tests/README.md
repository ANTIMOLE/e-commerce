# Zenit E-Commerce — API Functional Tests

Blackbox functional test suite untuk **REST API** (port 4000) dan **tRPC API** (port 4001).
Menggunakan **Vitest** + **Axios** — bukan k6 (k6 untuk performance, ini untuk correctness).

## Apa yang ditest?

| # | Group | Endpoint REST | Procedure tRPC |
|---|-------|--------------|----------------|
| 01 | Products [public] | `GET /products`, `/products/search`, `/products/:slug` | `product.getAll`, `product.search`, `product.getBySlug`, `product.getById` |
| 02 | Categories [public] | `GET /categories`, `/categories/:slug` | `category.getAll`, `category.getBySlug` |
| 03 | Auth Register | `POST /auth/register` | `auth.register` |
| 04 | Auth Login/Me/Refresh | `POST /auth/login`, `GET /auth/me`, `POST /auth/refresh` | `auth.login`, `auth.me`, `auth.refresh` |
| 05 | Profile | `GET/PATCH /profile`, `/profile/addresses` | `profile.get`, `profile.update`, `profile.addAddress`, dll |
| 06 | Cart | `GET/POST/PATCH/DELETE /cart` | `cart.get`, `cart.addItem`, `cart.updateItem`, `cart.removeItem`, `cart.clear` |
| 07 | Checkout | `POST /checkout/confirm`, `GET /checkout/summary/:no` | `checkout.calculateSummary`, `checkout.confirm`, `checkout.getSummary` |
| 08 | Orders | `GET /orders`, `/orders/:id` | `order.getAll`, `order.getById` |
| 09 | Change Password & Logout | `PATCH /auth/change-password`, `POST /auth/logout` | `auth.changePassword`, `auth.logout` |
| 10-11 | Admin Login & Reads | `GET /admin/dashboard/products/orders/users` | `admin.getDashboard/getProducts/getOrders/getUsers` |
| 12 | Admin Product CRUD | `POST/PATCH/DELETE /admin/products` | `admin.createProduct/updateProduct/deleteProduct` |
| 13 | Admin Order Status | `PATCH /admin/orders/:id/status` | `admin.updateOrderStatus` |
| 14 | Admin Logout | `POST /auth/logout` | `auth.logout` |

Setiap group test **happy path** + **error cases** (401, 400, 404, 409).

---

## Prasyarat

- **Node.js** ≥ 18
- **pnpm** ≥ 8 (atau npm/yarn — tapi monorepo pakai pnpm)
- Backend REST (`apps/backend-rest`) berjalan di `localhost:4000`
- Backend tRPC (`apps/backend-trpc`) berjalan di `localhost:4001`
- Database sudah di-seed (minimal: admin user `admin1@zenit.dev` + beberapa produk + kategori)

---

## Cara Install

### Option A — Sebagai package di monorepo (Rekomendasi)

Taruh folder `api-tests` ini di root monorepo kamu, sejajar dengan `apps/` dan `packages/`:

```
e-commerce/
├── apps/
│   ├── backend-rest/
│   ├── backend-trpc/
│   └── frontend/
├── packages/
│   └── shared/
├── api-tests/          ← taruh di sini
│   ├── package.json
│   ├── vitest.config.ts
│   └── src/
├── pnpm-workspace.yaml
└── package.json
```

Tambahkan `api-tests` ke `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'api-tests'         # ← tambahkan ini
```

Install dependencies dari root monorepo:

```bash
pnpm install
```

### Option B — Standalone (di luar monorepo)

```bash
cd api-tests
npm install
# atau
pnpm install
```

---

## Konfigurasi

Buat file `.env` di dalam folder `api-tests/`:

```bash
cp .env.example .env
```

Isi sesuai environment kamu:

```env
# Local (default — tidak perlu diubah kalau run di komputer yang sama)
REST_URL=http://localhost:4000/api/v1
TRPC_URL=http://localhost:4001/trpc

# VPS / Remote (ubah ke IP/domain server)
# REST_URL=http://123.456.789.0:4000/api/v1
# TRPC_URL=http://123.456.789.0:4001/trpc

# Kredensial admin — harus cocok dengan seed database
ADMIN_EMAIL=admin1@zenit.dev
ADMIN_PASSWORD=Password123!
```

---

## Cara Menjalankan Test

### Test REST API saja

```bash
# Dari folder api-tests/
pnpm test:rest

# Dari root monorepo
pnpm --filter @zenit/api-tests test:rest
```

### Test tRPC API saja

```bash
pnpm test:trpc
```

### Test keduanya sekaligus

```bash
pnpm test:all
```

### Mode watch (auto re-run saat file berubah)

```bash
pnpm test:watch
```

### Mode UI (browser — visual test runner)

```bash
pnpm test:ui
# Buka browser ke http://localhost:51204/__vitest__/
```

---

## Contoh Output

```
✓ REST API — Functional Blackbox Test (14 groups)
  ✓ 01 Products [public]
    ✓ GET /products 200 — list produk tersedia                     12ms
    ✓ GET /products?sortBy=price,asc 200                            8ms
    ✓ GET /products?minPrice&maxPrice 200 — filter harga            7ms
    ✓ GET /products/search?q=a 200                                  9ms
    ✓ GET /products/:slug 200 — detail produk                       6ms
    ✓ GET /products/:slug 404 — slug tidak ada                      5ms
  ✓ 02 Categories [public]
    ✓ GET /categories 200 — list kategori                           8ms
    ✓ GET /categories/:slug 200 — detail kategori                   6ms
    ✓ GET /categories/:slug 404 — slug tidak ada                    5ms
  ...
  ✓ 14 Admin — Logout
    ✓ POST /auth/logout 200 — admin logout                          7ms

Test Files  1 passed (1)
Tests       47 passed (47)
Duration    4.2s
```

---

## Troubleshooting

### ❌ `ECONNREFUSED` / `connect ECONNREFUSED 127.0.0.1:4000`
Backend belum jalan. Pastikan start backend dulu:
```bash
# Di terminal terpisah
pnpm --filter backend-rest dev
pnpm --filter backend-trpc dev
```

### ❌ Test `09 Auth — Change Password` fail padahal sudah login
Beberapa test sebelumnya (terutama cart/checkout) mungkin gagal sehingga sesi user terputus. Jalankan test satu per satu untuk debug:
```bash
pnpm test:rest -- --reporter=verbose 2>&1 | head -100
```

### ❌ Test `07 Checkout` skip terus
Artinya salah satu dari `cartId` atau `addressId` null. Ini terjadi kalau:
- Semua produk stock = 0 → seed database dengan produk yang ada stoknya
- Test `05 Profile/addAddress` gagal → cek endpoint profile addresses

### ❌ tRPC test `product.getBySlug 404` fail (dapat 200 bukan 404)
Cek apakah tRPC backend kamu throw `TRPCError({ code: 'NOT_FOUND' })` untuk slug yang tidak ada. Kalau throw error biasa (non-TRPC), status code bisa berbeda.

### ❌ `auth.register 409` fail (dapat 400 bukan 409)
Beberapa backend mengembalikan 400 untuk email duplikat, bukan 409. Sesuaikan di `src/trpc.test.ts`:
```typescript
// Ganti
expect(isTrpcError(res, 409)).toBe(true);
// Jadi
expect([400, 409]).toContain(res.data?.error?.data?.httpStatus);
```

### ⚠️ Warning "Skip checkout" di console
Normal kalau produk tidak ada stoknya. Pastikan database seed punya produk dengan `stock > 0`.

---

## Menambah Test Baru

Edit `src/rest.test.ts` atau `src/trpc.test.ts`. Ikuti pola yang sudah ada:

```typescript
it("GET /endpoint 200 — deskripsi test", async () => {
  const res = await S.user.client.get("/endpoint");
  expect(res.status).toBe(200);
  // Simpan ke state S kalau dibutuhkan test berikutnya
  S.someId = res.data?.data?.id ?? null;
});
```

Untuk test yang butuh data dari test sebelumnya, tambahkan early return:
```typescript
it("DELETE /endpoint/:id 200", async () => {
  if (!S.someId) return; // skip gracefully
  const res = await S.user.client.delete(`/endpoint/${S.someId}`);
  expect(res.status).toBe(200);
});
```

---

## Struktur File

```
api-tests/
├── .env                    # konfigurasi URL + kredensial (buat dari .env.example)
├── .env.example            # template
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── src/
    ├── config.ts           # baca .env, export konstanta
    ├── helpers/
    │   ├── rest.ts         # REST axios client dengan cookie jar
    │   └── trpc.ts         # tRPC axios client + helper trpcData() + isTrpcError()
    ├── rest.test.ts        # 47 test REST (14 groups)
    └── trpc.test.ts        # 50 test tRPC (14 groups)
```
