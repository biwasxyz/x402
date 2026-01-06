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

async function resolveTopic(): Promise<string | undefined> {
  const cliArg = process.argv[2]?.trim();
  if (cliArg) {
    return cliArg;
  }

  const rl = readline.createInterface({ input, output });
  const answer = (
    await rl.question(
      "Enter topic to analyze (or press Enter for default ecosystem analysis): "
    )
  ).trim();
  rl.close();

  return answer || undefined;
}

async function main() {
  const account = await mnemonicToAccount(MNEMONIC, NETWORK);
  console.log("Address:", account.address);

  // Create axios instance with automatic payment handling
  const axiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 120000, // 120 seconds - sentiment analysis may take longer
  });

  // Add request interceptor to log outgoing requests
  axiosInstance.interceptors.request.use((config) => {
    console.log(`\n Request: ${config.method?.toUpperCase()} ${config.url}`);
    if (config.headers["x-payment-tx-id"]) {
      console.log(` Includes Payment: TX ${config.headers["x-payment-tx-id"]}`);
    }
    return config;
  });

  // Add response interceptor to log responses
  axiosInstance.interceptors.response.use(
    (response) => {
      console.log(`✅ Response: ${response.status} ${response.statusText}`);
      if (response.headers["x-payment-response"]) {
        console.log(`   💰 Payment Accepted`);
      }
      return response;
    },
    (error) => {
      if (error.response) {
        console.log(
          `⚠️  Response: ${error.response.status} ${error.response.statusText}`
        );
        if (error.response.status === 402) {
          console.log(
            `   💳 Payment Required: ${JSON.stringify(error.response.data)}`
          );
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
  console.log("📊 STARTING SENTIMENT ANALYSIS PAYMENT FLOW");
  console.log("=".repeat(80));

  try {
    const topic = await resolveTopic();

    const response = await api.post("/api/sentiment", {
      topic: topic,
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
      console.log(`   Block Height: ${paymentResponse.blockHeight || "pending"}`);
      console.log(`   Explorer: ${getExplorerURL(paymentResponse.txId, NETWORK)}`);
    }

    console.log("\n📊 Sentiment Analysis Results:");
    console.log("─".repeat(80));

    const data = response.data.data;

    // Display formatted summary
    console.log("\n🎯 OVERALL SENTIMENT:");
    console.log(
      `   ${getSentimentEmoji(data.overallSentiment)} ${data.overallSentiment.toUpperCase()} (Score: ${data.sentimentScore})`
    );

    console.log("\n📝 SUMMARY:");
    console.log(wrapText(data.summary, 76, "   "));

    console.log("\n📈 TRADING SIGNAL:");
    console.log(
      `   ${getSignalEmoji(data.tradingSignals.signal)} ${data.tradingSignals.signal.toUpperCase()} (Confidence: ${data.tradingSignals.confidence}%)`
    );
    console.log(`   Timeframe: ${data.tradingSignals.timeframe}`);
    console.log(`   Reasoning: ${data.tradingSignals.reasoning}`);

    console.log("\n🪙 TOKEN ANALYSIS:");
    displayTokenSentiment("sBTC", data.tokenAnalysis.sBTC);
    displayTokenSentiment("STX/Stacks", data.tokenAnalysis.stacks);
    displayTokenSentiment("x402", data.tokenAnalysis.x402);
    displayTokenSentiment("USDCx", data.tokenAnalysis.USDCx);

    console.log("\n📊 MARKET INSIGHTS:");
    console.log(`   Short-term Outlook: ${data.marketInsights.shortTermOutlook}`);
    if (data.marketInsights.keyDrivers.length > 0) {
      console.log("   Key Drivers:");
      data.marketInsights.keyDrivers.forEach((d: string) =>
        console.log(`     • ${d}`)
      );
    }
    if (data.marketInsights.riskFactors.length > 0) {
      console.log("   ⚠️  Risk Factors:");
      data.marketInsights.riskFactors.forEach((r: string) =>
        console.log(`     • ${r}`)
      );
    }
    if (data.marketInsights.opportunities.length > 0) {
      console.log("   ✨ Opportunities:");
      data.marketInsights.opportunities.forEach((o: string) =>
        console.log(`     • ${o}`)
      );
    }

    console.log("\n🔥 SOCIAL METRICS:");
    console.log(`   Engagement Level: ${data.socialMetrics.engagementLevel}`);
    console.log(`   Community Mood: ${data.socialMetrics.communityMood}`);
    console.log(
      `   Influencer Sentiment: ${data.socialMetrics.influencerSentiment}`
    );
    if (data.socialMetrics.trendingTopics.length > 0) {
      console.log("   Trending Topics:");
      data.socialMetrics.trendingTopics.forEach((t: string) =>
        console.log(`     • ${t}`)
      );
    }

    if (data.notableEvents.length > 0) {
      console.log("\n📢 NOTABLE EVENTS:");
      data.notableEvents.forEach((e: string) => console.log(`   • ${e}`));
    }

    if (data.sources.length > 0) {
      console.log("\n🔗 SOURCES:");
      data.sources.forEach((s: string) => console.log(`   • ${s}`));
    }

    console.log("\n" + "─".repeat(80));
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

function getSentimentEmoji(sentiment: string): string {
  switch (sentiment) {
    case "bullish":
      return "🐂";
    case "bearish":
      return "🐻";
    case "neutral":
      return "😐";
    case "mixed":
      return "🔄";
    default:
      return "❓";
  }
}

function getSignalEmoji(signal: string): string {
  switch (signal) {
    case "strong_buy":
      return "🚀";
    case "buy":
      return "📈";
    case "hold":
      return "⏸️";
    case "sell":
      return "📉";
    case "strong_sell":
      return "⚠️";
    default:
      return "❓";
  }
}

function displayTokenSentiment(
  name: string,
  data: {
    sentiment: string;
    mentionVolume: string;
    keyDiscussions: string[];
    priceExpectation: string;
  }
): void {
  console.log(
    `   ${name}: ${getSentimentEmoji(data.sentiment)} ${data.sentiment} (Volume: ${data.mentionVolume})`
  );
  console.log(`      Price Expectation: ${data.priceExpectation}`);
  if (data.keyDiscussions.length > 0) {
    data.keyDiscussions.slice(0, 2).forEach((d) => console.log(`      • ${d}`));
  }
}

function wrapText(text: string, width: number, prefix: string): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= width) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(prefix + currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(prefix + currentLine);

  return lines.join("\n");
}

main().catch(console.error);
