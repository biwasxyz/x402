import { analyzeSentiment } from "../../services/sentiment.service";
import { sendError, sendSuccess } from "../../utils/response";
import { BaseEndpoint } from "../BaseEndpoint";
import { PaidEndpointContext } from "../../types";

interface SentimentRequest {
  topic?: string;
}

export class SentimentEndpoint extends BaseEndpoint<SentimentRequest, PaidEndpointContext<SentimentRequest>> {
  async handle(context: PaidEndpointContext<SentimentRequest>) {
    const payment = context.payment;
    console.log(`  Payment verified: ${payment.txId}`);

    try {
      const { topic } = context.body || {} as SentimentRequest;

      console.log(`  Analyzing sentiment for: ${topic || "default ecosystem topics"}`);

      const analysis = await analyzeSentiment(topic);

      console.log(`  Sentiment analysis complete: ${analysis.overallSentiment} (score: ${analysis.sentimentScore})`);

      return sendSuccess(analysis, 200, payment);
    } catch (error: any) {
      console.error(`  Error:`, error instanceof Error ? error.message : error);

      if (error.message?.includes("Failed to get sentiment")) {
        return sendError(
          "AI service failed to analyze sentiment. Please try again.",
          500,
          "AI_SERVICE_ERROR"
        );
      }

      return sendError(
        error instanceof Error ? error.message : "Failed to analyze sentiment",
        500,
        "SENTIMENT_ANALYSIS_ERROR"
      );
    }
  }
}

export const sentimentEndpoint = new SentimentEndpoint();
