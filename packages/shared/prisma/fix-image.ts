// @ts-ignore
require('dotenv').config({ path: './.env' });

const { PrismaClient } = require('../generated/prisma');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter }); // ← adapter wajib ada


async function fix() {
  console.log("🚀 Running fix...");
  try {
    const products = await prisma.product.findMany({
      select: { id: true, images: true }
    });

    console.log(`Found ${products.length} products`);

    let count = 0;
    for (const p of products) {
      const cleaned = p.images.map((url: string) => {
        if (!url || !url.includes("tokopedia-static.net")) return url;
        const main = url.split(/[?~]/)[0];
        const parts = main.split('/img/');
        return parts.length < 2 ? url : `https://images.tokopedia.net/img/cache/700/${parts[1]}`;
      });

      await prisma.product.update({
        where: { id: p.id },
        data: { images: cleaned }
      });

      count++;
      if (count % 1000 === 0) console.log(`Progress: ${count}/${products.length}`);
    }
    console.log("✅ DONE");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
