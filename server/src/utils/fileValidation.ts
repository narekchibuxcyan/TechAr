import path from "node:path";

export class FirmwareValidationError extends Error {}

const ALLOWED_EXTENSIONS = new Set([".bin", ".hex"]);

/**
 * Validates a firmware upload before it's persisted to disk. Rejects
 * anything whose extension AND content don't both look like real firmware —
 * this is the last line of defense before a binary gets pushed to edge
 * devices, so it fails closed on anything ambiguous.
 */
export function validateFirmwareFile(filename: string, buffer: Buffer, maxBytes: number): void {
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new FirmwareValidationError(
      `Unsupported firmware file extension "${ext}". Only .bin and .hex are allowed.`,
    );
  }

  if (buffer.length === 0) {
    throw new FirmwareValidationError("Firmware file is empty.");
  }

  if (buffer.length > maxBytes) {
    throw new FirmwareValidationError(
      `Firmware file exceeds the ${maxBytes}-byte limit.`,
    );
  }

  if (ext === ".hex") {
    validateIntelHex(buffer);
  } else {
    validateRawBinary(buffer);
  }
}

// Intel HEX: every line starts with ':', followed by an even number of hex
// digits, and the last byte of each record is a valid checksum
// (two's-complement of the sum of the preceding bytes).
function validateIntelHex(buffer: Buffer): void {
  const text = buffer.toString("ascii");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new FirmwareValidationError("Firmware .hex file has no records.");
  }

  const recordPattern = /^:([0-9A-Fa-f]{2})+$/;

  for (const [index, line] of lines.entries()) {
    if (!recordPattern.test(line)) {
      throw new FirmwareValidationError(
        `Firmware .hex file is malformed at line ${index + 1}: not a valid Intel HEX record.`,
      );
    }

    const bytes = line
      .slice(1)
      .match(/.{2}/g)!
      .map((b) => parseInt(b, 16));

    const checksum = bytes.pop()!;
    const sum = bytes.reduce((acc, b) => (acc + b) & 0xff, 0);
    const expectedChecksum = (0x100 - sum) & 0xff;

    if (checksum !== expectedChecksum) {
      throw new FirmwareValidationError(
        `Firmware .hex file has an invalid checksum at line ${index + 1}.`,
      );
    }
  }
}

// Raw .bin has no universal magic number, so we apply the checks that are
// actually meaningful: non-trivial size and not degenerate all-zero/all-FF
// content (a strong signal of a corrupted or placeholder upload).
function validateRawBinary(buffer: Buffer): void {
  const MIN_FIRMWARE_BYTES = 64;
  if (buffer.length < MIN_FIRMWARE_BYTES) {
    throw new FirmwareValidationError(
      `Firmware .bin file is too small to be valid (${buffer.length} bytes).`,
    );
  }

  const first = buffer[0];
  const isDegenerate = buffer.every((byte) => byte === first);
  if (isDegenerate) {
    throw new FirmwareValidationError(
      "Firmware .bin file contains no varying data (looks corrupted or blank).",
    );
  }
}
