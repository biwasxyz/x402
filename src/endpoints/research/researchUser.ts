import { researchUser } from "../../services/research.service";
import { sendError, sendSuccess } from "../../utils/response";
import { BaseEndpoint } from "../BaseEndpoint";
import { PaidEndpointContext } from "../../types";

interface ResearchRequest {
  username: string;
}

export class ResearchEndpoint extends BaseEndpoint<ResearchRequest, PaidEndpointContext<ResearchRequest>> {
  async handle(context: PaidEndpointContext<ResearchRequest>) {
    const payment = context.payment;
    console.log(`  Payment verified: ${payment.txId}`);

    try {
      const { username } = context.body || {} as ResearchRequest;

      if (!username) {
        return sendError(
          "username is required",
          400,
          "MISSING_USERNAME"
        );
      }

      console.log(`  Researching user: ${username}`);

      const research = await researchUser(username);

      console.log(`  Research complete for: ${research.username} on ${research.platform}`);

      return sendSuccess(research, 200, payment);
    } catch (error: any) {
      console.error(`  Error:`, error instanceof Error ? error.message : error);

      if (error.message?.includes("Invalid username")) {
        return sendError(
          "Invalid username provided",
          400,
          "INVALID_USERNAME"
        );
      }

      if (error.message?.includes("User not found")) {
        return sendError(
          "AI service configuration error. Please contact support.",
          500,
          "AI_SERVICE_ERROR",
          "OpenRouter API authentication failed"
        );
      }

      return sendError(
        error instanceof Error ? error.message : "Failed to research user",
        500,
        "RESEARCH_ERROR"
      );
    }
  }
}

export const researchEndpoint = new ResearchEndpoint();
