import { RuntimeConfig } from "./config";

export function buildDocsOverview(baseUrl: string, config: RuntimeConfig) {
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
      sentiment: {
        path: "/api/sentiment",
        method: "POST",
        description: "Analyze real-time sentiment for user-requested tokens or topics from X/Twitter",
        cost: "0.005 STX",
        payment: "Required via x402 protocol",
        body: {
          topic: "Comma-separated tokens or topics (optional)",
        },
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
      network: config.network,
      paymentAddress: config.serverAddress,
      facilitator: config.facilitatorUrl,
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

export function getOpenApiSpec(baseUrl: string, config: RuntimeConfig) {
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
        description: `${config.network.charAt(0).toUpperCase() + config.network.slice(1)} Server`,
      },
    ],
    tags: [
      { name: "Health", description: "Health check endpoints" },
      { name: "News", description: "Stacks & Bitcoin news powered by AI" },
      { name: "Sentiment", description: "Real-time sentiment across user-specified tokens/topics" },
      { name: "Audit", description: "Smart contract security audits" },
      { name: "Wallet", description: "Wallet classification and analysis" },
      { name: "Research", description: "User research with AI web search" },
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
                          network: { type: "string", example: config.network },
                          services: {
                            type: "object",
                            properties: {
                              news: { type: "string", example: "GET /api/news" },
                              sentiment: { type: "string", example: "POST /api/sentiment" },
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
          parameters: [],
          responses: {
            "200": {
              description: "News summary",
            },
            "402": {
              description: "Payment required",
            },
          },
        },
      },
      "/api/audit": {
        post: {
          tags: ["Audit"],
          summary: "Analyze Clarity contract security",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    contractIdentifier: {
                      type: "string",
                      example: "SP000000000000000000002Q6VF78.clarity-bitcoin",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Audit results" },
            "400": { description: "Invalid request" },
            "402": { description: "Payment required" },
          },
        },
      },
      "/api/wallet/classify": {
        post: {
          tags: ["Wallet"],
          summary: "Classify wallet behavior",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    address: { type: "string", example: "SP3FBR2AGKIPC8RP2XVW8KQ4JHA4M7GKBJ9K7JY1P" },
                  },
                  required: ["address"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Classification result" },
            "400": { description: "Invalid request" },
            "402": { description: "Payment required" },
          },
        },
      },
      "/api/research/user": {
        post: {
          tags: ["Research"],
          summary: "Research a user with AI",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string", example: "@muneeb" },
                  },
                  required: ["username"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Research result" },
            "400": { description: "Invalid request" },
            "402": { description: "Payment required" },
          },
        },
      },
      "/api/sentiment": {
        post: {
          tags: ["Sentiment"],
          summary: "Analyze sentiment for topics",
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    topic: { type: "string", example: "STX, sBTC" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Sentiment analysis" },
            "402": { description: "Payment required" },
          },
        },
      },
    },
  };
}

export function getDocsHtml(baseUrl: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>x402-stacks API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
    <style>
      body { margin: 0; background: #0f172a; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        SwaggerUIBundle({
          url: '${baseUrl}/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis],
        });
      };
    </script>
  </body>
</html>`;
}
