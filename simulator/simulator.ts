/**
 * Standalone IoT device simulator.
 *
 * Mimics a real device (e.g. an ESP32) talking to the platform's Express API
 * over HTTP: sends periodic telemetry, sends heartbeats for the connection
 * log, and polls for + applies OTA firmware updates. Authenticates with the
 * X-Device-Id / X-Device-Key headers issued when a device is registered
 * (server/src/routes/admin/devices.routes.ts) — see config.ts for the
 * seeded demo credentials this defaults to.
 *
 * Usage:
 *   cd simulator
 *   npm install
 *   npm start
 */
import crypto from "node:crypto";
import { config } from "./config";
import { deviceApi, DeviceApiError } from "./apiClient";
import { generateReadings } from "./telemetry";

type OtaStatus = "SCHEDULED" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "CANCELLED";

interface FirmwareJob {
  id: string;
  status: OtaStatus;
  firmware: {
    id: string;
    version: string;
    model: string;
    checksumSha256: string;
    fileSizeBytes: number;
  };
}

let otaInFlight = false;

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function describeError(err: unknown): string {
  if (err instanceof DeviceApiError) return `HTTP ${err.status} ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}

function maskKey(key: string): string {
  return key.length <= 4 ? "****" : `${key.slice(0, 4)}${"*".repeat(key.length - 4)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendTelemetry(): Promise<void> {
  const readings = generateReadings();
  try {
    await deviceApi.post("/telemetry", { readings });
    log(`Telemetry sent: ${readings.map((r) => `${r.metric}=${r.value}${r.unit}`).join(", ")}`);
  } catch (err) {
    log(`Telemetry send failed: ${describeError(err)}`);
  }
}

async function sendHeartbeat(): Promise<void> {
  try {
    await deviceApi.post("/heartbeat");
    log("Heartbeat sent.");
  } catch (err) {
    log(`Heartbeat failed: ${describeError(err)}`);
  }
}

async function pollForFirmwareUpdates(): Promise<void> {
  if (otaInFlight) return;

  let jobs: FirmwareJob[];
  try {
    const data = await deviceApi.get<{ jobs: FirmwareJob[] }>("/firmware-jobs");
    jobs = data.jobs;
  } catch (err) {
    log(`OTA poll failed: ${describeError(err)}`);
    return;
  }

  const job = jobs[0];
  if (!job) return;

  otaInFlight = true;
  try {
    await applyFirmwareUpdate(job);
  } finally {
    otaInFlight = false;
  }
}

async function applyFirmwareUpdate(job: FirmwareJob): Promise<void> {
  log(`OTA update available: ${job.firmware.model} v${job.firmware.version} (job ${job.id}). Downloading...`);

  const { buffer, checksum } = await deviceApi.getBinary(`/firmware-jobs/${job.id}/binary`);

  if (buffer.length !== job.firmware.fileSizeBytes) {
    const message = `Downloaded size ${buffer.length} does not match expected ${job.firmware.fileSizeBytes} bytes.`;
    log(`OTA validation failed: ${message}`);
    await reportOutcome(job.id, "FAILED", message);
    return;
  }

  const actualChecksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const expectedChecksum = checksum ?? job.firmware.checksumSha256;
  if (actualChecksum !== expectedChecksum) {
    const message = `Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}.`;
    log(`OTA validation failed: ${message}`);
    await reportOutcome(job.id, "FAILED", message);
    return;
  }

  log(`Firmware validated (${buffer.length} bytes, checksum OK). Flashing...`);
  await simulateFlashProgress();

  await reportOutcome(job.id, "SUCCEEDED");
  log(`OTA update to v${job.firmware.version} complete.`);
}

async function simulateFlashProgress(): Promise<void> {
  for (const pct of [0, 10, 25, 50, 75, 90, 100]) {
    log(`Flashing... ${pct}%`);
    await sleep(300);
  }
}

async function reportOutcome(jobId: string, status: "SUCCEEDED" | "FAILED", errorMessage?: string): Promise<void> {
  try {
    await deviceApi.post(`/firmware-jobs/${jobId}/report`, { status, errorMessage });
  } catch (err) {
    log(`Failed to report OTA outcome: ${describeError(err)}`);
  }
}

function main(): void {
  log("IoT device simulator starting.");
  log(`  Server:  ${config.serverUrl}`);
  log(`  Device:  ${config.deviceId}`);
  log(`  Key:     ${maskKey(config.deviceKey)}`);

  void sendHeartbeat();
  void pollForFirmwareUpdates();

  const timers = [
    setInterval(() => void sendTelemetry(), config.telemetryIntervalMs),
    setInterval(() => void sendHeartbeat(), config.heartbeatIntervalMs),
    setInterval(() => void pollForFirmwareUpdates(), config.otaPollIntervalMs),
  ];

  process.on("SIGINT", () => {
    log("Shutting down.");
    timers.forEach(clearInterval);
    process.exit(0);
  });
}

main();
