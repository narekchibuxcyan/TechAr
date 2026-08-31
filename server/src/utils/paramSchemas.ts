import { z } from "zod";

// Every model in this app uses a UUID string primary key (see
// prisma/schema.prisma) — these validate route path params match that shape
// before a handler ever touches them, rather than relying on Prisma to
// simply return "not found" for a malformed id.
export const idParamSchema = z.object({ id: z.string().uuid() });
export const jobIdParamSchema = z.object({ jobId: z.string().uuid() });
