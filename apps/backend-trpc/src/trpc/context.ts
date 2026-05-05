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
