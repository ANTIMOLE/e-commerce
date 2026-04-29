import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import * as profileService from "../services/profile.service";

export async function getProfileController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        const profile = await profileService.getProfile(req.user.id);
        res.json({
            success: true,
            message: "Profile retrieved successfully",
            data: profile,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateProfileController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        const updatedProfile = await profileService.updateProfile(req.user.id, req.body);
        res.json({
            success: true,
            message: "Profile updated successfully",
            data: updatedProfile,
        });
    } catch (error) {
        next(error);
    }
}

export async function changePasswordController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        // FIX [Critical]: schema mewajibkan `oldPassword`, bukan `currentPassword`.
        // Sebelumnya controller membaca `currentPassword` sehingga selalu undefined.
        const { oldPassword, newPassword } = req.body;
        const result = await profileService.changePassword(req.user.id, oldPassword, newPassword);
        res.json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
}


export async function getAddressController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        const addresses = await profileService.getAddress(req.user.id);
        res.json({
            success: true,
            message: "Addresses retrieved successfully",

            data: addresses,
        });
    } catch (error) {
        next(error);
    }
}

export async function setDefaultAddressController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;

        }
        const addressId = Array.isArray(req.params.addressId) ? req.params.addressId[0] : req.params.addressId;
        await profileService.setDefaultAddress(req.user.id, addressId);
        res.json({
            success: true,
            message: "Default address set successfully",
        });
    } catch (error) {
        next(error);
    }
}

export async function addAddressController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        const newAddress = await profileService.addAddress(req.user.id, req.body);
        res.status(201).json({
            success: true,
            message: "Address added successfully",
            data: newAddress,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateAddressController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }

        const addressId = Array.isArray(req.params.addressId) ? req.params.addressId[0] : req.params.addressId;
        const updatedAddress = await profileService.updateAddress(req.user.id, addressId, req.body);
        res.json({
            success: true,
            message: "Address updated successfully",
            data: updatedAddress,
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteAddressController(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
            return;
        }
        const addressId = Array.isArray(req.params.addressId) ? req.params.addressId[0] : req.params.addressId;
        await profileService.deleteAddress(req.user.id, addressId);
        res.json({
            success: true,
            message: "Address deleted successfully",
        });
    } catch (error) {
        next(error);
    }
}
