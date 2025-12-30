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
const SERVER_URL = process.env.API_URL || "http://localhost:3000";
const MNEMONIC = process.env.CLIENT_MNEMONIC || "";

if (!MNEMONIC) {
  console.error("❌ CLIENT_MNEMONIC not set in .env");
  process.exit(1);
}

// Get contract identifier from command line
const contractIdentifier = process.argv[2];

if (!contractIdentifier) {
  console.error("❌ Contract identifier required");
  console.error("\nUsage:");
  console.error("  npm run audit <CONTRACT_IDENTIFIER>");
  console.error("\nExample:");
  console.error("  npm run audit SP000000000000000000002Q6VF78.pox");
  console.error("  npm run audit SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token");
  process.exit(1);
}

async function main() {
  const account = await mnemonicToAccount(MNEMONIC, NETWORK);
  console.log("\n" + "=".repeat(80));
  console.log("🛡️  WHITEHAT - Clarity Smart Contract Security Auditor");
  console.log("=".repeat(80));
  console.log(`\nWallet: ${account.address}`);
  console.log(`Network: ${NETWORK}`);
  console.log(`Contract: ${contractIdentifier}\n`);

  // Create axios instance with automatic payment handling
  const axiosInstance = axios.create({
    baseURL: SERVER_URL,
    timeout: 180000, // 3 minutes for comprehensive analysis
  });

  // Add request interceptor to log outgoing requests
  axiosInstance.interceptors.request.use((config) => {
    console.log(`\n📤 Request: ${config.method?.toUpperCase()} ${config.url}`);
    if (config.headers['x-payment-tx-id']) {
      console.log(`   💳 Includes Payment: TX ${config.headers['x-payment-tx-id']}`);
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

  // Check if server is running
  try {
    await axios.get(`${SERVER_URL}/health`);
  } catch {
    console.error("❌ WHITEHAT server not running. Start with: npm run dev");
    process.exit(1);
  }

  console.log("=".repeat(80));
  console.log("🔍 STARTING COMPREHENSIVE SECURITY AUDIT");
  console.log("   This may take 1-2 minutes for thorough analysis");
  console.log("=".repeat(80));

  try {
    const response = await api.post("/api/audit", {
      contractIdentifier,
    });

    console.log("\n" + "=".repeat(80));
    console.log("🎉 AUDIT COMPLETED SUCCESSFULLY");
    console.log("=".repeat(80));

    const paymentResponse = decodeXPaymentResponse(
      response.headers["x-payment-response"]
    );

    if (paymentResponse) {
      console.log("\n💳 Payment Details:");
      console.log(`   Transaction ID: ${paymentResponse.txId}`);
      console.log(`   Status: ${paymentResponse.status}`);
      console.log(`   Block Height: ${paymentResponse.blockHeight || 'pending'}`);
      console.log(`   Explorer: ${getExplorerURL(paymentResponse.txId, NETWORK)}`);
    }

    const auditData = response.data;

    console.log("\n" + "=".repeat(80));
    console.log("📊 COMPREHENSIVE SECURITY AUDIT REPORT");
    console.log("=".repeat(80));
    console.log(`Contract: ${auditData.contractName}`);
    console.log(`Identifier: ${auditData.contractIdentifier || contractIdentifier}`);
    console.log(`Timestamp: ${auditData.scanTimestamp}`);
    console.log(`Overall Risk: ${auditData.overallRisk.toUpperCase()} ${getRiskEmoji(auditData.overallRisk)}`);
    console.log(`Vulnerabilities Found: ${auditData.vulnerabilities.length}`);

    // General Concept
    console.log("\n" + "─".repeat(80));
    console.log("## GENERAL CONCEPT");
    console.log("─".repeat(80));
    console.log(auditData.generalConcept);

    // Function Analysis
    console.log("\n" + "─".repeat(80));
    console.log("## FUNCTION RISK ANALYSIS");
    console.log("─".repeat(80));

    const functionAnalysis = auditData.functionAnalysis;

    if (functionAnalysis.red && functionAnalysis.red.functions.length > 0) {
      console.log("\n🔴 RED Functions (Critical Risk):");
      functionAnalysis.red.functions.forEach((fn: string) => console.log(`   • ${fn}`));
      console.log(`\nAnalysis:`);
      console.log(functionAnalysis.red.analysis);
    }

    if (functionAnalysis.orange && functionAnalysis.orange.functions.length > 0) {
      console.log("\n🟠 ORANGE Functions (High Risk):");
      functionAnalysis.orange.functions.forEach((fn: string) => console.log(`   • ${fn}`));
      console.log(`\nAnalysis:`);
      console.log(functionAnalysis.orange.analysis);
    }

    if (functionAnalysis.yellow && functionAnalysis.yellow.functions.length > 0) {
      console.log("\n🟡 YELLOW Functions (Medium Risk):");
      functionAnalysis.yellow.functions.forEach((fn: string) => console.log(`   • ${fn}`));
      console.log(`\nAnalysis:`);
      console.log(functionAnalysis.yellow.analysis);
    }

    if (functionAnalysis.green && functionAnalysis.green.functions.length > 0) {
      console.log("\n🟢 GREEN Functions (Low Risk):");
      functionAnalysis.green.functions.forEach((fn: string) => console.log(`   • ${fn}`));
      console.log(`\nAnalysis:`);
      console.log(functionAnalysis.green.analysis);
    }

    // Vulnerabilities
    if (auditData.vulnerabilities.length > 0) {
      console.log("\n" + "─".repeat(80));
      console.log("## SECURITY VULNERABILITIES");
      console.log("─".repeat(80));

      auditData.vulnerabilities.forEach((vuln: any, idx: number) => {
        const severityEmoji = getSeverityEmoji(vuln.severity);
        console.log(`\n${idx + 1}. ${severityEmoji} [${vuln.severity.toUpperCase()}] ${vuln.title}`);
        console.log(`   Category: ${vuln.category}`);
        console.log(`   Location: ${vuln.location || "N/A"}`);
        console.log(`   Description: ${vuln.description}`);
        console.log(`   Recommendation: ${vuln.recommendation}`);
      });
    } else {
      console.log("\n✅ No critical vulnerabilities found!");
    }

    // Special Checks
    if (auditData.traitFunctions) {
      console.log("\n" + "─".repeat(80));
      console.log("## TRAIT FUNCTIONS ANALYSIS");
      console.log("─".repeat(80));
      console.log(auditData.traitFunctions);
    }

    if (auditData.asContractFunctions) {
      console.log("\n" + "─".repeat(80));
      console.log("## AS-CONTRACT USAGE ANALYSIS");
      console.log("─".repeat(80));
      console.log(auditData.asContractFunctions);
    }

    if (auditData.edgeCases) {
      console.log("\n" + "─".repeat(80));
      console.log("## EDGE CASES & COMPLEX LOGIC");
      console.log("─".repeat(80));
      console.log(auditData.edgeCases);
    }

    // Recommendations
    console.log("\n" + "─".repeat(80));
    console.log("## RECOMMENDATIONS");
    console.log("─".repeat(80));
    console.log(auditData.recommendations);

    // Summary
    console.log("\n" + "─".repeat(80));
    console.log("## EXECUTIVE SUMMARY");
    console.log("─".repeat(80));
    console.log(auditData.summary);
    console.log("─".repeat(80) + "\n");

  } catch (error: any) {
    console.log("\n" + "=".repeat(80));
    console.error("❌ AUDIT FAILED");
    console.log("=".repeat(80));
    console.error("Error:", error.response?.data?.error || error.message);
    if (error.response) {
      console.error("\nResponse Details:");
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

function getRiskEmoji(risk: string): string {
  switch (risk.toLowerCase()) {
    case "critical": return "🔴";
    case "high": return "🟠";
    case "medium": return "🟡";
    case "low": return "🟢";
    case "passed": return "✅";
    default: return "⚪";
  }
}

function getSeverityEmoji(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical": return "🚨";
    case "high": return "⚠️";
    case "medium": return "⚡";
    case "low": return "ℹ️";
    case "info": return "💭";
    default: return "📌";
  }
}

main().catch(console.error);
