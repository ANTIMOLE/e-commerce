import type { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

type RequestPart = "body" | "params" | "query";

export const validate = (schema: ZodSchema, target: RequestPart = "body") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Validasi gagal.",
        errors:  result.error.flatten().fieldErrors,
      });
      return;
    }

    if (target === "query") {
      Object.assign(req.query, result.data);
    } else {
      req[target] = result.data;
    }
    next();
  };
};

export const validateMultiple = (schemas: Partial<Record<RequestPart, ZodSchema>>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: Record<string, unknown> = {};
    let hasError = false;

    for (const [part, schema] of Object.entries(schemas) as [RequestPart, ZodSchema][]) {
      const result = schema.safeParse(req[part]);

      if (!result.success) {
        hasError = true;
        allErrors[part] = result.error.flatten().fieldErrors;
      } else {
        if (part === "query") {
          Object.assign(req.query, result.data);
        } else {
          req[part] = result.data;
        }
      }
    }

    if (hasError) {
      res.status(400).json({
        success: false,
        message: "Validasi gagal.",
        errors:  allErrors,
      });
      return;
    }

    next();
  };
};