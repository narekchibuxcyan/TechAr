import type { NextFunction, Request, Response } from "express";
import type { Role, UserStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { sha256Hex } from "../utils/hash";
import { env } from "../config/env";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Loads the session from the HttpOnly cookie, re-checks the user's current
 * role/status from the database (never trusts a client-supplied claim), and
 * attaches `req.user`. Expired sessions are deleted lazily on lookup.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const rawToken = req.cookies?.[env.sessionCookieName];
  if (!rawToken) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const tokenHash = sha256Hex(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    res.clearCookie(env.sessionCookieName);
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }

  req.user = {
    id: session.user.id,
    email: session.user.email,
    fullName: session.user.fullName,
    role: session.user.role,
    status: session.user.status,
  };

  next();
}

export function requireActive(req: Request, res: Response, next: NextFunction) {
  if (req.user?.status !== "ACTIVE") {
    return res.status(403).json({ error: "Account is not active." });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN" || req.user.status !== "ACTIVE") {
    return res.status(403).json({ error: "Admin privileges required." });
  }
  next();
}
