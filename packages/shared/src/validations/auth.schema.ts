import { z } from "zod";

export const registerSchema = z.object({
  name:     z.string().min(2, "Nama minimal 2 karakter").max(100),
  email:    z.string().email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Password harus mengandung huruf besar")
    .regex(/[a-z]/, "Password harus mengandung huruf kecil")
    .regex(/[0-9]/, "Password harus mengandung angka"),
});

export const loginSchema = z.object({
  email:    z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password tidak boleh kosong"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Password harus mengandung huruf besar")
    .regex(/[a-z]/, "Password harus mengandung huruf kecil")
    .regex(/[0-9]/, "Password harus mengandung angka"),
});

export type RegisterInput      = z.infer<typeof registerSchema>;
export type LoginInput         = z.infer<typeof loginSchema>;
export type RefreshTokenInput  = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
