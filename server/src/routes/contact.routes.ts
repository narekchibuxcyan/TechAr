import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { contactLimiter } from "../middleware/rateLimit";
import { sanitizePlainText } from "../utils/sanitize";
import { sendMail } from "../services/email.service";
import { env } from "../config/env";

export const contactRouter = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  message: z.string().min(1).max(5000),
});

contactRouter.post(
  "/",
  contactLimiter,
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const { name, email, message } = req.body as z.infer<typeof contactSchema>;

    const clean = {
      name: sanitizePlainText(name),
      email: email.toLowerCase(),
      message: sanitizePlainText(message),
    };

    await prisma.contactMessage.create({ data: clean });

    await sendMail(
      env.adminNotificationEmail,
      "New contact form submission",
      `From: ${clean.name} <${clean.email}>\n\n${clean.message}`,
    ).catch((err) => console.error("Failed to send contact notification email", err));

    res.status(202).json({ message: "Thanks — we'll get back to you soon." });
  }),
);
