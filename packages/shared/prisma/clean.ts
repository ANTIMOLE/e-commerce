// prisma/clean.ts
// Jalankan: npx ts-node prisma/clean.ts
// Truncate semua table dalam urutan yang aman (child dulu baru parent)

import { PrismaClient } from '../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function clean() {
  console.log('🧹 Cleaning database...\n')

  // Urutan: child tables dulu, baru parent
  const steps: [string, () => Promise<{ count: number }>][] = [
    ['order_items',     () => prisma.orderItem.deleteMany()],
    ['orders',          () => prisma.order.deleteMany()],
    ['cart_items',      () => prisma.cartItem.deleteMany()],
    ['carts',           () => prisma.cart.deleteMany()],
    ['addresses',       () => prisma.address.deleteMany()],
    ['refresh_tokens',  () => prisma.refreshToken.deleteMany()],
    ['users',           () => prisma.user.deleteMany()],
    ['products',        () => prisma.product.deleteMany()],
    ['categories',      () => prisma.category.deleteMany()],
  ]

  for (const [table, fn] of steps) {
    const { count } = await fn()
    console.log(`  ✅ ${table}: ${count} rows deleted`)
  }

  console.log('\n🎉 Database clean!')
}

clean()
  .catch((e) => {
    console.error('❌ Clean failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
