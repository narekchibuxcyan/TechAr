import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export async function recordAudit(
  actorId: string | null,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
