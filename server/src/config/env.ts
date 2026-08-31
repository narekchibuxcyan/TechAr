// Central place that reads process.env. Every secret/config value must be
// read here — never inline `process.env.X` elsewhere, and never hardcode a
// default for anything sensitive (fail loudly instead).
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "4000")),

  databaseUrl: required("DATABASE_URL"),

  corsOrigins: required("CORS_ORIGIN")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  sessionSecret: required("SESSION_SECRET"),
  sessionCookieName: optional("SESSION_COOKIE_NAME", "iot_session"),
  sessionTtlHours: Number(optional("SESSION_TTL_HOURS", "24")),

  smtpHost: required("SMTP_HOST"),
  smtpPort: Number(optional("SMTP_PORT", "587")),
  smtpUser: required("SMTP_USER"),
  smtpPass: required("SMTP_PASS"),
  smtpFrom: required("SMTP_FROM"),
  adminNotificationEmail: required("ADMIN_NOTIFICATION_EMAIL"),

  firmwareMaxBytes: Number(optional("FIRMWARE_MAX_BYTES", String(64 * 1024 * 1024))),
  firmwareStorageDir: optional("FIRMWARE_STORAGE_DIR", "./storage/firmware"),

  get isProduction() {
    return this.nodeEnv === "production";
  },
};
