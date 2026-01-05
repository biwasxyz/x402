import { Router } from "express";
import { requirePayment } from "../middleware/payment";
import { researchUserHandler } from "../controllers/research.controller";

const router = Router();

// POST /api/research/user - Research a user using AI with web search
router.post("/research/user", requirePayment(0.005), researchUserHandler);

export default router;
