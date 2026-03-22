import { Router,IRouter } from "express";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { addCartItemSchema, cartItemIdSchema, updateCartItemSchema } from "@ecommerce/shared";
import {
    addItemToCartController,
    getCartController,
    updateCartItemController,
    removeCartItemController,
    clearCartController
} from "../controllers/cart.controller";


export const cartRoutes: IRouter = Router();

//PROTECTED ROUTES - harus login dulu

cartRoutes.get("/", authenticate,validate(cartItemIdSchema), getCartController);
cartRoutes.post("/", authenticate, validate(addCartItemSchema), addItemToCartController);
cartRoutes.patch("/:itemId", authenticate, validate(updateCartItemSchema), updateCartItemController);
cartRoutes.delete("/:itemId", authenticate, validate(cartItemIdSchema), removeCartItemController);
cartRoutes.delete("/", authenticate, clearCartController);

