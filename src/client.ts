import "dotenv/config";
import axios from "axios";
import {
  withPaymentInterceptor,
  decodeXPaymentResponse,
  getExplorerURL,
} from "x402-stacks";
import { mnemonicToAccount } from "./utils/index";

// Configuration
const NETWORK = (process.env.NETWORK as "mainnet" | "testnet") || "testnet";
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";
const MNEMONIC = process.env.CLIENT_MNEMONIC || "";

if (!MNEMONIC) {
  console.error("❌ CLIENT_MNEMONIC not set in .env");
  process.exit(1);
}

async function main() {
  const account = await mnemonicToAccount(MNEMONIC, NETWORK);
  console.log("Address:", account.address);

  // Create axios instance with automatic payment handling
  const axiosInstance = axios.create({
    baseURL: SERVER_URL,
    timeout: 60000, // 60 seconds - settlement can take time
  });


  const api = withPaymentInterceptor(axiosInstance, account);

  try {
    await axios.get(`${SERVER_URL}/health`);
  } catch {
    console.error("❌ Server not running. Start with: npm run dev:server");
    process.exit(1);
  }

  console.log("\nRequesting Crypto News...");

  try {
    const response = await api.get("/api/crypto-news");

    console.log("✅ Success!\n");
    console.log("📰 News:\n", response.data.news);

    const paymentResponse = decodeXPaymentResponse(
      response.headers["x-payment-response"]
    );

    if (paymentResponse) {
      console.log("\n💳 Payment:");
      console.log(`   TX: ${paymentResponse.txId}`);
      console.log(`   Status: ${paymentResponse.status}`);
      console.log(`   Explorer: ${getExplorerURL(paymentResponse.txId, NETWORK)}`);
    }
  } catch (error: any) {
    console.error("\n❌ Error:", error.response?.data?.error || error.message);
  }
}

main().catch(console.error);
