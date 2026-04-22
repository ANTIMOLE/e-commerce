# Testing Strategy — E-Commerce REST + tRPC

Dokumen ini menjelaskan **tiga lapisan testing** yang diimplementasikan
di project ini, cara setup, dan cara menjalankannya.

---

## Peta Testing

```
┌─────────────────────────────────────────────────────────┐
│                   TESTING PYRAMID                       │
│                                                         │
│          /\    BLACK-BOX (k6 Smoke + Load)              │
│         /  \   → smoke_rest.js  smoke_trpc.js           │
│        /    \  → mini_load.js                           │
│       /──────\─────────────────────────────────────     │
│      /        \ GRAY-BOX (Vitest + HTTP)                │
│     /          \ → api-tests/src/rest.test.ts           │
│    /            \ → api-tests/src/trpc.test.ts          │
│   /──────────────\──── SECURITY TEST ─────────          │
│  /                \  → api-tests/src/security.test.ts   │
│ /                  \ → api-tests/src/integration/       │
│/────────────────────\────────────────────────────────   │
│     WHITE-BOX (Vitest + vi.mock)                        │
│     → backend-rest/src/__tests__/unit/                  │
│       auth.service.test.ts                              │
│       auth.middleware.test.ts                           │
│       role.middleware.test.ts                           │
│       validate.middleware.test.ts                       │
│       checkout.service.test.ts                          │
│       product.service.test.ts                           │
└─────────────────────────────────────────────────────────┘
```

---

## 1. White-Box Unit Tests (BARU)

**Apa:** Test setiap fungsi service dan middleware secara isolasi.
Semua dependency (Prisma, bcrypt, JWT) di-**mock** sehingga test
ini **tidak butuh database** atau server berjalan.

**Lokasi file:**

```
backend-rest/
├── vitest.unit.config.ts          ← BARU (salin dari whitebox-tests/)
└── src/
    └── __tests__/
        └── unit/
            ├── setup.ts                         ← BARU
            ├── auth.service.test.ts             ← BARU
            ├── auth.middleware.test.ts          ← BARU
            ├── role.middleware.test.ts          ← BARU
            ├── validate.middleware.test.ts      ← BARU
            ├── checkout.service.test.ts         ← BARU
            └── product.service.test.ts          ← BARU
```

**Setup:**

```bash
# Di folder backend-rest/
# 1. Tambahkan devDependencies ke package.json:
pnpm add -D vitest @vitest/coverage-v8 @vitest/ui

# 2. Salin file-file dari whitebox-tests/vitest.unit.config.ts
#    dan whitebox-tests/src/unit/* ke lokasi yang sesuai

# 3. Jalankan
pnpm test:unit
```

**Script di package.json (tambahkan):**

```json
{
  "scripts": {
    "test:unit":          "vitest run --config vitest.unit.config.ts",
    "test:unit:watch":    "vitest --config vitest.unit.config.ts",
    "test:unit:coverage": "vitest run --config vitest.unit.config.ts --coverage",
    "test:unit:ui":       "vitest --ui --config vitest.unit.config.ts"
  }
}
```

**Apa yang di-test:**

| File Test | Fungsi yang Di-test | Skenario |
|---|---|---|
| `auth.service.test.ts` | register, login, logout, refreshToken, changePassword, getProfile | Happy path + semua error path |
| `auth.middleware.test.ts` | authenticate, optionalAuth | Token valid, expired, manipulated, user dihapus |
| `role.middleware.test.ts` | requireRole, requireAdmin, requireUser, requireOwnerOrAdmin | RBAC + IDOR protection |
| `validate.middleware.test.ts` | validate, validateMultiple | Input valid, invalid, mass assignment strip |
| `checkout.service.test.ts` | calculateCheckoutSummary, confirmCheckout | Kalkulasi harga, stok, payment method |
| `product.service.test.ts` | getAll, getBySlug, getById | Filter, sort, pagination, 404 |

---

## 2. Gray-Box Security Tests (BARU)

**Apa:** Test keamanan HTTP-level dengan pengetahuan parsial tentang
internal sistem (schema DB, kontrak API). Berjalan terhadap server nyata.

**Lokasi file:**

```
api-tests/
├── vitest.security.config.ts      ← BARU
└── src/
    ├── security/
    │   └── security.test.ts       ← BARU
    └── integration/
        └── auth-flow.integration.test.ts   ← BARU
```

**Butuh:** Server REST berjalan di `:4000` dan tRPC di `:4001`

**Setup:**

```bash
# Di folder api-tests/
pnpm add -D axios   # jika belum ada

# Jalankan dengan server aktif
pnpm test:security
pnpm test:integration
```

**Cakupan Security Test (OWASP Top 10):**

| Kode | Kategori | Apa yang Di-test |
|---|---|---|
| A01 | Broken Access Control | Missing auth (401), RBAC (403), IDOR protection |
| A02 | Cryptographic Failures | Token di httpOnly cookie, password hash tidak terekspos |
| A03 | Injection | SQL injection via query params, XSS via input |
| A04 | Insecure Design | Mass assignment (role injection), quantity negatif, payload besar |
| A07 | Auth Failures | JWT manipulation, algorithm:none attack, brute force stability, token revocation |
| Misc | Info Disclosure | Stack trace tidak terekspos, Server header, CORS |

---

## 3. Integration Tests (BARU)

**Apa:** Gray-box test yang memverifikasi bahwa data mengalir dengan
benar **antar service** — bukan hanya bahwa endpoint mengembalikan 200.

**Skenario yang diuji:**

- REST ↔ tRPC data consistency (produk yang sama di kedua API)
- Register → Login → Protected resource flow
- Cart → Checkout → Order creation
- Token Refresh lifecycle (issue → refresh → revoke)

---

## 4. Existing Tests (Sudah Ada)

### Black-Box (k6)

```bash
# Butuh k6 terinstall (https://k6.io/docs/getting-started/installation/)

# Smoke test
k6 run smoke_rest.js
k6 run smoke_trpc.js

# Load test
k6 run -e API=rest mini_load.js
k6 run -e API=trpc mini_load.js
```

### Gray-Box Functional (Vitest + HTTP)

```bash
# Di api-tests/
pnpm test:rest    # functional test REST
pnpm test:trpc    # functional test tRPC
```

---

## Cara Setup Lengkap (dari nol)

```bash
# 1. Clone / siapkan repo

# 2. Install dependencies backend-rest
cd backend-rest
pnpm add -D vitest @vitest/coverage-v8

# 3. Salin file-file unit test (dari whitebox-tests/src/unit/ ke backend-rest/src/__tests__/unit/)
# 4. Salin vitest.unit.config.ts ke backend-rest/
# 5. Tambahkan scripts ke backend-rest/package.json

# 6. Salin vitest.security.config.ts ke api-tests/
# 7. Salin security/security.test.ts ke api-tests/src/security/
# 8. Salin integration/auth-flow.integration.test.ts ke api-tests/src/integration/

# 9. Jalankan unit test (tanpa server)
cd backend-rest
pnpm test:unit

# 10. Start server lalu jalankan semua test lainnya
# (terminal 1) cd backend-rest && pnpm dev
# (terminal 2) cd backend-trpc && pnpm dev
# (terminal 3) cd api-tests
pnpm test:rest
pnpm test:trpc
pnpm test:security
pnpm test:integration
```

---

## CI/CD Pipeline yang Direkomendasikan

```yaml
# .github/workflows/test.yml (contoh)
jobs:
  unit-test:
    name: Unit Tests (no DB needed)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm --filter backend-rest test:unit:coverage

  functional-test:
    name: Functional + Security Tests
    needs: unit-test
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm --filter backend-rest dev &
      - run: pnpm --filter backend-trpc dev &
      - run: sleep 5  # tunggu server ready
      - run: pnpm --filter api-tests test:rest
      - run: pnpm --filter api-tests test:trpc
      - run: pnpm --filter api-tests test:security

  load-test:
    name: Load Tests (k6)
    needs: functional-test
    steps:
      - uses: actions/checkout@v4
      - run: sudo apt-get install -y k6
      - run: k6 run smoke_rest.js
```

---

## Tools Tambahan yang Direkomendasikan

### Vulnerability Scanning (Static)

```bash
# Scan npm dependencies untuk CVE
pnpm audit

# Atau gunakan Snyk (free untuk open source)
npx snyk test

# SAST (Static Application Security Testing)
# Tambahkan ke CI sebagai GitHub Action:
# - github/codeql-action (gratis untuk repo publik)
# - snyk/actions
```

### Dynamic Scanning (DAST)

```bash
# OWASP ZAP — full automated scanner
# Install: https://www.zaproxy.org/download/
# Jalankan baseline scan:
docker run -v $(pwd):/zap/wrk/:rw -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t http://localhost:4000 -r zap-report.html

# Hasil: laporan HTML lengkap dengan daftar kerentanan yang ditemukan
```

### Test Coverage Target

| Layer | Target Coverage |
|---|---|
| Services (unit) | ≥ 80% lines |
| Middlewares (unit) | ≥ 90% lines |
| API endpoints (functional) | 100% happy path + 70% error path |
| Security checks | Semua OWASP A01-A07 yang relevan |

---

## Penjelasan: Mengapa 3 Lapisan?

```
White-box unit:    CEPAT (< 5 detik), tidak butuh infrastruktur
                   → Tangkap bug logika SEDINI MUNGKIN
                   → Bisa jalan di mesin developer tanpa setup apapun

Gray-box security: SEDANG (30-60 detik), butuh server
                   → Tangkap bug keamanan SEBELUM ke production
                   → Test yang tidak mungkin di-cover oleh unit test

Black-box k6:      LAMBAT (2-5 menit), butuh server + data
                   → Verifikasi perilaku dari sudut pandang user
                   → Load testing untuk capacity planning
```

Kombinasi ketiganya memberikan **confidence yang tinggi** bahwa sistem
bekerja benar baik secara fungsional maupun dari sisi keamanan.
