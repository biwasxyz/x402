import "dotenv/config";
import express, { Request, Response } from "express";
import { x402PaymentRequired, STXtoMicroSTX, getPayment } from "x402-stacks";
import { OpenRouter } from "@openrouter/sdk";

const app = express();
app.use(express.json());

// Server configuration from environment variables
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
  "/api/crypto-news",
  x402PaymentRequired({
    amount: STXtoMicroSTX(0.001), // 0.001 STX = 1000 microSTX
    address: SERVER_ADDRESS,
    network: NETWORK,
    tokenType: "STX",
    facilitatorUrl: FACILITATOR_URL,
  }),
  async (req: Request, res: Response) => {
    // This handler only executes AFTER payment is confirmed
    const payment = getPayment(req);

    try {
      // Fetch news using the Grok agent
      const news = await getStacksAndBitcoinNews();

      res.json({
        success: true,
        news,
        message: "Payment received! Here's the latest Stacks and Bitcoin news.",
        payment: {
          txId: payment.txId,
          amount: payment.amount.toString(),
          sender: payment.sender,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
        payment: {
          txId: payment.txId,
          amount: payment.amount.toString(),
          sender: payment.sender,
        },
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
    "  GET  /api/crypto-news - Stacks & Bitcoin news via Grok AI (0.001 STX, confirmed)"
  );
  console.log("");
});
