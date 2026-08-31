import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { requireAuth, requireActive } from "../middleware/auth";
import { sanitizePlainText } from "../utils/sanitize";
import { idParamSchema } from "../utils/paramSchemas";

export const devicesRouter = Router();
devicesRouter.use(requireAuth, requireActive);

// apiKeyHash is a secret-adjacent value (like a password hash) — never
// return it to any client. Applied to every Device read/write below.
const OMIT_API_KEY_HASH = { apiKeyHash: true } as const;

devicesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const devices = await prisma.device.findMany({
      where: { ownerId: req.user!.id },
      include: {
        // Enough recent rows (across all metrics) for the dashboard to plot
        // a short per-metric sparkline after filtering client-side.
        telemetry: { orderBy: { recordedAt: "desc" }, take: 40 },
        updateJobs: { where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] } }, take: 1 },
      },
      omit: OMIT_API_KEY_HASH,
      orderBy: { registeredAt: "desc" },
    });
    res.json({ devices });
  }),
);

// Ownership is re-checked on every device-scoped route below — the UI hiding
// devices a user doesn't own is not the security boundary, this is.
async function loadOwnedDevice(userId: string, deviceId: string) {
  return prisma.device.findFirst({
    where: { id: deviceId, ownerId: userId },
    omit: OMIT_API_KEY_HASH,
  });
}

devicesRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const device = await loadOwnedDevice(req.user!.id, req.params.id!);
    if (!device) return res.status(404).json({ error: "Device not found." });
    res.json({ device });
  }),
);

devicesRouter.get(
  "/:id/telemetry",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const device = await loadOwnedDevice(req.user!.id, req.params.id!);
    if (!device) return res.status(404).json({ error: "Device not found." });

    const telemetry = await prisma.deviceTelemetry.findMany({
      where: { deviceId: device.id },
      orderBy: { recordedAt: "desc" },
      take: 100,
    });
    res.json({ telemetry });
  }),
);

// Settings is an intentionally-flexible per-device JSON bag (different
// device models have different config shapes), so it isn't given a strict
// shape — but it's still user-controlled input, so it gets a hard size cap
// to block abusive payloads even within the global 1mb JSON body limit.
const MAX_SETTINGS_JSON_BYTES = 10_000;

const configSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  settings: z
    .record(z.unknown())
    .optional()
    .refine((s) => !s || JSON.stringify(s).length <= MAX_SETTINGS_JSON_BYTES, {
      message: `Settings payload is too large (max ${MAX_SETTINGS_JSON_BYTES} bytes serialized).`,
    }),
});

devicesRouter.patch(
  "/:id/config",
  validate(idParamSchema, "params"),
  validate(configSchema),
  asyncHandler(async (req, res) => {
    const device = await loadOwnedDevice(req.user!.id, req.params.id!);
    if (!device) return res.status(404).json({ error: "Device not found." });

    const { name, settings } = req.body as z.infer<typeof configSchema>;
    const updated = await prisma.device.update({
      where: { id: device.id },
      data: {
        ...(name ? { name: sanitizePlainText(name) } : {}),
        ...(settings ? { settings: settings as Prisma.InputJsonValue } : {}),
      },
      omit: OMIT_API_KEY_HASH,
    });

    res.json({ device: updated });
  }),
);
