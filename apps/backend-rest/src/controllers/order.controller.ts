import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import * as orderService from "../services/order.service";

//getOrders

export async function getOrdersController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const orders = await orderService.getOrders(userId, req.query);
        res.json({
            success: true,
            message: "Orders retrieved successfully",
            data: orders,
        });
    } catch (error) {
        next(error);
    }
}

//getOrderById

export async function getOrderByIdController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user?.id;
        const orderId = Array.isArray(req.params.orderId)
            ? req.params.orderId[0]
            : req.params.orderId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const order = await orderService.getOrderById(userId, orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }
        res.json({
            success: true,
            message: "Order retrieved successfully",
            data: order,
        });
    } catch (error) {
        next(error);
    }
}

//cancelOrder

export async function cancelOrderController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user?.id;
        const orderId = Array.isArray(req.params.orderId)
            ? req.params.orderId[0]
            : req.params.orderId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await orderService.cancelOrder(userId, orderId);
        res.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
}

//confirmOrder

export async function confirmOrderController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user?.id;
        const orderId = Array.isArray(req.params.orderId)
            ? req.params.orderId[0]
            : req.params.orderId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const result = await orderService.confirmOrder(userId, orderId);
        res.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
}


//shipOrder

export async function shipOrderController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const orderId = Array.isArray(req.params.orderId)
            ? req.params.orderId[0]
            : req.params.orderId;
        const result = await orderService.shipOrder(orderId);
        res.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
}

//deliverOrder

export async function deliverOrderController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const orderId = Array.isArray(req.params.orderId)
            ? req.params.orderId[0]
            : req.params.orderId;
        const result = await orderService.deliverOrder(orderId);
        res.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
}


