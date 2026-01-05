import "dotenv/config";
import axios from "axios";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  withPaymentInterceptor,
  decodeXPaymentResponse,
  getExplorerURL,
} from "x402-stacks";
import { mnemonicToAccount } from "../utils/index";

// Configuration
const NETWORK = (process.env.NETWORK as "mainnet" | "testnet") || "testnet";
const API_URL = process.env.API_URL || "http://localhost:3001";
const MNEMONIC = process.env.CLIENT_MNEMONIC || "";

if (!MNEMONIC) {
  console.error("❌ CLIENT_MNEMONIC not set in .env");
  process.exit(1);
}

async function resolveAddress(): Promise<string> {
  const cliArg = process.argv[2]?.trim();
  if (cliArg) {
    return cliArg;
  }

  const rl = readline.createInterface({ input, output });
  const answer = (await rl.question("Enter the wallet address to classify: ")).trim();
  rl.close();

  if (!answer) {
    console.error("❌ Wallet address is required to run the wallet classification client.");
    process.exit(1);
  }

  return answer;
}

async function main() {
  const account = await mnemonicToAccount(MNEMONIC, NETWORK);
  console.log("Address:", account.address);

  // Create axios instance with automatic payment handling
  const axiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 60000, // 60 seconds - settlement can take time
  });

  // Add request interceptor to log outgoing requests
  axiosInstance.interceptors.request.use((config) => {
    console.log(`\n Request: ${config.method?.toUpperCase()} ${config.url}`);
    if (config.headers['x-payment-tx-id']) {
      console.log(` Includes Payment: TX ${config.headers['x-payment-tx-id']}`);
    }
    return config;
  });

  // Add response interceptor to log responses
  axiosInstance.interceptors.response.use(
    (response) => {
      console.log(`✅ Response: ${response.status} ${response.statusText}`);
      if (response.headers['x-payment-response']) {
        console.log(`   💰 Payment Accepted`);
      }
      return response;
    },
    (error) => {
      if (error.response) {
        console.log(`⚠️  Response: ${error.response.status} ${error.response.statusText}`);
        if (error.response.status === 402) {
          console.log(`   💳 Payment Required: ${JSON.stringify(error.response.data)}`);
          console.log(`   🔄 Interceptor will handle payment and retry...`);
        }
      }
      throw error;
    }
  );

  const api = withPaymentInterceptor(axiosInstance, account);

  try {
    await axios.get(`${API_URL}/health`);
  } catch {
    console.error("❌ Server not running. Start with: npm run dev");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(80));
  console.log("🎬 STARTING WALLET CLASSIFICATION PAYMENT FLOW");
  console.log("=".repeat(80));

  try {
    const address = await resolveAddress();

    const response = await api.post("/api/wallet/classify", {
      address: address,
    });

    console.log("\n" + "=".repeat(80));
    console.log("🎉 PAYMENT FLOW COMPLETED SUCCESSFULLY");
    console.log("=".repeat(80));

    const paymentResponse = decodeXPaymentResponse(
      response.headers["x-payment-response"]
    );

    if (paymentResponse) {
      console.log("\n💳 Final Payment Details:");
      console.log(`   Transaction ID: ${paymentResponse.txId}`);
      console.log(`   Status: ${paymentResponse.status}`);
      console.log(`   Block Height: ${paymentResponse.blockHeight || 'pending'}`);
      console.log(`   Explorer: ${getExplorerURL(paymentResponse.txId, NETWORK)}`);
    }

    console.log("\n🔍 Wallet Classification Results:");
    console.log("─".repeat(80));
    console.log("\n📦 RAW API RESPONSE:");
    console.log(JSON.stringify(response.data, null, 2));
    console.log("─".repeat(80));
  } catch (error: any) {
    console.log("\n" + "=".repeat(80));
    console.error("❌ PAYMENT FLOW FAILED");
    console.log("=".repeat(80));
    console.error("Error:", error.response?.data?.error || error.message);
    if (error.response) {
      console.error("\nResponse Details:");
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

main().catch(console.error);
