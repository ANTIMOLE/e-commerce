// import { PrismaClient } from "../generated/prisma";

// // ── Prisma Singleton ──────────────────────────────────────────
// // Penting: jangan buat PrismaClient baru di setiap file.
// // Satu instance untuk seluruh aplikasi — hemat koneksi DB.
// // Pattern ini juga standard untuk Next.js hot-reload (dev mode).

// const globalForPrisma = globalThis as unknown as {
//   prisma: PrismaClient | undefined;
// };

// export const prisma =
//   globalForPrisma.prisma ??
//   new PrismaClient({
//     log:
//       process.env.NODE_ENV === "development"
//         ? ["query", "error", "warn"]
//         : ["error"],
//   });

// if (process.env.NODE_ENV !== "production") {
//   globalForPrisma.prisma = prisma;
// }
