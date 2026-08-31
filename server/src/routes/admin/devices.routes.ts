import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { recordAudit } from "../../services/audit.service";
import { sanitizePlainText } from "../../utils/sanitize";
import { sha256Hex } from "../../utils/hash";
import { generateSecureToken } from "../../utils/tokens";
import { idParamSchema } from "../../utils/paramSchemas";

// apiKeyHash is a secret-adjacent value (like a password hash) — never
// return it to any client. Applied to every Device read/write below.
const OMIT_API_KEY_HASH = { apiKeyHash: true } as const;

export const adminDevicesRouter = Router();
adminDevicesRouter.use(requireAuth, requireAdmin);

const listQuerySchema = z.object({
  status: z.enum(["ONLINE", "OFFLINE", "DISABLED"]).optional(),
  ownerId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

adminDevicesRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { status, ownerId, search, page, pageSize } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >;

    const where = {
      ...(status ? { status } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(search
        ? {
            OR: [
              { serialNumber: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
              { model: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        where,
        include: { owner: { select: { id: true, email: true, fullName: true } } },
        omit: OMIT_API_KEY_HASH,
        orderBy: { registeredAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.device.count({ where }),
    ]);

    res.json({ devices, total, page, pageSize });
  }),
);

const registerSchema = z.object({
  serialNumber: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  model: z.string().min(1).max(120),
  hardwareRevision: z.string().max(60).optional(),
  ownerId: z.string().uuid().optional(),
});

adminDevicesRouter.post(
  "/",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof registerSchema>;

    const existing = await prisma.device.findUnique({ where: { serialNumber: data.serialNumber } });
    if (existing) {
      return res.status(409).json({ error: "A device with that serial number already exists." });
    }

    if (data.ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: data.ownerId } });
      if (!owner) return res.status(404).json({ error: "Target user not found." });
    }

    const apiKey = generateSecureToken(24);

    const device = await prisma.device.create({
      data: {
        serialNumber: sanitizePlainText(data.serialNumber),
        name: sanitizePlainText(data.name),
        model: sanitizePlainText(data.model),
        hardwareRevision: data.hardwareRevision ? sanitizePlainText(data.hardwareRevision) : null,
        ownerId: data.ownerId ?? null,
        createdByAdminId: req.user!.id,
        apiKeyHash: sha256Hex(apiKey),
      },
      include: { owner: { select: { id: true, email: true, fullName: true } } },
      omit: OMIT_API_KEY_HASH,
    });

    await recordAudit(req.user!.id, "DEVICE_REGISTERED", "Device", device.id, {
      ownerId: data.ownerId ?? null,
    });

    // apiKey is returned exactly once — the admin must copy it down now for
    // provisioning the physical device (or the simulator's config).
    res.status(201).json({ device, apiKey });
  }),
);

adminDevicesRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, email: true, fullName: true } },
        telemetry: { orderBy: { recordedAt: "desc" }, take: 20 },
        updateJobs: { include: { firmware: true }, orderBy: { createdAt: "desc" }, take: 10 },
      },
      omit: OMIT_API_KEY_HASH,
    });
    if (!device) return res.status(404).json({ error: "Device not found." });
    res.json({ device });
  }),
);

adminDevicesRouter.get(
  "/:id/logs",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const device = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (!device) return res.status(404).json({ error: "Device not found." });

    const logs = await prisma.deviceConnectionLog.findMany({
      where: { deviceId: device.id },
      orderBy: { occurredAt: "desc" },
      take: 200,
    });
    res.json({ logs });
  }),
);

const assignSchema = z.object({ ownerId: z.string().uuid().nullable() });

adminDevicesRouter.patch(
  "/:id/assign",
  validate(idParamSchema, "params"),
  validate(assignSchema),
  asyncHandler(async (req, res) => {
    const { ownerId } = req.body as z.infer<typeof assignSchema>;
    const device = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (!device) return res.status(404).json({ error: "Device not found." });

    if (ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: ownerId } });
      if (!owner) return res.status(404).json({ error: "Target user not found." });
    }

    const updated = await prisma.device.update({
      where: { id: device.id },
      data: { ownerId },
      include: { owner: { select: { id: true, email: true, fullName: true } } },
      omit: OMIT_API_KEY_HASH,
    });

    await recordAudit(req.user!.id, "DEVICE_REASSIGNED", "Device", device.id, {
      from: device.ownerId,
      to: ownerId,
    });

    res.json({ device: updated });
  }),
);

const stateSchema = z.object({
  status: z.enum(["ONLINE", "OFFLINE", "DISABLED"]),
  reason: z.string().max(500).optional(),
});

adminDevicesRouter.patch(
  "/:id/state",
  validate(idParamSchema, "params"),
  validate(stateSchema),
  asyncHandler(async (req, res) => {
    const { status, reason } = req.body as z.infer<typeof stateSchema>;
    const device = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (!device) return res.status(404).json({ error: "Device not found." });

    const updated = await prisma.device.update({
      where: { id: device.id },
      data: { status },
      include: { owner: { select: { id: true, email: true, fullName: true } } },
      omit: OMIT_API_KEY_HASH,
    });

    await prisma.deviceConnectionLog.create({
      data: {
        deviceId: device.id,
        event: "FORCED_STATE_CHANGE",
        detail: `Admin forced state ${device.status} -> ${status}.${reason ? ` Reason: ${sanitizePlainText(reason)}` : ""}`,
      },
    });

    await recordAudit(req.user!.id, "DEVICE_STATE_FORCED", "Device", device.id, {
      from: device.status,
      to: status,
    });

    res.json({ device: updated });
  }),
);
