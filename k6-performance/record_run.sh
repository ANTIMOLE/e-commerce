#!/usr/bin/env bash
# =============================================================
# record_run.sh — Catat satu pasangan REST–tRPC run ke manifest
#
# Jalankan SETELAH setiap pasangan run selesai:
#   ./record_run.sh \
#     --run 1 \
#     --scenario s01_browse \
#     --test-type load \
#     --rest   s01_browse_rest_load_1714300000.json \
#     --trpc   s01_browse_trpc_load_1714300060.json \
#     --rest-resource resource_rest_load_s01_1714300000.csv \
#     --trpc-resource resource_trpc_load_s01_1714300060.csv
#
# Tambahkan --note "..." kalau ada keterbatasan (konfound, dsb):
#   ./record_run.sh ... --note "konfound: backend-trpc masih jalan"
#
# Output: results/run_manifest.json (di-append, bukan di-overwrite)
#
# Kenapa manifest penting?
#   sorted(glob(...)) fragile — file sisa/ulang parsial bisa misalign pairing.
#   Manifest memberikan pairing eksplisit yang bisa di-audit dan di-verify.
# =============================================================

set -euo pipefail

RESULTS_DIR="$(dirname "$0")/results"
MANIFEST="$RESULTS_DIR/run_manifest.json"

# ── Parse args ────────────────────────────────────────────────
RUN=""
SCENARIO=""
TEST_TYPE=""
REST_FILE=""
TRPC_FILE=""
REST_RESOURCE=""
TRPC_RESOURCE=""
NOTE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run)            RUN="$2";            shift 2 ;;
    --scenario)       SCENARIO="$2";       shift 2 ;;
    --test-type)      TEST_TYPE="$2";      shift 2 ;;
    --rest)           REST_FILE="$2";      shift 2 ;;
    --trpc)           TRPC_FILE="$2";      shift 2 ;;
    --rest-resource)  REST_RESOURCE="$2";  shift 2 ;;
    --trpc-resource)  TRPC_RESOURCE="$2";  shift 2 ;;
    --note)           NOTE="$2";           shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── Validasi ──────────────────────────────────────────────────
missing=()
[ -z "$RUN" ]        && missing+=("--run")
[ -z "$SCENARIO" ]   && missing+=("--scenario")
[ -z "$TEST_TYPE" ]  && missing+=("--test-type")
[ -z "$REST_FILE" ]  && missing+=("--rest")
[ -z "$TRPC_FILE" ]  && missing+=("--trpc")

if [ ${#missing[@]} -gt 0 ]; then
  echo "❌ Argumen wajib tidak lengkap: ${missing[*]}"
  echo "   Lihat komentar di atas file ini untuk contoh penggunaan."
  exit 1
fi

# Verifikasi file result ada (warning saja, tidak exit — kalau jalankan dari CI mungkin path beda)
for f in "$REST_FILE" "$TRPC_FILE"; do
  [ ! -f "$RESULTS_DIR/$f" ] && echo "⚠️  File tidak ditemukan: $RESULTS_DIR/$f (pastikan path sudah benar)"
done

# ── Init manifest kalau belum ada ─────────────────────────────
mkdir -p "$RESULTS_DIR"
if [ ! -f "$MANIFEST" ]; then
  echo "[]" > "$MANIFEST"
  echo "📋 Manifest baru dibuat: $MANIFEST"
fi

# ── Cek duplikat run di scenario yang sama ────────────────────
DUPLICATE=$(python3 -c "
import json, sys
with open('$MANIFEST') as f: manifest = json.load(f)
dup = any(m['run'] == $RUN and m['scenario'] == '$SCENARIO' and m['test_type'] == '$TEST_TYPE' for m in manifest)
print('yes' if dup else 'no')
")

if [ "$DUPLICATE" = "yes" ]; then
  echo "⚠️  Run $RUN untuk $SCENARIO/$TEST_TYPE sudah ada di manifest."
  echo "   Gunakan --run dengan nomor yang berbeda, atau hapus entry lama dari manifest manual."
  exit 1
fi

# ── Append ke manifest ────────────────────────────────────────
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

python3 - << PYEOF
import json

manifest_path = "$MANIFEST"
with open(manifest_path) as f:
    manifest = json.load(f)

entry = {
    "run":           int("$RUN"),
    "scenario":      "$SCENARIO",
    "test_type":     "$TEST_TYPE",
    "recorded_at":   "$TIMESTAMP",
    "rest":          "$REST_FILE",
    "trpc":          "$TRPC_FILE",
    "rest_resource": "$REST_RESOURCE",
    "trpc_resource": "$TRPC_RESOURCE",
    "note":          "$NOTE",
}

manifest.append(entry)
manifest.sort(key=lambda m: (m["scenario"], m["test_type"], m["run"]))

with open(manifest_path, "w") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print(f"✅ Recorded: run={entry['run']} | {entry['scenario']}/{entry['test_type']}")
print(f"   REST : {entry['rest']}")
print(f"   tRPC : {entry['trpc']}")
if entry['note']:
    print(f"   Note : {entry['note']}")
print(f"   Total entries di manifest: {len(manifest)}")
PYEOF
