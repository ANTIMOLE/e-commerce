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

export interface Context {
  userId?:    string;
  userEmail?: string;
  userRole?:  "USER" | "ADMIN";
  res:        Response;
}

export function createContext({ req, res }: CreateExpressContextOptions): Context {
  // Read accessToken from httpOnly cookie — same as REST auth.middleware.ts
  const token = req.cookies?.accessToken;

  if (!token) return { res };

  try {
    const payload = verifyAccessToken(token);
    return {
      res,
      userId:    payload.userId,
      userEmail: payload.email,
      userRole:  payload.role,
    };
  } catch {
    // Token invalid or expired — return empty context
    // Protected procedures will throw UNAUTHORIZED
    return { res };
  }
}
