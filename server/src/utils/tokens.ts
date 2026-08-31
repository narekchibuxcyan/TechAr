import crypto from "node:crypto";

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function generateOtpCode(): string {
  // 6-digit numeric code, uniformly sampled (avoid modulo bias).
  const max = 1_000_000;
  const range = Math.floor(0xffffffff / max) * max;
  let n: number;
  do {
    n = crypto.randomBytes(4).readUInt32BE(0);
  } while (n >= range);
  return String(n % max).padStart(6, "0");
}
