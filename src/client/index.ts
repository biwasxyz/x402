import "dotenv/config";
import axios from "axios";
import {
  withPaymentInterceptor,
  decodeXPaymentResponse,
  getExplorerURL,
} from "x402-stacks";
import { mnemonicToAccount } from "../utils/index";

// Configuration
const NETWORK = (process.env.NETWORK as "mainnet" | "testnet") || "testnet";
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";
const MNEMONIC = process.env.CLIENT_MNEMONIC || "";

if (!MNEMONIC) {
  console.error("\n❌ Error: CLIENT_MNEMONIC not set in .env");
  console.log("\nAdd this to your .env file:");
  console.log('CLIENT_MNEMONIC="your twelve or twenty-four word mnemonic phrase here"');
  console.log("\nGet testnet STX from:");
  console.log("https://explorer.stacks.co/sandbox/faucet?chain=testnet\n");
  process.exit(1);
}

async function main() {
  console.log("=".repeat(60));
  console.log("x402-stacks Client (Mnemonic-based)");
  console.log("=".repeat(60));

  // Create account from mnemonic
  const account = await mnemonicToAccount(MNEMONIC, NETWORK);
  console.log("Using wallet from mnemonic:");
  console.log("Address:", account.address);
  console.log("");

  // Create axios instance with automatic payment handling
  const axiosInstance = axios.create({
    baseURL: SERVER_URL,
    timeout: 60000, // 60 seconds - settlement can take time
  });

  // Add response interceptor to log everything
  axiosInstance.interceptors.response.use(
    (response) => {
      console.log("\n📥 Response received:");
      console.log("Status:", response.status, response.statusText);
      console.log("Headers:", JSON.stringify(response.headers, null, 2));
      console.log("Data:", JSON.stringify(response.data, null, 2));
      return response;
    },
    (error) => {
      if (error.response) {
        console.log("\n📥 Error response received:");
        console.log("Status:", error.response.status, error.response.statusText);
        console.log("Headers:", JSON.stringify(error.response.headers, null, 2));
        console.log("Data:", JSON.stringify(error.response.data, null, 2));
      }
      return Promise.reject(error);
    }
  );

  const api = withPaymentInterceptor(axiosInstance, account);

  // Check if server is running
  try {
    const healthResponse = await axios.get(`${SERVER_URL}/health`);
    if (healthResponse.status !== 200) {
      throw new Error("Server not responding");
    }
    console.log("✓ Server is running\n");
  } catch {
    console.error("❌ Server is not running. Start it first:");
    console.error("  npm run dev\n");
    process.exit(1);
  }

  // Make request with automatic payment
  console.log("--- Requesting Personal Data (automatic payment) ---\n");

  try {
    console.log("🌐 GET /api/personal-data");

    // Just make a normal request - payment is handled automatically!
    const response = await api.get("/api/personal-data");

    console.log("✅ Success! Received data:\n");
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
  } catch (error: any) {
    if (error.response?.status === 402) {
      console.error("\n❌ Payment required but failed:");
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("\n❌ Error:", error.response?.data?.error || error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Request completed");
  console.log("=".repeat(60));
}

main().catch(console.error);
