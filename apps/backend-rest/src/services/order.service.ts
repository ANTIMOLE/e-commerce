import { prisma } from "../config/database";
import { AppError } from "../middlewares/error.middleware";
import { OrderStatus } from "@ecommerce/shared/generated/prisma";

//getOrders(userId, { page, limit, status }) — list order dengan pagination & filter status

export async function getOrders(userId: string, query: any) {
    // FIX: req.query selalu string. "10" dikirim ke Prisma take → Prisma throw error → 500.
    // Parse eksplisit ke number sebelum dipakai di skip/take.
    const page   = Number(query.page  ?? 1);
    const limit  = Number(query.limit ?? 20);
    // FIX: cast ke OrderStatus bukan string — Prisma where.status hanya terima enum OrderStatus,
    // bukan string literal biasa. TypeScript error terjadi karena string tidak assignable ke OrderStatus.
    const status = query.status as OrderStatus | undefined;

    const where = {
        userId,
        ...(status && { status }),
    };

    const total = await prisma.order.count({ where });
    const orders = await prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
            items: {
                select: {
                    id: true,
                    productId: true,
                    productName: true,
                    quantity: true,
                    unitPrice: true,
                    subtotal: true,
                    product: {
                        select: {
                            slug: true,
                            images: true,
                        }
                    }
                }
            }
        }
    });

    // FIX: Prisma Decimal (total, unitPrice, subtotal) ter-serialize ke string.
    // Normalize ke number supaya response contract konsisten dengan tRPC.
    const normalized = orders.map((order) => ({
        ...order,
        total: Number(order.total),
        items: order.items.map((item) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            subtotal:  Number(item.subtotal),
        })),
    }));

    return { orders: normalized, total };
}

//getOrderById(userId, orderId) — detail satu order + items

export async function getOrderById(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        select: {
            id:              true,
            orderNumber:     true,
            status:          true,
            subtotal:        true,
            tax:             true,
            shippingCost:    true,
            total:           true,
            shippingAddress: true,
            paymentMethod:   true,
            shippingMethod:  true,
            createdAt:       true,
            updatedAt:       true,
            items: {
                select: {
                    id:           true,
                    productId:    true,
                    productName:  true,
                    productImage: true,
                    quantity:     true,
                    unitPrice:    true,
                    subtotal:     true,
                    product: {
                        select: {
                            slug:   true,
                            images: true,
                        }
                    }
                }
            },
        }
    });

    if (!order) {
        throw new AppError("Order tidak ditemukan.", 404);
    }

    // FIX: Sama seperti getOrders() — Prisma Decimal ter-serialize ke string.
    // getOrderById sebelumnya tidak normalize, jadi total/subtotal/tax/shippingCost
    // dan items.unitPrice/subtotal masih Decimal object (jadi string di JSON response).
    return {
        ...order,
        subtotal:     Number(order.subtotal),
        tax:          Number(order.tax),
        shippingCost: Number(order.shippingCost),
        total:        Number(order.total),
        items: order.items.map((item) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            subtotal:  Number(item.subtotal),
        })),
    };
}


//cancelOrder(userId, orderId) — batalkan order (hanya jika status pending_payment)

export async function cancelOrder(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        select: { id: true, status: true },
    });
    if (!order) {
        throw new AppError("Order tidak ditemukan.", 404);
    }
    if (order.status !== "pending_payment") {
        throw new AppError("Order tidak bisa dibatalkan.", 400);
    }

    await prisma.order.update({
        where: { id: orderId },
        data: { status: "cancelled" },
    });
    return { message: "Order dibatalkan." };


}

//confirmOrder(userId, orderId) — konfirmasi pembayaran (hanya jika status pending_payment) — ubah status jadi processing lalu status ototmatis menjadi confirmed setelah 5 detik (simulasi proses pembayaran)
export async function confirmOrder(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
        where: { id: orderId, userId },
        select: { id: true, status: true },
    });
    if (!order) {
        throw new AppError("Order tidak ditemukan.", 404);
    }
    if (order.status !== "pending_payment") {
        throw new AppError("Order tidak bisa dikonfirmasi.", 400);
    }

    await prisma.order.update({
        where: { id: orderId },
        data: { status: "processing" },
    });

    // await new Promise(resolve => setTimeout(resolve, 5000)); // Simulasi proses pembayaran selama 5 detik
    await prisma.order.update({
        where: { id: orderId },
        data: { status: "confirmed" },
    });

    return { message: "Order dikonfirmasi." };
}


//shipOrder(orderId) — ubah status jadi shipped (fungsi ini bisa dipanggil admin untuk update status pengiriman)

export async function shipOrder(orderId: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
    });
    if (!order) {
        throw new AppError("Order tidak ditemukan.", 404);
    }
    if (order.status !== "confirmed") {
        throw new AppError("Order tidak bisa dikirim.", 400);
    }

    await prisma.order.update({
        where: { id: orderId },
        data: { status: "shipped" },
    });
    return { message: "Order dikirim." };
}

//deliverOrder(orderId) — ubah status jadi delivered (fungsi ini bisa dipanggil admin untuk update status pengiriman)

export async function deliverOrder(orderId: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
    });
    if (!order) {
        throw new AppError("Order tidak ditemukan.", 404);
    }
    if (order.status !== "shipped") {
        throw new AppError("Order tidak bisa di-delivered.", 400);
    }


    await prisma.order.update({
        where: { id: orderId },
        data: { status: "delivered" },
    });
    return { message: "Order delivered." };
}
