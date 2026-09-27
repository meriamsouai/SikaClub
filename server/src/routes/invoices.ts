import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { recordAdminAction } from "../lib/audit";
import { invoiceFilePublicPath, invoiceFileUpload, MAX_INVOICE_FILES } from "../lib/invoiceUpload";
import { recordInvoicePoints } from "../lib/pointsLedger";
import { InvoiceModel, toPublicInvoice } from "../models/Invoice";
import { allocateProductPoints, igolflexPointsForSeaux, ProductModel, toPublicProduct } from "../models/Product";
import { UserModel } from "../models/User";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";
import { AppError } from "../middleware/errorHandler";
import { createInvoiceSchema } from "../validation/invoice";

const router = Router();

function actorFrom(req: { authUser?: { _id: { toString(): string }; email: string; role: string } }) {
  const user = req.authUser!;
  return { id: user._id.toString(), email: user.email, role: user.role };
}
router.get(
  "/products",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const products = await ProductModel.find().sort({ name: 1 });
    res.json({ products: products.map(toPublicProduct) });
  }),
);

router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const invoices = await InvoiceModel.find({ user: req.authUser!._id }).sort({ createdAt: -1 });
    res.json({ invoices: invoices.map((invoice) => toPublicInvoice(invoice)) });
  }),
);

router.post(
  "/mine/:id/report",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.authUser!.role !== "client") {
      throw new AppError(403, "Seuls les partenaires peuvent signaler un problème.", "FORBIDDEN");
    }

    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) {
      throw new AppError(400, "Veuillez décrire le problème.", "VALIDATION");
    }
    if (message.length > 1000) {
      throw new AppError(400, "Le message est trop long (1000 caractères max).", "VALIDATION");
    }

    const invoice = await InvoiceModel.findOne({
      _id: req.params.id,
      user: req.authUser!._id,
    });
    if (!invoice) {
      throw new AppError(404, "Facture introuvable.", "NOT_FOUND");
    }
    if (invoice.clientProblemReport?.trim()) {
      throw new AppError(400, "Un problème a déjà été signalé pour cette facture.", "VALIDATION");
    }
    if (invoice.status !== "approved" && invoice.status !== "rejected") {
      throw new AppError(
        400,
        "Vous pourrez signaler un problème après la décision de l’administrateur.",
        "VALIDATION",
      );
    }

    invoice.clientProblemReport = message;
    await invoice.save();

    res.json({
      invoice: toPublicInvoice(invoice),
      message: "Votre message a été enregistré.",
    });
  }),
);

router.post(
  "/",
  requireAuth,
  invoiceFileUpload.array("files", MAX_INVOICE_FILES),
  asyncHandler(async (req, res) => {
    if (req.authUser!.role !== "client") {
      throw new AppError(403, "Seuls les partenaires peuvent soumettre une facture.", "FORBIDDEN");
    }
    const uploaded = req.files;
    if (!Array.isArray(uploaded) || uploaded.length === 0) {
      throw new AppError(400, "Veuillez téléverser au moins un fichier de facture.", "VALIDATION");
    }
    if (uploaded.length > MAX_INVOICE_FILES) {
      throw new AppError(400, `Vous pouvez téléverser au maximum ${MAX_INVOICE_FILES} fichiers.`, "VALIDATION");
    }

    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, "Certains champs sont invalides.", "VALIDATION");
    }

    const productIds = parsed.data.lines.map((line) => line.productId);
    const products = await ProductModel.find({ _id: { $in: productIds } });
    if (products.length !== new Set(productIds).size) {
      throw new AppError(400, "Un ou plusieurs produits sont invalides.", "VALIDATION");
    }

    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    const productPointAlloc = allocateProductPoints(
      parsed.data.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
      (productId) => productMap.get(productId)?.tiers,
    );
    const lines = parsed.data.lines.map((line, index) => {
      const product = productMap.get(line.productId)!;
      const igolflexSeaux = line.igolflexSeaux ?? 0;
      const igolflexPoints = igolflexPointsForSeaux(igolflexSeaux);
      return {
        product: product._id,
        productName: product.name,
        productReference: product.reference,
        distributor: line.distributor,
        quantity: line.quantity,
        points: (productPointAlloc[index] ?? 0) + igolflexPoints,
        igolflexSeaux,
        igolflexPoints,
      };
    });

    const estimatedPoints = lines.reduce((sum, line) => sum + line.points, 0);
    const distributors = [...new Set(lines.map((line) => line.distributor))];
    const fileUrls = uploaded.map((file) => invoiceFilePublicPath(file.filename));
    const invoice = await InvoiceModel.create({
      user: req.authUser!._id,
      distributor: distributors.join(" · "),
      products: lines,
      fileUrl: fileUrls[0],
      fileUrls,
      status: "pending",
      estimatedPoints,
      pointsAwarded: 0,
    });

    res.status(201).json({
      invoice: toPublicInvoice(invoice),
      message: "Votre facture a été enregistrée et sera examinée par un administrateur.",
    });
  }),
);

router.get(
  "/admin/pending",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const invoices = await InvoiceModel.find({ status: "pending" }).sort({ createdAt: 1 });
    const userIds = invoices.map((invoice) => invoice.user);
    const users = await UserModel.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    res.json({
      invoices: invoices.map((invoice) =>
        toPublicInvoice(invoice, userMap.get(invoice.user.toString()) ?? null),
      ),
    });
  }),
);

router.get(
  "/admin/reviewed",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const invoices = await InvoiceModel.find({ status: { $in: ["approved", "rejected"] } })
      .sort({ updatedAt: -1 })
      .limit(300);
    const userIds = invoices.map((invoice) => invoice.user);
    const users = await UserModel.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    res.json({
      invoices: invoices.map((invoice) =>
        toPublicInvoice(invoice, userMap.get(invoice.user.toString()) ?? null),
      ),
    });
  }),
);

router.post(
  "/admin/:id/approve",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const invoice = await InvoiceModel.findById(req.params.id);
    if (!invoice) {
      throw new AppError(404, "Facture introuvable.", "NOT_FOUND");
    }
    if (invoice.status !== "pending") {
      throw new AppError(400, "Cette facture n’est pas en attente.", "VALIDATION");
    }

    const user = await UserModel.findById(invoice.user);
    if (!user) {
      throw new AppError(404, "Compte introuvable.", "NOT_FOUND");
    }

    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    invoice.status = "approved";
    invoice.pointsAwarded = invoice.estimatedPoints;
    invoice.adminNote = note;
    await invoice.save();

    user.totalPoints += invoice.pointsAwarded;
    await user.save();

    const productNames = invoice.products.map((line) => line.productName).join(", ");
    await recordInvoicePoints({
      userId: user._id,
      invoiceId: invoice._id.toString(),
      points: invoice.pointsAwarded,
      label: productNames || "Facture approuvée",
    });

    await recordAdminAction({
      actor: actorFrom(req),
      action: "invoice.approve",
      targetType: "invoice",
      targetId: invoice._id.toString(),
      summary: `Facture approuvée (${invoice.pointsAwarded} pts) — ${user.email}`,
    });

    res.json({
      invoice: toPublicInvoice(invoice, user),
      message: "Facture approuvée. Les points ont été crédités.",
    });
  }),
);

router.post(
  "/admin/:id/reject",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const invoice = await InvoiceModel.findById(req.params.id);
    if (!invoice) {
      throw new AppError(404, "Facture introuvable.", "NOT_FOUND");
    }
    if (invoice.status !== "pending") {
      throw new AppError(400, "Cette facture n’est pas en attente.", "VALIDATION");
    }

    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
    invoice.status = "rejected";
    invoice.pointsAwarded = 0;
    invoice.adminNote = note;
    await invoice.save();

    const user = await UserModel.findById(invoice.user);

    await recordAdminAction({
      actor: actorFrom(req),
      action: "invoice.reject",
      targetType: "invoice",
      targetId: invoice._id.toString(),
      summary: `Facture refusée — ${user?.email ?? invoice.user.toString()}`,
    });

    res.json({
      invoice: toPublicInvoice(invoice, user),
      message: "Facture refusée.",
    });
  }),
);

export default router;
