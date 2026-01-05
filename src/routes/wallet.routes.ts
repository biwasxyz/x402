import { Router } from "express";
import { requirePayment } from "../middleware/payment";
import { classifyWalletHandler } from "../controllers/wallet.controller";

const router = Router();

// POST /api/wallet/classify - Classify wallet behavior
router.post("/wallet/classify", requirePayment(0.005), classifyWalletHandler);

export default router;
