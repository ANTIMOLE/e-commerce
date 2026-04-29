import { Router, IRouter } from "express";
import { validate } from "../middlewares/validate.middleware";
import { authenticate } from "../middlewares/auth.middleware";
import { addressSchema, updateProfileSchema } from "@ecommerce/shared";

import {
    getProfileController,
    updateProfileController,
    getAddressController,
    setDefaultAddressController,
    addAddressController,
    updateAddressController,
    deleteAddressController
} from "../controllers/profile.controller";


export const profileRoutes: IRouter = Router();

//PROTECTED ROUTES - harus login dulu

profileRoutes.get("/", authenticate, getProfileController);

// FIX [Medium]: tambahkan validate(updateProfileSchema) supaya payload invalid
// ditolak di REST seperti halnya di tRPC. Sebelumnya tidak ada validasi sama sekali.
profileRoutes.patch("/", authenticate, validate(updateProfileSchema), updateProfileController);

// FIX [High]: hapus duplikat PATCH /profile/change-password.
// Endpoint ini memanggil profileService.changePassword() yang TIDAK me-revoke
// refresh token — berbeda dengan PATCH /auth/change-password yang memakai
// authService.changePassword() dengan revoke token. Dua endpoint sama tapi
// beda perilaku keamanan adalah bug. Frontend REST sudah benar memanggil
// /auth/change-password, jadi route ini tidak dibutuhkan dan cukup dihapus.

profileRoutes.get("/addresses", authenticate, getAddressController);
profileRoutes.post("/addresses", authenticate, validate(addressSchema), addAddressController);
profileRoutes.patch("/addresses/:addressId/default", authenticate, setDefaultAddressController);
// FIX [High — round 1]: pakai addressSchema.partial() agar update sebagian field tidak 400
profileRoutes.patch("/addresses/:addressId", authenticate, validate(addressSchema.partial()), updateAddressController);
profileRoutes.delete("/addresses/:addressId", authenticate, deleteAddressController);
