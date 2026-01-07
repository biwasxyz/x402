import { classifyWallet } from "../../services/wallet.service";
import { sendError, sendSuccess } from "../../utils/response";
import { BaseEndpoint } from "../BaseEndpoint";
import { PaidEndpointContext } from "../../types";

interface ClassifyRequest {
  address: string;
}

export class WalletClassifierEndpoint extends BaseEndpoint<ClassifyRequest, PaidEndpointContext<ClassifyRequest>> {
  async handle(context: PaidEndpointContext<ClassifyRequest>) {
    const payment = context.payment;
    console.log(`  Payment verified: ${payment.txId}`);

    try {
      const { address } = context.body || {} as ClassifyRequest;

      if (!address) {
        return sendError(
          "address is required",
          400,
          "MISSING_ADDRESS"
        );
      }

      console.log(`  Classifying wallet: ${address}`);

      const analysis = await classifyWallet(address, context.config.stacksApiUrl);

      console.log(`  Classification complete: ${analysis.classification} (confidence: ${analysis.confidence})`);

      return sendSuccess(analysis, 200, payment);
    } catch (error: any) {
      console.error(`  Error:`, error instanceof Error ? error.message : error);

      if (error.message?.includes("Invalid Stacks address")) {
        return sendError(
          "Invalid Stacks address format. Expected format: SP... or SM...",
          400,
          "INVALID_ADDRESS"
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
        error instanceof Error ? error.message : "Failed to classify wallet",
        500,
        "CLASSIFICATION_ERROR"
      );
    }
  }
}

export const walletClassifierEndpoint = new WalletClassifierEndpoint();
