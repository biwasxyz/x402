import { Router } from "express";
import docsRoutes from "./docs.routes";
import newsRoutes from "./news.routes";
import auditRoutes from "./audit.routes";
import walletRoutes from "./wallet.routes";
import researchRoutes from "./research.routes";
import sentimentRoutes from "./sentiment.routes";
import { sendSuccess } from "../utils/response.utils";

const router = Router();

// Health check
router.get("/health", (_req, res) => {
  sendSuccess(res, {
    status: "ok",
    network: process.env.NETWORK || "testnet",
    services: {
      news: "GET /api/news",
      audit: "POST /api/audit",
      walletClassifier: "POST /api/wallet/classify",
      userResearch: "POST /api/research/user",
      sentimentAnalysis: "POST /api/sentiment"
    }
  });
});

// Mount routes
router.use(docsRoutes);
router.use("/api", newsRoutes);
router.use("/api", auditRoutes);
router.use("/api", walletRoutes);
router.use("/api", researchRoutes);
router.use("/api", sentimentRoutes);

export default router;
