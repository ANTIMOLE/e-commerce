import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { loginSchema, registerSchema , changePasswordSchema} from "@ecommerce/shared";
import {
  registerController,
  loginController,
  logoutController,
  changePasswordController,
  getProfileController,
  getMeController,
  refreshTokenController,
} from "../controllers/auth.controller";

export const authRouter = Router();

// Public routes
authRouter.post("/register", validate(registerSchema), registerController);
authRouter.post("/login",    validate(loginSchema),    loginController);

// Protected routes — harus login dulu
authRouter.post  ("/logout",          authenticate, logoutController);
authRouter.get   ("/profile",         authenticate, getProfileController);
authRouter.patch ("/change-password", authenticate, validate(changePasswordSchema), changePasswordController);
authRouter.get   ("/me",              authenticate, getMeController);
authRouter.post  ("/refresh",                       refreshTokenController);