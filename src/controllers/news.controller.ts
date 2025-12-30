import { Request, Response } from "express";
import { getPayment } from "x402-stacks";
import { getStacksAndBitcoinNews } from "../services/news.service";

export async function getNews(req: Request, res: Response) {
  const payment = getPayment(req);
  console.log(`  Payment verified: ${payment.txId}`);

  try {
    const news = await getStacksAndBitcoinNews();

    res.json({
      news,
      payment: {
        txId: payment.txId,
        amount: payment.amount.toString(),
        sender: payment.sender,
      },
    });
  } catch (error) {
    console.error(`  Error:`, error instanceof Error ? error.message : error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch news",
    });
  }
}
