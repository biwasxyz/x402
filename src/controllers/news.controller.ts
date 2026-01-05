import { Request, Response } from "express";
import { getPayment } from "x402-stacks";
import { getStacksAndBitcoinNews } from "../services/news.service";
import { sendSuccess, sendError } from "../utils/response.utils";

export async function getNews(req: Request, res: Response) {
  const payment = getPayment(req);
  console.log(`  Payment verified: ${payment.txId}`);

  try {
    const news = await getStacksAndBitcoinNews();

    sendSuccess(
      res,
      news,
      200,
      {
        txId: payment.txId,
        amount: payment.amount.toString(),
        sender: payment.sender,
      }
    );
  } catch (error) {
    console.error(`  Error:`, error instanceof Error ? error.message : error);
    sendError(
      res,
      error instanceof Error ? error.message : "Failed to fetch news",
      500,
      "NEWS_FETCH_ERROR"
    );
  }
}
