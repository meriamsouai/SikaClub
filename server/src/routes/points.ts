import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { ensureWelcomeBonus } from "../lib/pointsLedger";
import { PointEntryModel, toPublicPointEntry } from "../models/PointEntry";
import { UserModel } from "../models/User";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.authUser!._id);
    if (user && user.role === "client") {
      await ensureWelcomeBonus(user);
    }

    const entries = await PointEntryModel.find({ user: req.authUser!._id }).sort({ createdAt: -1 });
    res.json({ entries: entries.map(toPublicPointEntry) });
  }),
);

router.get(
  "/admin/user/:userId",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const entries = await PointEntryModel.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json({ entries: entries.map(toPublicPointEntry) });
  }),
);

export default router;
