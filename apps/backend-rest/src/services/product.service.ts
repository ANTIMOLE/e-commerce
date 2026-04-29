import { prisma } from "../config/database";
import { AppError } from "../middlewares/error.middleware";

export interface ProductQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: "price" | "rating" | "soldCount" | "createdAt" | "sold_count" | "created_at";
  sortOrder?: "asc" | "desc";
}

export async function getAll(query: ProductQuery) {
  const {
    page = 1,
    limit = 20,
    categoryId,
    q,
    minPrice,
    maxPrice,
    minRating,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  // FIX [Medium]: ganti truthy check ke !== undefined supaya nilai 0 tetap dipakai.
  // Sebelumnya `minPrice && { gte: minPrice }` — kalau minPrice=0 hasilnya falsy,
  // filter tidak terbentuk, dan semua harga lolos. Sama untuk maxPrice dan minRating.
  const where = {
    isActive: true,
    ...(categoryId && { categoryId }),
    ...(q && { name: { contains: q, mode: "insensitive" as const } }),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined && { gte: minPrice }),
            ...(maxPrice !== undefined && { lte: maxPrice }),
          },
        }
      : {}),
    ...(minRating !== undefined && { rating: { gte: minRating } }),
  };

  const sortMapping: Record<string, string> = {
    "created_at": "createdAt",
    "createdAt":  "createdAt",
    "sold_count": "soldCount",
    "soldCount":  "soldCount",
    "price":      "price",
    "rating":     "rating",
  };

  const finalSortBy = sortMapping[sortBy] || "createdAt";

  const total = await prisma.product.count({ where });

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
    orderBy: { [finalSortBy]: sortOrder },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    data:        products,
    totalCount:  total,
    page,
    totalPages:  Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };
}

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

export async function search(keyword: string, query?: Omit<ProductQuery, "q">) {
  return getAll({ q: keyword, ...query });
}
