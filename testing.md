# TESTING.md — Panduan Lengkap Menjalankan Test

> **Environment:** Panduan ini ditulis untuk **Linux/bash** (termasuk VPS Ubuntu).
> Command `psql`, heredoc `<< 'EOF'`, dan `pnpm --filter` tidak portable ke PowerShell Windows.
> Kalau kamu di Windows, gunakan WSL2 atau jalankan langsung di VPS.

---

## Gambaran Umum — 3 Suite Test

| Suite | Tipe | Butuh Backend? | Butuh DB? | Mengubah DB? | Lokasi Command |
|---|---|---|---|---|---|
| **Whitebox REST** | Unit (mocked) | ❌ Tidak | ❌ Tidak | ❌ Tidak | `apps/backend-rest/` |
| **Whitebox tRPC** | Unit (mocked) | ❌ Tidak | ❌ Tidak | ❌ Tidak | `apps/backend-trpc/` |
| **Blackbox API** | Functional E2E | ✅ Ya (port 4000 + 4001) | ✅ Ya | ✅ **Ya** | `api-tests/` |

**Implikasi:**
- Whitebox bisa jalan kapan saja — tidak butuh DB atau backend aktif
- Blackbox wajib backend jalan dan DB sudah di-seed
- Setelah blackbox, cleanup DB sebelum k6 (lihat bagian Cleanup)

---

## Struktur Folder yang Relevan

```
e-commerce/
├── apps/
│   ├── backend-rest/
│   │   ├── src/__tests__/unit/      ← whitebox test files (sudah di sini)
│   │   └── vitest.unit.config.ts
│   ├── backend-trpc/
│   │   ├── src/__tests__/unit/      ← whitebox test files (sudah di sini)
│   │   └── vitest.unit.config.ts
│   └── frontend/
├── packages/
│   └── shared/
└── api-tests/                       ← blackbox test (workspace member)
    ├── src/rest.test.ts
    ├── src/trpc.test.ts
    └── .env
```

---

## Prasyarat — Install Dependencies

```bash
# Dari root monorepo — sekali saja
pnpm install
```

✅ Tidak ada error, `node_modules` terbuat
❌ `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`: pastikan `pnpm-workspace.yaml` include `api-tests`
❌ `command not found: pnpm`: `npm install -g pnpm@10.30.3`

---
---

## SUITE 1 — Whitebox Unit Test: REST

**Karakteristik:** Semua dependency (Prisma, bcrypt, JWT) di-mock via `vi.mock()`.
Tidak butuh DB, tidak butuh backend jalan, tidak mengubah state apapun.

**File test di `apps/backend-rest/src/__tests__/unit/`:**
`auth.service` · `auth.middleware` · `role.middleware` · `validate.middleware` · `cart.service` · `category.service` · `checkout.service` · `order.service` · `product.service` · `profile.service` · `admin.service`

### Jalankan

```bash
cd apps/backend-rest

pnpm test:unit
```

✅ Semua test `PASS`, output: `X passed | 0 failed`
❌ `Cannot find module '@ecommerce/shared'`: jalankan `pnpm install` dari root dulu
❌ `vi is not defined`: pastikan `vitest.unit.config.ts` ada dan dipakai (bukan config default)

### Jalankan dengan Coverage

```bash
cd apps/backend-rest

pnpm test:unit:coverage
```

✅ Tabel coverage muncul, semua threshold terpenuhi (statements ≥70%, branches ≥65%, functions ≥70%, lines ≥70%)
✅ Laporan HTML di `apps/backend-rest/coverage/index.html`

> ⚠️ **ISSUE — `@vitest/coverage-v8` version mismatch (harus difix dulu sebelum jalankan coverage):**
>
> `package.json` backend-rest punya `"@vitest/coverage-v8": "^4.1.5"` tapi `"vitest": "^1.6.1"`.
> Package `coverage-v8` versi 4.x membutuhkan vitest 3.x — ini mismatch dan akan error.
>
> **Fix:** ubah di `apps/backend-rest/package.json`:
> ```json
> "@vitest/coverage-v8": "^1.6.1"
> ```
> Lalu dari root: `pnpm install`
>
> Command `test:unit` (tanpa coverage) tidak terpengaruh dan bisa langsung jalan.

---
---

## SUITE 2 — Whitebox Unit Test: tRPC

**Karakteristik:** Sama seperti REST — fully mocked, tidak butuh backend atau DB.

**File test di `apps/backend-trpc/src/__tests__/unit/`:**
`auth.service` · `cart.service` · `category.service` · `checkout.service` · `order.service` · `product.service` · `profile.service` · `admin.service` · `trpc.errors` (khusus tRPC, tidak ada padanannya di REST)

### Jalankan

```bash
cd apps/backend-trpc

pnpm test:unit
```

✅ Semua test `PASS`

### Jalankan dengan Coverage

```bash
cd apps/backend-trpc

pnpm test:coverage
```

✅ Coverage tabel muncul, threshold terpenuhi
✅ Laporan HTML di `apps/backend-trpc/coverage/index.html`

> ✅ Versi `@vitest/coverage-v8` di backend-trpc sudah benar (`^1.6.1`) — tidak perlu diubah.

### Jalankan Keduanya dari Root

```bash
# Dari root monorepo
pnpm --filter backend-rest test:unit
pnpm --filter backend-trpc test:unit
```

---
---

## SUITE 3 — Blackbox Functional Test

**Karakteristik:** Test end-to-end yang benar-benar hit HTTP. Stateful — tiap describe block bergantung pada state block sebelumnya. Membuat data nyata di DB.

**Yang dibuat di DB saat test jalan:**
- 1 user baru: `functest_<timestamp>@vitest.dev` (REST) / `trpc_functest_<timestamp>@vitest.dev` (tRPC)
- 1 address (dihapus oleh section 15 Cleanup dalam test)
- 1 order + order items (**tidak dihapus otomatis**)
- 1 produk admin test (dihapus oleh section 13 dalam test)
- Cart items sementara (dihapus selama test berlangsung)

**User dan order test TIDAK dihapus otomatis** — wajib cleanup manual setelah selesai.

---

### Prasyarat — Backend Harus Jalan

Tidak ada `ecosystem.config.js` di repo ini. Start backend sesuai script yang tersedia:

**Option A — Development mode (paling umum, dengan hot-reload):**

```bash
# Terminal 1
pnpm --filter backend-rest dev

# Terminal 2
pnpm --filter backend-trpc dev
```

**Option B — Kalau sudah pernah build (`dist/` sudah ada):**

```bash
# Terminal 1 (dari root atau dari folder backend-rest)
pnpm --filter backend-rest start

# Terminal 2
pnpm --filter backend-trpc start
```

**Option C — Kalau mau pakai pm2 (tanpa ecosystem file):**

```bash
# Build dulu kalau belum
pnpm --filter backend-rest build
pnpm --filter backend-trpc build

# Start via pm2 dengan command inline
pm2 start "node apps/backend-rest/dist/server.js" --name backend-rest
pm2 start "node apps/backend-trpc/dist/server.js" --name backend-trpc

# Verifikasi
pm2 status
```

**Verifikasi backend jalan (apapun option yang dipakai):**

```bash
curl -f http://localhost:4000/health && echo "REST OK"
curl -f http://localhost:4001/health && echo "tRPC OK"
```

✅ Keduanya print OK
❌ `connect ECONNREFUSED`: backend belum jalan atau build gagal — cek log terminal masing-masing

---

### Prasyarat — .env api-tests

```bash
cat api-tests/.env
```

✅ Isinya:
```
REST_URL=http://localhost:4000/api/v1
TRPC_URL=http://localhost:4001/trpc
ADMIN_EMAIL=admin1@zenit.dev
ADMIN_PASSWORD=Password123!
```

❌ File belum ada: `cp api-tests/.env.example api-tests/.env`
❌ Test di VPS remote: ganti `localhost` ke IP VPS di kedua URL

---

### Prasyarat — DB Sudah Di-seed

```bash
psql $DATABASE_URL -c "
SELECT
  (SELECT COUNT(*) FROM products WHERE is_active=true) AS products,
  (SELECT COUNT(*) FROM users WHERE role='USER')       AS users,
  (SELECT COUNT(*) FROM categories)                    AS categories;
"
```

✅ `products >= 1`, `users >= 1`, `categories >= 1`
❌ Semua 0: seed belum dijalankan — ikuti PROTOCOL.md bagian 0.2

---

### Jalankan Blackbox REST

```bash
cd api-tests

pnpm test:rest
```

✅ 16 describe block semua hijau, 0 failed
✅ Flow: Products → Categories → Register → Login → Me/Refresh → Profile → Address → Cart → Checkout → Orders → Change Password → Logout → Admin (login, dashboard, CRUD produk, update order) → Cleanup → Admin Logout

❌ `Harus ada minimal 1 produk di database`: DB belum di-seed
❌ `Admin accessToken harus ada` di section 11: `admin1@zenit.dev` tidak ada di DB — cek seed
❌ Test gagal di section 07 Checkout dengan `Butuh cartId` atau `Butuh addressId`: section sebelumnya (05 atau 06) gagal duluan — debug dari error di section tersebut, bukan section 07

---

### Jalankan Blackbox tRPC

```bash
cd api-tests

pnpm test:trpc
```

✅ Semua test hijau — flow identik REST tapi via tRPC procedures

---

### Jalankan Keduanya

```bash
cd api-tests

pnpm test:all
```

> `vitest.config.ts` memaksa `sequence: { concurrent: false }` — kedua file test dijalankan **non-paralel** (tidak berbarengan di waktu yang sama). Urutan file antara `rest.test.ts` dan `trpc.test.ts` tidak dijamin secara eksplisit oleh config. Jika urutan penting, jalankan `pnpm test:rest` dan `pnpm test:trpc` secara terpisah.

---

### Cleanup DB Setelah Blackbox

**Wajib dijalankan setelah setiap sesi blackbox** sebelum lanjut ke k6.

```bash
psql $DATABASE_URL << 'EOF'
-- Hapus data test dari blackbox (email domain @vitest.dev)
-- Urutan DELETE penting karena FK constraint

DELETE FROM order_items
WHERE order_id IN (
  SELECT id FROM orders
  WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@vitest.dev')
);

DELETE FROM orders
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@vitest.dev');

DELETE FROM cart_items
WHERE cart_id IN (
  SELECT id FROM carts
  WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@vitest.dev')
);

DELETE FROM carts
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@vitest.dev');

DELETE FROM addresses
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@vitest.dev');

DELETE FROM refresh_tokens
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@vitest.dev');

DELETE FROM users WHERE email LIKE '%@vitest.dev';

-- Verifikasi
SELECT COUNT(*) AS sisa_user_test FROM users WHERE email LIKE '%@vitest.dev';
EOF
```

✅ `sisa_user_test = 0`

---
---

## Urutan yang Disarankan

```
1.  pnpm install                          (dari root, sekali saja)
    ↓
2.  Whitebox REST   → cd apps/backend-rest && pnpm test:unit
    ↓
3.  Whitebox tRPC   → cd apps/backend-trpc && pnpm test:unit
    ↓
    (start backend sebelum lanjut)
    ↓
4.  Blackbox REST   → cd api-tests && pnpm test:rest
    ↓
5.  Blackbox tRPC   → cd api-tests && pnpm test:trpc
    ↓
6.  DB Cleanup      → psql (script di atas)
    ↓
7.  k6 Performance  → ikuti PROTOCOL.md
```

Whitebox (suite 1 & 2) tidak bergantung apapun — bisa dijalankan di luar urutan ini kapan saja.

---
---

## Issues yang Ditemukan

### 🔴 Issue 1 — `@vitest/coverage-v8` version mismatch di backend-rest

**File:** `apps/backend-rest/package.json`

**Problem:** `"@vitest/coverage-v8": "^4.1.5"` tidak kompatibel dengan `"vitest": "^1.6.1"`.
Coverage-v8 versi 4.x memerlukan vitest 3.x — `pnpm test:unit:coverage` akan error.

`pnpm test:unit` (tanpa flag coverage) tidak terpengaruh.

**Fix:**
```json
"@vitest/coverage-v8": "^1.6.1"
```
Lalu `pnpm install` dari root.

---

### 🟡 Issue 2 — `.env.example` backend-trpc berisi kode TypeScript

**File:** `apps/backend-trpc/.env.example`

**Problem:** File ini berisi env vars yang benar di bagian atas, lalu diikuti kode TypeScript dari `src/config/env.ts` yang ter-append (kemungkinan copy-paste tidak sengaja). Kalau file ini di-copy ke `.env`, backend gagal parse karena ada `import { z } from "zod"` di tengah file.

**Fix:** Buka file dan hapus semua yang mulai dari baris `import { z } from "zod";` ke bawah. Yang tersisa hanya:

```env
# NODE_ENV=development
# PORT=4001
# DATABASE_URL="postgresql://zenit:zenit123@localhost:5432/ecommerce_db"
# JWT_SECRET="..."
# JWT_REFRESH_SECRET="..."
# JWT_EXPIRY=1h
# JWT_REFRESH_EXPIRY=7d
# FRONTEND_URL=http://localhost:3000
```

---

### 🟡 Issue 3 — User test `@vitest.dev` tidak dihapus otomatis

**File:** `api-tests/src/rest.test.ts` (line 235), `api-tests/src/trpc.test.ts` (line 263)

**Problem:** Test membuat user `functest_<timestamp>@vitest.dev` tapi tidak ada `afterAll` yang menghapusnya. Hanya address yang dihapus oleh section 15 Cleanup. Setiap run meninggalkan 1 user + beberapa order di DB yang perlu dibersihkan manual.

**Solusi:** Jalankan script cleanup SQL di atas setelah setiap sesi blackbox.

---

### ℹ️ Info — Zip whitebox adalah salinan identik dari yang sudah di backend

Kedua zip (`__tests__WHITEBOX_REST_` dan `__tests__WHITEBOX_TRPC_`) berisi file yang **identik byte-per-byte** (MD5 sama persis) dengan yang sudah ada di `apps/backend-rest/src/__tests__/unit/` dan `apps/backend-trpc/src/__tests__/unit/`.

File unit test aktif yang dipakai saat `pnpm test:unit` adalah yang ada di dalam folder backend masing-masing. Zip ini adalah backup/export — tidak perlu action.

---

## Ringkasan Command Cepat

```bash
# Whitebox
cd apps/backend-rest  && pnpm test:unit
cd apps/backend-trpc  && pnpm test:unit

# Whitebox coverage (fix package.json backend-rest dulu)
cd apps/backend-rest  && pnpm test:unit:coverage
cd apps/backend-trpc  && pnpm test:coverage

# Blackbox (backend harus jalan dulu)
cd api-tests && pnpm test:rest
cd api-tests && pnpm test:trpc
cd api-tests && pnpm test:all

# Cleanup DB setelah blackbox
psql "postgresql://zenit:zenit123@localhost:5432/ecommerce_db" -c "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@vitest.dev'));" -c "DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@vitest.dev');" -c "DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@vitest.dev'));" -c "DELETE FROM carts WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@vitest.dev');" -c "DELETE FROM addresses WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@vitest.dev');" -c "DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@vitest.dev');" -c "DELETE FROM users WHERE email LIKE '%@vitest.dev';" -c "SELECT COUNT(*) AS sisa_user_test FROM users WHERE email LIKE '%@vitest.dev';"
```
