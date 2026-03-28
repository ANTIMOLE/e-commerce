import { prisma }   from "../config/database";
import { AppError } from "../middlewares/error.middleware";

// ── getAll ────────────────────────────────────────────────────
export async function getAll() {
  return prisma.category.findMany({
    select: {
      id:          true,
      name:        true,
      slug:        true,
      description: true,
      _count:      { select: { products: { where: { isActive: true } } } },
    },
    orderBy: { name: "asc" },
  });
}

// ── getBySlug ─────────────────────────────────────────────────
export async function getBySlug(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      id:          true,
      name:        true,
      slug:        true,
      description: true,
      _count:      { select: { products: { where: { isActive: true } } } },
    },
  });
  if (!category) throw new AppError("Kategori tidak ditemukan.", 404);
  return category;
}
