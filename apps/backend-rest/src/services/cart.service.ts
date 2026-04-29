import { Prisma } from "@ecommerce/shared/generated/prisma";
import { prisma } from "../config/database";
import { AppError } from "../middlewares/error.middleware";


// export interface CartItem {
//     productId: string;
//     quantity: number;
// }

// export interface Cart {
//     id: string;
//     userId: string;
//     items: CartItem[];
// }

const cartSelect = {
    id: true,
    userId: true,
    status: true,
    items: {
        select: {
            id: true,
            productId: true,
            quantity: true,
            priceAtTime: true,
            product: {
                select: {
                    name: true,
                    images: true,
                    categoryId: true,
                    slug: true,
                    price: true,
                    stock: true,
                    discount: true,
                    description: true,
                }
            }
        }
    }
} satisfies Prisma.CartSelect;

const applyDiscount = (price: number, discount: number) =>
    discount > 0 ? price * (1 - discount / 100) : price;

export async function getCartByUserId(userId: string) {
    let cart = await prisma.cart.findUnique({
        where: { userId },
        select: cartSelect,
    });

    // Buat cart baru kalau belum ada
    if (!cart) {
        return await prisma.cart.create({
            data: { userId, status: "active" },
            select: cartSelect,
        });
    }

    // Buat cart baru kalau yang ada sudah checked_out — jangan reaktivasi
    // supaya status checked_out bisa dipakai sebagai audit trail yang valid
    if (cart.status === "checked_out") {
        cart = await prisma.cart.create({
            data: { userId, status: "active" },
            select: cartSelect,
        });
    }

    // Stock = 0 → hapus item dari cart
    const outOfStockItems = cart.items.filter(item => item.product.stock === 0);
    if (outOfStockItems.length > 0) {
        cart = await prisma.cart.update({
            where: { id: cart.id },
            data: {
                items: {
                    deleteMany: { id: { in: outOfStockItems.map(item => item.id) } }
                }
            },
            select: cartSelect,
        });
    }

    // Stock ada tapi kurang dari quantity → cap ke stock
    const overQuantityItems = cart.items.filter(
        item => item.product.stock > 0 && item.product.stock < item.quantity
    );
    if (overQuantityItems.length > 0) {
        cart = await prisma.cart.update({
            where: { id: cart.id },
            data: {
                items: {
                    updateMany: overQuantityItems.map(item => ({
                        where: { id: item.id },
                        data: { quantity: item.product.stock },
                    }))
                }
            },
            select: cartSelect,
        });
    }

    // Sync harga (sudah include kalkulasi diskon sekaligus)
    const stalePriceItems = cart.items.filter(item => {
        const correctPrice = applyDiscount(
            Number(item.product.price),
            Number(item.product.discount ?? 0)
        );
        return Number(item.priceAtTime) !== correctPrice;
    });
    if (stalePriceItems.length > 0) {
        cart = await prisma.cart.update({
            where: { id: cart.id },
            data: {
                items: {
                    updateMany: stalePriceItems.map(item => ({
                        where: { id: item.id },
                        data: {
                            priceAtTime: applyDiscount(
                                Number(item.product.price),
                                Number(item.product.discount ?? 0)
                            ),
                        },
                    }))
                }
            },
            select: cartSelect,
        });
    }

    return cart;
}

export async function addItemToCart(userId: string, productId: string, quantity: number) {
    const cart = await getCartByUserId(userId);

    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, price: true, discount: true, stock: true },
    });
    if (!product) throw new AppError("Produk tidak ditemukan.", 404);

    const existingItem = cart.items.find(item => item.productId === productId);
    const totalQuantity = (existingItem?.quantity ?? 0) + quantity;
    if (product.stock < totalQuantity) throw new AppError("Stok tidak cukup.", 400)
    if (existingItem) {
        // Update quantity
        await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + quantity },
        });
    } else {
        // Tambah item baru
        await prisma.cartItem.create({
            data: {
                cartId: cart.id,
                productId: product.id,
                quantity,
                priceAtTime: applyDiscount(
                    Number(product.price),
                    Number(product.discount ?? 0)
                ),
            },
        });
    }
}

export async function updateCartItem(userId: string, itemId: string, quantity: number) {
    const cart = await getCartByUserId(userId);

    const item = cart.items.find(item => item.id === itemId);
    if (!item) throw new AppError("Item tidak ditemukan di cart.", 404);

    // Auto remove kalau quantity 0
    if (quantity === 0) {
        await prisma.cartItem.delete({ where: { id: itemId } });
        return;
    }

    const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { stock: true },
    });
    if (!product) throw new AppError("Produk tidak ditemukan.", 404);
    if (product.stock < quantity) throw new AppError("Stok tidak cukup.", 400);

    await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
    });
}

export async function removeCartItem(userId: string, itemId: string) {
    const cart = await getCartByUserId(userId);


    const item = cart.items.find(item => item.id === itemId);
    if (!item) throw new AppError("Item tidak ditemukan di cart.", 404);

    await prisma.cartItem.delete({ where: { id: itemId } });
}


export async function clearCart(userId: string) {
    const cart = await getCartByUserId(userId);

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}
