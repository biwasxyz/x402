import { Request, Response } from "express";
import { getPayment } from "x402-stacks";
import { classifyWallet } from "../services/wallet.service";
import { sendSuccess, sendError } from "../utils/response.utils";

interface ClassifyRequest {
  address: string;
}

export async function classifyWalletHandler(req: Request, res: Response) {
  const payment = getPayment(req);
  console.log(`  Payment verified: ${payment.txId}`);

  try {
    const { address } = req.body as ClassifyRequest;

    if (!address) {
      return sendError(
        res,
        "address is required",
        400,
        "MISSING_ADDRESS"
      );
    }

    console.log(`  Classifying wallet: ${address}`);

    const analysis = await classifyWallet(address);

    console.log(`  Classification complete: ${analysis.classification} (confidence: ${analysis.confidence})`);

    sendSuccess(
      res,
      analysis,
      200,
      {
        txId: payment.txId,
        amount: payment.amount.toString(),
        sender: payment.sender,
      }
    );
  } catch (error: any) {
    console.error(`  Error:`, error instanceof Error ? error.message : error);

    if (error.message?.includes("Invalid Stacks address")) {
      return sendError(
        res,
        "Invalid Stacks address format. Expected format: SP... or SM...",
        400,
        "INVALID_ADDRESS"
      );
    }

    if (error.message?.includes("User not found")) {
      return sendError(
        res,
        "AI service configuration error. Please contact support.",
        500,
        "AI_SERVICE_ERROR",
        "OpenRouter API authentication failed"
      );
    }

    sendError(
      res,
      error instanceof Error ? error.message : "Failed to classify wallet",
      500,
      "CLASSIFICATION_ERROR"
    );
  }
}
