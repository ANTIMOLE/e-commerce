import { prisma } from "../config/database";
import { AppError } from "../middlewares/error.middleware";
import bcrypt from "bcryptjs";


export async function getProfile(userId: string) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id:        true,
            name:      true,
            email:     true,
            // FIX [High]: tambah phone — sebelumnya tidak di-select sehingga tampil kosong di UI profil
            phone:     true,
            createdAt: true,
            updatedAt: true,
        },
    });
}

export async function updateProfile(userId: string, data: any) {
    const { name, phone } = data;
    return prisma.user.update({
      where: { id: userId },
      data: { name, phone },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, updatedAt: true },
    });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError("User tidak ditemukan", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError("Password lama salah", 400);
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedNewPassword },
    });

    return { message: "Password berhasil diubah" };
}


export async function getAddress(userId: string) {
    return prisma.address.findMany({
        where: { userId }
    });
}

export async function addAddress(userId: string, data: any) {
    const { label, recipientName, phone, address, city, province, zipCode, isDefault } = data;

    if (isDefault) {
        await prisma.address.updateMany({
            where: { userId, isDefault: true },
            data:  { isDefault: false },
        });
    }

    return prisma.address.create({
        data: {
            label:         label || null,
            userId,
            recipientName,
            phone,
            address,
            city,
            province,
            zipCode,
            isDefault:     isDefault ?? false,
        }
    });
}

export async function updateAddress(userId: string, addressId: string, data: any) {
    const address = await prisma.address.findUnique({
        where: { id: addressId }
    });
    if (!address || address.userId !== userId) throw new AppError("Address not found", 404);

    const { label, recipientName, phone, address: addr, city, province, zipCode } = data;
    return prisma.address.update({
        where: { id: addressId },
        data: {
          ...(label !== undefined ? { label: label || null } : {}),
            recipientName,
            phone,
            address:       addr,
            city,
            province,
            zipCode,
        }
    });
}

export async function deleteAddress(userId: string, addressId: string) {
    const address = await prisma.address.findUnique({
        where: { id: addressId }
    });
    if (!address || address.userId !== userId) throw new AppError("Address not found", 404);

    return prisma.address.delete({
        where: { id: addressId }
    });
}


export async function setDefaultAddress(userId: string, addressId: string) {
    const address = await prisma.address.findUnique({
        where: { id: addressId }
    });
    if (!address || address.userId !== userId) throw new AppError("Address not found", 404);

    await prisma.$transaction([
        prisma.address.updateMany({
            where: { userId, isDefault: true },
            data:  { isDefault: false },
        }),
        prisma.address.update({
            where: { id: addressId },
            data:  { isDefault: true },
        }),
    ]);
}
