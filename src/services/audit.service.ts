import { getOpenRouter } from "./openrouter.service";

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

export interface VulnerabilityFinding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  location?: string;
  recommendation: string;
}

export interface FunctionAnalysis {
  red: { functions: string[]; analysis: string };
  orange: { functions: string[]; analysis: string };
  yellow: { functions: string[]; analysis: string };
  green: { functions: string[]; analysis: string };
}

export interface AnalysisResult {
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
}

export async function performSecurityAudit(
  contractCode: string,
  contractName: string,
  contractIdentifier?: string
): Promise<AnalysisResult> {
  console.log(`  Performing comprehensive analysis for ${contractName}...`);

  const openrouter = getOpenRouter();
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
      throw new Error("No content returned from AI");
    }
  } catch (parseError) {
    console.error(`  JSON parse error:`, parseError);
    analysis = {
      overallRisk: "high",
      generalConcept: "Analysis encountered errors",
      functionAnalysis: {
        red: { functions: [], analysis: "" },
        orange: { functions: [], analysis: "" },
        yellow: { functions: [], analysis: "" },
        green: { functions: [], analysis: "" }
      },
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
    functionAnalysis: analysis.functionAnalysis || {
      red: { functions: [], analysis: "" },
      orange: { functions: [], analysis: "" },
      yellow: { functions: [], analysis: "" },
      green: { functions: [], analysis: "" }
    },
    vulnerabilities: analysis.vulnerabilities || [],
    traitFunctions: analysis.traitFunctions || "",
    asContractFunctions: analysis.asContractFunctions || "",
    edgeCases: analysis.edgeCases || "",
    recommendations: analysis.recommendations || "",
    summary: analysis.summary || "Analysis completed",
  };
}
