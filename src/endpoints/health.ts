import { RuntimeConfig } from "../config";
import { sendSuccess } from "../utils/response";

export function healthEndpoint(config: RuntimeConfig) {
  return sendSuccess({
    status: "ok",
    network: config.network,
    services: {
      news: "GET /api/news",
      audit: "POST /api/audit",
      walletClassifier: "POST /api/wallet/classify",
      userResearch: "POST /api/research/user",
      sentimentAnalysis: "POST /api/sentiment",
    },
  });
}
