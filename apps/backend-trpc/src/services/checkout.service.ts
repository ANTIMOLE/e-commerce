import { PaymentMethod, ShippingMethod } from "@ecommerce/shared/generated/prisma";
import { prisma } from "../config/database";
import { AppError } from "../middlewares/error.middleware";

const flatTax = 0.1; // 10% flat tax for simplicity
const regular = 15000
const express = 25000

export async function getCheckoutSummary(userId: string , orderNumber : string) {
    const checkout = await prisma.order.findUnique({
        where: { orderNumber: orderNumber },
        select:{
            orderNumber : true,
            status : true,
            total : true,
            subtotal : true,
            tax : true,
            shippingAddress : true,
            shippingCost : true,
            paymentMethod : true,
            shippingMethod : true,   
            user : {
                select : {
                    name : true,
                    email : true,
                    phone : true,
                }
             },
             address : {
                select : {
                    recipientName : true,
                    phone : true,
                    address : true,
                    city : true,
                    zipCode : true,
                    province : true,
                }
             },
             items : {
                select : {
                    id : true,
                    orderId : true,
                    productId : true,
                    productName : true,
                    quantity    : true,
                    unitPrice : true,
                    subtotal : true,
                    product : {
                        select : {
                            slug : true,
                            images : true,
                            stock : true,
                        }
                    }
                }
             }
        }
    });

        if( !checkout  ) throw new AppError("Checkout not found", 404);

    return checkout;

}

export async function calculateCheckoutSummary(cartId: string, shippingMethod: string) {
    const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        select: {
            items: {
                select: {
                    quantity: true,
                    priceAtTime: true,
                },
            },
        },
    });

    let flatShipping = regular;
    if(shippingMethod === "regular") {
        flatShipping = regular;
    } else if (shippingMethod === "express") {
        flatShipping = express;
    }

    const subtotal = cart?.items.reduce((sum, item) => sum + item.quantity * Number(item.priceAtTime), 0) || 0;
    const tax = subtotal * flatTax;
    const total = subtotal + tax + flatShipping;

    return {
        subtotal,
        tax,
        shippingCost: flatShipping,
        total,
    };
}

export async function confirmCheckout(userId: string, cartId: string, addressId: string, paymentMethod: string, shippingMethod: string) {
    const cart = await prisma.cart.findUnique({
        where: { id: cartId },
        select: {
            items: {
                select: {
                    productId: true,
                    quantity: true,
                    priceAtTime: true,
                },
            },
        },
    });


        if (!cart || cart.items.length === 0) {
        throw new AppError("Cart is empty.", 400);
    }

    const { subtotal, tax, shippingCost, total } = await calculateCheckoutSummary(cartId, shippingMethod);

    if (!Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) {
        throw new Error("Invalid payment method");
    }

    if (!Object.values(ShippingMethod).includes(shippingMethod as ShippingMethod)) {
        throw new Error("Invalid shipping method");
    }

    const address = await prisma.address.findUnique({
        where: { id: addressId },
    });

    if (!address) {
        throw new AppError("Address not found", 404);
    }

    const addressJSON = {
        recipientName: address?.recipientName,
        phone: address?.phone,
        address: address?.address,
        city: address?.city,
        province: address?.province,
        zipCode: address?.zipCode,
    };
        

    const productNames = await Promise.all(
        cart.items.map(item =>
            prisma.product.findUnique({
                where: { id: item.productId },
                select: { name: true },
            }).then(product => product?.name || "Unknown Product")
        )
    );

    const productStocks = await prisma.product.findMany({
        where: { id: { in: cart.items.map(i => i.productId) } },
        select: { id: true, stock: true, name: true },
        });

        for (const item of cart.items) {
        const product = productStocks.find(p => p.id === item.productId);
        if (!product || product.stock < item.quantity) {
            throw new AppError(
            `Stok ${product?.name ?? item.productId} tidak cukup.`, 400
            );
        }
    }

    const order = await prisma.order.create({
        data: {
            userId,
            orderNumber: `ORD-${Date.now()}`,
            subtotal,
            tax,
            shippingCost,
            total,
            paymentMethod: paymentMethod as PaymentMethod,
            shippingMethod: shippingMethod as ShippingMethod,
            addressId,
            shippingAddress: addressJSON,
            items: {
                create: cart.items.map((item, index) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.priceAtTime,
                    subtotal: item.quantity * Number(item.priceAtTime),
                    productName: productNames[index],
                })),
            },
        },
        include: {
            items: true,
        },
    });

    await prisma.$transaction([
    // 1. Kurangi stok masing-masing produk
    ...cart.items.map(item =>
        prisma.product.update({
        where: { id: item.productId },
        data:  { stock: { decrement: item.quantity } },
        })
    ),
    // 2. Tambah soldCount masing-masing produk
    ...cart.items.map(item =>
        prisma.product.update({
        where: { id: item.productId },
        data:  { soldCount: { increment: item.quantity } },
        })
    ),
    // 3. Kosongkan cart
    prisma.cartItem.deleteMany({ where: { cartId } }),
    // 4. Update status cart jadi checked_out
    prisma.cart.update({
        where: { id: cartId },
        data:  { status: "checked_out" },
    }),
    ]);

return order;
    
    return order;
}