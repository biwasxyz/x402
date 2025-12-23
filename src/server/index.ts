import "dotenv/config";
import express, { Request, Response } from "express";
import { x402PaymentRequired, STXtoMicroSTX, getPayment } from "x402-stacks";

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

// Protected endpoint - requires 0.001 STX payment
app.get(
  "/api/personal-data",
  x402PaymentRequired({
    amount: STXtoMicroSTX(0.001), // 0.001 STX = 1000 microSTX
    address: SERVER_ADDRESS,
    network: NETWORK,
    tokenType: "STX",
    facilitatorUrl: FACILITATOR_URL,
  }),
  (req: Request, res: Response) => {
    // This handler only executes AFTER payment is confirmed
    const payment = getPayment(req);

    res.json({
      success: true,
      personalData: {
        userId: "user_123",
        name: "John Doe",
        email: "john@example.com",
        preferences: {
          theme: "dark",
          notifications: true,
        },
      },
      message: "Payment received! Here's your personal data.",
      payment: {
        txId: payment.txId,
        amount: payment.amount.toString(),
        sender: payment.sender,
      },
    });
  }
);

// Health check endpoint (no payment required)
app.get("/health", (req: Request, res: Response) => {
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
    "  GET  /api/personal-data - Personal data (0.001 STX, confirmed)"
  );
  console.log("");
});
