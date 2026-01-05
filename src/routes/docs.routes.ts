import { Router, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";

const router = Router();

function buildDocsOverview(req: Request) {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  return {
    name: "x402-stacks API",
    version: "1.0.0",
    description: "Payment-protected API services for Stacks blockchain",
    documentation: `${baseUrl}/docs`,
    openapi: `${baseUrl}/openapi.json`,
    endpoints: {
      health: {
        path: "/health",
        method: "GET",
        description: "Health check endpoint",
        cost: "Free",
      },
      news: {
        path: "/api/news",
        method: "GET",
        description: "Get latest Stacks & Bitcoin news powered by Grok AI",
        cost: "0.001 STX",
        payment: "Required via x402 protocol",
      },
      audit: {
        path: "/api/audit",
        method: "POST",
        description: "Comprehensive Clarity smart contract security audit",
        cost: "0.02 STX",
        payment: "Required via x402 protocol",
        body: {
          contractIdentifier: "SP000...CONTRACT_NAME",
        },
      },
      walletClassifier: {
        path: "/api/wallet/classify",
        method: "POST",
        description: "Classify wallet behavior as trader, dao, bridge, bot, or whale",
        cost: "0.005 STX",
        payment: "Required via x402 protocol",
        body: {
          address: "SP... or SM...",
        },
      },
      userResearch: {
        path: "/api/research/user",
        method: "POST",
        description: "Research a user using AI with real-time web search",
        cost: "0.005 STX",
        payment: "Required via x402 protocol",
        body: {
          username: "@username or username",
        },
      },
    },
    payment: {
      protocol: "x402",
      network: process.env.NETWORK || "testnet",
      paymentAddress: process.env.SERVER_ADDRESS || "ST...",
      facilitator: process.env.FACILITATOR_URL || "https://facilitator.x402stacks.xyz",
      info: "All paid endpoints require x402 payment verification",
    },
    links: {
      documentation: `${baseUrl}/docs`,
      openapi: `${baseUrl}/openapi.json`,
      health: `${baseUrl}/health`,
      github: "https://github.com/tony1908/x402Stacks",
      stacks: "https://docs.stacks.co",
    },
  };
}

/**
 * @route   GET /
 * @desc    Redirect to Docs UI
 * @access  Public
 */
router.get("/", (_req: Request, res: Response) => {
  res.redirect("/docs");
});

/**
 * @route   GET /docs/info
 * @desc    API Documentation overview (JSON)
 * @access  Public
 */
router.get("/docs/info", (req: Request, res: Response) => {
  res.json(buildDocsOverview(req));
});

// Generate OpenAPI spec dynamically for Swagger UI
function getOpenApiSpec(req: Request) {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const network = process.env.NETWORK || "testnet";
  const serverAddress = process.env.SERVER_ADDRESS || "ST...";

  return {
    openapi: "3.0.3",
    info: {
      title: "x402-stacks API",
      version: "1.0.0",
      description: "Payment-protected API services for Stacks blockchain using the x402 micropayment protocol",
      contact: {
        name: "API Support",
        url: "https://github.com/tony1908/x402Stacks",
      },
    },
    servers: [
      {
        url: baseUrl,
        description: `${network.charAt(0).toUpperCase() + network.slice(1)} Server`,
      },
    ],
    tags: [
      {
        name: "Health",
        description: "Health check endpoints",
      },
      {
        name: "News",
        description: "Stacks & Bitcoin news powered by AI",
      },
      {
        name: "Audit",
        description: "Smart contract security audits",
      },
      {
        name: "Wallet",
        description: "Wallet classification and analysis",
      },
      {
        name: "Research",
        description: "User research with AI web search",
      },
    ],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          description: "Check API health status",
          operationId: "getHealth",
          responses: {
            "200": {
              description: "API is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      data: {
                        type: "object",
                        properties: {
                          status: { type: "string", example: "ok" },
                          network: { type: "string", example: network },
                          services: {
                            type: "object",
                            properties: {
                              news: { type: "string", example: "GET /api/news" },
                              audit: { type: "string", example: "POST /api/audit" },
                              walletClassifier: { type: "string", example: "POST /api/wallet/classify" },
                              userResearch: { type: "string", example: "POST /api/research/user" },
                            },
                          },
                        },
                      },
                      meta: {
                        type: "object",
                        properties: {
                          timestamp: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/news": {
        get: {
          tags: ["News"],
          summary: "Get latest Stacks & Bitcoin news",
          description: "Fetch latest news and developments about Stacks and Bitcoin using Grok AI with real-time web search. **Cost: 0.001 STX**",
          operationId: "getNews",
          security: [{ x402Payment: [] }],
          parameters: [
            {
              name: "x-payment-tx-id",
              in: "header",
              description: "x402 payment transaction ID",
              required: false,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "News fetched successfully",
              headers: {
                "x-payment-response": {
                  description: "x402 payment confirmation",
                  schema: { type: "string" },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/NewsResponse",
                  },
                },
              },
            },
            "402": {
              description: "Payment Required",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/PaymentRequired",
                  },
                },
              },
            },
            "500": {
              description: "Server error",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Error",
                  },
                },
              },
            },
          },
        },
      },
      "/api/audit": {
        post: {
          tags: ["Audit"],
          summary: "Audit smart contract",
          description: "Perform comprehensive security audit of a Clarity smart contract. **Cost: 0.02 STX**",
          operationId: "auditContract",
          security: [{ x402Payment: [] }],
          parameters: [
            {
              name: "x-payment-tx-id",
              in: "header",
              description: "x402 payment transaction ID",
              required: false,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["contractIdentifier"],
                  properties: {
                    contractIdentifier: {
                      type: "string",
                      example: "SP000000000000000000002Q6VF78.pox-4",
                      description: "Contract identifier in format: ADDRESS.CONTRACT_NAME",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Audit completed successfully",
              headers: {
                "x-payment-response": {
                  description: "x402 payment confirmation",
                  schema: { type: "string" },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AuditResponse",
                  },
                },
              },
            },
            "400": {
              description: "Invalid request",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Error",
                  },
                },
              },
            },
            "402": {
              description: "Payment Required",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/PaymentRequired",
                  },
                },
              },
            },
            "500": {
              description: "Server error",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Error",
                  },
                },
              },
            },
          },
        },
      },
      "/api/wallet/classify": {
        post: {
          tags: ["Wallet"],
          summary: "Classify wallet behavior",
          description: "Analyze wallet on-chain activity and classify as trader, dao, bridge, bot, or whale. **Cost: 0.005 STX**",
          operationId: "classifyWallet",
          security: [{ x402Payment: [] }],
          parameters: [
            {
              name: "x-payment-tx-id",
              in: "header",
              description: "x402 payment transaction ID",
              required: false,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["address"],
                  properties: {
                    address: {
                      type: "string",
                      example: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
                      description: "Stacks wallet address (SP... or SM...)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Wallet classified successfully",
              headers: {
                "x-payment-response": {
                  description: "x402 payment confirmation",
                  schema: { type: "string" },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/WalletClassificationResponse",
                  },
                },
              },
            },
            "400": {
              description: "Invalid request",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Error",
                  },
                },
              },
            },
            "402": {
              description: "Payment Required",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/PaymentRequired",
                  },
                },
              },
            },
            "500": {
              description: "Server error",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Error",
                  },
                },
              },
            },
          },
        },
      },
      "/api/research/user": {
        post: {
          tags: ["Research"],
          summary: "Research user profile",
          description: "Research a user using AI with real-time web and social media search (powered by Grok). **Cost: 0.005 STX**",
          operationId: "researchUser",
          security: [{ x402Payment: [] }],
          parameters: [
            {
              name: "x-payment-tx-id",
              in: "header",
              description: "x402 payment transaction ID",
              required: false,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["username"],
                  properties: {
                    username: {
                      type: "string",
                      example: "@elikitten",
                      description: "Username to research (with or without @ prefix)",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "User research completed successfully",
              headers: {
                "x-payment-response": {
                  description: "x402 payment confirmation",
                  schema: { type: "string" },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/UserResearchResponse",
                  },
                },
              },
            },
            "400": {
              description: "Invalid request",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Error",
                  },
                },
              },
            },
            "402": {
              description: "Payment Required",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/PaymentRequired",
                  },
                },
              },
            },
            "500": {
              description: "Server error",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/Error",
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        x402Payment: {
          type: "apiKey",
          in: "header",
          name: "x-payment-tx-id",
          description: "x402 protocol payment transaction ID",
        },
      },
      schemas: {
        NewsResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "string",
              description: "Latest news about Stacks and Bitcoin",
              example: "# Latest Stacks & Bitcoin News\n\n## Bitcoin Price\nBitcoin is currently trading at...",
            },
            meta: {
              type: "object",
              properties: {
                timestamp: { type: "string", format: "date-time" },
                payment: { $ref: "#/components/schemas/PaymentInfo" },
              },
            },
          },
        },
        AuditResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                contractName: { type: "string", example: "pox-4" },
                contractIdentifier: { type: "string", example: "SP000000000000000000002Q6VF78.pox-4" },
                overallRisk: {
                  type: "string",
                  enum: ["low", "medium", "high", "critical"],
                  example: "low",
                },
                riskScore: { type: "number", example: 2.5 },
                summary: { type: "string" },
                vulnerabilities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                      category: { type: "string" },
                      title: { type: "string" },
                      description: { type: "string" },
                      location: { type: "string" },
                      recommendation: { type: "string" },
                    },
                  },
                },
                recommendations: {
                  type: "array",
                  items: { type: "string" },
                },
                codeQuality: { type: "string" },
                complexity: { type: "string" },
              },
            },
            meta: {
              type: "object",
              properties: {
                timestamp: { type: "string", format: "date-time" },
                payment: { $ref: "#/components/schemas/PaymentInfo" },
              },
            },
          },
        },
        WalletClassificationResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                address: { type: "string", example: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7" },
                classification: {
                  type: "string",
                  enum: ["trader", "dao", "bridge", "bot", "whale"],
                  example: "trader",
                },
                confidence: { type: "number", minimum: 0, maximum: 1, example: 0.85 },
                reasoning: { type: "string", example: "High DEX interaction frequency..." },
                metrics: {
                  type: "object",
                  properties: {
                    stxBalance: { type: "string", example: "1000000000" },
                    totalTransactions: { type: "integer", example: 50 },
                    uniqueContractsInteracted: { type: "integer", example: 12 },
                    fungibleTokensHeld: { type: "integer", example: 5 },
                    nftCount: { type: "integer", example: 0 },
                    avgTransactionFrequency: { type: "string", example: "2 hours" },
                    largestTransaction: { type: "string", example: "500000000" },
                  },
                },
              },
            },
            meta: {
              type: "object",
              properties: {
                timestamp: { type: "string", format: "date-time" },
                payment: { $ref: "#/components/schemas/PaymentInfo" },
              },
            },
          },
        },
        UserResearchResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                username: { type: "string", example: "elikitten" },
                platform: { type: "string", example: "X/Twitter" },
                summary: { type: "string", example: "Comprehensive user profile..." },
                keyFindings: {
                  type: "array",
                  items: { type: "string" },
                  example: ["Active in Stacks community", "Regular contributor to Bitcoin discussions"],
                },
                sentiment: {
                  type: "string",
                  enum: ["positive", "neutral", "negative", "mixed"],
                  example: "positive",
                },
                topics: {
                  type: "array",
                  items: { type: "string" },
                  example: ["crypto", "stacks", "bitcoin"],
                },
                sources: {
                  type: "array",
                  items: { type: "string" },
                  example: ["https://x.com/elikitten"],
                },
              },
            },
            meta: {
              type: "object",
              properties: {
                timestamp: { type: "string", format: "date-time" },
                payment: { $ref: "#/components/schemas/PaymentInfo" },
              },
            },
          },
        },
        PaymentInfo: {
          type: "object",
          properties: {
            txId: { type: "string", example: "0x123..." },
            amount: { type: "string", example: "1000" },
            sender: { type: "string", example: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7" },
          },
        },
        PaymentRequired: {
          type: "object",
          properties: {
            amount: { type: "string", example: "1000" },
            address: { type: "string", example: serverAddress },
            tokenType: { type: "string", example: "STX" },
            network: { type: "string", example: network },
            facilitatorUrl: { type: "string", example: "https://facilitator.x402stacks.xyz" },
            message: { type: "string", example: "Payment required to access this endpoint" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                message: { type: "string", example: "Error message" },
                code: { type: "string", example: "ERROR_CODE" },
                details: { type: "object" },
              },
            },
            meta: {
              type: "object",
              properties: {
                timestamp: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * @route   GET /openapi.json
 * @desc    OpenAPI 3.0 Specification (JSON)
 * @access  Public
 */
router.get("/openapi.json", (req: Request, res: Response) => {
  const openApiSpec = getOpenApiSpec(req);
  res.json(openApiSpec);
});

/**
 * @route   GET /docs
 * @desc    Swagger UI Documentation
 * @access  Public
 */
router.use("/docs", swaggerUi.serve);
router.get("/docs", (req: Request, res: Response, next) => {
  const swaggerSpec = getOpenApiSpec(req);
  const swaggerHandler = swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "x402-stacks API Documentation",
  });
  swaggerHandler(req, res, next);
});

export default router;
