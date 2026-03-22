import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import * as checkoutService from "../services/checkout.service";


//getCheckoutSummary

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
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
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

//calculateCheckoutSummary

export async function calculateCheckoutSummaryController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {

        const { cartId } = req.body;
        const checkoutSummary = await checkoutService.calculateCheckoutSummary(cartId);
        res.json({
            success: true,
            message: "Checkout summary calculated successfully",
            data: checkoutSummary,
        });
    } catch (error) {
        next(error);
    }
}

//confirmCheckout

export async function confirmCheckoutController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user?.id;
        const { cartId, addressId, paymentMethod, shippingMethod } = req.body;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
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



