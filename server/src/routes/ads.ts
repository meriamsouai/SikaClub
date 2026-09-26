import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { AdModel, toPublicAd } from "../models/Ad";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const ads = await AdModel.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 });
    res.json({ ads: ads.map(toPublicAd) });
  }),
);

export default router;
