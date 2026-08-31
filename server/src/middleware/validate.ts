import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

type Source = "body" | "query" | "params";

/**
 * Validates (and replaces) req[source] with the parsed result of `schema`.
 * Centralizing this means every route gets consistent 400 responses and no
 * handler ever trusts unvalidated client input.
 */
export function validate(schema: ZodTypeAny, source: Source = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed.",
        details: result.error.flatten(),
      });
    }
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
