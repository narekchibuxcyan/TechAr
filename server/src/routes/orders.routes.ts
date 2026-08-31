import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { requireAuth, requireActive } from "../middleware/auth";
import { idParamSchema } from "../utils/paramSchemas";

export const ordersRouter = Router();
ordersRouter.use(requireAuth, requireActive);

ordersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
  }),
);

ordersRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { items: true, statusHistory: { orderBy: { changedAt: "asc" } } },
    });
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json({ order });
  }),
);

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(50),
});

ordersRouter.post(
  "/",
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const { items } = req.body as z.infer<typeof createOrderSchema>;

    // Price and title are always sourced from the current Product record,
    // never trusted from the client — otherwise a request could set its own
    // price. The OrderItem still stores a denormalized copy (title/price at
    // time of purchase) so later catalog edits don't rewrite past orders.
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, status: "PUBLISHED", deletedAt: null },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      if (!productById.has(item.productId)) {
        return res.status(400).json({ error: "One or more products are no longer available." });
      }
    }

    const lineItems = items.map((item) => {
      const product = productById.get(item.productId)!;
      return { productName: product.title, quantity: item.quantity, unitPriceCents: product.priceCents };
    });
    const totalCents = lineItems.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);

    const order = await prisma.order.create({
      data: {
        userId: req.user!.id,
        totalCents,
        items: { create: lineItems },
        statusHistory: {
          create: { status: "AWAITING_CONFIRMATION", note: "Order placed." },
        },
      },
      include: { items: true },
    });

    res.status(201).json({ order });
  }),
);
