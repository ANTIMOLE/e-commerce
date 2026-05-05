import { Router, IRouter } from "express";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { z } from "zod";
import {
    getOrdersController,
    getOrderByIdController,
    cancelOrderController,
    confirmOrderController,
    shipOrderController,
    deliverOrderController
} from "../controllers/order.controller";
import { requireAdmin } from "../middlewares/role.middleware";

export const orderRoutes: IRouter = Router();

// FIX: Validasi params :orderId sebagai UUID sebelum masuk controller.
// Tanpa ini, GET /orders/bukan-uuid langsung ke service → findFirst miss → 404.
// Test rest.test.ts line 652 expect 400 — contract yang benar karena "bukan-uuid"
// bukan ID yang valid secara format, bukan sekadar "tidak ditemukan".
const orderIdParamsSchema = z.object({
    orderId: z.string().uuid("orderId harus berformat UUID"),
});

orderRoutes.get("/",                  authenticate, getOrdersController);
orderRoutes.get("/:orderId",          authenticate, validate(orderIdParamsSchema, "params"), getOrderByIdController);
orderRoutes.post("/:orderId/cancel",  authenticate, validate(orderIdParamsSchema, "params"), cancelOrderController);
orderRoutes.post("/:orderId/confirm", authenticate, validate(orderIdParamsSchema, "params"), confirmOrderController);
orderRoutes.post("/:orderId/ship",    authenticate, requireAdmin, validate(orderIdParamsSchema, "params"), shipOrderController);
orderRoutes.post("/:orderId/deliver", authenticate, requireAdmin, validate(orderIdParamsSchema, "params"), deliverOrderController);
