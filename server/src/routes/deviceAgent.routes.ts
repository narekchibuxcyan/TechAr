import fs from "node:fs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { requireDeviceAuth } from "../middleware/deviceAuth";
import { deviceAgentLimiter } from "../middleware/rateLimit";
import { sanitizePlainText } from "../utils/sanitize";
import { recordAudit } from "../services/audit.service";
import { jobIdParamSchema } from "../utils/paramSchemas";

// Routes a physical device (or the simulator) calls directly, authenticated
// via X-Device-Id / X-Device-Key headers rather than a browser session — see
// requireDeviceAuth. Deliberately mounted before the CSRF middleware in
// app.ts: CSRF protects cookie-based sessions from being driven by a
// malicious page in the user's browser, which doesn't apply to a machine
// client presenting its own bearer-style credential on every call.
export const deviceAgentRouter = Router();
deviceAgentRouter.use(deviceAgentLimiter, requireDeviceAuth);

const telemetrySchema = z.object({
  readings: z
    .array(
      z.object({
        metric: z.string().min(1).max(60),
        value: z.number().finite(),
        unit: z.string().max(20).optional(),
      }),
    )
    .min(1)
    .max(50),
});

deviceAgentRouter.post(
  "/telemetry",
  validate(telemetrySchema),
  asyncHandler(async (req, res) => {
    const { readings } = req.body as z.infer<typeof telemetrySchema>;
    const deviceId = req.device!.id;

    await prisma.$transaction([
      prisma.deviceTelemetry.createMany({
        data: readings.map((r) => ({
          deviceId,
          metric: sanitizePlainText(r.metric),
          value: r.value,
          unit: r.unit ? sanitizePlainText(r.unit) : null,
        })),
      }),
      prisma.device.update({
        where: { id: deviceId },
        data: { status: "ONLINE", lastSeenAt: new Date() },
      }),
    ]);

    res.status(201).json({ accepted: readings.length });
  }),
);

deviceAgentRouter.post(
  "/heartbeat",
  asyncHandler(async (req, res) => {
    const deviceId = req.device!.id;

    await prisma.$transaction([
      prisma.deviceConnectionLog.create({
        data: { deviceId, event: "CONNECTED", ipAddress: req.ip },
      }),
      prisma.device.update({
        where: { id: deviceId },
        data: { status: "ONLINE", lastSeenAt: new Date() },
      }),
    ]);

    res.status(204).send();
  }),
);

// Devices poll this rather than being pushed to — no inbound connectivity
// requirement on the device side.
deviceAgentRouter.get(
  "/firmware-jobs",
  asyncHandler(async (req, res) => {
    const jobs = await prisma.firmwareUpdateJob.findMany({
      where: {
        deviceId: req.device!.id,
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
      },
      include: {
        firmware: {
          select: { id: true, version: true, model: true, checksumSha256: true, fileSizeBytes: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ jobs });
  }),
);

deviceAgentRouter.get(
  "/firmware-jobs/:jobId/binary",
  validate(jobIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const job = await prisma.firmwareUpdateJob.findUnique({
      where: { id: req.params.jobId! },
      include: { firmware: true },
    });

    if (!job || job.deviceId !== req.device!.id) {
      return res.status(404).json({ error: "Update job not found." });
    }
    if (job.status !== "SCHEDULED" && job.status !== "IN_PROGRESS") {
      return res.status(409).json({ error: "This update job is not active." });
    }

    if (job.status === "SCHEDULED") {
      await prisma.firmwareUpdateJob.update({
        where: { id: job.id },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
      });
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", String(job.firmware.fileSizeBytes));
    res.setHeader("X-Firmware-Checksum-Sha256", job.firmware.checksumSha256);

    const stream = fs.createReadStream(job.firmware.filePath);
    stream.on("error", () => {
      if (!res.headersSent) res.status(500).json({ error: "Failed to read firmware file." });
    });
    stream.pipe(res);
  }),
);

const reportSchema = z.object({
  status: z.enum(["SUCCEEDED", "FAILED"]),
  errorMessage: z.string().max(1000).optional(),
});

deviceAgentRouter.post(
  "/firmware-jobs/:jobId/report",
  validate(jobIdParamSchema, "params"),
  validate(reportSchema),
  asyncHandler(async (req, res) => {
    const job = await prisma.firmwareUpdateJob.findUnique({
      where: { id: req.params.jobId! },
      include: { firmware: true },
    });

    if (!job || job.deviceId !== req.device!.id) {
      return res.status(404).json({ error: "Update job not found." });
    }
    if (job.status !== "IN_PROGRESS") {
      return res.status(409).json({ error: "Job must be downloaded before it can be reported." });
    }

    const { status, errorMessage } = req.body as z.infer<typeof reportSchema>;

    const updated = await prisma.firmwareUpdateJob.update({
      where: { id: job.id },
      data: {
        status,
        completedAt: new Date(),
        errorMessage: status === "FAILED" ? sanitizePlainText(errorMessage ?? "Unknown error.") : null,
      },
    });

    if (status === "SUCCEEDED") {
      await prisma.device.update({
        where: { id: job.deviceId },
        data: { firmwareVersion: job.firmware.version },
      });
    }

    await recordAudit(null, "OTA_REPORTED", "FirmwareUpdateJob", job.id, {
      deviceId: job.deviceId,
      status,
    });

    res.json({ job: updated });
  }),
);
