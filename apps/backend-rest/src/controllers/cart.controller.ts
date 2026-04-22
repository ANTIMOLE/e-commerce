import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import * as cartService from "../services/cart.service";
// ============================================================
// GET /cart
export async function getCartController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User tidak ditemukan.",
            });
        }
        const cart = await cartService.getCartByUserId(req.user.id);
        res.json({
            success: true,
            message: "Cart berhasil diambil.",
            data: cart,
        });
    } catch (error) {
        next(error);
    }
}

export async function addItemToCartController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User tidak ditemukan.",
            });
        }
        const { productId, quantity } = req.body;
        const cart = await cartService.addItemToCart(req.user.id, productId, quantity);
        res.json({
            success: true,
            message: "Item berhasil ditambahkan ke cart.",
            data: cart,
        });
    } catch (error) {
        next(error);
    }
}


export async function updateCartItemController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User tidak ditemukan.",
            });
        }
        const itemId = req.params.itemId as string;
        const { quantity } = req.body;
        const cart = await cartService.updateCartItem(req.user.id, itemId, quantity);
        res.json({
            success: true,
            message: "Item cart berhasil diperbarui.",
            data: cart,
        });
    } catch (error) {
        next(error);
    }
}

export async function removeCartItemController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User tidak ditemukan.",
            });
        }
        const rawItemId = req.params.itemId;
        const itemId = Array.isArray(rawItemId) ? rawItemId[0] : rawItemId;
        if (!itemId) {
            return res.status(400).json({
                success: false,
                message: "itemId tidak valid.",
            });
        }
        const cart = await cartService.removeCartItem(req.user.id, itemId);
        res.json({
            success: true,
            message: "Item cart berhasil dihapus.",
            data: cart,
        });
    } catch (error) {
        next(error);
    }
}

export async function clearCartController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User tidak ditemukan.",
            });
        }
        const cart = await cartService.clearCart(req.user.id);
        res.json({
            success: true,
            message: "Cart berhasil dikosongkan.",
            data: cart,
        });
    } catch (error) {
        next(error);
    }
}
