import { getStacksAndBitcoinNews } from "../../services/news.service";
import { sendError, sendSuccess } from "../../utils/response";
import { BaseEndpoint } from "../BaseEndpoint";
import { PaidEndpointContext } from "../../types";

export class NewsEndpoint extends BaseEndpoint<void, PaidEndpointContext> {
  async handle(context: PaidEndpointContext) {
    const payment = context.payment;
    console.log(`  Payment verified: ${payment.txId}`);

    try {
      const news = await getStacksAndBitcoinNews();
      return sendSuccess(news, 200, payment);
    } catch (error) {
      console.error(`  Error:`, error instanceof Error ? error.message : error);
      return sendError(
        error instanceof Error ? error.message : "Failed to fetch news",
        500,
        "NEWS_FETCH_ERROR"
      );
    }
  }
}

export const newsEndpoint = new NewsEndpoint();
