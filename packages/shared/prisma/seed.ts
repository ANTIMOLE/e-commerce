// ============================================================
// SEED — Import data dari CSV Tokopedia
// Run: pnpm db:seed
// ============================================================

import { PrismaClient } from "../generated/prisma";
import * as fs from "fs";
import * as path from "path";
import * as csv from "csv-parse/sync";

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────
function parsePrice(raw: string): number {
  return parseInt(raw.replace(/[^0-9]/g, ""), 10) || 0;
}

function parseSoldCount(raw: string): number {
  if (!raw) return 0;
  const clean = raw.toLowerCase().replace(/[^0-9kmrb+]/g, "");
  if (raw.includes("jt"))  return parseInt(clean) * 1_000_000;
  if (raw.includes("rb") || raw.includes("k")) return parseInt(clean) * 1_000;
  return parseInt(clean) || 0;
}

function parseRating(raw: string): number | null {
  const num = parseFloat(raw);
  return isNaN(num) ? null : Math.min(5, Math.max(0, num));
}

function parseDiscount(raw: string): number {
  if (!raw) return 0;
  return parseInt(raw.replace(/[^0-9]/g, ""), 10) || 0;
}

function generateSlug(name: string, id: number): string {
  return (
    name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 200)
      .trim() +
    "-" +
    id
  );
}

// ── Kategori: deteksi dari nama produk ───────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Elektronik":       ["xiaomi", "samsung", "laptop", "hp", "phone", "tablet", "earphone", "charger", "kabel", "powerbank", "speaker", "headset", "mouse", "keyboard", "monitor"],
  "Fashion Pria":     ["baju pria", "kaos pria", "kemeja", "celana pria", "jaket", "polo"],
  "Fashion Wanita":   ["baju wanita", "dress", "blouse", "rok", "celana wanita", "hijab", "jilbab"],
  "Makanan & Minuman":["minyak", "beras", "gula", "garam", "kopi", "teh", "snack", "camilan", "makanan", "minuman", "deterjen", "rinso", "sunco", "susu"],
  "Kesehatan":        ["vitamin", "masker", "obat", "suplemen", "kesehatan", "sanitizer"],
  "Rumah Tangga":     ["bantal", "kasur", "kursi", "meja", "lemari", "rak", "panci", "wajan", "sendok", "piring"],
  "Kecantikan":       ["skincare", "serum", "moisturizer", "sunscreen", "lipstik", "parfum", "sabun", "shampo", "conditioner"],
  "Olahraga":         ["sepatu olahraga", "baju olahraga", "raket", "bola", "gym", "yoga", "treadmill"],
  "Bayi & Anak":      ["pampers", "popok", "susu bayi", "mainan", "stroller", "baju bayi", "sweety"],
  "Otomotif":         ["oli", "ban", "helm", "aki", "motor", "mobil", "sparepart"],
};

function detectCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "Lainnya";
}

// ── Main Seed ─────────────────────────────────────────────────
async function main() {
  console.log("🌱 Starting seed...");

  // ── 1. Reset data (urutan penting karena FK) ─────────────
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Cleared existing data");

  // ── 2. Baca CSV ──────────────────────────────────────────
  const csvPath = path.join(__dirname, "../../tokopedia-data.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("❌ CSV not found at:", csvPath);
    console.log("   Copy file CSV Tokopedia ke packages/shared/tokopedia-data.csv");
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, "");
  const records = csv.parse(fileContent, {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
  }) as Record<string, string>[];

  console.log(`📊 Found ${records.length} products in CSV`);

  // ── 3. Buat kategori ─────────────────────────────────────
  const categoryNames = [
    ...Object.keys(CATEGORY_KEYWORDS),
    "Lainnya",
  ];

  const categoryMap: Record<string, string> = {};
  for (const name of categoryNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const cat = await prisma.category.create({
      data: { name, slug, description: `Produk kategori ${name}` },
    });
    categoryMap[name] = cat.id;
  }
  console.log(`✅ Created ${categoryNames.length} categories`);

  // ── 4. Buat produk dari CSV (batch) ──────────────────────
  const PLACEHOLDER = "https://placehold.co/400x400/f3f4f6/9ca3af?text=No+Image";
  const products = records
    .filter((r) => r["data3"] && r["data"])
    .map((r, i) => {
      const name     = r["data3"]?.trim() ?? "";
      const price    = parsePrice(r["data"] ?? "");
      const sold     = parseSoldCount(r["data2"] ?? "");
      const rating   = parseRating(r["data4"] ?? "");
      const location = r["data5"]?.trim() ?? "";
      const discount = parseDiscount(r["data6"] ?? "");
      const image    = r["image"]?.trim();
      const catName  = detectCategory(name);

      return {
        categoryId:  categoryMap[catName] ?? categoryMap["Lainnya"],
        name,
        slug:        generateSlug(name, i + 1),
        description: `${name}. Tersedia di ${location || "berbagai kota"}.`,
        price,
        stock:       Math.floor(Math.random() * 200) + 10, // 10-210
        images:      image ? [image] : [PLACEHOLDER],
        rating,
        soldCount:   sold,
        location:    location || null,
        discount,
        isActive:    price > 0,
      };
    })
    .filter((p) => p.price > 0 && p.name.length >= 3);

  // Insert batch 100 sekaligus untuk performa
  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < products.length; i += BATCH) {
    await prisma.product.createMany({ data: products.slice(i, i + BATCH) });
    inserted += Math.min(BATCH, products.length - i);
    process.stdout.write(`\r📦 Inserting products... ${inserted}/${products.length}`);
  }
  console.log(`\n✅ Inserted ${inserted} products`);

  // ── 5. Buat test users ────────────────────────────────────
  const bcrypt = await import("bcryptjs");
  const hash   = await bcrypt.hash("Test1234!", 12);

  const users = await prisma.user.createMany({
    data: [
      { name: "Test User",  email: "test@test.com",  passwordHash: hash, phone: "081234567890" },
      { name: "Test User 2",email: "test2@test.com", passwordHash: hash, phone: "081234567891" },
      { name: "Admin User", email: "admin@test.com", passwordHash: hash, phone: "081234567892" },
    ],
  });
  console.log(`✅ Created ${users.count} test users`);
  console.log("   📧 Email: test@test.com | Password: Test1234!");

  // ── 6. Summary ───────────────────────────────────────────
  const counts = {
    categories: await prisma.category.count(),
    products:   await prisma.product.count(),
    users:      await prisma.user.count(),
  };
  console.log("\n🎉 Seed complete!");
  console.table(counts);
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
