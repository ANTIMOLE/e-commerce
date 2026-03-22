import { Router, IRouter } from "express";
import { authRouter }     from "./auth.routes";
import { productRouter }  from "./product.routes";
import { categoryRoutes } from "./category.routes";
import { cartRoutes }     from "./cart.routes";
import { checkoutRoutes } from "./checkout.routes";
import { orderRoutes }    from "./order.routes";
import { profileRoutes }  from "./profile.routes";
import { adminRoutes } from "./admin.routes";

export const router: IRouter = Router();

router.use("/auth",       authRouter);
router.use("/products",   productRouter);
router.use("/categories", categoryRoutes);
router.use("/cart",       cartRoutes);
router.use("/checkout",   checkoutRoutes);
router.use("/orders",     orderRoutes);
router.use("/profile",    profileRoutes);


router.use("/admin", adminRoutes);
