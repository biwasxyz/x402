import { createRuntimeConfig, EnvBindings, RuntimeConfig } from "./config";
import { EndpointConfig } from "./types";
import { sendError, sendSuccess, jsonResponse } from "./utils/response";
import { requirePayment, PaymentSuccess, PaymentFailure } from "./utils/payment";
import { initOpenRouter } from "./services/openrouter.service";
import { getStacksAndBitcoinNews } from "./services/news.service";
import { performSecurityAudit } from "./services/audit.service";
import { getContractSource } from "./services/stacks.service";
import { classifyWallet } from "./services/wallet.service";
import { researchUser } from "./services/research.service";
import { analyzeSentiment } from "./services/sentiment.service";


type Env = EnvBindings & Record<string, string | undefined>;

// x402-stacks Endpoint Configurations (prices in STX)
const ENDPOINTS: Record<string, EndpointConfig> = {
  "/api/news": {
    resource: "/api/news",
    description: "Get latest Stacks and Bitcoin news with AI analysis",
    method: "GET",
    amountSTX: 0.001, // 0.001 STX
  },
  "/api/audit": {
    resource: "/api/audit",
    description: "Security audit for Clarity smart contracts",
    method: "POST",
    amountSTX: 0.02, // 0.02 STX
  },
  "/api/wallet/classify": {
    resource: "/api/wallet/classify",
    description: "Classify wallet behavior (trader, whale, bot, dao, bridge)",
    method: "POST",
    amountSTX: 0.005, // 0.005 STX
  },
  "/api/research/user": {
    resource: "/api/research/user",
    description: "Research user profile from X/Twitter and web sources",
    method: "POST",
    amountSTX: 0.005, // 0.005 STX
  },
  "/api/sentiment": {
    resource: "/api/sentiment",
    description: "Real-time sentiment analysis for crypto tokens on X/Twitter",
    method: "POST",
    amountSTX: 0.005, // 0.005 STX
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
        amountSTX: endpoint.amountSTX,
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
    if (url.pathname.startsWith("/api/")) {
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
