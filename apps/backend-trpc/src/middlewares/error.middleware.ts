import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";


export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validasi gagal.",
      errors:  err.flatten().fieldErrors,
    });
    return;
  }

  // App error (known errors)
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Prisma errors
  if (err instanceof Error && "code" in err) {
    const prismaErr = err as Error & { code: string; meta?: { target?: string[] } };

    // Unique constraint violation
    if (prismaErr.code === "P2002") {
      const field = prismaErr.meta?.target?.[0] ?? "field";
      res.status(409).json({
        success: false,
        message: `${field} sudah digunakan.`,
      });
      return;
    }

    // Record not found
    if (prismaErr.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Data tidak ditemukan.",
      });
      return;
    }
  }

  // Generic error
  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status ?? 500;
    console.error(`[Error] ${err.message}`, err.stack);
    res.status(status).json({
      success: false,
      message: status === 500 ? "Internal server error." : err.message,
    });
    return;
  }

  // Unknown error
  console.error("[Unknown Error]", err);
  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
}