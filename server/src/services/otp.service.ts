import type { OtpPurpose } from "@prisma/client";
import { prisma } from "../prisma";
import { sha256Hex, timingSafeEqualHex } from "../utils/hash";
import { generateOtpCode } from "../utils/tokens";
import { sendOtpEmail } from "./email.service";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export async function issueOtp(userId: string, email: string, purpose: OtpPurpose): Promise<void> {
  const code = generateOtpCode();
  const codeHash = sha256Hex(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // Invalidate any prior unconsumed codes for this purpose before issuing a
  // new one, so only the most recently sent code is ever valid.
  await prisma.otpCode.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.otpCode.create({
    data: { userId, purpose, codeHash, expiresAt },
  });

  await sendOtpEmail(email, code);
}

export type OtpVerifyResult = "OK" | "INVALID" | "EXPIRED" | "LOCKED";

export async function verifyOtp(
  userId: string,
  purpose: OtpPurpose,
  submittedCode: string,
): Promise<OtpVerifyResult> {
  const otp = await prisma.otpCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return "INVALID";
  if (otp.attempts >= MAX_ATTEMPTS) return "LOCKED";

  if (otp.expiresAt < new Date()) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    return "EXPIRED";
  }

  const submittedHash = sha256Hex(submittedCode);
  const matches = timingSafeEqualHex(submittedHash, otp.codeHash);

  if (!matches) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return "INVALID";
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return "OK";
}
