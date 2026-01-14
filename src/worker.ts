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
import { getWorkerAnalytics, getSubrequestStats, trackEndpointKV, getEndpointStatsKV } from "./services/analytics.service";
import { ANALYTICS_HTML } from "./analytics-page";
// Alex Lab services
import {
  optimizeSwap,
  analyzePoolRisk,
  scanArbitrage,
  detectMarketRegime,
} from "./services/alex.service";
import { AlexApiError } from "./services/alex/client";
// Zest Protocol services
import {
  analyzeLiquidationRisk,
  optimizeYield,
  forecastInterestRates,
  analyzePositionHealth,
} from "./services/zest.service";
import { ZestApiError } from "./services/zest/client";
// Cross-protocol DeFi services
import { analyzePortfolio, buildStrategy } from "./services/defi.service";


type Env = EnvBindings & Record<string, string | KVNamespace | undefined>;

const OPENROUTER_ENDPOINTS = new Set([
  "/api/news",
  "/api/audit",
  "/api/wallet/classify",
  "/api/research/user",
  "/api/sentiment",
  "/api/wallet/trading",
  "/api/wallet/pnl",
  // Alex Lab endpoints
  "/api/alex/swap-optimizer",
  "/api/alex/pool-risk",
  "/api/alex/arbitrage-scan",
  "/api/alex/market-regime",
  // Zest Protocol endpoints
  "/api/zest/liquidation-risk",
  "/api/zest/yield-optimizer",
  "/api/zest/interest-forecast",
  "/api/zest/position-health",
  // Cross-protocol DeFi endpoints
  "/api/defi/portfolio-analyzer",
  "/api/defi/strategy-builder",
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
  // Alex Lab DEX Endpoints
  "/api/alex/swap-optimizer": {
    resource: "/api/alex/swap-optimizer",
    description: "AI swap route optimizer - finds optimal routes, calculates slippage, recommends execution strategy",
    method: "POST",
    paymentRequired: true,
    amount: 0.005,
  },
  "/api/alex/pool-risk": {
    resource: "/api/alex/pool-risk",
    description: "LP position risk analyzer - impermanent loss scenarios, pool sustainability assessment",
    method: "POST",
    paymentRequired: true,
    amount: 0.008,
  },
  "/api/alex/arbitrage-scan": {
    resource: "/api/alex/arbitrage-scan",
    description: "Cross-pool arbitrage scanner - finds price discrepancies, calculates profitable paths",
    method: "GET",
    paymentRequired: true,
    amount: 0.01,
  },
  "/api/alex/market-regime": {
    resource: "/api/alex/market-regime",
    description: "Market regime detector - classifies current market conditions (trending, ranging, volatile)",
    method: "GET",
    paymentRequired: true,
    amount: 0.005,
  },
  // Zest Protocol Lending Endpoints
  "/api/zest/liquidation-risk": {
    resource: "/api/zest/liquidation-risk",
    description: "Liquidation risk monitor - health factor analysis, price scenario simulation, liquidation probability",
    method: "POST",
    paymentRequired: true,
    amount: 0.008,
  },
  "/api/zest/yield-optimizer": {
    resource: "/api/zest/yield-optimizer",
    description: "Lending yield optimizer - analyzes all markets, recommends optimal supply/borrow strategy",
    method: "POST",
    paymentRequired: true,
    amount: 0.008,
  },
  "/api/zest/interest-forecast": {
    resource: "/api/zest/interest-forecast",
    description: "Interest rate forecaster - predicts rate movements based on utilization trends",
    method: "GET",
    paymentRequired: true,
    amount: 0.005,
  },
  "/api/zest/position-health": {
    resource: "/api/zest/position-health",
    description: "Position health analyzer - comprehensive health check with AI rebalancing recommendations",
    method: "POST",
    paymentRequired: true,
    amount: 0.005,
  },
  // Cross-Protocol DeFi Intelligence
  "/api/defi/portfolio-analyzer": {
    resource: "/api/defi/portfolio-analyzer",
    description: "DeFi portfolio intelligence - analyzes combined Alex LP + Zest positions, risk assessment, optimization",
    method: "POST",
    paymentRequired: true,
    amount: 0.015,
  },
  "/api/defi/strategy-builder": {
    resource: "/api/defi/strategy-builder",
    description: "AI strategy builder - generates complete DeFi strategy across Alex and Zest with execution plan",
    method: "POST",
    paymentRequired: true,
    amount: 0.02,
  },
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    console.log(`[${new Date().toISOString()}] ${method} ${url.pathname}`);

    // CORS preflight (don't track)
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

    // Execute request and track endpoint
    let response: Response;
    try {
      response = await handleRequest(request, env, url, method);
    } catch (error) {
      console.error("Request error:", error);
      response = sendError(
        error instanceof Error ? error.message : "Internal server error",
        500,
        "INTERNAL_ERROR"
      );
    }

    // Track endpoint to KV (skip /health and /api/analytics to avoid noise)
    // Use waitUntil to ensure KV write completes after response is sent
    if (url.pathname !== "/health" && url.pathname !== "/api/analytics") {
      ctx.waitUntil(
        trackEndpointKV(env.ANALYTICS, url.pathname, method, response.status, Date.now() - startTime)
      );
    }

    return response;
  },
};

async function handleRequest(request: Request, env: Env, url: URL, method: string): Promise<Response> {

    // Health check (free)
    if (method === "GET" && url.pathname === "/health") {
      return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
    }

    // Analytics dashboard (free, public)
    if (method === "GET" && url.pathname === "/analytics") {
      return new Response(ANALYTICS_HTML, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "access-control-allow-origin": "*",
          "cache-control": "public, max-age=300",
        },
      });
    }

    // Analytics API endpoint (free, public)
    if (method === "GET" && url.pathname === "/api/analytics") {
      const hours = parseInt(url.searchParams.get("hours") || "168", 10);
      const validHours = Math.min(Math.max(hours, 1), 720); // 1 hour to 30 days

      if (!env.CLOUDFLARE_API_TOKEN) {
        // Return endpoint stats even without CF API token
        const endpointStats = await getEndpointStatsKV(env.ANALYTICS);
        return jsonResponse({
          success: false,
          error: "CLOUDFLARE_API_TOKEN not configured",
          endpointStats,
        });
      }

      const analytics = await getWorkerAnalytics(env.CLOUDFLARE_API_TOKEN, validHours, env.ANALYTICS);
      return jsonResponse(analytics);
    }

    // x402 scan manifest (free)
    if (method === "GET" && url.pathname === "/.well-known/x402.json") {
      return serveX402Manifest(env);
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
        x402Manifest: "/.well-known/x402.json",
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

    // Alex Lab DEX Endpoints
    if (method === "POST" && url.pathname === "/api/alex/swap-optimizer") {
      return handleAlexSwapOptimizer(request, config);
    }

    if (method === "POST" && url.pathname === "/api/alex/pool-risk") {
      return handleAlexPoolRisk(request, config);
    }

    if (method === "GET" && url.pathname === "/api/alex/arbitrage-scan") {
      return handleAlexArbitrageScan(request, config);
    }

    if (method === "GET" && url.pathname === "/api/alex/market-regime") {
      return handleAlexMarketRegime(request, config);
    }

    // Zest Protocol Lending Endpoints
    if (method === "POST" && url.pathname === "/api/zest/liquidation-risk") {
      return handleZestLiquidationRisk(request, config);
    }

    if (method === "POST" && url.pathname === "/api/zest/yield-optimizer") {
      return handleZestYieldOptimizer(request, config);
    }

    if (method === "GET" && url.pathname === "/api/zest/interest-forecast") {
      return handleZestInterestForecast(request, config);
    }

    if (method === "POST" && url.pathname === "/api/zest/position-health") {
      return handleZestPositionHealth(request, config);
    }

    // Cross-Protocol DeFi Intelligence
    if (method === "POST" && url.pathname === "/api/defi/portfolio-analyzer") {
      return handleDefiPortfolioAnalyzer(request, config);
    }

    if (method === "POST" && url.pathname === "/api/defi/strategy-builder") {
      return handleDefiStrategyBuilder(request, config);
    }

    return sendError("Not Found", 404, "NOT_FOUND");
}

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

// Alex Lab DEX Handlers

async function handleAlexSwapOptimizer(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/alex/swap-optimizer"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { tokenIn, tokenOut, amountIn } = body.data as {
      tokenIn?: string;
      tokenOut?: string;
      amountIn?: number;
    };

    if (!tokenIn || !tokenOut || !amountIn) {
      return sendError("tokenIn, tokenOut, and amountIn are required", 400, "MISSING_FIELD");
    }

    const result = await optimizeSwap({ tokenIn, tokenOut, amountIn });
    return sendSuccess(result, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Alex swap optimizer error:", error);
    if (error instanceof AlexApiError) {
      return sendError(`Alex API unavailable: ${error.message}`, 502, "ALEX_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to optimize swap",
      500,
      "SWAP_OPTIMIZER_ERROR"
    );
  }
}

async function handleAlexPoolRisk(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/alex/pool-risk"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { poolId, investmentAmount } = body.data as {
      poolId?: string;
      investmentAmount?: number;
    };

    if (!poolId) {
      return sendError("poolId is required", 400, "MISSING_FIELD");
    }

    const result = await analyzePoolRisk({ poolId, investmentAmount });
    return sendSuccess(result, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Alex pool risk error:", error);
    if (error instanceof AlexApiError) {
      return sendError(`Alex API unavailable: ${error.message}`, 502, "ALEX_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to analyze pool risk",
      500,
      "POOL_RISK_ERROR"
    );
  }
}

async function handleAlexArbitrageScan(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/alex/arbitrage-scan"];

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const result = await scanArbitrage();
    return sendSuccess(result, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Alex arbitrage scan error:", error);
    if (error instanceof AlexApiError) {
      return sendError(`Alex API unavailable: ${error.message}`, 502, "ALEX_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to scan arbitrage",
      500,
      "ARBITRAGE_SCAN_ERROR"
    );
  }
}

async function handleAlexMarketRegime(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/alex/market-regime"];

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const result = await detectMarketRegime();
    return sendSuccess(result, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Alex market regime error:", error);
    if (error instanceof AlexApiError) {
      return sendError(`Alex API unavailable: ${error.message}`, 502, "ALEX_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to detect market regime",
      500,
      "MARKET_REGIME_ERROR"
    );
  }
}

// Zest Protocol Lending Handlers

async function handleZestLiquidationRisk(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/zest/liquidation-risk"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { address, collateralAsset, collateralAmount, debtAsset, debtAmount } = body.data as {
      address?: string;
      collateralAsset?: string;
      collateralAmount?: number;
      debtAsset?: string;
      debtAmount?: number;
    };

    if (!address || !collateralAsset || !collateralAmount || !debtAsset || !debtAmount) {
      return sendError(
        "address, collateralAsset, collateralAmount, debtAsset, and debtAmount are required",
        400,
        "MISSING_FIELD"
      );
    }

    const result = await analyzeLiquidationRisk({
      address,
      collateralAsset,
      collateralAmount,
      debtAsset,
      debtAmount,
    });
    return sendSuccess(result, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Zest liquidation risk error:", error);
    if (error instanceof ZestApiError) {
      return sendError(`Zest API unavailable: ${error.message}`, 502, "ZEST_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to analyze liquidation risk",
      500,
      "LIQUIDATION_RISK_ERROR"
    );
  }
}

async function handleZestYieldOptimizer(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/zest/yield-optimizer"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { capitalUsd, riskTolerance, preferredAssets } = body.data as {
      capitalUsd?: number;
      riskTolerance?: "conservative" | "moderate" | "aggressive";
      preferredAssets?: string[];
    };

    if (!capitalUsd || !riskTolerance) {
      return sendError("capitalUsd and riskTolerance are required", 400, "MISSING_FIELD");
    }

    const validTolerances = ["conservative", "moderate", "aggressive"];
    if (!validTolerances.includes(riskTolerance)) {
      return sendError(
        "riskTolerance must be conservative, moderate, or aggressive",
        400,
        "INVALID_FIELD"
      );
    }

    const result = await optimizeYield({ capitalUsd, riskTolerance, preferredAssets });
    return sendSuccess(result, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Zest yield optimizer error:", error);
    if (error instanceof ZestApiError) {
      return sendError(`Zest API unavailable: ${error.message}`, 502, "ZEST_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to optimize yield",
      500,
      "YIELD_OPTIMIZER_ERROR"
    );
  }
}

async function handleZestInterestForecast(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/zest/interest-forecast"];

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const result = await forecastInterestRates();
    return sendSuccess(result, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Zest interest forecast error:", error);
    if (error instanceof ZestApiError) {
      return sendError(`Zest API unavailable: ${error.message}`, 502, "ZEST_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to forecast interest rates",
      500,
      "INTEREST_FORECAST_ERROR"
    );
  }
}

async function handleZestPositionHealth(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/zest/position-health"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { address, positions } = body.data as {
      address?: string;
      positions?: { asset: string; supplied: number; borrowed: number }[];
    };

    if (!address || !positions || !Array.isArray(positions)) {
      return sendError("address and positions array are required", 400, "MISSING_FIELD");
    }

    const result = await analyzePositionHealth({ address, positions });
    return sendSuccess(result, 200, paymentResult.settlement);
  } catch (error) {
    console.error("Zest position health error:", error);
    if (error instanceof ZestApiError) {
      return sendError(`Zest API unavailable: ${error.message}`, 502, "ZEST_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to analyze position health",
      500,
      "POSITION_HEALTH_ERROR"
    );
  }
}

// Cross-Protocol DeFi Handlers

async function handleDefiPortfolioAnalyzer(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/defi/portfolio-analyzer"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { address, alexPositions, zestPositions } = body.data as {
      address?: string;
      alexPositions?: { poolId: string; lpTokens: number; token0Symbol: string; token1Symbol: string }[];
      zestPositions?: { asset: string; supplied: number; borrowed: number }[];
    };

    if (!address) {
      return sendError("address is required", 400, "MISSING_FIELD");
    }

    const result = await analyzePortfolio({ address, alexPositions, zestPositions });
    return sendSuccess(result, 200, paymentResult.settlement);
  } catch (error) {
    console.error("DeFi portfolio analyzer error:", error);
    if (error instanceof AlexApiError) {
      return sendError(`Alex API unavailable: ${error.message}`, 502, "ALEX_API_ERROR");
    }
    if (error instanceof ZestApiError) {
      return sendError(`Zest API unavailable: ${error.message}`, 502, "ZEST_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to analyze portfolio",
      500,
      "PORTFOLIO_ANALYZER_ERROR"
    );
  }
}

async function handleDefiStrategyBuilder(request: Request, config: RuntimeConfig): Promise<Response> {
  const endpointConfig = ENDPOINTS["/api/defi/strategy-builder"];
  const body = await parseJsonBody(request);

  if (body.error) {
    return body.error;
  }

  try {
    const paymentResult = await requirePayment(request, config, endpointConfig);
    if (!paymentResult.ok) {
      return (paymentResult as PaymentFailure).response;
    }

    const { capitalUsd, riskTolerance, goals, timeHorizon, preferences } = body.data as {
      capitalUsd?: number;
      riskTolerance?: "conservative" | "moderate" | "aggressive";
      goals?: ("yield" | "growth" | "hedge" | "income")[];
      timeHorizon?: "short" | "medium" | "long";
      preferences?: {
        preferredAssets?: string[];
        avoidAssets?: string[];
        maxLeverage?: number;
      };
    };

    if (!capitalUsd || !riskTolerance || !goals || !timeHorizon) {
      return sendError(
        "capitalUsd, riskTolerance, goals, and timeHorizon are required",
        400,
        "MISSING_FIELD"
      );
    }

    const validTolerances = ["conservative", "moderate", "aggressive"];
    const validHorizons = ["short", "medium", "long"];

    if (!validTolerances.includes(riskTolerance)) {
      return sendError(
        "riskTolerance must be conservative, moderate, or aggressive",
        400,
        "INVALID_FIELD"
      );
    }

    if (!validHorizons.includes(timeHorizon)) {
      return sendError("timeHorizon must be short, medium, or long", 400, "INVALID_FIELD");
    }

    const result = await buildStrategy({
      capitalUsd,
      riskTolerance,
      goals,
      timeHorizon,
      preferences,
    });
    return sendSuccess(result, 200, paymentResult.settlement);
  } catch (error) {
    console.error("DeFi strategy builder error:", error);
    if (error instanceof AlexApiError) {
      return sendError(`Alex API unavailable: ${error.message}`, 502, "ALEX_API_ERROR");
    }
    if (error instanceof ZestApiError) {
      return sendError(`Zest API unavailable: ${error.message}`, 502, "ZEST_API_ERROR");
    }
    return sendError(
      error instanceof Error ? error.message : "Failed to build strategy",
      500,
      "STRATEGY_BUILDER_ERROR"
    );
  }
}

function serveX402Manifest(env: Env): Response {
  const serverAddress = env.SERVER_ADDRESS || "YOUR_STACKS_ADDRESS";

  const manifest = {
    x402Version: 1,
    name: "x402-stacks AI Analytics",
    image: "https://x402stacks.xyz/logo.png",
    accepts: [
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "1000",
        resource: "/api/news",
        description: "Get latest Stacks and Bitcoin news with AI analysis",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: { type: "http", method: "GET" },
          output: { news: "array", analysis: "string", timestamp: "string" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "20000",
        resource: "/api/audit",
        description: "Security audit for Clarity smart contracts",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 120,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              contractIdentifier: { type: "string", required: true, description: "Contract identifier (e.g., SP123.contract-name)" }
            }
          },
          output: { vulnerabilities: "array", riskLevel: "string", recommendations: "array", score: "number" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "5000",
        resource: "/api/wallet/classify",
        description: "Classify wallet behavior (trader, whale, bot, dao, bridge)",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              address: { type: "string", required: true, description: "Stacks wallet address to classify" }
            }
          },
          output: { classification: "string", confidence: "number", traits: "array", analysis: "string" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "5000",
        resource: "/api/research/user",
        description: "Research user profile from X/Twitter and web sources",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 90,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              username: { type: "string", required: true, description: "X/Twitter username to research" }
            }
          },
          output: { profile: "object", sentiment: "string", summary: "string" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "5000",
        resource: "/api/sentiment",
        description: "Real-time sentiment analysis for crypto tokens on X/Twitter",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              topic: { type: "string", required: false, description: "Topic or token to analyze sentiment for" }
            }
          },
          output: { sentiment: "string", score: "number", analysis: "string", sources: "array" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "5000",
        resource: "/api/wallet/trading",
        description: "AI-enhanced wallet trading behavior analysis",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              address: { type: "string", required: true, description: "Stacks wallet address to analyze" }
            }
          },
          output: { tradingPattern: "string", frequency: "string", profitability: "object", analysis: "string" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "5000",
        resource: "/api/wallet/pnl",
        description: "AI-enhanced wallet profit/loss analysis",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              address: { type: "string", required: true, description: "Stacks wallet address to analyze" }
            }
          },
          output: { totalPnl: "number", realizedPnl: "number", unrealizedPnl: "number", analysis: "string" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "5000",
        resource: "/api/alex/swap-optimizer",
        description: "AI swap route optimizer - finds optimal routes, calculates slippage, recommends execution strategy",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              tokenIn: { type: "string", required: true, description: "Input token symbol or contract" },
              tokenOut: { type: "string", required: true, description: "Output token symbol or contract" },
              amountIn: { type: "number", required: true, description: "Amount of input token" }
            }
          },
          output: { optimalRoute: "array", expectedOutput: "number", slippage: "number", recommendation: "string" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "8000",
        resource: "/api/alex/pool-risk",
        description: "LP position risk analyzer - impermanent loss scenarios, pool sustainability assessment",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              poolId: { type: "string", required: true, description: "Alex pool identifier" },
              investmentAmount: { type: "number", required: false, description: "Investment amount for IL calculation" }
            }
          },
          output: { riskLevel: "string", impermanentLossScenarios: "array", sustainability: "object", recommendation: "string" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "10000",
        resource: "/api/alex/arbitrage-scan",
        description: "Cross-pool arbitrage scanner - finds price discrepancies, calculates profitable paths",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: { type: "http", method: "GET" },
          output: { opportunities: "array", bestPath: "object", expectedProfit: "number", analysis: "string" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "5000",
        resource: "/api/alex/market-regime",
        description: "Market regime detector - classifies current market conditions (trending, ranging, volatile)",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: { type: "http", method: "GET" },
          output: { regime: "string", confidence: "number", indicators: "object", analysis: "string" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "8000",
        resource: "/api/zest/liquidation-risk",
        description: "Liquidation risk monitor - health factor analysis, price scenario simulation, liquidation probability",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              address: { type: "string", required: true, description: "Stacks wallet address" },
              collateralAsset: { type: "string", required: true, description: "Collateral asset symbol" },
              collateralAmount: { type: "number", required: true, description: "Amount of collateral" },
              debtAsset: { type: "string", required: true, description: "Debt asset symbol" },
              debtAmount: { type: "number", required: true, description: "Amount of debt" }
            }
          },
          output: { healthFactor: "number", liquidationPrice: "number", riskLevel: "string", scenarios: "array" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "8000",
        resource: "/api/zest/yield-optimizer",
        description: "Lending yield optimizer - analyzes all markets, recommends optimal supply/borrow strategy",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              capitalUsd: { type: "number", required: true, description: "Capital to deploy in USD" },
              riskTolerance: { type: "string", required: true, description: "Risk tolerance: conservative, moderate, or aggressive" },
              preferredAssets: { type: "array", required: false, description: "Preferred assets to use" }
            }
          },
          output: { strategy: "object", expectedYield: "number", risks: "array", recommendation: "string" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "5000",
        resource: "/api/zest/interest-forecast",
        description: "Interest rate forecaster - predicts rate movements based on utilization trends",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: { type: "http", method: "GET" },
          output: { forecasts: "array", trends: "object", analysis: "string" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "5000",
        resource: "/api/zest/position-health",
        description: "Position health analyzer - comprehensive health check with AI rebalancing recommendations",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 60,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              address: { type: "string", required: true, description: "Stacks wallet address" },
              positions: { type: "array", required: true, description: "Array of positions with asset, supplied, and borrowed amounts" }
            }
          },
          output: { overallHealth: "string", positionDetails: "array", recommendations: "array" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "15000",
        resource: "/api/defi/portfolio-analyzer",
        description: "DeFi portfolio intelligence - analyzes combined Alex LP + Zest positions, risk assessment, optimization",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 90,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              address: { type: "string", required: true, description: "Stacks wallet address" },
              alexPositions: { type: "array", required: false, description: "Alex LP positions" },
              zestPositions: { type: "array", required: false, description: "Zest lending positions" }
            }
          },
          output: { totalValue: "number", riskAssessment: "object", optimization: "object", analysis: "string" }
        }
      },
      {
        scheme: "exact",
        network: "stacks",
        maxAmountRequired: "20000",
        resource: "/api/defi/strategy-builder",
        description: "AI strategy builder - generates complete DeFi strategy across Alex and Zest with execution plan",
        mimeType: "application/json",
        payTo: serverAddress,
        maxTimeoutSeconds: 120,
        asset: "STX",
        outputSchema: {
          input: {
            type: "http",
            method: "POST",
            bodyType: "json",
            bodyFields: {
              capitalUsd: { type: "number", required: true, description: "Capital to deploy in USD" },
              riskTolerance: { type: "string", required: true, description: "Risk tolerance: conservative, moderate, or aggressive" },
              goals: { type: "array", required: true, description: "Investment goals: yield, growth, hedge, income" },
              timeHorizon: { type: "string", required: true, description: "Time horizon: short, medium, or long" },
              preferences: { type: "object", required: false, description: "Optional preferences for assets and leverage" }
            }
          },
          output: { strategy: "object", allocations: "array", executionPlan: "array", expectedReturns: "object", risks: "array" }
        }
      }
    ]
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=3600",
    },
  });
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
