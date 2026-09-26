import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import path from "path";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import giftRoutes from "./routes/gifts";
import adRoutes from "./routes/ads";
import invoiceRoutes from "./routes/invoices";
import pointsRoutes from "./routes/points";

export const app = express();

app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

if (!env.isProduction) {
  app.use(morgan("dev"));
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/gifts", giftRoutes);
app.use("/api/ads", adRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/points", pointsRoutes);

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Ressource introuvable.", code: "NOT_FOUND" });
});

app.use(errorHandler);
