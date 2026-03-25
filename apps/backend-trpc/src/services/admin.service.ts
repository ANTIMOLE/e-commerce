import { OrderStatus } from "@ecommerce/shared/generated/prisma";
import { prisma } from "../config/database";
import { AppError } from "../middlewares/error.middleware";

// ============================================================
// ADMIN SERVICE
// Semua fungsi untuk modul admin (S-05: Admin Dashboard Flow)
// Query di sini berat (JOIN, agregasi) — relevan untuk riset performa
// ============================================================

// ── getDashboardStats ─────────────────────────────────────────
// Query agregasi berat: revenue, order count, top products, chart 30 hari
// Ini endpoint utama S-05 yang mengukur kemampuan tRPC vs REST handle aggregation
export async function getDashboardStats() {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalOrdersToday,
    weeklyRevenue,
    totalOrders,
    totalProducts,
    totalUsers,
    topProducts,
    recentOrders,
  ] = await Promise.all([
    // Total pesanan hari ini
    prisma.order.count({
      where: { createdAt: { gte: today } },
    }),

    // Revenue mingguan (hanya order yang bukan cancelled)
    prisma.order.aggregate({
      where: {
        createdAt: { gte: sevenDaysAgo },
        status: { not: "cancelled" },
      },
      _sum: { total: true },
    }),

    // Total semua order
    prisma.order.count(),

    // Total produk aktif
    prisma.product.count({ where: { isActive: true } }),

    // Total user
    prisma.user.count(),

    // Top 10 produk terlaris (by soldCount)
    prisma.product.findMany({
      where:   { isActive: true },
      select: {
        id:        true,
        name:      true,
        slug:      true,
        price:     true,
        stock:     true,
        soldCount: true,
        images:    true,
        category:  { select: { name: true } },
      },
      orderBy: { soldCount: "desc" },
      take:    10,
    }),

    // 10 order terbaru
    prisma.order.findMany({
      select: {
        id:          true,
        orderNumber: true,
        status:      true,
        total:       true,
        createdAt:   true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take:    10,
    }),
  ]);

  // Grafik penjualan 30 hari — grup by tanggal
  const salesChart = await prisma.order.groupBy({
    by:      ["createdAt"],
    where:   {
      createdAt: { gte: thirtyDaysAgo },
      status:    { not: "cancelled" },
    },
    _sum:    { total: true },
    _count:  { id: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    summary: {
      totalOrdersToday,
      weeklyRevenue:  Number(weeklyRevenue._sum.total ?? 0),
      totalOrders,
      totalProducts,
      totalUsers,
    },
    topProducts,
    recentOrders,
    salesChart: salesChart.map(row => ({
      date:    row.createdAt,
      revenue: Number(row._sum.total ?? 0),
      orders:  row._count.id,
    })),
  };
}

// ── getAllProducts ─────────────────────────────────────────────
// List semua produk untuk admin (termasuk yang nonaktif)
export async function getAllProducts(query: {
  page?:       number;
  limit?:      number;
  q?:          string;
  categoryId?: string;
  isActive?:   boolean;
}) {
  const { page = 1, limit = 20, q, categoryId, isActive } = query;

  const where = {
    ...(q          && { name: { contains: q, mode: "insensitive" as const } }),
    ...(categoryId && { categoryId }),
    ...(isActive !== undefined && { isActive }),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: {
        id:        true,
        name:      true,
        slug:      true,
        price:     true,
        stock:     true,
        soldCount: true,
        isActive:  true,
        discount:  true,
        images:    true,
        createdAt: true,
        category:  { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
  ]);

  return {
    data:        products,
    totalCount:  total,
    page,
    totalPages:  Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };
}

// ── createProduct ─────────────────────────────────────────────
export async function createProduct(data: {
  categoryId:   string;
  name:         string;
  description?: string;
  price:        number;
  stock:        number;
  images?:      string[];
  discount?:    number;
}) {
  const slug = data.name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200)
    .trim() + "-" + Date.now();

  return prisma.product.create({
    data: { ...data, slug, images: data.images ?? [] },
    select: {
      id: true, name: true, slug: true, price: true,
      stock: true, isActive: true, createdAt: true,
    },
  });
}

// ── updateProduct ─────────────────────────────────────────────
export async function updateProduct(
  id:   string,
  data: Partial<{
    name:        string;
    description: string;
    price:       number;
    stock:       number;
    images:      string[];
    discount:    number;
    isActive:    boolean;
    categoryId:  string;
  }>
) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError("Produk tidak ditemukan.", 404);

  return prisma.product.update({
    where: { id },
    data,
    select: {
      id: true, name: true, price: true, stock: true,
      isActive: true, updatedAt: true,
    },
  });
}

// ── deleteProduct ─────────────────────────────────────────────
// Soft delete — set isActive = false, tidak hapus dari DB
export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError("Produk tidak ditemukan.", 404);

  await prisma.product.update({
    where: { id },
    data:  { isActive: false },
  });

  return { message: "Produk dinonaktifkan." };
}

// ── getAllOrders ──────────────────────────────────────────────
export async function getAllOrders(query: {
  page?:   number;
  limit?:  number;
  status?: OrderStatus;
  q?:      string;
}) {
  const { page = 1, limit = 20, status, q } = query;

  const where = {
    ...(status && { status }),
    ...(q && {
      OR: [
        { orderNumber: { contains: q, mode: "insensitive" as const } },
        { user: { email: { contains: q, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: {
        id:          true,
        orderNumber: true,
        status:      true,
        total:       true,
        createdAt:   true,
        paymentMethod:  true,
        shippingMethod: true,
        user:  { select: { id: true, name: true, email: true } },
        items: { select: { id: true, productName: true, quantity: true, unitPrice: true } },
      },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
  ]);

  return {
    data:        orders,
    totalCount:  total,
    page,
    totalPages:  Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };
}

// ── updateOrderStatus ─────────────────────────────────────────
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: { id: true, status: true },
  });
  if (!order) throw new AppError("Order tidak ditemukan.", 404);

  // Validasi transisi status
  const validTransitions: Record<string, OrderStatus[]> = {
    pending_payment: ["confirmed", "cancelled"],
    confirmed:       ["processing"],
    processing:      ["shipped"],
    shipped:         ["delivered"],
    delivered:       [],
    cancelled:       [],
  };

  if (!validTransitions[order.status]?.includes(status)) {
    throw new AppError(
      `Tidak bisa mengubah status dari ${order.status} ke ${status}.`, 400
    );
  }

  return prisma.order.update({
    where:  { id: orderId },
    data:   { status },
    select: { id: true, orderNumber: true, status: true, updatedAt: true },
  });
}

// ── getAdminUsers ─────────────────────────────────────────────
// Opsional — list user untuk admin
export async function getAllUsers(query: { page?: number; limit?: number; q?: string }) {
  const { page = 1, limit = 20, q } = query;

  const where = q
    ? {
        OR: [
          { name:  { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        phone:     true,
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
  ]);

  return {
    data:        users,
    totalCount:  total,
    page,
    totalPages:  Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  };
}