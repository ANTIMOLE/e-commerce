// src/seeds/seed_history.ts
// Seed: order history + active carts
// TIDAK mengubah categories, products, users, addresses yang sudah ada.
//
// Target:
//   - ~30.000 orders (rata-rata 3 order/user dari 10k users)
//   - ~67.500 order_items (rata-rata 2.25 items/order)
//   - ~2.000 active carts (20% user) dengan 1-3 items
//
// Jalankan SETELAH seed_barang_final.ts selesai:
//   npx ts-node src/seeds/seed_history.ts

import { PrismaClient, OrderStatus, PaymentMethod, ShippingMethod } from '../../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma  = new PrismaClient({ adapter })

// ── Config ────────────────────────────────────────────────────
const ORDERS_PER_USER_MIN  = 1
const ORDERS_PER_USER_MAX  = 6
const ITEMS_PER_ORDER_MIN  = 1
const ITEMS_PER_ORDER_MAX  = 5
const CART_USER_RATIO      = 0.20   // 20% user punya active cart
const ITEMS_PER_CART_MIN   = 1
const ITEMS_PER_CART_MAX   = 4
const PRODUCT_POOL_SIZE    = 2_000  // Ambil 2k produk random sebagai pool
const USER_BATCH_SIZE      = 500    // Proses users per batch
const INSERT_BATCH         = 500    // Batch size untuk DB insert

// ── Helpers ───────────────────────────────────────────────────
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randDate(daysAgoMin: number, daysAgoMax: number): Date {
  const days = randInt(daysAgoMin, daysAgoMax)
  const d = new Date()
  d.setDate(d.getDate() - days)
  // Randomize time within the day
  d.setHours(randInt(7, 22), randInt(0, 59), randInt(0, 59))
  return d
}

// Order number format: ZNT-YYYYMMDD-XXXXXXX (unique counter)
let orderCounter = 1
function nextOrderNumber(date: Date): string {
  const pad = String(orderCounter++).padStart(7, '0')
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '')
  return `ZNT-${ymd}-${pad}`
}

// Distribusi status order: sebagian besar delivered (realistic history)
const STATUS_WEIGHTS: { status: OrderStatus; weight: number; daysAgo: [number, number] }[] = [
  { status: 'delivered',       weight: 55, daysAgo: [7,   365] },
  { status: 'shipped',         weight: 15, daysAgo: [1,   6]   },
  { status: 'processing',      weight: 10, daysAgo: [1,   3]   },
  { status: 'confirmed',       weight: 8,  daysAgo: [0,   2]   },
  { status: 'pending_payment', weight: 7,  daysAgo: [0,   1]   },
  { status: 'cancelled',       weight: 5,  daysAgo: [3,   180] },
]
const STATUS_TOTAL = STATUS_WEIGHTS.reduce((s, w) => s + w.weight, 0)

function pickStatus(): { status: OrderStatus; daysAgo: [number, number] } {
  let r = Math.random() * STATUS_TOTAL
  for (const w of STATUS_WEIGHTS) {
    r -= w.weight
    if (r <= 0) return w
  }
  return STATUS_WEIGHTS[0]
}

const PAYMENT_METHODS: PaymentMethod[]  = ['bank_transfer', 'qris', 'cod']
const SHIPPING_METHODS: ShippingMethod[] = ['regular', 'express']

// Shipping cost by method
function shippingCost(method: ShippingMethod): number {
  if (method === 'express') return randItem([25_000, 30_000, 35_000, 45_000])
  return randItem([9_000, 12_000, 15_000, 18_000])
}

// Tax: 11% PPN
function calcTax(subtotal: number): number {
  return Math.round(subtotal * 0.11)
}

// Build shippingAddress JSON snapshot dari address record
function buildShippingAddress(addr: {
  recipientName: string; phone: string; address: string;
  city: string; province: string; zipCode: string;
}): object {
  return {
    recipientName: addr.recipientName,
    phone:         addr.phone,
    address:       addr.address,
    city:          addr.city,
    province:      addr.province,
    zipCode:       addr.zipCode,
  }
}

// ── SEED ORDERS ───────────────────────────────────────────────
async function seedOrders(
  productPool: { id: string; name: string; price: number; images: string[] }[]
) {
  console.log('🌱 Seeding orders & order_items...')

  // Fetch semua user IDs + addresses (hanya regular user, bukan admin)
  const users = await prisma.user.findMany({
    where:  { role: 'USER' },
    select: { id: true, addresses: { select: { id: true, recipientName: true, phone: true, address: true, city: true, province: true, zipCode: true } } },
  })

  console.log(`  → ${users.length} users found, generating orders...`)

  let totalOrders     = 0
  let totalOrderItems = 0

  // Proses per batch user agar memory ga meledak
  for (let bStart = 0; bStart < users.length; bStart += USER_BATCH_SIZE) {
    const batch = users.slice(bStart, bStart + USER_BATCH_SIZE)

    const ordersToInsert:     any[] = []
    const orderItemsToInsert: any[] = []

    for (const user of batch) {
      if (user.addresses.length === 0) continue  // skip user tanpa address

      const orderCount = randInt(ORDERS_PER_USER_MIN, ORDERS_PER_USER_MAX)

      for (let o = 0; o < orderCount; o++) {
        const { status, daysAgo } = pickStatus()
        const orderDate   = randDate(daysAgo[0], daysAgo[1])
        const address     = randItem(user.addresses)
        const shipping    = randItem(SHIPPING_METHODS)
        const payment     = randItem(PAYMENT_METHODS)
        const shipCost    = shippingCost(shipping)
        const itemCount   = randInt(ITEMS_PER_ORDER_MIN, ITEMS_PER_ORDER_MAX)

        // Pick unique products for this order
        const pickedProducts = [...productPool]
          .sort(() => Math.random() - 0.5)
          .slice(0, itemCount)

        let subtotal = 0
        const items: any[] = []

        for (const prod of pickedProducts) {
          const qty      = randInt(1, 3)
          const price    = prod.price
          const itemSub  = price * qty
          subtotal      += itemSub

          items.push({
            id:           crypto.randomUUID(),
            orderId:      '',  // filled below
            productId:    prod.id,
            productName:  prod.name,
            productImage: prod.images[0] ?? null,
            quantity:     qty,
            unitPrice:    price,
            subtotal:     itemSub,
          })
        }

        const tax   = calcTax(subtotal)
        const total = subtotal + tax + shipCost

        const orderId = crypto.randomUUID()
        ordersToInsert.push({
          id:              orderId,
          userId:          user.id,
          addressId:       address.id,
          orderNumber:     nextOrderNumber(orderDate),
          status,
          subtotal,
          tax,
          shippingCost:    shipCost,
          total,
          shippingAddress: buildShippingAddress(address),
          paymentMethod:   payment,
          shippingMethod:  shipping,
          createdAt:       orderDate,
          updatedAt:       orderDate,
        })

        for (const item of items) {
          item.orderId = orderId
          orderItemsToInsert.push(item)
        }
      }
    }

    // Batch insert orders
    for (let i = 0; i < ordersToInsert.length; i += INSERT_BATCH) {
      await prisma.order.createMany({
        data:           ordersToInsert.slice(i, i + INSERT_BATCH),
        skipDuplicates: true,
      })
    }

    // Batch insert order_items
    for (let i = 0; i < orderItemsToInsert.length; i += INSERT_BATCH) {
      await prisma.orderItem.createMany({
        data:           orderItemsToInsert.slice(i, i + INSERT_BATCH),
        skipDuplicates: true,
      })
    }

    totalOrders     += ordersToInsert.length
    totalOrderItems += orderItemsToInsert.length

    const pct = Math.round(((bStart + batch.length) / users.length) * 100)
    console.log(`  → ${pct}% | orders: ${totalOrders} | items: ${totalOrderItems}`)
  }

  console.log(`✅ ${totalOrders} orders seeded`)
  console.log(`✅ ${totalOrderItems} order_items seeded`)
}

// ── SEED CARTS ────────────────────────────────────────────────
async function seedCarts(
  productPool: { id: string; price: number }[]
) {
  console.log('🌱 Seeding carts & cart_items...')

  // Ambil subset user untuk punya active cart
  const allUsers = await prisma.user.findMany({
    where:  { role: 'USER' },
    select: { id: true },
  })

  // Pilih 20% user secara acak
  const cartUsers = allUsers
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(allUsers.length * CART_USER_RATIO))

  const cartsToInsert:     any[] = []
  const cartItemsToInsert: any[] = []

  for (const user of cartUsers) {
    const cartId    = crypto.randomUUID()
    const now       = new Date()
    const itemCount = randInt(ITEMS_PER_CART_MIN, ITEMS_PER_CART_MAX)

    cartsToInsert.push({
      id:        cartId,
      userId:    user.id,
      status:    'active',
      createdAt: now,
      updatedAt: now,
    })

    const pickedProducts = [...productPool]
      .sort(() => Math.random() - 0.5)
      .slice(0, itemCount)

    for (const prod of pickedProducts) {
      cartItemsToInsert.push({
        id:          crypto.randomUUID(),
        cartId,
        productId:   prod.id,
        quantity:    randInt(1, 3),
        priceAtTime: prod.price,
        createdAt:   now,
      })
    }
  }

  // Insert carts
  for (let i = 0; i < cartsToInsert.length; i += INSERT_BATCH) {
    await prisma.cart.createMany({
      data:           cartsToInsert.slice(i, i + INSERT_BATCH),
      skipDuplicates: true,
    })
  }

  // Insert cart_items
  for (let i = 0; i < cartItemsToInsert.length; i += INSERT_BATCH) {
    await prisma.cartItem.createMany({
      data:           cartItemsToInsert.slice(i, i + INSERT_BATCH),
      skipDuplicates: true,
    })
  }

  console.log(`✅ ${cartsToInsert.length} carts seeded`)
  console.log(`✅ ${cartItemsToInsert.length} cart_items seeded`)
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting history seed...\n')

  // Fetch product pool sekali di awal (random 2k dari 50k)
  console.log(`📦 Fetching ${PRODUCT_POOL_SIZE} products as pool...`)
  const productPool = await prisma.product.findMany({
    where:  { isActive: true },
    select: { id: true, name: true, price: true, images: true },
    take:   PRODUCT_POOL_SIZE,
    // orderBy: random tidak ada di Prisma — pakai offset trick
    skip:   randInt(0, 48_000),
  })

  // Kalau skip terlalu besar dan hasilnya kurang, ambil dari awal
  const finalPool = productPool.length >= 500
    ? productPool
    : await prisma.product.findMany({
        where:  { isActive: true },
        select: { id: true, name: true, price: true, images: true },
        take:   PRODUCT_POOL_SIZE,
      })

  // Cast price Decimal ke number
  const pool = finalPool.map((p) => ({
    ...p,
    price: Number(p.price),
  }))

  console.log(`  → ${pool.length} products in pool\n`)

  await seedOrders(pool)
  console.log()
  await seedCarts(pool)

  console.log('\n🎉 History seed complete!')

  // Summary stats
  const [orderCount, orderItemCount, cartCount, cartItemCount] = await Promise.all([
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.cart.count(),
    prisma.cartItem.count(),
  ])

  console.log('\n📊 Final DB counts:')
  console.log(`  orders:      ${orderCount.toLocaleString()}`)
  console.log(`  order_items: ${orderItemCount.toLocaleString()}`)
  console.log(`  carts:       ${cartCount.toLocaleString()}`)
  console.log(`  cart_items:  ${cartItemCount.toLocaleString()}`)
}

main()
  .catch((e) => {
    console.error('❌ History seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
