import { prisma } from "../config/database";
import { AppError } from "../middlewares/error.middleware";


export interface ProductQuery {
  page?:       number;
  limit?:      number;
  categoryId?: string;
  q?:          string;         // search by name
  minPrice?:   number;
  maxPrice?:   number;
  minRating?:  number;
  sortBy?:     "price" | "rating" | "soldCount" | "createdAt";
  sortOrder?:  "asc" | "desc";
}

/**
 * LOGIKA:
 * 1. Build filter `where` dari query params
 * 2. Hitung total data untuk pagination
 * 3. Ambil data dengan skip/take
 * 4. Return data + meta pagination
 */
export async function getAll(query: ProductQuery) {
  const {
    page      = 1,
    limit     = 20,
    categoryId,
    q,
    minPrice,
    maxPrice,
    minRating,
    sortBy    = "createdAt",
    sortOrder = "desc",
  } = query;

  const where = {
    isActive: true,
    ...(categoryId && { categoryId }),
    ...(q && { name: { contains: q, mode: "insensitive" as const } }),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? { price: { ...(minPrice && { gte: minPrice }), ...(maxPrice && { lte: maxPrice }) } }
      : {}),
    ...(minRating && { rating: { gte: minRating } }),
  };

  // 2. Count total
  const total = await prisma.product.count({ where });

  // 3. Ambil data
  const products = await prisma.product.findMany({
    where,
    select: {
      id:        true,
      name:      true,
      slug:      true,
      price:     true,
      images:    true,
      rating:    true,
      soldCount: true,
      location:  true,
      discount:  true,
      stock:     true,
      category:  { select: { id: true, name: true, slug: true } },
    },
    orderBy: { [sortBy]: sortOrder },
    skip:    (page - 1) * limit,
    take:    limit,
  });

  // 4. Return dengan meta pagination
  return {
    data:       products,
    totalCount: total,
    page,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };
}
/**
 * LOGIKA:
 * 1. Cari produk by slug
 * 2. Kalau tidak ada / tidak aktif → throw 404
 * 3. Return data lengkap
 */
export async function getBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    select: {
      id:          true,
      name:        true,
      slug:        true,
      description: true,
      price:       true,
      images:      true,
      rating:      true,
      soldCount:   true,
      stock:       true,
      location:    true,
      discount:    true,
      createdAt:   true,
      category:    { select: { id: true, name: true, slug: true } },
    },
  });

  if (!product) {
    throw new AppError("Produk tidak ditemukan.", 404);
  }

  return product;
}

/**
 * TODO:
 *
 * LOGIKA:
 * 1. Cari produk by id pakai prisma.product.findUnique
 * 2. Kalau tidak ada → throw AppError("Produk tidak ditemukan", 404)
 * 3. Return produk
 *
 * HINT: Lihat getBySlug di atas — bedanya cuma where: { id } bukan { slug }
 */
export async function getById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id:          true,
      name:        true,
      slug:        true,
      description: true,
      price:       true,
      images:      true,
      rating:      true,
      soldCount:   true,
      stock:       true,
      location:    true,
      discount:    true,
      createdAt:   true,
      category:    { select: { id: true, name: true, slug: true } },
    },
  });

  if (!product) {
    throw new AppError("Produk tidak ditemukan.", 404);
  }
  return product;
}

/**
 * TODO:
 *
 * LOGIKA:
 * 1. Pakai getAll() yang sudah ada, pass { q: keyword }
 *    → HINT: tinggal return getAll({ q: keyword, ...options })
 * 2. Atau pakai fullTextSearch Prisma (previewFeatures sudah aktif di schema)
 *    → prisma.product.findMany({ where: { name: { search: keyword } } })
 *
 * HINT: Cara paling gampang adalah opsi 1
 */
export async function search(keyword: string, query?: Omit<ProductQuery, "q">) {
  return getAll({ q: keyword, ...query });
}