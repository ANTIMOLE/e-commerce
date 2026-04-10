import { z } from "zod";

// import { hashPassword } from "@ecommerce/shared/src/utils/hash";
// import { prisma } from "../config/database";
// import { AppError } from "../middlewares/error.middleware";
// import bcrypt from "bcryptjs/umd/types";
// import { id } from "zod/v4/locales";


// export async function getProfile(userId: string) {
//     return prisma.user.findUnique({
//         where: { id: userId },
//         select: {
//             id: true,
//             name: true,
//             email: true,
//             createdAt: true,
//             updatedAt: true,
//         },
//     });
// }

// export async function updateProfile(userId: string, data: any) {
//     const { name, phone } = data;
//     return prisma.user.update({
//         where: { id: userId },
//         data: { name, phone },
//     });
// }

// export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
//     const user = await prisma.user.findUnique({ where: { id: userId } });

//     if (!user) {
//         throw new AppError("User not found", 404);
//     }

//     const hashPassword = user.passwordHash;


//     const isMatch = await bcrypt.compare(currentPassword, hashPassword);
//     if (!isMatch) {
//         throw new AppError("Current password is incorrect", 400);
//     }

//     const hashedNewPassword = await bcrypt.hash(newPassword, 12);

//     await prisma.user.update({
//         where: { id: userId },
//         data: { passwordHash: hashedNewPassword },
//     });

//     return { message: "Password updated successfully" };

// }


// export async function getAddress( userId : string ){

//     return prisma.address.findMany({
//         where : { userId }
//     })

// }

// export async function addAddress( userId : string , data : any ){
//     const { label, recipientName ,phone, address, city , province , zipCode } = data;
//     return prisma.address.create({
//         data : {
//             label : label || null,
//             userId,
//             recipientName ,
//             phone,
//             address,
//             city ,
//             province ,
//             zipCode
//         }
//     })
// }

// export async function updateAddress( userId : string , addressId : string , data : any ){
//     const address = await prisma.address.findUnique({
//         where : { id : addressId }
//     })
//     if( !address || address.userId !== userId ) throw new AppError("Address not found", 404);

//     const { label, recipientName ,phone, address : addr, city , province , zipCode } = data;
//     return prisma.address.update({
//         where : { id : addressId },
//         data : {
//             label : label || null,
//             recipientName ,
//             phone,
//             address : addr,
//             city ,
//             province ,
//             zipCode
//         }
//     })
// }

// export async function deleteAddress( userId : string , addressId : string ){
//     const address = await prisma.address.findUnique({
//         where : { id : addressId }
//     })
//     if( !address || address.userId !== userId ) throw new AppError("Address not found", 404);

//     return prisma.address.delete({
//         where : { id : addressId }
//     }
//     )
// }


// export async function setDefaultAddress( userId : string , addressId : string ){
//     const address = await prisma.address.findUnique({
//         where : { id : addressId }
//     })
//     if( !address || address.userId !== userId ) throw new AppError("Address not found", 404);

//     await prisma.address.update({
//         where : { id : addressId },
//         data : { isDefault : true }
//     })

// }



export const updateProfileSchema = z.object({
    name : z.string().min(2).max(100).optional(),
    phone : z.string().min(9).max(20).optional()
})

export const addressSchema = z.object({
    label :         z.string().max(100).optional(),
    recipientName : z.string().min(2).max(100),
    phone :         z.string().min(9).max(20),
    address :       z.string().min(5),
    city :          z.string().min(2).max(100),
    province :      z.string().min(2).max(100),
    zipCode :       z.string().min(5).max(10),
    isDefault :     z.boolean().optional(),
})




export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
