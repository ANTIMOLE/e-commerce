import { Router, IRouter } from "express";
import { authRoutes }     from "./auth.routes";
import { productRoutes }  from "./product.routes";
import { categoryRoutes } from "./category.routes";
import { cartRoutes }     from "./cart.routes";
import { checkoutRoutes } from "./checkout.routes";
import { orderRoutes }    from "./order.routes";
import { profileRoutes }  from "./profile.routes";

export const router: IRouter = Router();

router.use("/auth",       authRoutes);
router.use("/products",   productRoutes);
router.use("/categories", categoryRoutes);
router.use("/cart",       cartRoutes);
router.use("/checkout",   checkoutRoutes);
router.use("/orders",     orderRoutes);
router.use("/profile",    profileRoutes);
