import { PaymentMethod, ShippingMethod } from "@ecommerce/shared/generated/prisma";
import { prisma } from "../config/database";
import { AppError } from "../middlewares/error.middleware";

const flatTax  = 0.11;
const regular  = 15_000;
const express  = 35_000;

// FIX [Critical]: tambah userId agar hanya pemilik cart yang bisa menghitung summary-nya.
export async function calculateCheckoutSummary(userId: string, cartId: string, shippingMethod: string) {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    select: { userId: true, items: { select: { quantity: true, priceAtTime: true } } },
  });

  if (!cart || cart.userId !== userId) {
    throw new AppError("Cart tidak ditemukan.", 404);
  }

  const flatShipping = shippingMethod === "express" ? express : regular;
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.quantity * Number(item.priceAtTime), 0
  );
  const tax   = subtotal * flatTax;
  const total = subtotal + tax + flatShipping;

  return { subtotal, tax, shippingCost: flatShipping, total };
}

export async function getCheckoutSummary(userId: string, orderNumber: string) {
  const checkout = await prisma.order.findFirst({
    where: { orderNumber, userId },
    select: {
      orderNumber: true, status: true, total: true, subtotal: true, tax: true,
      shippingAddress: true, shippingCost: true, paymentMethod: true, shippingMethod: true,
      user: { select: { name: true, email: true, phone: true } },
      address: {
        select: {
          recipientName: true, phone: true, address: true,
          city: true, zipCode: true, province: true,
        },
      },
      items: {
        select: {
          id: true, orderId: true, productId: true, productName: true,
          quantity: true, unitPrice: true, subtotal: true,
          product: { select: { slug: true, images: true, stock: true } },
        },
      },
    },
  });

  if (!checkout) throw new AppError("Checkout not found", 404);

  // FIX: tRPC tidak punya serializer otomatis untuk Prisma Decimal.
  // Sama seperti REST — Decimal ter-serialize ke string kalau tidak di-Number()-kan dulu.
  return {
    ...checkout,
    total:        Number(checkout.total),
    subtotal:     Number(checkout.subtotal),
    tax:          Number(checkout.tax),
    shippingCost: Number(checkout.shippingCost),
    items: (checkout.items ?? []).map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      subtotal:  Number(item.subtotal),
    })),
  };
}

export async function confirmCheckout(
  userId:         string,
  cartId:         string,
  addressId:      string,
  paymentMethod:  string,
  shippingMethod: string
) {
  if (!Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) {
    throw new AppError("Invalid payment method", 400);
  }
  if (!Object.values(ShippingMethod).includes(shippingMethod as ShippingMethod)) {
    throw new AppError("Invalid shipping method", 400);
  }

  // FIX [Critical]: verifikasi kepemilikan address sebelum masuk tx
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) {
    throw new AppError("Address tidak ditemukan.", 404);
  }

  const addressJSON = {
    recipientName: address.recipientName,
    phone:         address.phone,
    address:       address.address,
    city:          address.city,
    province:      address.province,
    zipCode:       address.zipCode,
  };

  const flatShipping = shippingMethod === "express" ? express : regular;

  const order = await prisma.$transaction(async (tx) => {
    // FIX [Critical]: filter cart by id AND userId dalam tx
    const cart = await tx.cart.findUnique({
      where: { id: cartId },
      select: {
        userId: true,
        items: { select: { productId: true, quantity: true, priceAtTime: true } },
      },
    });

    if (!cart || cart.userId !== userId) {
      throw new AppError("Cart tidak ditemukan.", 404);
    }

    if (cart.items.length === 0) {
      throw new AppError("Cart is empty.", 400);
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.quantity * Number(item.priceAtTime), 0
    );
    const tax   = subtotal * flatTax;
    const total = subtotal + tax + flatShipping;

    const productIds = cart.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where:  { id: { in: productIds } },
      select: { id: true, stock: true, name: true },
    });

    for (const item of cart.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        throw new AppError(`Stok ${product?.name ?? item.productId} tidak cukup.`, 400);
      }
    }

    const newOrder = await tx.order.create({
      data: {
        userId,
        orderNumber:     `ORD-${Date.now()}`,
        subtotal,
        tax,
        shippingCost:    flatShipping,
        total,
        paymentMethod:   paymentMethod as PaymentMethod,
        shippingMethod:  shippingMethod as ShippingMethod,
        addressId,
        shippingAddress: addressJSON,
        items: {
          create: cart.items.map((item) => ({
            productId:   item.productId,
            quantity:    item.quantity,
            unitPrice:   item.priceAtTime,
            subtotal:    item.quantity * Number(item.priceAtTime),
            productName: products.find((p) => p.id === item.productId)?.name ?? "Unknown Product",
          })),
        },
      },
      include: { items: true },
    });

    await Promise.all(
      cart.items.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: {
            stock:     { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        })
      )
    );

    await tx.cartItem.deleteMany({ where: { cartId } });
    await tx.cart.update({ where: { id: cartId }, data: { status: "checked_out" } });

    return newOrder;
  });

  return order;
}
