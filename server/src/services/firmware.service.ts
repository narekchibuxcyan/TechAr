import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { validateFirmwareFile } from "../utils/fileValidation";

export interface StoredFirmware {
  filePath: string;
  checksumSha256: string;
  fileSizeBytes: number;
}

/**
 * Validates and persists an uploaded firmware buffer under a randomized
 * filename outside any statically-served directory. Returns the stored path
 * plus a checksum devices can use to verify integrity before flashing.
 */
export async function storeFirmwareFile(
  originalName: string,
  buffer: Buffer,
): Promise<StoredFirmware> {
  validateFirmwareFile(originalName, buffer, env.firmwareMaxBytes);

  const ext = path.extname(originalName).toLowerCase();
  const storageDir = path.resolve(env.firmwareStorageDir);
  await fs.mkdir(storageDir, { recursive: true });

  const randomizedName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(storageDir, randomizedName);
  await fs.writeFile(filePath, buffer, { mode: 0o600 });

  return {
    filePath,
    checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    fileSizeBytes: buffer.length,
  };
}
