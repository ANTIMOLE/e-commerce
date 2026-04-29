# Protokol Eksperimen — Performance Testing Zenit Marketplace
# REST API vs tRPC Comparison

---

## 0. RUNBOOK — Urutan Command Lengkap

> **Ini adalah panduan eksekusi operasional.**
> Ikuti dari atas ke bawah. Setiap langkah punya command eksak, indikator sukses (✅),
> dan instruksi kalau gagal (❌). Detail metodologi ada di section 1–11.

---

### FASE 0 — Setup Awal (SEKALI SAJA, tidak perlu diulang)

Fase ini hanya dijalankan pertama kali sebelum eksperimen dimulai.
Kalau DB sudah pernah di-seed dan `generated_product_data.json` sudah ada, skip ke Fase 1.

---

**0.1 — Pastikan semua service berjalan**

```bash
pm2 status
```

✅ `backend-rest` (port 4000) dan `backend-trpc` (port 4001) status `online`
❌ Kalau offline: `pm2 start ecosystem.config.js` lalu cek lagi

```bash
curl -f http://localhost:4000/health && echo "REST OK"
curl -f http://localhost:4001/health && echo "tRPC OK"
```

✅ Kedua endpoint return 200 dan print `REST OK` / `tRPC OK`
❌ Kalau salah satu gagal: cek log dengan `pm2 logs backend-rest` atau `pm2 logs backend-trpc`

---

**0.2 — Seed database**

Jalankan seed secara berurutan. `seed_barang_final.ts` harus selesai dulu sebelum `seed_history.ts`.

```bash
# Seed categories + products (50k) + users (10k) + addresses
npx ts-node src/seeds/seed_barang_final.ts
```

✅ Output akhir: `✅ categories seeded`, `✅ products seeded`, `✅ users seeded`, `✅ addresses seeded`
❌ Kalau error `duplicate key`: seed sudah pernah jalan. Skip ke step 0.3.
❌ Kalau error koneksi DB: cek `DATABASE_URL` di `.env`

```bash
# Seed order history + carts (jalankan SETELAH seed_barang_final selesai)
npx ts-node src/seeds/seed_history.ts
```

✅ Output akhir: angka `orders`, `order_items`, `carts`, `cart_items` sesuai target
❌ Error `relation "order" does not exist`: schema belum di-migrate, jalankan `npx prisma migrate deploy` dulu

---

**0.3 — Verifikasi jumlah data di DB**

```bash
psql $DATABASE_URL -c "
SELECT
  (SELECT COUNT(*) FROM categories)  AS categories,
  (SELECT COUNT(*) FROM products WHERE is_active=true) AS products,
  (SELECT COUNT(*) FROM users WHERE role='USER') AS users,
  (SELECT COUNT(*) FROM addresses)   AS addresses,
  (SELECT COUNT(*) FROM orders)      AS orders;
"
```

✅ Nilai yang diharapkan:

| Tabel | Minimum |
|---|---|
| categories | 370 |
| products (aktif) | 45.000 |
| users (USER) | 10.000 |
| addresses | 29.000 |
| orders | 25.000 |

❌ Jauh di bawah target → seed belum selesai atau ada error yang terlewat, ulang seed.

---

**0.4 — Generate product data untuk k6**

Script ini query DB dan tulis `generated_product_data.json` yang dipakai `seed.js`.
Harus dijalankan dari folder `k6-performance/`.

```bash
cd k6-performance/
chmod +x generate_seed_data.sh record_run.sh monitor_resources.sh
./generate_seed_data.sh
```

✅ Output: `product_slugs: 100 entries, product_ids_for_cart: 30 entries` dan file `generated_product_data.json` terbuat
❌ `Gagal koneksi ke DB`: set env `DATABASE_URL` atau `PGHOST/PGUSER/PGPASSWORD/PGDATABASE`
❌ `Terlalu sedikit produk dengan stok > 500`: stock belum di-set, cek seed atau jalankan manual:

```bash
psql $DATABASE_URL -c "UPDATE products SET stock = 999 WHERE stock < 100 LIMIT 5000;"
./generate_seed_data.sh   # jalankan ulang setelah update stock
```

---

**0.5 — Verifikasi k6 bisa baca data**

```bash
# Smoke test REST dulu — ini test paling ringan, hanya verifikasi konektivitas
k6 run --env API=rest run_smoke.js
```

✅ Tidak ada `FAIL` di output, `functional_error_rate` = 0, `checkout_skip_no_address` = 0
❌ `PRODUCT_SLUGS kosong` / `WARNING: generated_product_data.json tidak ditemukan`: ulang step 0.4
❌ `connection refused`: backend tidak jalan, kembali ke step 0.1

```bash
# Smoke test tRPC
k6 run --env API=trpc run_smoke.js
```

✅ Sama seperti di atas untuk tRPC
❌ Kalau hanya tRPC yang gagal tapi REST OK: cek `pm2 logs backend-trpc`

---

**0.6 — Buat folder results**

```bash
mkdir -p k6-performance/results
```

✅ Folder ada (idempotent, aman dijalankan berkali-kali)

---
---

### FASE 1 — Setup Per Sesi (SETIAP KALI mau mulai test session)

Fase ini dijalankan di awal setiap hari/sesi testing, bukan hanya sekali.

---

**1.1 — Verifikasi kedua backend masih jalan**

```bash
pm2 status
curl -sf http://localhost:4000/health && echo "REST OK"
curl -sf http://localhost:4001/health && echo "tRPC OK"
```

✅ Keduanya online
❌ `pm2 restart backend-rest backend-trpc` lalu tunggu 10 detik, cek lagi

---

**1.2 — Reset state DB (wajib sebelum sesi pertama)**

```bash
psql $DATABASE_URL << 'EOF'
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM cart_items;
UPDATE carts SET status = 'active';
UPDATE products SET stock = 999 WHERE stock < 999;
DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@k6test.dev');
DELETE FROM carts       WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@k6test.dev');
DELETE FROM users WHERE email LIKE '%@k6test.dev';
DELETE FROM refresh_tokens WHERE created_at < NOW() - INTERVAL '10 minutes';
EOF
```

✅ Perintah selesai tanpa error. Verifikasi:

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM orders;"          # harus 0
psql $DATABASE_URL -c "SELECT COUNT(*) FROM order_items;"     # harus 0
psql $DATABASE_URL -c "SELECT MIN(stock) FROM products;"      # harus >= 999
```

---

**1.3 — Restart service setelah reset (flush memory dan connection pool)**

```bash
pm2 restart backend-rest backend-trpc
sleep 10
curl -sf http://localhost:4000/health && echo "REST OK"
curl -sf http://localhost:4001/health && echo "tRPC OK"
```

✅ Keduanya online setelah restart

---

**1.4 — Smoke test ulang untuk konfirmasi sesi siap**

```bash
k6 run --env API=rest  run_smoke.js 2>&1 | tail -20
k6 run --env API=trpc  run_smoke.js 2>&1 | tail -20
```

✅ Tidak ada `FAIL`, `functional_error_rate = 0`, `checkout_skip_no_address = 0`
❌ Kalau masih ada error setelah restart: jangan lanjut ke Fase 2, debug dulu

---
---

### FASE 2 — Eksekusi Per Skenario (DIULANG untuk setiap skenario × 3 run)

Fase ini adalah inti eksperimen. Untuk setiap skenario (S-01 s/d S-05) dan setiap test type
(load, stress, spike, soak), jalankan 3 pasangan run (kecuali soak: 1 pasang).

Template di bawah ini menggunakan **S-01 Browse / load** sebagai contoh.
Ganti `SCENARIO=s01_browse`, `SCRIPT=s01_browse.js`, `S_CODE=s01`, `TYPE=load`
sesuai skenario yang sedang dijalankan.

---

**Variabel yang disesuaikan tiap skenario:**

```bash
# Edit sesuai skenario yang sedang dijalankan:
SCENARIO="s01_browse"    # s01_browse | s02_shopping | s03_checkout | s04_auth | s05_admin
SCRIPT="s01_browse.js"   # s01_browse.js | s02_shopping.js | ...
S_CODE="s01"             # s01 | s02 | s03 | s04 | s05  (untuk nama file resource monitor)
TYPE="load"              # load | stress | spike | soak
RUN_NUMBER=1             # 1, 2, atau 3 — increment setiap pasang
```

---

**2.1 — Reset DB sebelum setiap pasang run**

Jalankan ini SEBELUM setiap pasang REST–tRPC (total 3x per skenario per type).

```bash
psql $DATABASE_URL << 'EOF'
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM cart_items;
UPDATE carts SET status = 'active';
UPDATE products SET stock = 999 WHERE stock < 999;
DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@k6test.dev');
DELETE FROM carts       WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@k6test.dev');
DELETE FROM users WHERE email LIKE '%@k6test.dev';
DELETE FROM refresh_tokens WHERE created_at < NOW() - INTERVAL '10 minutes';
EOF

pm2 restart backend-rest backend-trpc
sleep 10
```

✅ Reset selesai, service kembali online

---

**2.2 — Run REST (Terminal terpisah: monitor + k6)**

Buka **2 terminal**. Jalankan monitor di Terminal A, k6 di Terminal B.

**Terminal A — jalankan monitor resource:**

```bash
cd k6-performance/

# Stop backend tRPC dulu supaya resource measurement bersih
pm2 stop backend-trpc

# Mulai monitor (jalan di background)
./monitor_resources.sh rest $TYPE $S_CODE 5 &
MONITOR_PID=$!
echo "Monitor PID: $MONITOR_PID"
```

✅ Monitor print `=== Resource Monitor ===` dan `✓ Target PID: XXXX (port 4000)`
❌ Print `⚠️ KONFOUND TERDETEKSI`: backend-trpc masih jalan. Cek `pm2 stop backend-trpc` sudah berhasil.
❌ Kalau terpaksa tidak bisa stop (alasan teknis), gunakan:

```bash
ALLOW_CONFOUND=1 ./monitor_resources.sh rest $TYPE $S_CODE 5 &
MONITOR_PID=$!
# Catat ini — akan ada suffix _confound di nama file CSV
# Wajib dicatat ke manifest dengan --note
```

**Terminal B — jalankan k6 REST:**

```bash
cd k6-performance/

# Catat timestamp sebelum run untuk identifikasi file output
REST_TS=$(date +%s)
echo "REST timestamp: $REST_TS"

k6 run \
  --env API=rest \
  --env TEST_TYPE=$TYPE \
  --out json=results/${SCENARIO}_rest_${TYPE}_${REST_TS}.json \
  $SCRIPT
```

✅ k6 selesai, tidak ada `FAIL`, `functional_error_rate < 1%`
✅ File `results/${SCENARIO}_rest_${TYPE}_${REST_TS}.json` ada

Setelah k6 selesai, kembali ke Terminal A:

```bash
# Stop monitor
kill $MONITOR_PID

# Start kembali backend-trpc
pm2 start backend-trpc
sleep 5
```

✅ File `results/resource_rest_${TYPE}_${S_CODE}_*.csv` ada

---

**2.3 — Reset DB di antara REST dan tRPC (dalam satu pasang run)**

```bash
psql $DATABASE_URL << 'EOF'
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM cart_items;
UPDATE carts SET status = 'active';
UPDATE products SET stock = 999 WHERE stock < 999;
DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@k6test.dev');
DELETE FROM carts       WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@k6test.dev');
DELETE FROM users WHERE email LIKE '%@k6test.dev';
DELETE FROM refresh_tokens WHERE created_at < NOW() - INTERVAL '10 minutes';
EOF

pm2 restart backend-rest backend-trpc
sleep 10
```

---

**2.4 — Run tRPC (Terminal terpisah: monitor + k6)**

**Terminal A — monitor resource untuk tRPC:**

```bash
cd k6-performance/

# Stop backend REST dulu
pm2 stop backend-rest

./monitor_resources.sh trpc $TYPE $S_CODE 5 &
MONITOR_PID=$!
echo "Monitor PID: $MONITOR_PID"
```

✅ Monitor print `✓ Target PID: XXXX (port 4001)`

**Terminal B — jalankan k6 tRPC:**

```bash
cd k6-performance/

TRPC_TS=$(date +%s)
echo "tRPC timestamp: $TRPC_TS"

k6 run \
  --env API=trpc \
  --env TEST_TYPE=$TYPE \
  --out json=results/${SCENARIO}_trpc_${TYPE}_${TRPC_TS}.json \
  $SCRIPT
```

✅ k6 selesai, tidak ada `FAIL`, `functional_error_rate < 1%`
✅ File `results/${SCENARIO}_trpc_${TYPE}_${TRPC_TS}.json` ada

Setelah k6 selesai:

```bash
kill $MONITOR_PID
pm2 start backend-rest
sleep 5
```

---

**2.5 — Catat pasangan run ke manifest**

Ini langkah yang sering dilupa — jangan skip. Tanpa ini analisis paired tidak bisa jalan.

```bash
cd k6-performance/

./record_run.sh \
  --run $RUN_NUMBER \
  --scenario $SCENARIO \
  --test-type $TYPE \
  --rest   ${SCENARIO}_rest_${TYPE}_${REST_TS}.json \
  --trpc   ${SCENARIO}_trpc_${TYPE}_${TRPC_TS}.json \
  --rest-resource resource_rest_${TYPE}_${S_CODE}_${REST_TS}.csv \
  --trpc-resource resource_trpc_${TYPE}_${S_CODE}_${TRPC_TS}.csv
```

> Kalau tadi ada konfound (ALLOW_CONFOUND=1), tambahkan:
> `--note "konfound: backend-trpc masih jalan saat REST test run $RUN_NUMBER"`

✅ Output: `✅ Recorded: run=1 | s01_browse/load`
✅ `results/run_manifest.json` terupdate

---

**2.6 — Cooldown 60 detik, lalu ulang untuk run berikutnya**

```bash
echo "Cooldown 60s sebelum run berikutnya..."
sleep 60
```

Setelah cooldown, kembali ke **step 2.1** dengan `RUN_NUMBER` di-increment.

Untuk run ke-2, **balik urutan**:
- Run 1: REST dulu → tRPC
- Run 2: **tRPC dulu → REST** (kurangi bias cache)
- Run 3: REST dulu → tRPC

Untuk run ke-2 dan seterusnya, di step 2.2 dan 2.4 cukup balik urutan mana yang dijalankan duluan
(jalankan step 2.4 template dulu, baru 2.2).

---

**2.7 — Verifikasi setelah 3 run selesai**

```bash
# Cek manifest sudah ada 3 entry untuk skenario ini
python3 -c "
import json
with open('results/run_manifest.json') as f: m = json.load(f)
entries = [e for e in m if e['scenario']=='$SCENARIO' and e['test_type']=='$TYPE']
print(f'Entries untuk $SCENARIO/$TYPE: {len(entries)}')
for e in entries: print(f'  Run {e[\"run\"]}: {e[\"rest\"]} vs {e[\"trpc\"]}')
"
```

✅ `Entries untuk s01_browse/load: 3` (atau 1 untuk soak)
❌ Kurang dari 3: ada run yang belum di-record ke manifest, jalankan `record_run.sh` untuk yang kurang

```bash
# Cek semua file JSON hasil ada di disk
ls -lh results/${SCENARIO}_rest_${TYPE}_*.json
ls -lh results/${SCENARIO}_trpc_${TYPE}_*.json
ls -lh results/resource_rest_${TYPE}_${S_CODE}_*.csv
ls -lh results/resource_trpc_${TYPE}_${S_CODE}_*.csv
```

✅ Masing-masing ada 3 file (1 untuk soak)

---
---

### FASE 3 — Analisis (SETELAH semua run selesai)

---

**3.1 — Install Python dependencies (sekali saja)**

```bash
pip install pandas scipy
```

✅ Tidak ada error install

---

**3.2 — Verifikasi manifest lengkap**

```bash
python3 -c "
import json
from collections import Counter
with open('results/run_manifest.json') as f: m = json.load(f)
print(f'Total entries: {len(m)}')
counter = Counter((e['scenario'], e['test_type']) for e in m)
for (sc, tt), n in sorted(counter.items()):
    flag = '✅' if n >= 3 else ('⚠️ 1x (soak OK)' if n == 1 else f'❌ hanya {n}x')
    print(f'  {flag}  {sc}/{tt}: {n} run')
"
```

✅ Semua skenario non-soak punya 3 run, soak punya 1 run
❌ Ada yang kurang: cek apakah run sudah dijalankan dan `record_run.sh` sudah dipanggil

---

**3.3 — Jalankan analisis statistik**

Ganti `SCENARIO` dan `TYPE` sesuai yang mau dianalisis:

```python
# Simpan sebagai analyze.py, jalankan dari folder k6-performance/
# python3 analyze.py

import json, os
import pandas as pd
from scipy import stats

RESULTS_DIR = "results"
SCENARIO    = "s01_browse"   # ganti sesuai kebutuhan
TEST_TYPE   = "load"          # ganti sesuai kebutuhan

with open(os.path.join(RESULTS_DIR, "run_manifest.json")) as f:
    manifest = json.load(f)

def extract_p95(filepath):
    with open(filepath) as f:
        data = json.load(f)
    return data["metrics"]["http_req_duration"]["values"]["p(95)"]

entries = sorted(
    [m for m in manifest if m["scenario"] == SCENARIO
     and m["test_type"] == TEST_TYPE and m.get("note", "") == ""],
    key=lambda m: m["run"]
)

if len(entries) == 0:
    raise RuntimeError(f"Tidak ada entry clean untuk {SCENARIO}/{TEST_TYPE}")

rest_p95 = [extract_p95(os.path.join(RESULTS_DIR, m["rest"]))  for m in entries]
trpc_p95 = [extract_p95(os.path.join(RESULTS_DIR, m["trpc"])) for m in entries]

t_paired, p_paired = stats.ttest_rel(rest_p95, trpc_p95)
t_ind,    p_ind    = stats.ttest_ind(rest_p95, trpc_p95)
pooled_std = ((pd.Series(rest_p95).std()**2 + pd.Series(trpc_p95).std()**2) / 2) ** 0.5
cohens_d   = (pd.Series(rest_p95).mean() - pd.Series(trpc_p95).mean()) / pooled_std

print(f"\n{'='*50}")
print(f"Analisis: {SCENARIO} / {TEST_TYPE}")
print(f"{'='*50}")
print(f"Paired runs    : {len(entries)} pasang (run {[m['run'] for m in entries]})")
print(f"REST  P95 avg  : {pd.Series(rest_p95).mean():.1f}ms  {rest_p95}")
print(f"tRPC  P95 avg  : {pd.Series(trpc_p95).mean():.1f}ms  {trpc_p95}")
print(f"Paired t-test  : t={t_paired:.3f}, p={p_paired:.4f}")
print(f"Ind.   t-test  : t={t_ind:.3f},   p={p_ind:.4f}")
print(f"Cohen's d      : {cohens_d:.3f}")
alpha = 0.05
sig = "SIGNIFIKAN ✅" if p_paired < alpha else "tidak signifikan"
print(f"\nKesimpulan: perbedaan {sig} pada α={alpha} (paired, primary)")
```

```bash
python3 analyze.py
```

✅ Output print hasil statistik tanpa error
❌ `FileNotFoundError`: file JSON hasil k6 tidak ada di `results/` — cek nama file di manifest sudah cocok

---

**3.4 — Cek file CSV resource tersedia**

```bash
# Contoh verifikasi untuk S-01 load
ls -lh results/resource_rest_load_s01_*.csv
ls -lh results/resource_trpc_load_s01_*.csv

# Preview isi CSV (pastikan nama kolom sudah benar)
head -2 results/resource_rest_load_s01_*.csv | head -1
```

✅ Header CSV: `timestamp,cpu_total_pct,mem_used_mb,mem_total_mb,pg_active,pg_idle,pg_cache_hit_ratio,pg_tps_delta,target_pid_cpu_pct,target_pid_mem_mb`
❌ Header berbeda: monitor lama yang dipakai, update ke `monitor_resources.sh` versi terbaru

---

### Urutan Skenario Lengkap (referensi cepat)

```
# Untuk setiap baris di bawah: jalankan Fase 2 (step 2.1–2.7) dengan variabel berikut
# Soak cukup 1 pasang run (RUN_NUMBER=1 saja), yang lain 3 pasang.

SCENARIO=s01_browse   SCRIPT=s01_browse.js   S_CODE=s01  TYPE=load    → 3 run
SCENARIO=s01_browse   SCRIPT=s01_browse.js   S_CODE=s01  TYPE=stress  → 3 run
SCENARIO=s01_browse   SCRIPT=s01_browse.js   S_CODE=s01  TYPE=spike   → 3 run
SCENARIO=s01_browse   SCRIPT=s01_browse.js   S_CODE=s01  TYPE=soak    → 1 run

SCENARIO=s02_shopping SCRIPT=s02_shopping.js S_CODE=s02  TYPE=load    → 3 run
SCENARIO=s02_shopping SCRIPT=s02_shopping.js S_CODE=s02  TYPE=stress  → 3 run
SCENARIO=s02_shopping SCRIPT=s02_shopping.js S_CODE=s02  TYPE=spike   → 3 run
SCENARIO=s02_shopping SCRIPT=s02_shopping.js S_CODE=s02  TYPE=soak    → 1 run

SCENARIO=s03_checkout SCRIPT=s03_checkout.js S_CODE=s03  TYPE=load    → 3 run
SCENARIO=s03_checkout SCRIPT=s03_checkout.js S_CODE=s03  TYPE=stress  → 3 run
SCENARIO=s03_checkout SCRIPT=s03_checkout.js S_CODE=s03  TYPE=spike   → 3 run
SCENARIO=s03_checkout SCRIPT=s03_checkout.js S_CODE=s03  TYPE=soak    → 1 run

SCENARIO=s04_auth     SCRIPT=s04_auth.js     S_CODE=s04  TYPE=load    → 3 run
SCENARIO=s04_auth     SCRIPT=s04_auth.js     S_CODE=s04  TYPE=stress  → 3 run
SCENARIO=s04_auth     SCRIPT=s04_auth.js     S_CODE=s04  TYPE=spike   → 3 run
# s04 tidak ada soak

SCENARIO=s05_admin    SCRIPT=s05_admin.js    S_CODE=s05  TYPE=load    → 3 run
SCENARIO=s05_admin    SCRIPT=s05_admin.js    S_CODE=s05  TYPE=stress  → 3 run
# s05 tidak ada spike dan soak
```

---

## 1. Tujuan

Mengukur dan membandingkan performa REST API (Express) vs tRPC (Express + tRPC adapter)
pada aplikasi e-commerce Zenit Marketplace dalam kondisi beban yang identik.

---

## 2. Variabel Eksperimen

| Variabel | Nilai |
|---|---|
| Variabel bebas | Implementasi API layer (REST vs tRPC) |
| Variabel terikat | Latency (avg, P95, P99), throughput (req/s), error rate |
| Variabel kontrol | Hardware VPS, database, dataset, user pool, test stages, seed data |

---

## 3. Kondisi Lingkungan (wajib identik untuk REST dan tRPC)

- **VPS**: spec yang sama (CPU, RAM, disk)
- **Database**: PostgreSQL 15 instance yang sama, data yang sama
- **Dataset**: `~10.000 produk` dari scrape Tokopedia (seed_2.ts)
- **User pool**: `500 user` unik dari `users_seed.csv`
- **Address**: tiap user memiliki minimal 1 address (dari `addresses_seed.csv`)
- **Stok minimal**: semua produk di `PRODUCT_IDS_FOR_CART` memiliki stok > 500
- **Network**: REST port 4000, tRPC port 4001, keduanya di-run dengan `pm2`

---

## 4. Prosedur Reset Antara Run

**WAJIB dijalankan sebelum setiap test run (antara REST dan tRPC, atau antara run ulangan):**

```bash
# Reset state transaksi — pertahankan users, products, categories, addresses
psql $DATABASE_URL << 'EOF'
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM cart_items;
UPDATE carts SET status = 'active';

-- FIX: reset stock ke 999 untuk semua produk yang dipakai cart test
-- Threshold < 100 tidak cukup — PRODUCT_IDS_FOR_CART disyaratkan stock > 500
-- Pakai threshold 999 supaya fairness antar-run REST vs tRPC terjaga
UPDATE products SET stock = 999 WHERE stock < 999;

-- FIX: hapus user test yang dibuat s04 register flow (email domain @k6test.dev)
-- Kalau tidak dihapus, tabel user terus membesar dan mempengaruhi auth benchmark
DELETE FROM refresh_tokens WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@k6test.dev'
);
DELETE FROM carts WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@k6test.dev'
);
DELETE FROM users WHERE email LIKE '%@k6test.dev';

-- Bersihkan semua refresh token lama (bukan hanya > 1 jam)
-- Token menumpuk antar run dan menambah ukuran tabel yang diquery saat login
DELETE FROM refresh_tokens WHERE created_at < NOW() - INTERVAL '10 minutes';
EOF

# Restart service (flush memory, connection pool bersih)
pm2 restart backend-rest backend-trpc

# Tunggu service siap
sleep 10
curl -f http://localhost:4000/health || exit 1
curl -f http://localhost:4001/health || exit 1

echo "Reset complete. Ready for next run."
```

---

## 5. Urutan Eksekusi

### 5.1 Pre-flight checklist (SEBELUM tiap sesi test)

- [ ] Jalankan smoke test REST: `k6 run --env API=rest run_smoke.js`
- [ ] Jalankan smoke test tRPC: `k6 run --env API=trpc run_smoke.js`
- [ ] Verifikasi tidak ada error di smoke test
- [ ] Verifikasi `checkout_skip_no_address` = 0 dari smoke test
- [ ] DB state di-reset (lihat bagian 4)
- [ ] Resource monitor berjalan (monitor_resources.sh)

### 5.2 Urutan run per skenario

Setiap skenario dijalankan **3 kali** untuk stabilitas statistik.
Antara run: reset DB, restart service, tunggu 60 detik cooldown.

```
Warm-up: Smoke test
Run 1:   REST → reset → tRPC → reset → cooldown 60s
Run 2:   tRPC → reset → REST → reset → cooldown 60s  (order dibalik)
Run 3:   REST → reset → tRPC → reset
```

Membalik urutan REST/tRPC di run 2 mengurangi bias akibat DB warm-up cache.

### 5.3 Urutan skenario

```
S-01 Browse (load)   REST × 3 run  →  tRPC × 3 run
S-01 Browse (stress) REST × 3 run  →  tRPC × 3 run
S-01 Browse (spike)  REST × 3 run  →  tRPC × 3 run
S-01 Browse (soak)   REST × 1 run  →  tRPC × 1 run  (4-8 jam, cukup 1x)

S-02 Shopping (load, stress, spike, soak)  — sama polanya
S-03 Checkout (load, stress, spike, soak)
S-04 Auth (load, stress, spike)             — tidak ada soak
S-05 Admin (load, stress)                   — tidak ada spike/soak
```

---

## 6. Pengumpulan Data

### 6.1 k6 metrics (otomatis ke results/)

Setiap run menyimpan JSON ke `results/`:
```
s01_browse_rest_load_<timestamp>.json
s01_browse_trpc_load_<timestamp>.json
```

### 6.2 Resource metrics (monitor_resources.sh)

Jalankan **bersamaan** dengan k6, terpisah untuk REST dan tRPC:

```bash
# Terminal 1 (monitoring) — pastikan backend lain sudah di-stop dulu
pm2 stop backend-trpc   # saat test REST
./monitor_resources.sh rest load s01 5 &
MONITOR_PID=$!

# Jika karena alasan tertentu backend lain tidak bisa di-stop,
# gunakan flag ALLOW_CONFOUND=1 (hasil akan di-suffix _confound.csv):
# ALLOW_CONFOUND=1 ./monitor_resources.sh rest load s01 5 &
# Catat konfound ini sebagai keterbatasan di laporan.

# Terminal 2 (k6)
k6 run --env API=rest --env TEST_TYPE=load s01_browse.js

# Setelah k6 selesai, stop monitor
kill $MONITOR_PID
```

Output: `results/resource_rest_load_s01_<timestamp>.csv`

#### Mencatat Pasangan Run ke Manifest

Setelah setiap pasangan REST–tRPC selesai, jalankan `record_run.sh` untuk mencatat ke manifest:

```bash
# Contoh: setelah run ke-1 S-01 load
./record_run.sh \
  --run 1 \
  --scenario s01_browse \
  --test-type load \
  --rest   s01_browse_rest_load_1714300000.json \
  --trpc   s01_browse_trpc_load_1714300060.json \
  --rest-resource resource_rest_load_s01_1714300000.csv \
  --trpc-resource resource_trpc_load_s01_1714300060.csv

# Jika run ini ada konfound (ALLOW_CONFOUND=1 digunakan):
./record_run.sh ... --note "konfound: backend-trpc masih jalan saat REST test"
```

`record_run.sh` tersedia di repo (`k6-performance/record_run.sh`).
Manifest disimpan di `results/run_manifest.json` dan di-append tiap run.

---

## 7. Metrik yang Dikumpulkan

### 7.1 Performance metrics (dari k6 JSON)

| Metrik | Field k6 | Keterangan |
|---|---|---|
| Latency P50 | `http_req_duration.values.med` | Median |
| Latency P95 | `http_req_duration.values.p(95)` | Target utama |
| Latency P99 | `http_req_duration.values.p(99)` | Worst case |
| Latency Avg | `http_req_duration.values.avg` | Informasi tambahan |
| Throughput | `http_reqs.values.rate` | Request per detik |
| Functional Error Rate | `functional_error_rate.values.rate` | 4xx/5xx saja |
| SLA Breach Rate | `sla_breach_rate.values.rate` | 2xx tapi lambat |
| Total Requests | `http_reqs.values.count` | Untuk normalisasi |

**PENTING — Jangan campur saat analisis:**
- `functional_error_rate` → masalah logic/server error
- `sla_breach_rate` → masalah performa/latency
- Keduanya berbeda dan harus dilaporkan terpisah di bab hasil

### 7.2 Resource metrics (dari monitor_resources.sh CSV)

> **Urutan kolom CSV persis seperti di bawah** — sesuai header yang di-write `monitor_resources.sh`:
> `timestamp,cpu_total_pct,mem_used_mb,mem_total_mb,pg_active,pg_idle,pg_cache_hit_ratio,pg_tps_delta,target_pid_cpu_pct,target_pid_mem_mb`

| Kolom | Keterangan |
|---|---|
| `timestamp` | Waktu pengambilan sampel (ISO 8601) |
| `cpu_total_pct` | CPU utilization total server — delta `/proc/stat`, mencakup semua core |
| `mem_used_mb` | RAM yang digunakan (MB, dari `free -m`) |
| `mem_total_mb` | RAM total server (MB) |
| `pg_active` | Koneksi DB aktif saat ini |
| `pg_idle` | Koneksi DB idle saat ini |
| `pg_cache_hit_ratio` | Rasio cache hit PostgreSQL (%) |
| `pg_tps_delta` | Transaksi DB per detik (delta antar interval) |
| `target_pid_cpu_pct` | CPU % proses backend yang sedang ditest — delta jiffy `/proc/<pid>/stat`, bukan cumulative `ps %cpu` |
| `target_pid_mem_mb` | RSS memory proses backend yang sedang ditest (MB, dari `/proc/<pid>/status VmRSS`) |

> **Catatan desain**: kolom `rest_pid_cpu` dan `trpc_pid_cpu` dari versi lama dihapus.
> Monitor sekarang hanya mengukur **satu** backend (yang sedang ditest) via `target_pid_*`.
> Backend lain wajib di-stop sebelum test (`pm2 stop`) — lihat section 6.2.
> Jika terpaksa keduanya jalan, gunakan `ALLOW_CONFOUND=1` dan catat sebagai keterbatasan.

---

## 8. Analisis Statistik

### 8.1 Tools
- Python + pandas + scipy untuk analisis
- Minimal 3 run per skenario untuk hitung rata-rata dan variansi

### 8.2 Desain Pengujian — Berpasangan (Paired Design)

Urutan run di section 5.2 membentuk **paired design**:
- Run 1: REST → tRPC
- Run 2: tRPC → REST (dibalik untuk kontrol cache warm-up)
- Run 3: REST → tRPC

Setiap pasangan REST–tRPC dijalankan dalam kondisi yang sangat mirip (DB state, cache, service state). Secara metodologi, **paired t-test (`ttest_rel`)** lebih tepat untuk desain ini dibanding independent t-test (`ttest_ind`), karena:
- Mengurangi variance dari faktor lingkungan (cache, DB state)
- Lebih powerful untuk n kecil (n=3)
- Sesuai dengan cara data dikumpulkan (pasangan per kondisi)

Jika menggunakan `ttest_ind`, sebutkan di bab metodologi bahwa ini simplifikasi dan laporkan hasilnya lebih konservatif.

### 8.3 Prosedur Analisis

#### 8.3.1 Run Manifest — Dasar Pairing

> **PENTING**: Analisis paired mengandalkan pairing yang **eksplisit**, bukan urutan sort file.
> Setiap pasangan REST–tRPC di-record ke `results/run_manifest.json` saat eksekusi.
> Gunakan `record_run.sh` (lihat section 6.2) untuk mengisi manifest otomatis.

Format `results/run_manifest.json`:
```json
[
  {
    "run": 1,
    "scenario": "s01_browse",
    "test_type": "load",
    "rest": "s01_browse_rest_load_1714300000.json",
    "trpc": "s01_browse_trpc_load_1714300060.json",
    "rest_resource": "resource_rest_load_s01_1714300000.csv",
    "trpc_resource": "resource_trpc_load_s01_1714300060.csv",
    "note": ""
  }
]
```

Untuk menambah entry manifest setelah tiap run, jalankan `record_run.sh`
(tersedia di repo, lihat section 6.2). Jangan edit manifest manual kecuali untuk
mengisi kolom `note` (contoh: `"konfound terdeteksi"` kalau `ALLOW_CONFOUND=1`).

#### 8.3.2 Skrip Analisis

```python
import json, os
import pandas as pd
from scipy import stats

RESULTS_DIR = "results"
MANIFEST    = os.path.join(RESULTS_DIR, "run_manifest.json")

# ── Load manifest ────────────────────────────────────────────────
with open(MANIFEST) as f:
    manifest = json.load(f)

def extract_p95(filepath: str) -> float:
    with open(filepath) as f:
        data = json.load(f)
    return data["metrics"]["http_req_duration"]["values"]["p(95)"]

def filter_manifest(scenario: str, test_type: str):
    """Kembalikan entries manifest yang sesuai, sudah terurut by run number."""
    entries = [
        m for m in manifest
        if m["scenario"] == scenario and m["test_type"] == test_type
        and m.get("note", "") == ""          # exclude run dengan catatan konfound, dsb
    ]
    entries.sort(key=lambda m: m["run"])     # urut by run number, BUKAN by filename
    return entries

# ── Analisis S-01 load sebagai contoh ───────────────────────────
entries = filter_manifest("s01_browse", "load")

if len(entries) == 0:
    raise RuntimeError("Tidak ada entry manifest untuk s01_browse load. Cek run_manifest.json.")

rest_p95 = [extract_p95(os.path.join(RESULTS_DIR, m["rest"]))  for m in entries]
trpc_p95 = [extract_p95(os.path.join(RESULTS_DIR, m["trpc"])) for m in entries]

assert len(rest_p95) == len(trpc_p95), \
    f"Jumlah run tidak match: REST={len(rest_p95)}, tRPC={len(trpc_p95)}"

# ── Paired t-test (PRIMER — sesuai desain berpasangan) ──────────
# rest_p95[i] dipasangkan dengan trpc_p95[i] berdasarkan run number
# dari manifest — bukan posisi sort file yang bisa misalign
t_stat_paired, p_value_paired = stats.ttest_rel(rest_p95, trpc_p95)

# ── Independent t-test (SEKUNDER — robustness check) ────────────
t_stat_ind, p_value_ind = stats.ttest_ind(rest_p95, trpc_p95)

# ── Cohen's d (effect size) ──────────────────────────────────────
pooled_std = ((pd.Series(rest_p95).std()**2 + pd.Series(trpc_p95).std()**2) / 2) ** 0.5
cohens_d   = (pd.Series(rest_p95).mean() - pd.Series(trpc_p95).mean()) / pooled_std

print(f"Paired runs   : {len(entries)} pasang (run {[m['run'] for m in entries]})")
print(f"REST  P95 avg : {pd.Series(rest_p95).mean():.1f}ms  (runs: {rest_p95})")
print(f"tRPC  P95 avg : {pd.Series(trpc_p95).mean():.1f}ms  (runs: {trpc_p95})")
print(f"Paired t-test    : t={t_stat_paired:.3f}, p={p_value_paired:.4f}")
print(f"Independent t-test: t={t_stat_ind:.3f},   p={p_value_ind:.4f}")
print(f"Cohen's d        : {cohens_d:.3f}")
print()

alpha = 0.05
sig = "SIGNIFIKAN" if p_value_paired < alpha else "tidak signifikan"
print(f"Perbedaan {sig} pada α={alpha} (paired, primary test)")
```

> **Kenapa manifest dan bukan `sorted(glob(...))`?**
> `sorted(glob(...))` fragile karena: (1) file sisa dari run parsial/gagal ikut ke glob,
> (2) kalau satu run REST re-run tanpa re-run tRPC, urutan sort tidak lagi mencerminkan pasangan,
> (3) tidak ada cara verify mana yang benar-benar satu pasang tanpa membuka file satu per satu.
> Manifest memberikan pairing eksplisit yang bisa di-inspect dan di-audit.

### 8.4 Interpretasi Cohen's d

| Nilai | Interpretasi |
|---|---|
| < 0.2 | Efek sangat kecil (perbedaan tidak signifikan praktis) |
| 0.2 – 0.5 | Efek kecil |
| 0.5 – 0.8 | Efek sedang |
| > 0.8 | Efek besar |

### 8.5 Keterbatasan Statistik

- **n=3** — inferensi masih rapuh. Hasil yang tidak signifikan (p > 0.05) tidak bisa diartikan "tidak ada perbedaan", hanya "tidak cukup bukti dengan n kecil".
- **Soak 1x** — tidak bisa diuji secara inferensial, hanya deskriptif.
- Disarankan laporkan **confidence interval** di samping p-value untuk transparansi estimasi.

---

## 9. Seed Data Requirements

| Data | Jumlah | Query |
|---|---|---|
| Users (USER role) | 500 | `SELECT email FROM users WHERE role='USER' ORDER BY created_at LIMIT 500;` |
| Admin users | 5 (`admin1@zenit.dev` – `admin5@zenit.dev`) | Sudah di auth.js |
| Products (active, stock > 100) | ≥ 100 | `SELECT slug FROM products WHERE is_active=true AND stock>100 ORDER BY random() LIMIT 100;` |
| Products for cart (stock > 500) | ≥ 30 | `SELECT id FROM products WHERE is_active=true AND stock>500 ORDER BY random() LIMIT 30;` |
| Categories | Semua | `SELECT id FROM categories ORDER BY name;` |
| Addresses | 1 per user | Di-seed via addresses_seed.csv di seed_2.ts |

---

## 10. Checklist Validitas Eksperimen

Sebelum mengklaim hasil sebagai "valid":

- [ ] Smoke test lewat tanpa error untuk REST dan tRPC
- [ ] `checkout_skip_no_address` = 0 (semua user punya address)
- [ ] `admin_product_create_skip` = 0 (CATEGORY_IDS terisi)
- [ ] `admin_order_update_skip` = 0, **ATAU** jika > 0, dokumentasikan bahwa S-05 dijalankan sebagai dashboard/list-heavy scenario tanpa subflow order-status update — catat di bab hasil berapa % iterasi yang benar-benar mengeksekusi mutation order. Kalau dibiarkan > 0 tanpa catatan, klaim "admin flow tested" menjadi tidak akurat.
- [ ] `functional_error_rate` < 1% untuk semua skenario
- [ ] Tiap skenario dirun minimal 3x
- [ ] DB di-reset antara REST dan tRPC run
- [ ] Service di-restart sebelum setiap run
- [ ] Resource monitor jalan bersamaan dengan k6
- [ ] Hasil resource CSV tersedia untuk semua run

---

## 11. Batasan yang Perlu Disebutkan di Bab Metodologi

1. **tRPC dengan `AUTH_DB_VALIDATION=false`** (default) tidak melakukan DB lookup per request, berbeda dari REST yang selalu lookup. Ini kondisi default tRPC yang lebih "natural". Kondisi equalized (`AUTH_DB_VALIDATION=true`) dapat diuji terpisah untuk perbandingan apple-to-apple.

2. **k6 tidak mengukur resource server secara native** — resource metrics dikumpulkan via script terpisah dengan granularitas 5 detik. Hasilnya adalah snapshot, bukan stream real-time.

3. **Cart contention**: dengan 200 VU dan 500 user pool, 2–3 VU mungkin berbagi user yang sama. Produk dengan stok tinggi (> 500) dan clearCart di awal setiap iterasi meminimalkan dampak, tapi tidak menghilangkan sepenuhnya.

4. **Checkout skip**: kalau `checkout_skip_no_address` > 0, throughput checkout perlu dikoreksi. Denominator yang benar adalah VU yang berhasil eksekusi checkout, bukan total VU iterations.
