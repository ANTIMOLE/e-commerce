import { Router, IRouter } from "express";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { orderItemSchema,  orderCreateSchema} from "@ecommerce/shared";
import {
    getOrdersController,
    getOrderByIdController,
    cancelOrderController,
    confirmOrderController,
    shipOrderController,
    deliverOrderController
} from "../controllers/order.controller";


export const orderRoutes: IRouter = Router();

//PROTECTED ROUTES - harus login dulu

//CONTOH
//PROTECTED ROUTES - harus login dulu

// checkoutRoutes.get("/summary/:orderNumber", authenticate, getCheckoutSummaryController);
// checkoutRoutes.post("/calculate-summary", validate(cartItemIdSchema),calculateCheckoutSummaryController);
// checkoutRoutes.post("/confirm", authenticate, validate(checkoutConfirmSchema), confirmCheckoutController);

orderRoutes.get("/", authenticate, validate(orderItemSchema), getOrdersController);
orderRoutes.get("/:orderId", authenticate, getOrderByIdController);
orderRoutes.post("/:orderId/cancel", authenticate, cancelOrderController);
orderRoutes.post("/:orderId/confirm", authenticate, confirmOrderController);
orderRoutes.post("/:orderId/ship", authenticate, shipOrderController);
orderRoutes.post("/:orderId/deliver", authenticate, deliverOrderController);
