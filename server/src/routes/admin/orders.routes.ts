import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { recordAudit } from "../../services/audit.service";
import { sanitizePlainText } from "../../utils/sanitize";
import { idParamSchema } from "../../utils/paramSchemas";

export const adminOrdersRouter = Router();
adminOrdersRouter.use(requireAuth, requireAdmin);

const ORDER_STATUSES = ["AWAITING_CONFIRMATION", "CONFIRMED", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const;

// Forward-only state machine (CANCELLED is reachable from any non-terminal
// state as an escape hatch); prevents e.g. DELIVERED -> AWAITING_CONFIRMATION.
const ALLOWED_TRANSITIONS: Record<(typeof ORDER_STATUSES)[number], (typeof ORDER_STATUSES)[number][]> = {
  AWAITING_CONFIRMATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

const listQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

adminOrdersRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { status, page, pageSize } = req.query as unknown as z.infer<typeof listQuerySchema>;

    const where = status ? { status } : {};
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total, page, pageSize });
  }),
);

adminOrdersRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        items: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
      },
    });
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json({ order });
  }),
);

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().max(500).optional(),
});

adminOrdersRouter.patch(
  "/:id/status",
  validate(idParamSchema, "params"),
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const { status, note } = req.body as z.infer<typeof statusSchema>;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found." });

    if (!ALLOWED_TRANSITIONS[order.status].includes(status)) {
      return res.status(409).json({
        error: `Cannot move an order from ${order.status} to ${status}.`,
      });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status,
        statusHistory: {
          create: {
            status,
            changedById: req.user!.id,
            note: note ? sanitizePlainText(note) : null,
          },
        },
      },
    });

    await recordAudit(req.user!.id, "ORDER_STATUS_CHANGE", "Order", order.id, {
      from: order.status,
      to: status,
    });

    res.json({ order: updated });
  }),
);
