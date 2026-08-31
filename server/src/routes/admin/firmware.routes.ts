import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { recordAudit } from "../../services/audit.service";
import { storeFirmwareFile } from "../../services/firmware.service";
import { FirmwareValidationError } from "../../utils/fileValidation";
import { sanitizePlainText } from "../../utils/sanitize";
import { idParamSchema } from "../../utils/paramSchemas";
import { env } from "../../config/env";

export const adminFirmwareRouter = Router();
adminFirmwareRouter.use(requireAuth, requireAdmin);

// Buffered in memory (not disk) so validation runs before anything is
// written; size is capped here as the first line of defense.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.firmwareMaxBytes },
});

const uploadMetaSchema = z.object({
  version: z.string().min(1).max(40),
  model: z.string().min(1).max(120),
});

adminFirmwareRouter.post(
  "/upload",
  upload.single("firmware"),
  validate(uploadMetaSchema),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No firmware file provided." });
    }

    const version = sanitizePlainText((req.body as z.infer<typeof uploadMetaSchema>).version);
    const model = sanitizePlainText((req.body as z.infer<typeof uploadMetaSchema>).model);

    let stored;
    try {
      stored = await storeFirmwareFile(req.file.originalname, req.file.buffer);
    } catch (err) {
      if (err instanceof FirmwareValidationError) {
        return res.status(422).json({ error: err.message });
      }
      throw err;
    }

    const firmware = await prisma.firmware.create({
      data: {
        version,
        model,
        filePath: stored.filePath,
        checksumSha256: stored.checksumSha256,
        fileSizeBytes: stored.fileSizeBytes,
        uploadedById: req.user!.id,
      },
    });

    await recordAudit(req.user!.id, "FIRMWARE_UPLOADED", "Firmware", firmware.id, {
      version,
      model,
      checksumSha256: stored.checksumSha256,
    });

    res.status(201).json({ firmware });
  }),
);

adminFirmwareRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const firmwares = await prisma.firmware.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ firmwares });
  }),
);

const scheduleSchema = z.object({
  firmwareId: z.string().uuid(),
  deviceIds: z.array(z.string().uuid()).min(1).max(500),
  scheduledAt: z.coerce.date().optional(),
});

adminFirmwareRouter.post(
  "/jobs",
  validate(scheduleSchema),
  asyncHandler(async (req, res) => {
    const { firmwareId, deviceIds, scheduledAt } = req.body as z.infer<typeof scheduleSchema>;

    const firmware = await prisma.firmware.findUnique({ where: { id: firmwareId } });
    if (!firmware) return res.status(404).json({ error: "Firmware not found." });

    const devices = await prisma.device.findMany({ where: { id: { in: deviceIds } } });
    if (devices.length !== deviceIds.length) {
      return res.status(404).json({ error: "One or more devices were not found." });
    }

    const jobs = await prisma.$transaction(
      devices.map((device) =>
        prisma.firmwareUpdateJob.create({
          data: {
            firmwareId: firmware.id,
            deviceId: device.id,
            scheduledAt: scheduledAt ?? null,
            createdById: req.user!.id,
          },
        }),
      ),
    );

    await recordAudit(req.user!.id, "OTA_SCHEDULED", "Firmware", firmware.id, {
      deviceIds,
      scheduledAt,
    });

    res.status(201).json({ jobs });
  }),
);

const jobsQuerySchema = z.object({
  deviceId: z.string().uuid().optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "SUCCEEDED", "FAILED", "CANCELLED"]).optional(),
});

adminFirmwareRouter.get(
  "/jobs",
  validate(jobsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { deviceId, status } = req.query as unknown as z.infer<typeof jobsQuerySchema>;
    const jobs = await prisma.firmwareUpdateJob.findMany({
      where: { ...(deviceId ? { deviceId } : {}), ...(status ? { status } : {}) },
      include: { firmware: true, device: { select: { id: true, name: true, serialNumber: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ jobs });
  }),
);

adminFirmwareRouter.patch(
  "/jobs/:id/cancel",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const job = await prisma.firmwareUpdateJob.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: "Job not found." });
    if (job.status !== "SCHEDULED") {
      return res.status(409).json({ error: "Only scheduled jobs can be cancelled." });
    }

    const updated = await prisma.firmwareUpdateJob.update({
      where: { id: job.id },
      data: { status: "CANCELLED" },
    });

    await recordAudit(req.user!.id, "OTA_CANCELLED", "FirmwareUpdateJob", job.id);

    res.json({ job: updated });
  }),
);
