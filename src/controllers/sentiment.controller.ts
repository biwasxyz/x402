import { Request, Response } from "express";
import { getPayment } from "x402-stacks";
import { analyzeSentiment } from "../services/sentiment.service";
import { sendSuccess, sendError } from "../utils/response.utils";

interface SentimentRequest {
  topic?: string;
}

export async function sentimentAnalysisHandler(req: Request, res: Response) {
  const payment = getPayment(req);
  console.log(`  Payment verified: ${payment.txId}`);

  try {
    const { topic } = req.body as SentimentRequest;

    console.log(`  Analyzing sentiment for: ${topic || "default ecosystem topics"}`);

    const analysis = await analyzeSentiment(topic);

    console.log(`  Sentiment analysis complete: ${analysis.overallSentiment} (score: ${analysis.sentimentScore})`);

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

    if (error.message?.includes("Failed to get sentiment")) {
      return sendError(
        res,
        "AI service failed to analyze sentiment. Please try again.",
        500,
        "AI_SERVICE_ERROR"
      );
    }

    sendError(
      res,
      error instanceof Error ? error.message : "Failed to analyze sentiment",
      500,
      "SENTIMENT_ANALYSIS_ERROR"
    );
  }
}
