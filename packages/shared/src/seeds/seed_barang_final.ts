// src/seeds/seed_2.ts
// Seed: categories + products (dari CSV baru) + users + addresses
// Perubahan dari versi lama:
//   - description diambil dari CSV (sebelumnya null)
//   - images: [image_url, image_local] — url tokopedia + local path sebagai backup
//   - stock: random 10–500 (sebelumnya 0)
//   - Baca CSV baru yang ada kolom description, image_url, image_local

import { PrismaClient } from '../../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ============================================================
// HELPER: Parse images field dari CSV (format postgres array)
// Format: {"url1","url2"} -> string[]
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
// HELPER: Build images array dengan fallback strategy
// Priority: image_url (direct scrapped URL) dulu
// Backup:   image_local (path foto lokal yang sudah didownload)
//
// Frontend logic:
//   - Coba render images[0] (tokopedia URL)
//   - Kalau 404/error, fallback ke images[1] (local: /static/images/...)
// ============================================================
function buildImages(imageUrl: string, imageLocal: string, rawImages: string): string[] {
  const result: string[] = []

  // 1. image_url dari kolom dedicated (lebih reliable dari parse images array)
  if (imageUrl && imageUrl.trim()) {
    result.push(imageUrl.trim())
  } else {
    // Fallback ke parse dari kolom images (format postgres array)
    const parsed = parseImages(rawImages)
    if (parsed.length > 0) result.push(...parsed)
  }

  // 2. image_local sebagai backup (path relatif, diprefix /static/ di frontend)
  if (imageLocal && imageLocal.trim()) {
    result.push(imageLocal.trim())
  }

  return result
}

// ============================================================
// HELPER: Random stock
// ============================================================
function randomStock(): number {
  // Distribusi realistis:
  // 30% chance: low stock (10–50)
  // 50% chance: normal (51–300)
  // 20% chance: high stock (301–500)
  const r = Math.random()
  if (r < 0.3) return Math.floor(Math.random() * 41) + 10   // 10–50
  if (r < 0.8) return Math.floor(Math.random() * 250) + 51  // 51–300
  return Math.floor(Math.random() * 200) + 301               // 301–500
}

// ============================================================
// SEED CATEGORIES
// ============================================================
async function seedCategories() {
  console.log('🌱 Seeding categories...')

  const filePath = path.join(__dirname, '../dataset/categories.json')
  const raw = fs.readFileSync(filePath, 'utf-8')
  const categories = JSON.parse(raw)

  const data = categories.map((c: any) => ({
    id:          c.id,
    name:        c.name,
    slug:        c.slug,
    description: c.description ?? null,
  }))

  await prisma.category.createMany({ data, skipDuplicates: true })
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

  // Baca CSV baru (ada description, image_url, image_local)
  const filePath = path.join(__dirname, '../dataset/tokopedia_50000.csv')
  const raw = fs.readFileSync(filePath, 'utf-8')
  const rows = parse(raw, {
    columns:            true,
    skip_empty_lines:   true,
    relax_column_count: true,
  })

  const products = rows.map((row: any) => ({
    id:         crypto.randomUUID(),
    categoryId: slugToId[row.category_slug] ?? null,
    name:       row.name?.trim() ?? '',
    slug:       row.slug?.trim() ?? '',

    // ✅ BARU: description dari CSV (sebelumnya null hardcoded)
    description: row.description?.trim() || null,

    price:    parseFloat(row.price) || 0,

    // ✅ BARU: stock random realistis (sebelumnya 0)
    stock: randomStock(),

    // ✅ BARU: images = [tokopedia_url, image_local_path]
    // Frontend: coba [0] dulu, kalau gagal render [1] via /static/
    images: buildImages(row.image_url ?? '', row.image_local ?? '', row.images ?? ''),

    rating:    row.rating && row.rating !== '' ? parseFloat(row.rating) : null,
    soldCount: parseInt(row.sold_count) || 0,
    location:  row.location?.trim() || null,
    discount:  parseInt(row.discount) || 0,
    isActive:  true,
  }))

  // Filter: skip kalau categoryId null (category_slug tidak ada di DB)
  const valid   = products.filter((p: any) => p.categoryId !== null)
  const skipped = products.length - valid.length
  if (skipped > 0) {
    console.warn(`⚠️  ${skipped} products dilewati (category_slug tidak ditemukan)`)
  }

  // Batch insert per 500
  const BATCH = 500
  let inserted = 0
  for (let i = 0; i < valid.length; i += BATCH) {
    await prisma.product.createMany({
      data:           valid.slice(i, i + BATCH),
      skipDuplicates: true,
    })
    inserted += Math.min(BATCH, valid.length - i)
    console.log(`   → ${inserted}/${valid.length} products inserted`)
  }

  console.log(`✅ ${inserted} products seeded`)
}

// ============================================================
// SEED USERS & ADDRESSES
// ============================================================
const FIRST_NAMES = [
  'Budi','Siti','Agus','Dewi','Eko','Fitri','Hendra','Ika','Joko','Kartika',
  'Luki','Maya','Nanda','Putri','Rizky','Sari','Tono','Umar','Vina','Wahyu',
  'Yoga','Zahra','Andi','Bella','Cahyo','Dinda','Farhan','Gita','Hafiz','Indah',
  'Irfan','Jasmine','Kevin','Lina','Mukti','Nisa','Okta','Prita','Rafi','Sela',
  'Teguh','Ulfa','Vero','Widi','Yusuf','Zaki','Aditya','Bagas','Citra','Dedi',
  'Erna','Fauzi','Galih','Hani','Ivan','Juli','Kiki','Leo','Mita','Naufal',
  'Prima','Reza','Sena','Tasya','Udin','Vita','Wawan','Yanti','Zulfa','Arif',
]
const LAST_NAMES = [
  'Santoso','Wijaya','Kusuma','Pratama','Saputra','Wibowo','Nugroho','Hidayat',
  'Setiawan','Purnomo','Rahardjo','Utama','Halim','Kurniawan','Suharto','Gunawan',
  'Wahyudi','Susanto','Hartono','Wardana','Subagyo','Salim','Maulana','Firdaus',
  'Hakim','Iskandar','Karim','Latif','Mansur','Rachmat','Siregar','Tanjung','Zainal',
]
const CITY_PROVINCE_ZIP = [
  ['Jakarta Pusat',   'DKI Jakarta',        '10110'],
  ['Jakarta Selatan', 'DKI Jakarta',        '12110'],
  ['Surabaya',        'Jawa Timur',         '60111'],
  ['Bandung',         'Jawa Barat',         '40111'],
  ['Medan',           'Sumatera Utara',     '20111'],
  ['Semarang',        'Jawa Tengah',        '50111'],
  ['Makassar',        'Sulawesi Selatan',   '90111'],
  ['Yogyakarta',      'DI Yogyakarta',      '55111'],
  ['Depok',           'Jawa Barat',         '16400'],
  ['Tangerang',       'Banten',             '15111'],
  ['Bekasi',          'Jawa Barat',         '17111'],
  ['Bogor',           'Jawa Barat',         '16111'],
  ['Malang',          'Jawa Timur',         '65111'],
  ['Denpasar',        'Bali',               '80111'],
  ['Pekanbaru',       'Riau',               '28111'],
  ['Balikpapan',      'Kalimantan Timur',   '76111'],
  ['Padang',          'Sumatera Barat',     '25111'],
  ['Pontianak',       'Kalimantan Barat',   '78111'],
  ['Batam',           'Kepulauan Riau',     '29432'],
  ['Solo',            'Jawa Tengah',        '57111'],
] as const

const STREET_NAMES = [
  'Merdeka','Sudirman','Diponegoro','Gatot Subroto','Ahmad Yani','Pahlawan',
  'Veteran','Pemuda','Cendana','Melati','Mawar','Anggrek','Flamboyan','Kenanga',
  'Mangga','Rambutan','Durian','Kelapa','Bambu','Jati','Mahoni',
]
const ADDR_LABELS   = ['Rumah', 'Kantor', 'Kosan']
const PHONE_PREFIXES = ['0812','0813','0821','0822','0851','0852','0856','0857','0877','0878']

function rng(arr: readonly any[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function randomPhone() {
  return rng(PHONE_PREFIXES) + String(randInt(10_000_000, 99_999_999))
}
function randomAddress() {
  return `Jl. ${rng(STREET_NAMES)} No.${randInt(1, 150)}, RT ${String(randInt(1,15)).padStart(2,'0')}/RW ${String(randInt(1,10)).padStart(2,'0')}`
}

async function seedUsers() {
  console.log('🌱 Seeding users...')

  const USER_COUNT    = 10_000
  const ADMIN_COUNT   = 10
  const ADDR_PER_USER = 3

  // Shared hash untuk speed (bcrypt per-user di 10k terlalu lambat)
  const sharedHash = await bcrypt.hash('Password123!', 12)

  const users: any[] = []

  // 10 admins
  for (let i = 1; i <= ADMIN_COUNT; i++) {
    users.push({
      id:           crypto.randomUUID(),
      name:         `${rng(FIRST_NAMES)} ${rng(LAST_NAMES)}`,
      email:        `admin${i}@zenit.dev`,
      passwordHash: sharedHash,
      phone:        randomPhone(),
      role:         'ADMIN',
    })
  }

  // 10.000 regular users
  for (let i = 1; i <= USER_COUNT; i++) {
    const firstName = rng(FIRST_NAMES)
    const lastName  = rng(LAST_NAMES)
    const domain    = rng(['gmail.com','yahoo.com','outlook.com','hotmail.com'])
    users.push({
      id:           crypto.randomUUID(),
      name:         `${firstName} ${lastName}`,
      email:        `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`,
      passwordHash: sharedHash,
      phone:        randomPhone(),
      role:         'USER',
    })
  }

  const BATCH = 500
  let uInserted = 0
  for (let i = 0; i < users.length; i += BATCH) {
    await prisma.user.createMany({ data: users.slice(i, i + BATCH), skipDuplicates: true })
    uInserted += Math.min(BATCH, users.length - i)
    console.log(`   → ${uInserted}/${users.length} users inserted`)
  }
  console.log(`✅ ${uInserted} users seeded`)

  // Addresses
  console.log('🌱 Seeding addresses...')
  const regularUsers = users.filter((u) => u.role === 'USER')
  const addresses: any[] = []

  for (const u of regularUsers) {
    const cities = [...CITY_PROVINCE_ZIP].sort(() => Math.random() - 0.5).slice(0, ADDR_PER_USER)
    cities.forEach(([city, province, zipCode], j) => {
      addresses.push({
        id:            crypto.randomUUID(),
        userId:        u.id,
        label:         ADDR_LABELS[j % ADDR_LABELS.length],
        recipientName: u.name,
        phone:         u.phone,
        address:       randomAddress(),
        city,
        province,
        zipCode,
        isDefault:     j === 0,
      })
    })
  }

  let aInserted = 0
  for (let i = 0; i < addresses.length; i += BATCH) {
    await prisma.address.createMany({ data: addresses.slice(i, i + BATCH), skipDuplicates: true })
    aInserted += Math.min(BATCH, addresses.length - i)
    if (aInserted % 5000 === 0 || aInserted === addresses.length) {
      console.log(`   → ${aInserted}/${addresses.length} addresses inserted`)
    }
  }
  console.log(`✅ ${aInserted} addresses seeded`)
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🚀 Starting seed...\n')
  await seedCategories()
  await seedProducts()
  await seedUsers()
  console.log('\n🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
