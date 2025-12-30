import { Router } from "express";
import newsRoutes from "./news.routes";
import auditRoutes from "./audit.routes";

const router = Router();

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    network: process.env.NETWORK || "testnet",
    services: {
      news: "GET /api/news",
      audit: "POST /api/audit"
    }
  });
});

// Mount routes
router.use("/api", newsRoutes);
router.use("/api", auditRoutes);

export default router;
