// // @ts-ignore
// require('dotenv').config({ path: './.env' });
// const { PrismaClient } = require('../generated/prisma');
// const { Pool } = require('pg');
// const { PrismaPg } = require('@prisma/adapter-pg');

// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// const adapter = new PrismaPg(pool);
// const prisma = new PrismaClient({ adapter });

// async function fixStock() {
//   console.log("🚀 Updating all product stocks to 100...");
//   try {
//     const result = await prisma.product.updateMany({
//       data: { stock: 100 },
//     });
//     console.log(`✅ DONE — ${result.count} products updated`);
//   } catch (e) {
//     console.error("❌ Error:", e);
//   } finally {
//     await prisma.$disconnect();
//     await pool.end();
//   }
// }

// fixStock();
