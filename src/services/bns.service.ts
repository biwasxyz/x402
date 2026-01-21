// BNS Domain Valuation and Portfolio Analysis Service
import { fetchBnsName, fetchAddressNames, HiroApiError } from "./hiro/client";
import { getOpenRouter } from "./openrouter.service";
import { BnsNameInfo } from "./hiro/types";

// Result types
export interface BnsValuation {
  name: string;
  estimatedValue: {
    low: number;
    mid: number;
    high: number;
    currency: string;
  };
  factors: {
    length: number;
    isNumeric: boolean;
    isWord: boolean;
    hasSpecialChars: boolean;
    category: string;
  };
  comparables: string[];
  analysis: string;
  confidence: number;
}

export interface BnsPortfolioAnalysis {
  address: string;
  totalNames: number;
  estimatedPortfolioValue: {
    low: number;
    mid: number;
    high: number;
    currency: string;
  };
  names: Array<{
    name: string;
    category: string;
    estimatedValue: number;
  }>;
  insights: string[];
  recommendation: string;
}

// Domain category detection
function categorizeNameSync(name: string): string {
  const cleanName = name.replace(/\.btc$/, "").toLowerCase();

  // Numeric patterns
  if (/^\d+$/.test(cleanName)) {
    if (cleanName.length <= 3) return "premium-numeric";
    if (cleanName.length <= 5) return "numeric";
    return "long-numeric";
  }

  // Single character
  if (cleanName.length === 1) return "single-char";

  // Two character
  if (cleanName.length === 2) return "two-char";

  // Three character
  if (cleanName.length === 3) return "three-char";

  // Common words/brand potential
  const commonWords = ["bitcoin", "stacks", "crypto", "defi", "nft", "dao", "web3", "meta", "ai", "pay"];
  if (commonWords.some(w => cleanName.includes(w))) return "keyword";

  // Short names are generally more valuable
  if (cleanName.length <= 5) return "short";
  if (cleanName.length <= 8) return "medium";

  return "standard";
}

function calculateBaseValue(name: string): { low: number; mid: number; high: number } {
  const cleanName = name.replace(/\.btc$/, "").toLowerCase();
  const category = categorizeNameSync(name);

  // Base values in STX
  const valueRanges: Record<string, { low: number; mid: number; high: number }> = {
    "single-char": { low: 5000, mid: 15000, high: 50000 },
    "two-char": { low: 2000, mid: 5000, high: 15000 },
    "three-char": { low: 500, mid: 1500, high: 5000 },
    "premium-numeric": { low: 1000, mid: 3000, high: 10000 },
    "numeric": { low: 100, mid: 300, high: 1000 },
    "long-numeric": { low: 10, mid: 30, high: 100 },
    "keyword": { low: 200, mid: 800, high: 3000 },
    "short": { low: 50, mid: 150, high: 500 },
    "medium": { low: 20, mid: 50, high: 150 },
    "standard": { low: 5, mid: 15, high: 50 },
  };

  return valueRanges[category] || valueRanges.standard;
}

export async function valuateBnsName(name: string): Promise<BnsValuation> {
  const cleanName = name.replace(/\.btc$/, "").toLowerCase();

  // Validate name format
  if (!cleanName || cleanName.length === 0) {
    throw new Error("Invalid BNS name");
  }

  // Check if name exists
  const nameInfo = await fetchBnsName(cleanName, "/api/bns/valuation");

  // Calculate factors
  const factors = {
    length: cleanName.length,
    isNumeric: /^\d+$/.test(cleanName),
    isWord: /^[a-z]+$/.test(cleanName),
    hasSpecialChars: /[^a-z0-9]/.test(cleanName),
    category: categorizeNameSync(cleanName),
  };

  const baseValue = calculateBaseValue(cleanName);

  // Build summary for AI
  const summary = `
BNS Domain Valuation Request:
Name: ${cleanName}.btc
Status: ${nameInfo ? "Registered" : "Available"}
${nameInfo ? `Owner: ${nameInfo.address}` : ""}
${nameInfo ? `Expires Block: ${nameInfo.expire_block}` : ""}

Domain Characteristics:
- Length: ${factors.length} characters
- Category: ${factors.category}
- Is Numeric: ${factors.isNumeric}
- Is Pure Word: ${factors.isWord}
- Has Special Characters: ${factors.hasSpecialChars}

Base Valuation Range (STX):
- Low: ${baseValue.low}
- Mid: ${baseValue.mid}
- High: ${baseValue.high}

Please provide:
1. Refined valuation based on market factors
2. List of 3-5 comparable domain names
3. Brief analysis of the name's value drivers
`;

  const openrouter = getOpenRouter();
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a BNS (Bitcoin Name System) domain valuation expert for the Stacks blockchain.

Valuate domains based on:
- Length (shorter = more valuable)
- Memorability and pronounceability
- Keyword relevance (crypto, bitcoin, defi terms)
- Numeric patterns (repeating digits, sequences)
- Brand potential
- Comparable sales data

Respond in valid JSON format only:
{
  "valuationAdjustment": { "low": number, "mid": number, "high": number },
  "comparables": ["name1.btc", "name2.btc", "name3.btc"],
  "analysis": "Brief analysis of value drivers",
  "confidence": 0.0-1.0
}`,
      },
      {
        role: "user",
        content: summary,
      },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Failed to get valuation from AI");
  }

  // Parse AI response
  let parsed: {
    valuationAdjustment: { low: number; mid: number; high: number };
    comparables: string[];
    analysis: string;
    confidence: number;
  };

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    // Fallback to base values
    parsed = {
      valuationAdjustment: baseValue,
      comparables: [],
      analysis: "Valuation based on standard domain metrics.",
      confidence: 0.5,
    };
  }

  return {
    name: `${cleanName}.btc`,
    estimatedValue: {
      low: parsed.valuationAdjustment?.low || baseValue.low,
      mid: parsed.valuationAdjustment?.mid || baseValue.mid,
      high: parsed.valuationAdjustment?.high || baseValue.high,
      currency: "STX",
    },
    factors,
    comparables: parsed.comparables || [],
    analysis: parsed.analysis || "Standard valuation based on domain characteristics.",
    confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
  };
}

export async function analyzeBnsPortfolio(address: string): Promise<BnsPortfolioAnalysis> {
  // Validate address format
  if (!address.match(/^S[PM][A-Z0-9]{38,}$/i)) {
    throw new Error("Invalid Stacks address format");
  }

  // Fetch all names owned by address
  const names = await fetchAddressNames(address, "/api/bns/portfolio");

  if (names.length === 0) {
    return {
      address,
      totalNames: 0,
      estimatedPortfolioValue: { low: 0, mid: 0, high: 0, currency: "STX" },
      names: [],
      insights: ["This address does not own any BNS domains."],
      recommendation: "Consider acquiring BNS domains for identity and potential value appreciation.",
    };
  }

  // Calculate individual valuations
  const nameValuations = names.map(name => {
    const baseValue = calculateBaseValue(name);
    const category = categorizeNameSync(name);
    return {
      name,
      category,
      estimatedValue: baseValue.mid,
      valueRange: baseValue,
    };
  });

  // Calculate portfolio totals
  const portfolioValue = nameValuations.reduce(
    (acc, nv) => ({
      low: acc.low + nv.valueRange.low,
      mid: acc.mid + nv.valueRange.mid,
      high: acc.high + nv.valueRange.high,
    }),
    { low: 0, mid: 0, high: 0 }
  );

  // Build summary for AI analysis
  const summary = `
BNS Portfolio Analysis for: ${address}

Total Domains: ${names.length}

Domain List:
${nameValuations.map(nv => `- ${nv.name}: ${nv.category} (est. ${nv.estimatedValue} STX)`).join("\n")}

Estimated Portfolio Value (STX):
- Low: ${portfolioValue.low}
- Mid: ${portfolioValue.mid}
- High: ${portfolioValue.high}

Category Distribution:
${Object.entries(
  nameValuations.reduce((acc, nv) => {
    acc[nv.category] = (acc[nv.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
).map(([cat, count]) => `- ${cat}: ${count}`).join("\n")}

Please provide:
1. 3-5 key insights about this portfolio
2. A recommendation for the portfolio owner
`;

  const openrouter = getOpenRouter();
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a BNS portfolio analyst for the Stacks blockchain.

Analyze domain portfolios and provide:
- Insights about portfolio composition and value
- Recommendations for optimization (hold, sell, acquire more)
- Market timing considerations

Respond in valid JSON format only:
{
  "insights": ["insight1", "insight2", "insight3"],
  "recommendation": "Strategic recommendation for the portfolio owner"
}`,
      },
      {
        role: "user",
        content: summary,
      },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  let parsed: { insights: string[]; recommendation: string };

  try {
    if (content && typeof content === "string") {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } else {
      throw new Error("Invalid response");
    }
  } catch (e) {
    parsed = {
      insights: ["Portfolio contains diverse BNS domains."],
      recommendation: "Hold quality domains and consider acquiring more short names.",
    };
  }

  return {
    address,
    totalNames: names.length,
    estimatedPortfolioValue: {
      ...portfolioValue,
      currency: "STX",
    },
    names: nameValuations.map(nv => ({
      name: nv.name,
      category: nv.category,
      estimatedValue: nv.estimatedValue,
    })),
    insights: parsed.insights || [],
    recommendation: parsed.recommendation || "Continue building your BNS portfolio.",
  };
}
