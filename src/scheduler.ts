import "dotenv/config";
import cron from "node-cron";
import axios from "axios";
import {
  withPaymentInterceptor,
  decodeXPaymentResponse,
  getExplorerURL,
} from "x402-stacks";
import { mnemonicToAccount } from "./utils/index";

// Configuration
const NETWORK = (process.env.NETWORK as "mainnet" | "testnet") || "testnet";
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3001";
const MNEMONIC = process.env.CLIENT_MNEMONIC || "";
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "*/5 * * * *"; // Default: Every 5 minutes

if (!MNEMONIC) {
  console.error("\n❌ Error: CLIENT_MNEMONIC not set in .env");
  console.log("\nAdd this to your .env file:");
  console.log('CLIENT_MNEMONIC="your twelve or twenty-four word mnemonic phrase here"');
  console.log("\nGet testnet STX from:");
  console.log("https://explorer.stacks.co/sandbox/faucet?chain=testnet\n");
  process.exit(1);
}

async function makePayment() {
  const timestamp = new Date().toISOString();
  console.log("\n" + "=".repeat(80));
  console.log(`🕒 Scheduled Payment Triggered at ${timestamp}`);
  console.log("=".repeat(80));

  try {
    // Create account from mnemonic
    const account = await mnemonicToAccount(MNEMONIC, NETWORK);
    console.log(`📍 Using wallet: ${account.address}`);

    // Create axios instance with automatic payment handling
    const axiosInstance = axios.create({
      baseURL: SERVER_URL,
      timeout: 60000, // 60 seconds - settlement can take time
    });

    const api = withPaymentInterceptor(axiosInstance, account);

    console.log(`🌐 Requesting: GET /api/stacks-news`);

    // Make request with automatic payment
    const response = await api.get("/api/stacks-news");

    console.log("✅ Payment successful!");
    console.log("\n📦 Received Data:");
    console.log(JSON.stringify(response.data, null, 2));

    // Decode the payment response header
    const paymentResponse = decodeXPaymentResponse(
      response.headers["x-payment-response"]
    );

    if (paymentResponse) {
      console.log("\n💳 Payment Details:");
      console.log(`   Transaction ID: ${paymentResponse.txId}`);
      console.log(`   Status: ${paymentResponse.status}`);
      console.log(`   Block Height: ${paymentResponse.blockHeight}`);
      console.log(`   Explorer: ${getExplorerURL(paymentResponse.txId, NETWORK)}`);
    }

    console.log("\n✓ Scheduled payment completed successfully");
  } catch (error: any) {
    console.error("\n❌ Scheduled payment failed:");
    if (error.response?.status === 402) {
      console.error("Payment required but failed:");
      console.error(JSON.stringify(error.response.data, null, 2));
      console.error("\nResponse headers:");
      console.error(JSON.stringify(error.response.headers, null, 2));
    } else {
      console.error("Error message:", error.message);
      console.error("\nFull error details:");
      console.error(JSON.stringify({
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
      }, null, 2));
    }
  }

  console.log("=".repeat(80));
}

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🤖 x402 Automated Payment Scheduler");
  console.log("=".repeat(80));
  console.log(`⏰ Schedule: ${CRON_SCHEDULE}`);
  console.log(`🎯 Target: ${SERVER_URL}/api/stacks-news`);
  console.log(`🌐 Network: ${NETWORK}`);

  // Create account to show address
  const account = await mnemonicToAccount(MNEMONIC, NETWORK);
  console.log(`💰 Wallet: ${account.address}`);

  console.log("\n📋 Cron Schedule Format:");
  console.log("   */5 * * * *  = Every 5 minutes");
  console.log("   0 * * * *    = Every hour at minute 0");
  console.log("   0 */2 * * *  = Every 2 hours");
  console.log("   0 9 * * *    = Every day at 9:00 AM");
  console.log("   0 9,17 * * * = Every day at 9:00 AM and 5:00 PM");
  console.log("   0 0 * * 0    = Every Sunday at midnight");
  console.log("=".repeat(80));

  // Validate cron schedule
  if (!cron.validate(CRON_SCHEDULE)) {
    console.error("\n❌ Invalid cron schedule:", CRON_SCHEDULE);
    console.error("Please check CRON_SCHEDULE in your .env file\n");
    process.exit(1);
  }

  // Check if server is running
  try {
    const healthResponse = await axios.get(`${SERVER_URL}/health`);
    if (healthResponse.status !== 200) {
      throw new Error("Server not responding");
    }
    console.log("\n✓ Server is running and healthy");
  } catch {
    console.error("\n❌ Server is not running. Start it first:");
    console.error("  npm run dev:server\n");
    process.exit(1);
  }

  console.log("\n🚀 Scheduler started. Waiting for scheduled times...");
  console.log("   Press Ctrl+C to stop\n");

  // Schedule the task
  cron.schedule(CRON_SCHEDULE, makePayment, {
    timezone: "UTC", // You can change this to your local timezone
  });

  // Optional: Run immediately on start (uncomment if desired)
  // console.log("▶️  Running initial payment now...");
  // await makePayment();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
