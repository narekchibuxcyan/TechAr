import type { NextFunction, Request, Response } from "express";
import type { Device } from "@prisma/client";
import { prisma } from "../prisma";
import { sha256Hex, timingSafeEqualHex } from "../utils/hash";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      device?: Device;
    }
  }
}

/**
 * Authenticates a physical device (or the simulator) via the X-Device-Id /
 * X-Device-Key headers, re-checking the current hash from the database on
 * every request — the same "never trust a client-supplied claim" rule
 * requireAdmin applies to users. This is header-based, not cookie-based, so
 * it is deliberately mounted outside the CSRF middleware (see app.ts).
 */
export async function requireDeviceAuth(req: Request, res: Response, next: NextFunction) {
  const deviceId = req.header("x-device-id");
  const deviceKey = req.header("x-device-key");

  if (!deviceId || !deviceKey) {
    return res.status(401).json({ error: "Missing device credentials." });
  }

  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device || !device.apiKeyHash) {
    return res.status(401).json({ error: "Invalid device credentials." });
  }

  if (!timingSafeEqualHex(sha256Hex(deviceKey), device.apiKeyHash)) {
    return res.status(401).json({ error: "Invalid device credentials." });
  }

  if (device.status === "DISABLED") {
    return res.status(403).json({ error: "This device has been disabled." });
  }

  req.device = device;
  next();
}
