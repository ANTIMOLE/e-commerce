import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error:   "Data tidak valid",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // Generic error
  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status ?? 500;
    res.status(status).json({
      success: false,
      error:   status === 500 ? "Internal server error" : err.message,
    });
    return;
  }

  res.status(500).json({ success: false, error: "Internal server error" });
}

// Custom error class dengan HTTP status
export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}
