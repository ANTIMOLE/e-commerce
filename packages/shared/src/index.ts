// ============================================================
// SHARED — Main Entry Point
// Re-export semua yang dibutuhkan oleh backend-rest & backend-trpc
// ============================================================

// Types
export * from "./types";

// Validations (Zod schemas)
export * from "./validations/auth.schema";
export * from "./validations/product.schema";
export * from "./validations/cart.schema";
export * from "./validations/checkout.schema";
export * from "./validations/profile.schema";
export * from "./validations/order.schema";

// Utils
export * from "./utils/hash";
export * from "./utils/jwt";
export * from "./utils/pagination";
export * from "./utils/response";
export { prisma } from "./database";

// Prisma client
// export { prisma } from "./database";
