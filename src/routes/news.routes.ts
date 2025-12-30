import { Router } from "express";
import { getNews } from "../controllers/news.controller";
import { requirePayment } from "../middleware/payment";

const router = Router();

/**
 * @route   GET /api/news
 * @desc    Get latest Stacks & Bitcoin news
 * @access  Paid (0.001 STX)
 */
router.get("/news", requirePayment(0.001), getNews);

export default router;
