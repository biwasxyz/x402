import { Router } from "express";
import { requirePayment } from "../middleware/payment";
import { sentimentAnalysisHandler } from "../controllers/sentiment.controller";

const router = Router();

// POST /api/sentiment - Analyze X/Twitter sentiment for Stacks ecosystem tokens
router.post("/sentiment", requirePayment(0.005), sentimentAnalysisHandler);

export default router;
