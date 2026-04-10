import { prisma } from "../config/database";
import { AppError } from "../middlewares/error.middleware";

//getOrders(userId, { page, limit, status }) — list order dengan pagination & filter status

export async function getOrders(userId: string, query: any) {
    const { page = 1, limit = 20, status } = query;

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
    return { orders, total };
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

    return order;
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
