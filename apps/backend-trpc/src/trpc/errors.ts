import { TRPCError } from "@trpc/server";
import { AppError } from "../middlewares/error.middleware";

const HTTP_TO_TRPC: Record<number, TRPCError["code"]> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_CONTENT",
};

/**
 * Convert AppError (HTTP-based) → TRPCError (code-based).
 * Services throw AppError — routers catch and re-throw as TRPCError
 * so tRPC can serialize the error correctly to the client.
 */
export function toTRPCError(err: unknown): TRPCError {
  if (err instanceof TRPCError) return err;
  if (err instanceof AppError) {
    return new TRPCError({
      code:    HTTP_TO_TRPC[err.status] ?? "INTERNAL_SERVER_ERROR",
      message: err.message,
    });
  }
  if (err instanceof Error) {
    return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
  }
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Terjadi kesalahan." });
}

/** Shorthand: wrap service call and auto-convert error */
export async function serviceCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw toTRPCError(err);
  }
}
