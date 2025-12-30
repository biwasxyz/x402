import { Router } from "express";
import { auditContract } from "../controllers/audit.controller";
import { requirePayment } from "../middleware/payment";

const router = Router();

/**
 * @route   POST /api/audit
 * @desc    Comprehensive Clarity smart contract security audit
 * @access  Paid (0.02 STX)
 * @body    { contractIdentifier?: string, contractCode?: string, contractName?: string }
 */
router.post("/audit", requirePayment(0.02), auditContract);

export default router;
