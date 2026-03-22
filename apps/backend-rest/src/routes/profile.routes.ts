import { Router ,IRouter } from "express";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { changePasswordSchema, addressSchema } from "@ecommerce/shared";

import {
    getProfileController,
    updateProfileController,
    changePasswordController,
    getAddressController,
    setDefaultAddressController,
    addAddressController,
    updateAddressController,
    deleteAddressController
} from "../controllers/profile.controller";
import { profile } from "node:console";


export const profileRoutes: IRouter = Router();

//PROTECTED ROUTES - harus login dulu

profileRoutes.get("/", authenticate, getProfileController);
profileRoutes.patch("/", authenticate, updateProfileController);
profileRoutes.patch("/change-password", authenticate, validate(changePasswordSchema), changePasswordController);
profileRoutes.get("/addresses", authenticate, getAddressController);
profileRoutes.post("/addresses", authenticate, validate(addressSchema), addAddressController);
profileRoutes.patch("/addresses/:addressId/default", authenticate, setDefaultAddressController);
profileRoutes.patch("/addresses/:addressId", authenticate, validate(addressSchema), updateAddressController);
profileRoutes.delete("/addresses/:addressId", authenticate, deleteAddressController);
