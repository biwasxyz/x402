import "dotenv/config";
import express, { Request, Response } from "express";
import { x402PaymentRequired, STXtoMicroSTX, getPayment } from "x402-stacks";
import { OpenRouter } from "@openrouter/sdk";
import axios from "axios";

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

  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode === 402) {
      console.log(`  Response: 402 - Payment required`);
    } else if (res.statusCode === 200) {
      console.log(`  Response: 200 - OK`);
    } else {
      console.log(`  Response: ${res.statusCode}`);
    }
    return originalSend.call(this, data);
  };

  next();
});

const SERVER_ADDRESS = process.env.SERVER_ADDRESS || "STZWXQNJWS9WT1409PABGQCT318VWXWZ6VK2C583";
const NETWORK = (process.env.NETWORK as "mainnet" | "testnet") || "testnet";
const PORT = process.env.PORT || 3000;
const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://facilitator.x402stacks.xyz";

// Initialize OpenRouter client
if (!process.env.OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY not set in .env");
  process.exit(1);
}

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Stacks API endpoints
const STACKS_API_URL = NETWORK === "mainnet"
  ? "https://api.mainnet.hiro.so"
  : "https://api.testnet.hiro.so";

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    network: NETWORK,
    services: {
      news: "GET /api/news",
      whitehat: "POST /api/audit"
    }
  });
});

// ============================================================================
// NEWS SERVICE - Stacks & Bitcoin News
// ============================================================================
async function getStacksAndBitcoinNews(): Promise<string> {
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-2-1212",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that provides the latest news and updates about Stacks blockchain and Bitcoin. Provide concise, accurate, and up-to-date information from reliable sources.",
      },
      {
        role: "user",
        content: `What are the latest news and developments about Stacks and Bitcoin in last 24 hours? Please provide a comprehensive summary of recent updates, price movements, technological developments, and important announcements searching through X and web also provide me the links to it. (Request time: ${new Date().toISOString()})`,
      },
    ],
    temperature: 0.7,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;
  return typeof content === "string" ? content : "Unable to fetch news at this time.";
}

app.get(
  "/api/news",
  x402PaymentRequired({
    amount: STXtoMicroSTX(0.001),
    address: SERVER_ADDRESS,
    network: NETWORK,
    tokenType: "STX",
    facilitatorUrl: FACILITATOR_URL,
  }),
  async (req: Request, res: Response) => {
    const payment = getPayment(req);
    console.log(`  Payment verified: ${payment.txId}`);

    try {
      const news = await getStacksAndBitcoinNews();

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

// ============================================================================
// WHITEHAT SERVICE - Clarity Security Auditor
// ============================================================================

const CLARITY_SECURITY_KNOWLEDGE = `
# Clarity Smart Contract Security Analysis Framework

## Risk Categories

### RED Functions - Critical Risk
- Functions that can lead to theft, funds loss or contract lock
- Must verify: Authorization, access control, tx-sender vs contract-caller
- Examples: Token transfers, minting, burning, fund withdrawals

### ORANGE Functions - High Risk
- Functions with side-effects that can alter contract behavior
- Functions without side-effects used by critical functions
- Must verify: Proper authorization, trait usage security
- Examples: State changes, configuration updates

### YELLOW Functions - Medium Risk
- Can change variables or map entries for non-critical data
- Typically metadata modifications
- Must verify: Access control for admin functions
- Examples: URI updates, metadata changes

### GREEN Functions - Low Risk
- Read-only functions with no side-effects
- Return values stored on-chain
- Must verify: No unintended state modifications

## Key Security Checks

### 1. Authorization & Access Control
- Check tx-sender vs contract-caller usage
- Verify admin function protection
- Validate permission checks with is-eq

### 2. Trait Functions
- Assume supplied contracts are malicious
- Validate trait usage consistency
- Check for trait-based vulnerabilities

### 3. as-contract Usage
- Verify appropriate context switching
- Check contract-call? security
- Validate call patterns

### 4. Input Validation
- User inputs properly validated
- Bounds checking on all inputs
- List and buffer length validations

### 5. Fee & Transfer Validation
- Prevent zero or unintended values
- Check stx-transfer?, ft-transfer?, nft-transfer?
- Validate transfer recipients

### 6. Pause/Resume Mechanisms
- Ensure resume functionality exists
- Prevent permanent lockout
- Validate pause authorization

### 7. Edge Cases
- Integer overflow/underflow (auto-aborted by Clarity)
- Complex logic decomposition
- Response handling (unwrap!, try!, match)

### 8. Token Operations
- Verify all transfer results checked
- Prevent front-running
- Validate recipient addresses
`;

interface ContractAnalysisRequest {
  contractIdentifier?: string;
  contractCode?: string;
  contractName?: string;
}

interface VulnerabilityFinding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  location?: string;
  recommendation: string;
}

interface FunctionAnalysis {
  red: { functions: string[]; analysis: string };
  orange: { functions: string[]; analysis: string };
  yellow: { functions: string[]; analysis: string };
  green: { functions: string[]; analysis: string };
}

interface AnalysisResponse {
  contractName: string;
  contractIdentifier?: string;
  scanTimestamp: string;
  overallRisk: "critical" | "high" | "medium" | "low" | "passed";
  generalConcept: string;
  functionAnalysis: FunctionAnalysis;
  vulnerabilities: VulnerabilityFinding[];
  traitFunctions: string;
  asContractFunctions: string;
  edgeCases: string;
  recommendations: string;
  summary: string;
  payment?: {
    txId: string;
    amount: string;
    sender: string;
  };
}

async function getContractSource(contractIdentifier: string): Promise<string> {
  const [address, contractName] = contractIdentifier.split(".");

  if (!address || !contractName) {
    throw new Error("Invalid contract identifier. Format: ADDRESS.CONTRACT_NAME");
  }

  const url = `${STACKS_API_URL}/v2/contracts/source/${address}/${contractName}`;

  try {
    const response = await axios.get(url);
    if (response.data && response.data.source) {
      return response.data.source;
    }
    throw new Error("Contract source code not found");
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error(`Contract not found: ${contractIdentifier}`);
    }
    throw new Error(`Failed to fetch contract: ${error.message}`);
  }
}

async function performComprehensiveAnalysis(
  contractCode: string,
  contractName: string,
  contractIdentifier?: string
): Promise<AnalysisResponse> {
  console.log(`  Performing comprehensive analysis for ${contractName}...`);

  const completion = await openrouter.chat.send({
    model: "anthropic/claude-3.5-sonnet",
    messages: [
      {
        role: "system",
        content: `You are an expert Clarity smart contract security auditor with deep knowledge of blockchain security.

${CLARITY_SECURITY_KNOWLEDGE}

Perform a comprehensive multi-stage security analysis:

1. GENERAL CONCEPT - Understand the contract's purpose
2. FUNCTION CATEGORIZATION - Categorize all functions by risk (RED/ORANGE/YELLOW/GREEN)
3. SECURITY ANALYSIS - Analyze each category for vulnerabilities
4. SPECIAL CHECKS - Trait functions, as-contract usage
5. COMMON ISSUES - Input validation, fee validation, pause/resume, edge cases

Return a detailed JSON analysis with this structure:
{
  "overallRisk": "critical" | "high" | "medium" | "low" | "passed",
  "generalConcept": "Brief description of contract purpose and functionality",
  "functionAnalysis": {
    "red": {
      "functions": ["function1", "function2"],
      "analysis": "Detailed analysis of RED functions with security issues"
    },
    "orange": {
      "functions": ["function1", "function2"],
      "analysis": "Detailed analysis of ORANGE functions"
    },
    "yellow": {
      "functions": ["function1", "function2"],
      "analysis": "Detailed analysis of YELLOW functions"
    },
    "green": {
      "functions": ["function1", "function2"],
      "analysis": "Analysis of GREEN functions"
    }
  },
  "vulnerabilities": [
    {
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "category": "Authorization" | "Input Validation" | "Token Operations" | etc,
      "title": "Brief vulnerability title",
      "description": "Detailed description",
      "location": "Function name or line reference",
      "recommendation": "How to fix with code example if applicable"
    }
  ],
  "traitFunctions": "Analysis of functions using traits",
  "asContractFunctions": "Analysis of as-contract usage",
  "edgeCases": "Analysis of edge cases and complex logic",
  "recommendations": "Overall security recommendations",
  "summary": "Executive summary of findings"
}

Be thorough and include code references where applicable.`,
      },
      {
        role: "user",
        content: `Perform a comprehensive security audit of this Clarity smart contract:

Contract: ${contractName}
${contractIdentifier ? `Identifier: ${contractIdentifier}` : ""}

\`\`\`clarity
${contractCode}
\`\`\`

Analyze ALL security aspects following the multi-stage framework.`,
      },
    ],
    temperature: 0.2,
    responseFormat: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;

  let analysis;
  try {
    if (typeof content === "string") {
      const cleanedContent = content.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
      analysis = JSON.parse(cleanedContent);
    } else {
      analysis = {
        overallRisk: "high",
        generalConcept: "Analysis failed - no content",
        functionAnalysis: { red: { functions: [], analysis: "" }, orange: { functions: [], analysis: "" }, yellow: { functions: [], analysis: "" }, green: { functions: [], analysis: "" } },
        vulnerabilities: [],
        traitFunctions: "",
        asContractFunctions: "",
        edgeCases: "",
        recommendations: "",
        summary: "Analysis failed"
      };
    }
  } catch (parseError) {
    console.error(`  JSON parse error:`, parseError);
    analysis = {
      overallRisk: "high",
      generalConcept: "Analysis encountered errors",
      functionAnalysis: { red: { functions: [], analysis: "" }, orange: { functions: [], analysis: "" }, yellow: { functions: [], analysis: "" }, green: { functions: [], analysis: "" } },
      vulnerabilities: [{
        severity: "info",
        category: "System",
        title: "Analysis Error",
        description: "Failed to parse security analysis results",
        location: "N/A",
        recommendation: "Please try again"
      }],
      traitFunctions: "",
      asContractFunctions: "",
      edgeCases: "",
      recommendations: "Analysis incomplete due to parsing error",
      summary: "Analysis encountered errors"
    };
  }

  return {
    contractName,
    contractIdentifier,
    scanTimestamp: new Date().toISOString(),
    overallRisk: analysis.overallRisk || "high",
    generalConcept: analysis.generalConcept || "",
    functionAnalysis: analysis.functionAnalysis || { red: { functions: [], analysis: "" }, orange: { functions: [], analysis: "" }, yellow: { functions: [], analysis: "" }, green: { functions: [], analysis: "" } },
    vulnerabilities: analysis.vulnerabilities || [],
    traitFunctions: analysis.traitFunctions || "",
    asContractFunctions: analysis.asContractFunctions || "",
    edgeCases: analysis.edgeCases || "",
    recommendations: analysis.recommendations || "",
    summary: analysis.summary || "Analysis completed",
  };
}

app.post(
  "/api/audit",
  x402PaymentRequired({
    amount: STXtoMicroSTX(0.02),
    address: SERVER_ADDRESS,
    network: NETWORK,
    tokenType: "STX",
    facilitatorUrl: FACILITATOR_URL,
  }),
  async (req: Request, res: Response) => {
    const payment = getPayment(req);
    console.log(`  Payment verified: ${payment.txId}`);

    try {
      const { contractIdentifier, contractCode, contractName = "unnamed-contract" } = req.body as ContractAnalysisRequest;

      let sourceCode: string;
      let finalContractName: string;
      let finalContractIdentifier: string | undefined;

      if (contractIdentifier) {
        console.log(`  Fetching contract from Stacks API: ${contractIdentifier}`);
        sourceCode = await getContractSource(contractIdentifier);
        const [, name] = contractIdentifier.split(".");
        finalContractName = name;
        finalContractIdentifier = contractIdentifier;
      } else if (contractCode) {
        sourceCode = contractCode;
        finalContractName = contractName;
      } else {
        return res.status(400).json({
          error: "Either 'contractIdentifier' or 'contractCode' must be provided",
        });
      }

      console.log(`  Analyzing contract: ${finalContractName} (${sourceCode.length} chars)`);

      const auditResult = await performComprehensiveAnalysis(
        sourceCode,
        finalContractName,
        finalContractIdentifier
      );

      console.log(`  Audit complete: ${auditResult.overallRisk} risk, ${auditResult.vulnerabilities.length} findings`);

      res.json({
        ...auditResult,
        payment: {
          txId: payment.txId,
          amount: payment.amount.toString(),
          sender: payment.sender,
        },
      });
    } catch (error: any) {
      console.error(`  Error:`, error instanceof Error ? error.message : error);

      if (error.message?.includes("User not found")) {
        console.error("  OpenRouter API key issue - check your OPENROUTER_API_KEY");
        return res.status(500).json({
          error: "AI service configuration error. Please contact support.",
          details: "OpenRouter API authentication failed"
        });
      }

      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to analyze contract",
      });
    }
  }
);

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(80));
  console.log("🚀 x402-stacks API Server");
  console.log("=".repeat(80));
  console.log(`Port: ${PORT}`);
  console.log(`Network: ${NETWORK}`);
  console.log(`Payment Address: ${SERVER_ADDRESS}`);
  console.log(`Stacks API: ${STACKS_API_URL}`);
  console.log("\n📋 Available Endpoints:");
  console.log("  GET  /health              - Health check (free)");
  console.log("  GET  /api/news            - Stacks & Bitcoin news (0.001 STX)");
  console.log("  POST /api/audit           - Clarity security audit (0.02 STX)");
  console.log("=".repeat(80) + "\n");
});
