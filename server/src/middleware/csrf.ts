import type { NextFunction, Request, Response } from "express";
import { generateSecureToken } from "../utils/tokens";
import { timingSafeEqualHex } from "../utils/hash";
import { env } from "../config/env";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Double-submit cookie CSRF protection. The cookie is readable by JS (it is
 * NOT the session cookie) so the SPA can echo it back in a custom header;
 * an attacker's cross-site form post can't read the cookie to do the same.
 */
export function issueCsrfCookie(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    res.cookie(CSRF_COOKIE_NAME, generateSecureToken(16), {
      httpOnly: false,
      secure: env.isProduction,
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24,
    });
  }
  next();
}

export function verifyCsrf(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.header(CSRF_HEADER_NAME);

  // Timing-safe compare (both tokens are hex from generateSecureToken) — the
  // same defense-in-depth applied to password/session-hash comparisons
  // elsewhere, so no secret-comparison in the app leaks via response timing.
  if (!cookieToken || !headerToken || !timingSafeEqualHex(cookieToken, headerToken)) {
    return res.status(403).json({ error: "CSRF token missing or invalid." });
  }
  next();
}
