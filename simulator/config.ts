/**
 * Simulator configuration, read from environment variables with defaults
 * matching the "Living Room Sensor" device created by
 * server/prisma/seed.ts — that device also has a SCHEDULED firmware update
 * job waiting for it, so running the simulator with zero config exercises
 * the full OTA flow immediately.
 *
 * To simulate a different seeded device, or a real one provisioned through
 * the admin panel, override these before starting:
 *
 *   SIMULATOR_DEVICE_ID=<id> SIMULATOR_DEVICE_KEY=<key> npm start
 */
export interface SimulatorConfig {
  serverUrl: string;
  deviceId: string;
  deviceKey: string;
  telemetryIntervalMs: number;
  heartbeatIntervalMs: number;
  otaPollIntervalMs: number;
}

export const config: SimulatorConfig = {
  serverUrl: process.env.SIMULATOR_SERVER_URL ?? "http://localhost:4000",
  deviceId: process.env.SIMULATOR_DEVICE_ID ?? "a1111111-1111-4111-8111-111111111111",
  deviceKey: process.env.SIMULATOR_DEVICE_KEY ?? "demo-device-key-env-001",
  telemetryIntervalMs: Number(process.env.SIMULATOR_TELEMETRY_INTERVAL_MS ?? 5000),
  heartbeatIntervalMs: Number(process.env.SIMULATOR_HEARTBEAT_INTERVAL_MS ?? 20000),
  otaPollIntervalMs: Number(process.env.SIMULATOR_OTA_POLL_INTERVAL_MS ?? 15000),
};
