import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { hashPassword, verifyPassword, sha256Hex } from "../utils/hash";
import { generateSecureToken } from "../utils/tokens";
import { sanitizePlainText } from "../utils/sanitize";
import { issueOtp, verifyOtp } from "../services/otp.service";
import { registerLimiter, otpVerifyLimiter, loginLimiter } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/auth";
import { env } from "../config/env";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10).max(200),
  fullName: z.string().min(1).max(120),
});

authRouter.post(
  "/register",
  registerLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, fullName } = req.body as z.infer<typeof registerSchema>;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      // Don't reveal whether the email exists — generic success response.
      return res.status(202).json({ message: "If that email is new, a verification code has been sent." });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: sanitizePlainText(fullName),
        status: "PENDING",
      },
    });

    await issueOtp(user.id, user.email, "REGISTRATION");

    res.status(202).json({ message: "Verification code sent. Check your email to activate your account." });
  }),
);

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/),
});

authRouter.post(
  "/verify-otp",
  otpVerifyLimiter,
  validate(verifyOtpSchema),
  asyncHandler(async (req, res) => {
    const { email, code } = req.body as z.infer<typeof verifyOtpSchema>;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || user.status !== "PENDING") {
      return res.status(400).json({ error: "Invalid or already-verified account." });
    }

    const result = await verifyOtp(user.id, "REGISTRATION", code);

    if (result === "OK") {
      await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } });
      return res.status(200).json({ message: "Account activated. You can now log in." });
    }

    const statusByResult = { INVALID: 400, EXPIRED: 410, LOCKED: 429 } as const;
    const messageByResult = {
      INVALID: "Incorrect verification code.",
      EXPIRED: "Verification code expired. Please request a new one.",
      LOCKED: "Too many incorrect attempts. Please request a new code.",
    } as const;

    res.status(statusByResult[result]).json({ error: messageByResult[result] });
  }),
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

authRouter.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always run verifyPassword against a hash (even a dummy one) to avoid
    // leaking account existence via response-time differences.
    const passwordMatches = await verifyPassword(
      user?.passwordHash ?? "$argon2id$v=19$m=65536,t=3,p=4$00000000000000000000000000000000",
      password,
    );

    if (!user || !passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (user.status === "PENDING") {
      return res.status(403).json({ error: "Please verify your email before logging in." });
    }
    if (user.status === "BANNED") {
      return res.status(403).json({ error: "This account has been disabled." });
    }

    const rawToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: sha256Hex(rawToken),
        userAgent: req.get("user-agent")?.slice(0, 255),
        ipAddress: req.ip,
        expiresAt,
      },
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    res.cookie(env.sessionCookieName, rawToken, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "strict",
      expires: expiresAt,
    });

    res.json({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    });
  }),
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const rawToken = req.cookies?.[env.sessionCookieName];
    if (rawToken) {
      await prisma.session.deleteMany({ where: { tokenHash: sha256Hex(rawToken) } });
    }
    res.clearCookie(env.sessionCookieName);
    res.status(204).send();
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);
