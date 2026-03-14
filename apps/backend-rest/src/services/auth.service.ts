import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { AppError } from "../middlewares/error.middleware";
import type {
  LoginInput,
  RegisterInput,
} from "@ecommerce/shared";


const COOKIE_OPTIONS = {
  httpOnly:  true,
  secure:    env.NODE_ENV === "production",
  sameSite:  "lax" as const,
};

function signAccessToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRY as SignOptions["expiresIn"],
  });
}

function signRefreshToken(userId: string) {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as SignOptions["expiresIn"],
  });
}
/**
 * LOGIKA:
 * 1. Cek email sudah dipakai atau belum
 * 2. Hash password pakai bcrypt
 * 3. Simpan user baru ke DB
 * 4. Buat access token + refresh token
 * 5. Simpan hash refresh token ke tabel refresh_tokens
 * 6. Return tokens + data user (tanpa password)
 */
export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new AppError("Email sudah terdaftar.", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name:         input.name,
      email:        input.email,
      passwordHash,
    },
    select: {
      id:        true,
      name:      true,
      email:     true,
      role:      true,
      createdAt: true,
    },
  });

  const accessToken  = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id);

  const tokenHash = await bcrypt.hash(refreshToken, 10);
  await prisma.refreshToken.create({
    data: {
      userId:    user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 hari
    },
  });

  return { user, accessToken, refreshToken };
}
/**
 * LOGIKA:
 * 1. Cari user by email
 * 2. Bandingkan password dengan hash di DB (bcrypt.compare)
 * 3. Buat access token + refresh token
 * 4. Simpan hash refresh token ke DB (revoke yang lama optional)
 * 5. Return tokens + data user
 */
export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (!user) {
    throw new AppError("Email atau password salah.", 401);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError("Email atau password salah.", 401);
  }

  const accessToken  = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id);

  const tokenHash = await bcrypt.hash(refreshToken, 10);
  await prisma.refreshToken.create({
    data: {
      userId:    user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * LOGIKA:
 * 1. Ambil refresh token dari cookie
 * 2. Cari di DB, tandai revoked = true
 * 3. Clear cookie
 */
export async function logout(userId: string) {
  // Revoke semua refresh token milik user ini
  await prisma.refreshToken.updateMany({
    where:  { userId, revoked: false },
    data:   { revoked: true },
  });
}


/**
 * TODO — lengkapi logikanya:
 *
 * LOGIKA:
 * 1. Cari user by userId (dari req.user.id)
 * 2. Bandingkan oldPassword dengan passwordHash di DB
 *    → kalau salah, throw AppError("Password lama salah", 400)
 * 3. Hash newPassword
 * 4. Update passwordHash di DB
 * 5. Revoke semua refresh token (paksa login ulang di device lain)
 * 6. Return { message: "Password berhasil diubah" }
 *
 * HINT: Lihat cara bcrypt.compare di login(), cara update di logout()
 */
export async function changePassword(
  userId:      string,
  oldPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if(!user) {
    throw new AppError("User tidak ditemukan", 404);
  }

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) {
    throw new AppError("Password lama salah", 400);
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data:  { passwordHash: newHash },
  });

  await prisma.refreshToken.updateMany({
    where:  { userId, revoked: false },
    data:   { revoked: true },
  });

  return { message: "Password berhasil diubah" };
}

/**
 * TODO — lengkapi logikanya:
 *
 * LOGIKA:
 * 1. Cari user by userId (dari req.user.id)
 * 2. Kalau tidak ketemu, throw AppError("User tidak ditemukan", 404)
 * 3. Return data user TANPA passwordHash
 *    → pakai `select` untuk pilih field yang mau dikembalikan
 *
 * HINT: Lihat cara prisma.user.findUnique di login() dan register()
 *       Lihat field apa saja yang ada di model User di schema.prisma
 */
export async function getProfile(userId: string) {
  // TODO: implementasi di sini
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:        true,
      name:      true,
      email:     true,
      role:      true,
      createdAt: true,
    },
  });
  if (!user) {
    throw new AppError("User tidak ditemukan", 404);
  }
  return { user , message: "Profil berhasil diambil" };
}

export async function refreshToken(token: string) {
  // 1. Verify refreshToken
  let decoded: { userId: string };
  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    throw new AppError("Refresh token tidak valid.", 401);
  }

  // 2. Cari di DB, pastikan tidak di-revoke
  const tokens = await prisma.refreshToken.findMany({
    where: { userId: decoded.userId, revoked: false },
  });

  // 3. Cek salah satu token cocok
  let validToken = null;
  for (const t of tokens) {
    const match = await bcrypt.compare(token, t.tokenHash);
    if (match) { validToken = t; break; }
  }

  if (!validToken) throw new AppError("Refresh token tidak valid.", 401);

  // 4. Cek expired
  if (validToken.expiresAt < new Date()) {
    throw new AppError("Refresh token kadaluarsa.", 401);
  }

  // 5. Buat accessToken baru
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) throw new AppError("User tidak ditemukan.", 401);

  return signAccessToken(user.id, user.role);
}


//VERIFIKASI EMAIL ? ga di test sih, jadi skip dulu
// export async function verifyEmail(token: string) {
