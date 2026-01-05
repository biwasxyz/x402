import { Request, Response } from "express";
import { getPayment } from "x402-stacks";
import { researchUser } from "../services/research.service";
import { sendSuccess, sendError } from "../utils/response.utils";

interface ResearchRequest {
  username: string;
}

export async function researchUserHandler(req: Request, res: Response) {
  const payment = getPayment(req);
  console.log(`  Payment verified: ${payment.txId}`);

  try {
    const { username } = req.body as ResearchRequest;

    if (!username) {
      return sendError(
        res,
        "username is required",
        400,
        "MISSING_USERNAME"
      );
    }

    console.log(`  Researching user: ${username}`);

    const research = await researchUser(username);

    console.log(`  Research complete for: ${research.username} on ${research.platform}`);

    sendSuccess(
      res,
      research,
      200,
      {
        txId: payment.txId,
        amount: payment.amount.toString(),
        sender: payment.sender,
      }
    );
  } catch (error: any) {
    console.error(`  Error:`, error instanceof Error ? error.message : error);

    if (error.message?.includes("Invalid username")) {
      return sendError(
        res,
        "Invalid username provided",
        400,
        "INVALID_USERNAME"
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
      error instanceof Error ? error.message : "Failed to research user",
      500,
      "RESEARCH_ERROR"
    );
  }
}
