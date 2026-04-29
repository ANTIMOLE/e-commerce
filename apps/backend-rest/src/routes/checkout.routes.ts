import { Router,IRouter } from "express";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { calculateSummarySchema , checkoutConfirmSchema } from "@ecommerce/shared";

import {
    getCheckoutSummaryController,
    calculateCheckoutSummaryController,
    confirmCheckoutController,
} from "../controllers/checkout.controller";

export const checkoutRoutes: IRouter = Router();

//PROTECTED ROUTES - harus login dulu

checkoutRoutes.get("/summary/:orderNumber", authenticate, getCheckoutSummaryController);
checkoutRoutes.post("/calculate-summary", authenticate, validate(calculateSummarySchema), calculateCheckoutSummaryController);
checkoutRoutes.post("/confirm", authenticate, validate(checkoutConfirmSchema), confirmCheckoutController);
