import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { recordAudit } from "../../services/audit.service";
import { sanitizePlainText } from "../../utils/sanitize";
import { idParamSchema } from "../../utils/paramSchemas";

export const adminProductsRouter = Router();
// requireAdmin re-checks role + ACTIVE status from the DB on every request —
// the "isAdmin" gate for this whole router.
adminProductsRouter.use(requireAuth, requireAdmin);

const specEntrySchema = z.object({
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(200),
});

function sanitizeSpecs(specs: { label: string; value: string }[]): Prisma.InputJsonValue {
  return specs.map((s) => ({ label: sanitizePlainText(s.label), value: sanitizePlainText(s.value) }));
}

const listQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  search: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

adminProductsRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { status, search, page, pageSize } = req.query as unknown as z.infer<typeof listQuerySchema>;

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ products, total, page, pageSize });
  }),
);

const createProductSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(5000),
  priceCents: z.number().int().positive(),
  stockQuantity: z.number().int().min(0),
  imageUrl: z.string().max(2000).optional(),
  specs: z.array(specEntrySchema).max(30).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

adminProductsRouter.post(
  "/",
  validate(createProductSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof createProductSchema>;

    const product = await prisma.product.create({
      data: {
        title: sanitizePlainText(data.title),
        description: sanitizePlainText(data.description),
        priceCents: data.priceCents,
        stockQuantity: data.stockQuantity,
        imageUrl: data.imageUrl ? sanitizePlainText(data.imageUrl) : null,
        specs: data.specs ? sanitizeSpecs(data.specs) : undefined,
        status: data.status ?? "DRAFT",
        createdById: req.user!.id,
      },
    });

    await recordAudit(req.user!.id, "PRODUCT_CREATED", "Product", product.id);

    res.status(201).json({ product });
  }),
);

const updateProductSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().min(1).max(5000).optional(),
  priceCents: z.number().int().positive().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  imageUrl: z.string().max(2000).optional(),
  specs: z.array(specEntrySchema).max(30).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

adminProductsRouter.put(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateProductSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id!, deletedAt: null } });
    if (!existing) return res.status(404).json({ error: "Product not found." });

    const data = req.body as z.infer<typeof updateProductSchema>;

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...(data.title !== undefined ? { title: sanitizePlainText(data.title) } : {}),
        ...(data.description !== undefined ? { description: sanitizePlainText(data.description) } : {}),
        ...(data.priceCents !== undefined ? { priceCents: data.priceCents } : {}),
        ...(data.stockQuantity !== undefined ? { stockQuantity: data.stockQuantity } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: sanitizePlainText(data.imageUrl) || null } : {}),
        ...(data.specs !== undefined ? { specs: sanitizeSpecs(data.specs) } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    await recordAudit(req.user!.id, "PRODUCT_UPDATED", "Product", product.id, { fields: Object.keys(data) });

    res.json({ product });
  }),
);

adminProductsRouter.delete(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id!, deletedAt: null } });
    if (!existing) return res.status(404).json({ error: "Product not found." });

    // Soft delete: removed from every listing (admin + public storefront)
    // but kept in the database rather than physically deleted.
    await prisma.product.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });

    await recordAudit(req.user!.id, "PRODUCT_DELETED", "Product", existing.id);

    res.status(204).send();
  }),
);
