import { PrismaClient } from '../generated/prisma'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

// ============================================================
// HELPER: Parse images field dari CSV
// Format di CSV: {"url1","url2"} -> string[]
// ============================================================
function parseImages(raw: string): string[] {
  if (!raw || raw.trim() === '') return []
  try {
    const cleaned = raw.replace(/^\{/, '').replace(/\}$/, '')
    if (!cleaned) return []
    return cleaned
      .split('","')
      .map((s) => s.replace(/^"/, '').replace(/"$/, '').trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

// ============================================================
// SEED CATEGORIES
// ============================================================
async function seedCategories() {
  console.log('🌱 Seeding categories...')

  const filePath = path.join(__dirname, 'categories.json')
  const raw = fs.readFileSync(filePath, 'utf-8')
  const categories = JSON.parse(raw)

  const data = categories.map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
  }))

  await prisma.category.createMany({
    data,
    skipDuplicates: true,
  })

  console.log(`✅ ${data.length} categories seeded`)
}

// ============================================================
// SEED PRODUCTS
// ============================================================
async function seedProducts() {
  console.log('🌱 Seeding products...')

  // Build map: category_slug -> category id
  const allCategories = await prisma.category.findMany({
    select: { id: true, slug: true },
  })
  const slugToId: Record<string, string> = {}
  for (const cat of allCategories) {
    slugToId[cat.slug] = cat.id
  }

  // Baca CSV
  const filePath = path.join(__dirname, 'tokopedia_20000.csv')
  const raw = fs.readFileSync(filePath, 'utf-8')
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  })

  const products = rows.map((row: any) => ({
    id: crypto.randomUUID(),
    categoryId: slugToId[row.category_slug] ?? null,
    name: row.name?.trim() ?? '',
    slug: row.slug?.trim() ?? '',
    description: null,
    price: parseFloat(row.price) || 0,
    stock: 0,
    images: parseImages(row.images),
    rating: row.rating && row.rating !== '' ? parseFloat(row.rating) : null,
    soldCount: parseInt(row.sold_count) || 0,
    location: row.location?.trim() || null,
    discount: parseInt(row.discount) || 0,
    isActive: true,
  }))

  // Filter produk yang categoryId-nya valid
  const valid = products.filter((p: any) => p.categoryId !== null)
  const skipped = products.length - valid.length
  if (skipped > 0) {
    console.warn(`⚠️  ${skipped} products dilewati (category_slug tidak ditemukan)`)
  }

  // Batch insert per 500 biar ga timeout
  const BATCH = 500
  let inserted = 0

  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH)
    await prisma.product.createMany({
      data: batch,
      skipDuplicates: true,
    })
    inserted += batch.length
    console.log(`   → ${inserted}/${valid.length} products inserted`)
  }

  console.log(`✅ ${inserted} products seeded`)
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🚀 Starting seed...\n')
  await seedCategories()
  await seedProducts()
  console.log('\n🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())