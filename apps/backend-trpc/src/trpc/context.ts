// // // import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
// // // import { verifyAccessToken, extractBearerToken } from "@ecommerce/shared";

// // // // ── Context Type ──────────────────────────────────────────────
// // // // Ini yang tersedia di SETIAP procedure via `ctx`
// // // export interface Context {
// // //   userId?:    string;
// // //   userEmail?: string;
// // // }

// // // // ── createContext ─────────────────────────────────────────────
// // // // Dipanggil SEKALI PER REQUEST oleh tRPC adapter.
// // // // Extract userId dari JWT supaya procedure bisa pakai ctx.userId.
// // // //
// // // // Ini adalah salah satu perbedaan struktural tRPC vs REST:
// // // // context creation ini terjadi di setiap request sebagai
// // // // bagian dari pipeline adapter tRPC.

// // // export function createContext({ req }: CreateExpressContextOptions): Context {
// // //   const token = extractBearerToken(req.headers.authorization);

// // //   if (!token) return {};

// // //   try {
// // //     const payload = verifyAccessToken(token);
// // //     return {
// // //       userId:    payload.userId,
// // //       userEmail: payload.email,
// // //     };
// // //   } catch {
// // //     // Token invalid — return empty context (bukan throw)
// // //     // Protected procedures yang akan throw UNAUTHORIZED
// // //     return {};
// // //   }
// // // }

// // import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
// // import { verifyAccessToken, extractBearerToken } from "@ecommerce/shared";

// // export interface Context {
// //   userId?:   string;
// //   userEmail?: string;
// //   userRole?: "USER" | "ADMIN";
// // }

// // export function createContext({ req }: CreateExpressContextOptions): Context {
// //   const token = extractBearerToken(req.headers.authorization);
// //   if (!token) return {};

// //   try {
// //     const payload = verifyAccessToken(token);
// //     return {
// //       userId:    payload.userId,
// //       userEmail: payload.email,
// //       userRole:  payload.role,   // works now — role is in JwtPayload
// //     };
// //   } catch {
// //     return {};
// //   }
// // }
// //
// //

// import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
// import type { Response }                    from "express";
// import { verifyAccessToken }                from "@ecommerce/shared";

// export interface Context {
//   userId?:    string;
//   userEmail?: string;
//   userRole?:  "USER" | "ADMIN";
//   res:        Response;
// }

// export function createContext({ req, res }: CreateExpressContextOptions): Context {
//   // Read accessToken from httpOnly cookie — same as REST auth.middleware.ts
//   const token = req.cookies?.accessToken;

//   if (!token) return { res };

//   try {
//     const payload = verifyAccessToken(token);
//     return {
//       res,
//       userId:    payload.userId,
//       userEmail: payload.email,
//       userRole:  payload.role,
//     };
//   } catch {
//     // Token invalid or expired — return empty context
//     // Protected procedures will throw UNAUTHORIZED
//     return { res };
//   }
// }

// // import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
// // import { verifyAccessToken, extractBearerToken } from "@ecommerce/shared";

// // // ── Context Type ──────────────────────────────────────────────
// // // Ini yang tersedia di SETIAP procedure via `ctx`
// // export interface Context {
// //   userId?:    string;
// //   userEmail?: string;
// // }

// // // ── createContext ─────────────────────────────────────────────
// // // Dipanggil SEKALI PER REQUEST oleh tRPC adapter.
// // // Extract userId dari JWT supaya procedure bisa pakai ctx.userId.
// // //
// // // Ini adalah salah satu perbedaan struktural tRPC vs REST:
// // // context creation ini terjadi di setiap request sebagai
// // // bagian dari pipeline adapter tRPC.

// // export function createContext({ req }: CreateExpressContextOptions): Context {
// //   const token = extractBearerToken(req.headers.authorization);

// //   if (!token) return {};

// //   try {
// //     const payload = verifyAccessToken(token);
// //     return {
// //       userId:    payload.userId,
// //       userEmail: payload.email,
// //     };
// //   } catch {
// //     // Token invalid — return empty context (bukan throw)
// //     // Protected procedures yang akan throw UNAUTHORIZED
// //     return {};
// //   }
// // }

// import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
// import { verifyAccessToken, extractBearerToken } from "@ecommerce/shared";

// export interface Context {
//   userId?:   string;
//   userEmail?: string;
//   userRole?: "USER" | "ADMIN";
// }

// export function createContext({ req }: CreateExpressContextOptions): Context {
//   const token = extractBearerToken(req.headers.authorization);
//   if (!token) return {};

//   try {
//     const payload = verifyAccessToken(token);
//     return {
//       userId:    payload.userId,
//       userEmail: payload.email,
//       userRole:  payload.role,   // works now — role is in JwtPayload
//     };
//   } catch {
//     return {};
//   }
// }
//
//

import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Response }                    from "express";
import { verifyAccessToken }                from "@ecommerce/shared";
import { prisma }                           from "@ecommerce/shared";

export interface Context {
  userId?:    string;
  userEmail?: string;
  userRole?:  "USER" | "ADMIN";
  res:        Response;
}

// Read once at startup — no per-request overhead
const AUTH_DB_VALIDATION = process.env.AUTH_DB_VALIDATION === "true";

export async function createContext({ req, res }: CreateExpressContextOptions): Promise<Context> {
  // Read accessToken from httpOnly cookie — same as REST auth.middleware.ts
  const token = req.cookies?.accessToken;

  if (!token) return { res };

  try {
    const decoded = verifyAccessToken(token);

    // AUTH_DB_VALIDATION flag (Opsi D — research design):
    // true  → mirrors REST middleware exactly: verify user still exists in DB
    // false → stateless JWT-only, natural tRPC behavior (default)
    if (AUTH_DB_VALIDATION) {
      const user = await prisma.user.findUnique({
        where:  { id: decoded.userId },
        select: { id: true, role: true },
      });
      if (!user) return { res };
      return {
        res,
        userId:    user.id,
        userRole:  user.role,
        userEmail: decoded.email,
      };
    }

    return {
      res,
      userId:    decoded.userId,
      userEmail: decoded.email,
      userRole:  decoded.role,
    };
  } catch {
    // Token invalid or expired — return empty context
    // Protected procedures will throw UNAUTHORIZED
    return { res };
  }
}
