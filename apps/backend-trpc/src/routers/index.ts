import { router }           from "../trpc/init";
import { authRouter }      from "./auth.router";
import { productRouter }   from "./product.router";
import { categoryRouter }  from "./category.router";
import { cartRouter }      from "./cart.router";
import { checkoutRouter }  from "./checkout.router";
import { orderRouter }     from "./order.router";
import { profileRouter }   from "./profile.router";
import { adminRouter }     from "./admin.router";

export const appRouter = router({
  auth:     authRouter,
  product:  productRouter,
  category: categoryRouter,
  cart:     cartRouter,
  checkout: checkoutRouter,
  order:    orderRouter,
  profile:  profileRouter,
  admin:    adminRouter,
});

export type AppRouter = typeof appRouter;
