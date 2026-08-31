import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { recordAudit } from "../../services/audit.service";
import { idParamSchema } from "../../utils/paramSchemas";

export const adminUsersRouter = Router();
adminUsersRouter.use(requireAuth, requireAdmin);

// passwordHash is never selected back out to any client — applied to every
// User read/write below that doesn't already use an explicit `select`.
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

const listQuerySchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "BANNED"]).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  search: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

adminUsersRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { status, role, search, page, pageSize } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >;

    const where = {
      ...(status ? { status } : {}),
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" as const } },
              { fullName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { devices: true, orders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page, pageSize });
  }),
);

adminUsersRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        devices: { select: { id: true, name: true, serialNumber: true, status: true } },
        orders: { select: { id: true, status: true, totalCents: true, createdAt: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user });
  }),
);

const statusSchema = z.object({ status: z.enum(["PENDING", "ACTIVE", "BANNED"]) });

adminUsersRouter.patch(
  "/:id/status",
  validate(idParamSchema, "params"),
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as z.infer<typeof statusSchema>;
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: "User not found." });

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { status },
      select: SAFE_USER_SELECT,
    });

    // Banning/deactivating should also kill any live sessions immediately.
    if (status !== "ACTIVE") {
      await prisma.session.deleteMany({ where: { userId: target.id } });
    }

    await recordAudit(req.user!.id, "USER_STATUS_CHANGE", "User", target.id, {
      from: target.status,
      to: status,
    });

    res.json({ user: updated });
  }),
);

const roleSchema = z.object({ role: z.enum(["USER", "ADMIN"]) });

adminUsersRouter.patch(
  "/:id/role",
  validate(idParamSchema, "params"),
  validate(roleSchema),
  asyncHandler(async (req, res) => {
    const { role } = req.body as z.infer<typeof roleSchema>;
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: "User not found." });

    if (target.id === req.user!.id && role !== "ADMIN") {
      return res.status(400).json({ error: "You cannot revoke your own admin role." });
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role },
      select: SAFE_USER_SELECT,
    });

    await recordAudit(req.user!.id, "USER_ROLE_CHANGE", "User", target.id, {
      from: target.role,
      to: role,
    });

    res.json({ user: updated });
  }),
);
