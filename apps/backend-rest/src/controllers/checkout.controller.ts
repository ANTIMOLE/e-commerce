import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import * as checkoutService from "../services/checkout.service";


export async function getCheckoutSummaryController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user?.id;
        const orderNumber = Array.isArray(req.params.orderNumber)
            ? req.params.orderNumber[0]
            : req.params.orderNumber;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const checkoutSummary = await checkoutService.getCheckoutSummary(userId, orderNumber);
        res.json({
            success: true,
            message: "Checkout summary retrieved successfully",
            data: checkoutSummary,
        });
    } catch (error) {
        next(error);
    }
}

export async function calculateCheckoutSummaryController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { cartId, shippingMethod } = req.body;
        // FIX [Critical]: pass userId ke service supaya kepemilikan cart diverifikasi
        const checkoutSummary = await checkoutService.calculateCheckoutSummary(userId, cartId, shippingMethod);
        res.json({
            success: true,
            message: "Checkout summary calculated successfully",
            data: checkoutSummary,
        });
    } catch (error) {
        next(error);
    }
}

export async function confirmCheckoutController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user?.id;
        const { cartId, addressId, paymentMethod, shippingMethod } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const order = await checkoutService.confirmCheckout(userId, cartId, addressId, paymentMethod, shippingMethod);
        res.json({
            success: true,
            message: "Checkout confirmed successfully",
            data: order,
        });
    } catch (error) {
        next(error);
    }
}
