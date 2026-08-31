import type { NextFunction, Request, Response } from "express";
import { FirmwareValidationError } from "../utils/fileValidation";
import { env } from "../config/env";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof FirmwareValidationError) {
    return res.status(422).json({ error: err.message });
  }

  console.error(err);
  res.status(500).json({
    error: "Internal server error.",
    // Never leak stack traces / internals in production responses.
    detail: env.isProduction ? undefined : String(err),
  });
}
