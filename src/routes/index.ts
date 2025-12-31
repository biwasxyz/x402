import { Router } from "express";
import docsRoutes from "./docs.routes";
import newsRoutes from "./news.routes";
import auditRoutes from "./audit.routes";
import { sendSuccess } from "../utils/response.utils";

const router = Router();

// Health check
router.get("/health", (_req, res) => {
  sendSuccess(res, {
    status: "ok",
    network: process.env.NETWORK || "testnet",
    services: {
      news: "GET /api/news",
      audit: "POST /api/audit"
    }
  });
});

// Mount routes
router.use(docsRoutes);
router.use("/api", newsRoutes);
router.use("/api", auditRoutes);

export default router;
