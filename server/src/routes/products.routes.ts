import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler } from "../utils/asyncHandler";

// Public, unauthenticated storefront read — only published, non-deleted
// products are ever exposed here. Admin-only mutation lives in
// routes/admin/products.routes.ts.
export const productsRouter = Router();

productsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    res.json({ products });
  }),
);
