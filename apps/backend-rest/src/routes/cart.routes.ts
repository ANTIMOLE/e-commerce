import { Router,IRouter } from "express";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { addCartItemSchema, updateCartItemSchema } from "@ecommerce/shared";
import {
    addItemToCartController,
    getCartController,
    updateCartItemController,
    removeCartItemController,
    clearCartController
} from "../controllers/cart.controller";


export const cartRoutes: IRouter = Router();

// PROTECTED ROUTES - harus login dulu

cartRoutes.get   ("/",         authenticate, getCartController);
cartRoutes.post  ("/",         authenticate, validate(addCartItemSchema),    addItemToCartController);
cartRoutes.patch ("/:itemId", authenticate, validate(updateCartItemSchema), updateCartItemController);
cartRoutes.delete("/",         authenticate, clearCartController);
cartRoutes.delete("/:itemId", authenticate, removeCartItemController);
