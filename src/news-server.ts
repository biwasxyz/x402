import "dotenv/config";
import express, { Request, Response } from "express";
import { x402PaymentRequired, STXtoMicroSTX, getPayment } from "x402-stacks";
import { OpenRouter } from "@openrouter/sdk";

const app = express();
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

  if (req.headers['x-payment-tx-id']) {
    console.log(`  Payment: ${req.headers['x-payment-tx-id']}`);
  } else {
    console.log(`  No payment`);
  }

  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode === 402) {
      console.log(`  Response: 402 - Sending payment details`);
    } else if (res.statusCode === 200) {
      console.log(`  Response: 200 - OK`);
    } else {
      console.log(`  Response: ${res.statusCode}`);
    }
    return originalSend.call(this, data);
  };

  next();
});

const SERVER_ADDRESS =
  process.env.SERVER_ADDRESS || "STZWXQNJWS9WT1409PABGQCT318VWXWZ6VK2C583";
const NETWORK =
  (process.env.NETWORK as "mainnet" | "testnet") || "testnet";
const PORT = process.env.PORT || 3000;
const FACILITATOR_URL =
  process.env.FACILITATOR_URL || "https://facilitator.x402stacks.xyz";

// Initialize OpenRouter client
const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function getStacksAndBitcoinNews(): Promise<string> {
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast:online",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that provides the latest news and updates about Stacks blockchain and Bitcoin. Provide concise, accurate, and up-to-date information from reliable sources.",
      },
      {
        role: "user",
        content:
          "What are the latest news and developments about Stacks and Bitcoin? Please provide a comprehensive summary of recent updates, price movements, technological developments, and important announcements.",
      },
    ],
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;
  return typeof content === "string"
    ? content
    : "Unable to fetch news at this time.";
}

// Protected endpoint - requires 0.001 STX payment
app.get(
  "/api/stacks-news",
  x402PaymentRequired({
    amount: STXtoMicroSTX(0.001), // 0.001 STX = 1000 microSTX
    address: SERVER_ADDRESS,
    network: NETWORK,
    tokenType: "STX",
    facilitatorUrl: FACILITATOR_URL,
  }),
  async (req: Request, res: Response) => {
    const payment = getPayment(req);

    console.log(`  Payment verified: ${payment.txId}`);
    console.log(`  Fetching news...`);

    try {
      const news = await getStacksAndBitcoinNews();

      console.log(`  News fetched: ${news.length} chars`);

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
);

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    network: NETWORK,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 x402-stacks server running on port ${PORT}`);
  console.log(`Network: ${NETWORK}`);
  console.log(`Payment address: ${SERVER_ADDRESS}`);
  console.log(`Facilitator URL: ${FACILITATOR_URL}`);
  console.log("\nAvailable endpoints:");
  console.log("  GET  /health - Health check (free)");
  console.log(
    "  GET  /api/stacks-news - Stacks & Bitcoin news via Grok AI"
  );
  console.log("");
});
