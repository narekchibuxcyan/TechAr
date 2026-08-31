import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance. All queries go through Prisma's parameterized
// query builder — no raw SQL string concatenation anywhere in this codebase.
export const prisma = new PrismaClient();
