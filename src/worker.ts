import { createRuntimeConfig, EnvBindings, RuntimeConfig } from "./config";
import { EndpointConfig } from "./types";
import { sendError, sendSuccess, jsonResponse } from "./utils/response";
import { requirePayment, PaymentFailure } from "./utils/payment";
import { initOpenRouter } from "./services/openrouter.service";
import { getStacksAndBitcoinNews } from "./services/news.service";
import { performSecurityAudit } from "./services/audit.service";
import { getContractSource } from "./services/stacks.service";
import { classifyWallet } from "./services/wallet.service";
import { researchUser } from "./services/research.service";
import { analyzeSentiment } from "./services/sentiment.service";
import {
  getMarketStats,
  getTopGainers,
  getTopLosers,
  getWhaleTrades,
  getHourlyNetflow,
} from "./services/tenero-market.service";
import { TeneroApiError } from "./services/tenero/client";
import { getTrendingPools, getPoolOhlc } from "./services/tenero-pools.service";
import { getTokenSummary, getTokenDetails } from "./services/tenero-tokens.service";
import { TrendingTimeframe } from "./services/tenero/types";
import { analyzeWalletTrading, analyzeWalletPnl } from "./services/tenero-wallets.service";


type Env = EnvBindings & Record<string, string | undefined>;

const OPENROUTER_ENDPOINTS = new Set([
  "/api/news",
  "/api/audit",
  "/api/wallet/classify",
  "/api/research/user",
  "/api/sentiment",
  "/api/wallet/trading",
  "/api/wallet/pnl",
]);

// x402-stacks Endpoint Configurations (prices in token units)
const ENDPOINTS: Record<string, EndpointConfig> = {
  "/api/news": {
    resource: "/api/news",
    description: "Get latest Stacks and Bitcoin news with AI analysis",
    method: "GET",
    paymentRequired: true,
    amount: 0.001, // 0.001 STX
  },
  "/api/audit": {
    resource: "/api/audit",
    description: "Security audit for Clarity smart contracts",
    method: "POST",
    paymentRequired: true,
    amount: 0.02, // 0.02 STX
  },
  "/api/wallet/classify": {
    resource: "/api/wallet/classify",
    description: "Classify wallet behavior (trader, whale, bot, dao, bridge)",
    method: "POST",
    paymentRequired: true,
    amount: 0.005, // 0.005 STX
  },
  "/api/research/user": {
    resource: "/api/research/user",
    description: "Research user profile from X/Twitter and web sources",
    method: "POST",
    paymentRequired: true,
    amount: 0.005, // 0.005 STX
  },
  "/api/sentiment": {
    resource: "/api/sentiment",
    description: "Real-time sentiment analysis for crypto tokens on X/Twitter",
    method: "POST",
    paymentRequired: true,
    amount: 0.005, // 0.005 STX
  },
  // Tenero Market Data Endpoints
  "/api/market/stats": {
    resource: "/api/market/stats",
    description: "Stacks DeFi market statistics (volume, traders, pools)",
    method: "GET",
    paymentRequired: false,
  },
  "/api/market/gainers": {
    resource: "/api/market/gainers",
    description: "Top gaining tokens by price change",
    method: "GET",
    paymentRequired: false,
  },
  "/api/market/losers": {
    resource: "/api/market/losers",
    description: "Top losing tokens by price change",
    method: "GET",
    paymentRequired: false,
  },
  "/api/market/whales": {
    resource: "/api/market/whales",
    description: "Recent whale trades (large transactions)",
    method: "GET",
    paymentRequired: false,
  },
  "/api/market/netflow": {
    resource: "/api/market/netflow",
    description: "Hourly net flow of funds in/out of the market",
    method: "GET",
    paymentRequired: false,
  },
  // Tenero Pools Endpoints
  "/api/pools/trending": {
    resource: "/api/pools/trending",
    description: "Trending liquidity pools by trading activity",
    method: "GET",
    paymentRequired: false,
  },
  "/api/pools/ohlc": {
    resource: "/api/pools/ohlc",
    description: "OHLCV candlestick data for a pool",
    method: "POST",
    paymentRequired: false,
  },
  // Tenero Tokens Endpoints
  "/api/tokens/summary": {
    resource: "/api/tokens/summary",
    description: "Token market summary with weighted price",
    method: "POST",
    paymentRequired: false,
  },
  "/api/tokens/details": {
    resource: "/api/tokens/details",
    description: "Full token details including supply and holders",
    method: "POST",
    paymentRequired: false,
  },
  // Tenero Wallet Analytics (AI-Enhanced)
  "/api/wallet/trading": {
    resource: "/api/wallet/trading",
    description: "AI-enhanced wallet trading behavior analysis",
    method: "POST",
    paymentRequired: true,
    amount: 0.005,
  },
  "/api/wallet/pnl": {
    resource: "/api/wallet/pnl",
    description: "AI-enhanced wallet profit/loss analysis",
    method: "POST",
    paymentRequired: true,
    amount: 0.005,
  },
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    console.log(`[${new Date().toISOString()}] ${method} ${url.pathname}`);

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type,x-payment",
          "access-control-max-age": "86400",
        },
      });
    }

    // Health check (free)
    if (method === "GET" && url.pathname === "/health") {
      return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
    }

    // Root info (free)
    if (method === "GET" && url.pathname === "/") {
      const endpoints = Object.values(ENDPOINTS).map((endpoint) => ({
        path: endpoint.resource,
        method: endpoint.method,
        description: endpoint.description,
        paymentRequired: endpoint.paymentRequired,
        price: endpoint.paymentRequired
          ? {
              amount: endpoint.amount,
              tokenType: endpoint.tokenType || "STX",
            }
          : null,
      }));

      return jsonResponse({
        status: "ok",
        service: "x402-stacks",
        endpoints,
        health: "/health",
      });
    }

    // Initialize config
    let config: RuntimeConfig;
    try {
      config = createRuntimeConfig(env);
    } catch (error) {
      return sendError(
        error instanceof Error ? error.message : "Configuration error",
        500,
        "CONFIG_ERROR"
      );
    }

    // Initialize OpenRouter for API endpoints
    if (OPENROUTER_ENDPOINTS.has(url.pathname)) {
      try {
        initOpenRouter(env.OPENROUTER_API_KEY);
      } catch (error) {
        return sendError("OpenRouter API key not configured", 500, "API_KEY_ERROR");
      }
    }

    // Route handlers
    if (method === "GET" && url.pathname === "/api/news") {
      return handleNews(request, config);
    }

    if (method === "POST" && url.pathname === "/api/audit") {
      return handleAudit(request, config);
    }

    if (method === "POST" && url.pathname === "/api/wallet/classify") {
      return handleWalletClassify(request, config);
    }

    if (method === "POST" && url.pathname === "/api/research/user") {
      return handleResearchUser(request, config);
    }

    if (method === "POST" && url.pathname === "/api/sentiment") {
      return handleSentiment(request, config);
    }

    // Tenero Market Endpoints
    if (method === "GET" && url.pathname === "/api/market/stats") {
      return handleMarketStats(request, config);
    }

    if (method === "GET" && url.pathname === "/api/market/gainers") {
      return handleMarketGainers(request, config);
    }

    if (method === "GET" && url.pathname === "/api/market/losers") {
      return handleMarketLosers(request, config);
    }

    if (method === "GET" && url.pathname === "/api/market/whales") {
      return handleMarketWhales(request, config);
    }

    if (method === "GET" && url.pathname === "/api/market/netflow") {
      return handleMarketNetflow(request, config);
    }

    // Tenero Pools Endpoints
    if (method === "GET" && url.pathname === "/api/pools/trending") {
      return handlePoolsTrending(request, config);
    }

    if (method === "POST" && url.pathname === "/api/pools/ohlc") {
      return handlePoolsOhlc(request, config);
    }

    // Tenero Tokens Endpoints
    if (method === "POST" && url.pathname === "/api/tokens/summary") {
      return handleTokensSummary(request, config);
    }

    if (method === "POST" && url.pathname === "/api/tokens/details") {
      return handleTokensDetails(request, config);
    }

    // Tenero Wallet Analytics (AI-Enhanced)
    if (method === "POST" && url.pathname === "/api/wallet/trading") {
      return handleWalletTrading(request, config);
    }

    if (method === "POST" && url.pathname === "/api/wallet/pnl") {
      return handleWalletPnl(request, config);
    }

    return sendError("Not Found", 404, "NOT_FOUND");
  },
};

async function handleNews(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/news"];
  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const news = await getStacksAndBitcoinNews();
    return sendSuccess(news, 200, paymentResult.settlement);
  } catch (error) {
    console.error("News error:", error);
    return sendError(
      error instanceof Error ? error.message : "Failed to fetch news",
      500,
      "NEWS_ERROR"
    );
  }
}

async function handleAudit(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/audit"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { contractIdentifier } = body.data as { contractIdentifier?: string };
    if (!contractIdentifier) {
      return sendError("contractIdentifier is required", 400, "MISSING_FIELD");
    }

    const sourceCode = await getContractSource(contractIdentifier, config.stacksApiUrl);
    const [, contractName] = contractIdentifier.split(".");
    const auditResult = await performSecurityAudit(
      sourceCode,
      contractName,
      contractIdentifier
    );

    return sendSuccess(auditResult, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Audit error:", error);
    return sendError(
      error instanceof Error ? error.message : "Failed to audit contract",
      500,
      "AUDIT_ERROR"
    );
  }
}

async function handleWalletClassify(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/wallet/classify"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { address } = body.data as { address?: string };
    if (!address) {
      return sendError("address is required", 400, "MISSING_FIELD");
    }

    const analysis = await classifyWallet(address, config.stacksApiUrl);

    return sendSuccess(analysis, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Wallet classify error:", error);
    return sendError(
      error instanceof Error ? error.message : "Failed to classify wallet",
      500,
      "WALLET_ERROR"
    );
  }
}

async function handleResearchUser(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/research/user"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { username } = body.data as { username?: string };
    if (!username) {
      return sendError("username is required", 400, "MISSING_FIELD");
    }

    const research = await researchUser(username);

    return sendSuccess(research, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Research error:", error);
    return sendError(
      error instanceof Error ? error.message : "Failed to research user",
      500,
      "RESEARCH_ERROR"
    );
  }
}

async function handleSentiment(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/sentiment"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { topic } = body.data as { topic?: string };
    const analysis = await analyzeSentiment(topic);

    return sendSuccess(analysis, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Sentiment error:", error);
    return sendError(
      error instanceof Error ? error.message : "Failed to analyze sentiment",
      500,
      "SENTIMENT_ERROR"
    );
  }
}

// Tenero Market Handlers

async function handleMarketStats(request: Request, config: RuntimeConfig): Promise<Response> {
  try {
    const stats = await getMarketStats();
    return sendSuccess(stats, 200);
  } catch (error) {
    console.error("Market stats error:", error);
    if (error instanceof TeneroApiError) {
      return sendError(`Tenero API unavailable: ${error.message}`, 502, "TENERO_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to fetch market stats",
      500,
      "MARKET_STATS_ERROR"
    );
  }
}

async function handleMarketGainers(request: Request, config: RuntimeConfig): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const gainers = await getTopGainers(Math.min(limit, 50));
    return sendSuccess(gainers, 200);
  } catch (error) {
    console.error("Market gainers error:", error);
    if (error instanceof TeneroApiError) {
      return sendError(`Tenero API unavailable: ${error.message}`, 502, "TENERO_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to fetch top gainers",
      500,
      "MARKET_GAINERS_ERROR"
    );
  }
}

async function handleMarketLosers(request: Request, config: RuntimeConfig): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const losers = await getTopLosers(Math.min(limit, 50));
    return sendSuccess(losers, 200);
  } catch (error) {
    console.error("Market losers error:", error);
    if (error instanceof TeneroApiError) {
      return sendError(`Tenero API unavailable: ${error.message}`, 502, "TENERO_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to fetch top losers",
      500,
      "MARKET_LOSERS_ERROR"
    );
  }
}

async function handleMarketWhales(request: Request, config: RuntimeConfig): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const whales = await getWhaleTrades(Math.min(limit, 100));
    return sendSuccess(whales, 200);
  } catch (error) {
    console.error("Market whales error:", error);
    if (error instanceof TeneroApiError) {
      return sendError(`Tenero API unavailable: ${error.message}`, 502, "TENERO_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to fetch whale trades",
      500,
      "MARKET_WHALES_ERROR"
    );
  }
}

async function handleMarketNetflow(request: Request, config: RuntimeConfig): Promise<Response> {
  try {
    const netflow = await getHourlyNetflow();
    return sendSuccess(netflow, 200);
  } catch (error) {
    console.error("Market netflow error:", error);
    if (error instanceof TeneroApiError) {
      return sendError(`Tenero API unavailable: ${error.message}`, 502, "TENERO_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to fetch market netflow",
      500,
      "MARKET_NETFLOW_ERROR"
    );
  }
}

// Tenero Pools Handlers

async function handlePoolsTrending(request: Request, config: RuntimeConfig): Promise<Response> {
  try {
    const url = new URL(request.url);
    const timeframe = (url.searchParams.get("timeframe") || "1d") as TrendingTimeframe;
    const validTimeframes: TrendingTimeframe[] = ["1h", "4h", "1d", "24h", "7d"];
    const tf = validTimeframes.includes(timeframe) ? timeframe : "1d";

    const pools = await getTrendingPools(tf);
    return sendSuccess(pools, 200);
  } catch (error) {
    console.error("Pools trending error:", error);
    if (error instanceof TeneroApiError) {
      return sendError(`Tenero API unavailable: ${error.message}`, 502, "TENERO_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to fetch trending pools",
      500,
      "POOLS_TRENDING_ERROR"
    );
  }
}

async function handlePoolsOhlc(request: Request, config: RuntimeConfig): Promise<Response> {
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const { poolId, period, limit } = body.data as {
      poolId?: string;
      period?: string;
      limit?: number;
    };

    if (!poolId) {
      return sendError("poolId is required", 400, "MISSING_FIELD");
    }

    const ohlc = await getPoolOhlc(poolId, {
      period: period as "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | undefined,
      limit: limit ? Math.min(limit, 1000) : undefined,
    });
    return sendSuccess(ohlc, 200);
  } catch (error) {
    console.error("Pools OHLC error:", error);
    if (error instanceof TeneroApiError) {
      return sendError(`Tenero API unavailable: ${error.message}`, 502, "TENERO_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to fetch pool OHLC",
      500,
      "POOLS_OHLC_ERROR"
    );
  }
}

// Tenero Tokens Handlers

async function handleTokensSummary(request: Request, config: RuntimeConfig): Promise<Response> {
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const { tokenAddress } = body.data as { tokenAddress?: string };
    if (!tokenAddress) {
      return sendError("tokenAddress is required", 400, "MISSING_FIELD");
    }

    const summary = await getTokenSummary(tokenAddress);
    return sendSuccess(summary, 200);
  } catch (error) {
    console.error("Token summary error:", error);
    if (error instanceof TeneroApiError) {
      return sendError(`Tenero API unavailable: ${error.message}`, 502, "TENERO_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to fetch token summary",
      500,
      "TOKEN_SUMMARY_ERROR"
    );
  }
}

async function handleTokensDetails(request: Request, config: RuntimeConfig): Promise<Response> {
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const { tokenAddress } = body.data as { tokenAddress?: string };
    if (!tokenAddress) {
      return sendError("tokenAddress is required", 400, "MISSING_FIELD");
    }

    const details = await getTokenDetails(tokenAddress);
    return sendSuccess(details, 200);
  } catch (error) {
    console.error("Token details error:", error);
    if (error instanceof TeneroApiError) {
      return sendError(`Tenero API unavailable: ${error.message}`, 502, "TENERO_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to fetch token details",
      500,
      "TOKEN_DETAILS_ERROR"
    );
  }
}

// Tenero Wallet Analytics Handlers (AI-Enhanced)

async function handleWalletTrading(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/wallet/trading"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { address } = body.data as { address?: string };
    if (!address) {
      return sendError("address is required", 400, "MISSING_FIELD");
    }

    const analysis = await analyzeWalletTrading(address);
    return sendSuccess(analysis, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Wallet trading analysis error:", error);
    if (error instanceof TeneroApiError) {
      return sendError(`Tenero API unavailable: ${error.message}`, 502, "TENERO_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to analyze wallet trading",
      500,
      "WALLET_TRADING_ERROR"
    );
  }
}

async function handleWalletPnl(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/wallet/pnl"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { address } = body.data as { address?: string };
    if (!address) {
      return sendError("address is required", 400, "MISSING_FIELD");
    }

    const analysis = await analyzeWalletPnl(address);
    return sendSuccess(analysis, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Wallet PnL analysis error:", error);
    if (error instanceof TeneroApiError) {
      return sendError(`Tenero API unavailable: ${error.message}`, 502, "TENERO_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to analyze wallet PnL",
      500,
      "WALLET_PNL_ERROR"
    );
  }
}

async function parseJsonBody(request: Request): Promise<{ data?: unknown; error?: Response }> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return { data: {} };
  }

  try {
    const data = await request.json();
    return { data };
  } catch (error) {
    return {
      error: sendError(
        "Invalid JSON body",
        400,
        "INVALID_JSON",
        error instanceof Error ? error.message : "Parse error"
      ),
    };
  }
}
