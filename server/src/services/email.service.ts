import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: { user: env.smtpUser, pass: env.smtpPass },
});

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  await transporter.sendMail({ from: env.smtpFrom, to, subject, text });
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await sendMail(
    to,
    "Your verification code",
    `Your activation code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
  );
}
