// sBTC Analytics Service - Whale Flows and Farming Opportunities
import { trackedFetch } from "./analytics.service";
import { getOpenRouter } from "./openrouter.service";
import { teneroFetch } from "./tenero/client";
import { TrendingPool } from "./tenero/types";

const SBTC_CONTRACT = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token";
const HIRO_BASE_URL = "https://api.mainnet.hiro.so";

// Result types
export interface SbtcWhaleFlow {
  direction: "in" | "out";
  amount: string;
  amountBtc: number;
  sender: string;
  recipient: string;
  txId: string;
  blockTime: string;
  isWhale: boolean;
}

export interface SbtcWhaleFlowsAnalysis {
  timeframe: string;
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
  whaleTransactions: SbtcWhaleFlow[];
  summary: {
    largestInflow: number;
    largestOutflow: number;
    uniqueWhales: number;
    avgTransactionSize: number;
  };
  sentiment: "bullish" | "bearish" | "neutral";
  analysis: string;
}

export interface SbtcFarmingOpportunity {
  protocol: string;
  poolName: string;
  poolId: string;
  apy: number;
  tvl: number;
  risk: "low" | "medium" | "high";
  minDeposit: number;
  description: string;
}

export interface SbtcFarmingAnalysis {
  userBalance: number;
  opportunities: SbtcFarmingOpportunity[];
  recommendation: {
    bestYield: SbtcFarmingOpportunity | null;
    safestOption: SbtcFarmingOpportunity | null;
    strategy: string;
  };
  projectedReturns: {
    conservative: { apy: number; monthly: number; yearly: number };
    moderate: { apy: number; monthly: number; yearly: number };
    aggressive: { apy: number; monthly: number; yearly: number };
  };
  analysis: string;
}

// Fetch sBTC transfer events from Hiro API
interface HiroSbtcEvent {
  tx_id: string;
  event_index: number;
  event_type: string;
  asset: {
    asset_event_type: string;
    asset_id: string;
    sender: string;
    recipient: string;
    amount: string;
  };
  block_height: number;
  block_time?: number;
}

interface HiroEventsResponse {
  limit: number;
  offset: number;
  total: number;
  results: HiroSbtcEvent[];
}

async function fetchSbtcTransferEvents(
  hours: number = 24,
  limit: number = 100
): Promise<HiroSbtcEvent[]> {
  const url = `${HIRO_BASE_URL}/extended/v1/tokens/ft/${SBTC_CONTRACT}/events?limit=${limit}`;

  const response = await trackedFetch("/api/sbtc/whale-flows", url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sBTC events: ${response.statusText}`);
  }

  const data = await response.json() as HiroEventsResponse;

  // Filter by time if block_time is available
  const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
  return (data.results || []).filter(event => {
    if (!event.block_time) return true;
    return event.block_time * 1000 >= cutoffTime;
  });
}

// Whale threshold: 0.1 BTC (10,000,000 sats)
const WHALE_THRESHOLD_SATS = 10000000;

function satsToBtc(sats: string | number): number {
  return Number(sats) / 100000000;
}

export async function analyzeWhaleFlows(hours: number = 24): Promise<SbtcWhaleFlowsAnalysis> {
  // Validate hours
  const validHours = Math.min(Math.max(hours, 1), 168); // 1 hour to 7 days

  // Fetch sBTC transfer events
  const events = await fetchSbtcTransferEvents(validHours, 200);

  // Process transfers
  const transfers: SbtcWhaleFlow[] = [];
  let totalInflow = 0;
  let totalOutflow = 0;
  const uniqueAddresses = new Set<string>();

  for (const event of events) {
    if (event.asset?.asset_event_type !== "transfer") continue;

    const amount = event.asset.amount || "0";
    const amountNum = Number(amount);
    const amountBtc = satsToBtc(amount);
    const isWhale = amountNum >= WHALE_THRESHOLD_SATS;

    // Track unique whales
    if (isWhale) {
      uniqueAddresses.add(event.asset.sender);
      uniqueAddresses.add(event.asset.recipient);
    }

    // Determine direction (simplified: any transfer counts as flow)
    const flow: SbtcWhaleFlow = {
      direction: "out", // From sender's perspective
      amount,
      amountBtc,
      sender: event.asset.sender,
      recipient: event.asset.recipient,
      txId: event.tx_id,
      blockTime: event.block_time ? new Date(event.block_time * 1000).toISOString() : "unknown",
      isWhale,
    };

    transfers.push(flow);
    totalOutflow += amountBtc;
    totalInflow += amountBtc; // Same amount flows in to recipient
  }

  // Filter whale transactions only
  const whaleTransactions = transfers.filter(t => t.isWhale);

  // Calculate summary
  const largestInflow = Math.max(...whaleTransactions.map(t => t.amountBtc), 0);
  const largestOutflow = Math.max(...whaleTransactions.map(t => t.amountBtc), 0);
  const avgSize = whaleTransactions.length > 0
    ? whaleTransactions.reduce((sum, t) => sum + t.amountBtc, 0) / whaleTransactions.length
    : 0;

  // Build summary for AI analysis
  const summary = `
sBTC Whale Flow Analysis (Last ${validHours} hours):

Total Transactions: ${transfers.length}
Whale Transactions (>0.1 BTC): ${whaleTransactions.length}
Unique Whale Addresses: ${uniqueAddresses.size}

Volume Metrics:
- Total sBTC Moved: ${(totalOutflow).toFixed(4)} BTC
- Largest Transaction: ${largestInflow.toFixed(4)} BTC
- Average Whale Transaction: ${avgSize.toFixed(4)} BTC

Recent Whale Movements:
${whaleTransactions.slice(0, 10).map(t =>
  `- ${t.amountBtc.toFixed(4)} BTC: ${t.sender.slice(0, 10)}... → ${t.recipient.slice(0, 10)}...`
).join("\n")}

Analyze the whale activity and provide:
1. Overall sentiment (bullish/bearish/neutral)
2. Brief analysis of what this activity suggests
`;

  const openrouter = getOpenRouter();
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are an sBTC (synthetic Bitcoin on Stacks) analyst specializing in whale movements.

Analyze whale flows to determine:
- Market sentiment from large holder behavior
- Accumulation vs distribution patterns
- Potential price impact

Respond in valid JSON format only:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "analysis": "Brief analysis explaining the sentiment and implications"
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

  let parsed: { sentiment: "bullish" | "bearish" | "neutral"; analysis: string };

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
      sentiment: "neutral",
      analysis: "Insufficient data for comprehensive analysis.",
    };
  }

  // Validate sentiment
  const validSentiments = ["bullish", "bearish", "neutral"];
  if (!validSentiments.includes(parsed.sentiment)) {
    parsed.sentiment = "neutral";
  }

  return {
    timeframe: `${validHours}h`,
    totalInflow: Number(totalInflow.toFixed(8)),
    totalOutflow: Number(totalOutflow.toFixed(8)),
    netFlow: 0, // Same amount in both directions for transfers
    whaleTransactions: whaleTransactions.slice(0, 20),
    summary: {
      largestInflow,
      largestOutflow,
      uniqueWhales: uniqueAddresses.size,
      avgTransactionSize: Number(avgSize.toFixed(8)),
    },
    sentiment: parsed.sentiment,
    analysis: parsed.analysis,
  };
}

export async function scanFarmingOpportunities(userBalanceSats?: number): Promise<SbtcFarmingAnalysis> {
  // Fetch trending pools from Tenero to find sBTC pools
  const trendingPools = await teneroFetch<TrendingPool[]>(
    "/pools?trending=1d&limit=50",
    "stacks",
    "/api/sbtc/farming-scanner"
  );

  // Filter for sBTC-related pools
  const sbtcPools = trendingPools.filter(pool =>
    pool.base_token_address?.toLowerCase().includes("sbtc") ||
    pool.quote_token_address?.toLowerCase().includes("sbtc") ||
    pool.base_token?.symbol?.toLowerCase().includes("sbtc") ||
    pool.quote_token?.symbol?.toLowerCase().includes("sbtc") ||
    pool.pool_id?.toLowerCase().includes("sbtc")
  );

  // Map to farming opportunities
  const opportunities: SbtcFarmingOpportunity[] = sbtcPools.slice(0, 10).map(pool => {
    // Estimate risk based on TVL and volume
    let risk: "low" | "medium" | "high" = "medium";
    const tvl = pool.liquidity_usd || 0;
    if (tvl > 1000000) risk = "low";
    else if (tvl < 100000) risk = "high";

    // Estimate APY from volume/TVL ratio (simplified)
    const volume24h = pool.metrics?.volume_1d_usd || 0;
    const estimatedApy = tvl > 0 ? (volume24h / tvl) * 365 * 0.003 * 100 : 0; // 0.3% fee assumption

    return {
      protocol: pool.pool_platform || "Unknown DEX",
      poolName: `${pool.base_token?.symbol || "?"}-${pool.quote_token?.symbol || "?"}`,
      poolId: pool.pool_id || "",
      apy: Number(estimatedApy.toFixed(2)),
      tvl: tvl,
      risk,
      minDeposit: 0,
      description: `Liquidity pool on ${pool.pool_platform || "Unknown"} with ${tvl.toLocaleString()} USD TVL`,
    };
  });

  // Sort by APY
  opportunities.sort((a, b) => b.apy - a.apy);

  // Calculate user balance in BTC
  const userBalanceBtc = userBalanceSats ? satsToBtc(userBalanceSats) : 0;

  // Build summary for AI
  const summary = `
sBTC Farming Opportunities Analysis:

User sBTC Balance: ${userBalanceBtc.toFixed(8)} BTC (${userBalanceSats || 0} sats)

Available Opportunities:
${opportunities.map(o =>
  `- ${o.poolName} (${o.protocol}): APY ~${o.apy}%, TVL $${o.tvl.toLocaleString()}, Risk: ${o.risk}`
).join("\n")}

Provide:
1. Recommendation for best yield opportunity
2. Recommendation for safest option
3. Optimal strategy given the user's balance
4. Projected returns for conservative, moderate, and aggressive strategies
`;

  const openrouter = getOpenRouter();
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are an sBTC DeFi yield farming strategist.

Analyze farming opportunities and recommend optimal strategies based on:
- User's balance size
- Risk tolerance options
- APY vs TVL (higher TVL = safer)
- Protocol reputation

Respond in valid JSON format only:
{
  "bestYieldIndex": number | null,
  "safestOptionIndex": number | null,
  "strategy": "Strategic recommendation",
  "projectedReturns": {
    "conservative": { "apy": number, "monthly": number, "yearly": number },
    "moderate": { "apy": number, "monthly": number, "yearly": number },
    "aggressive": { "apy": number, "monthly": number, "yearly": number }
  },
  "analysis": "Detailed analysis"
}

Use indices (0-based) to reference opportunities from the list.`,
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

  let parsed: {
    bestYieldIndex: number | null;
    safestOptionIndex: number | null;
    strategy: string;
    projectedReturns: {
      conservative: { apy: number; monthly: number; yearly: number };
      moderate: { apy: number; monthly: number; yearly: number };
      aggressive: { apy: number; monthly: number; yearly: number };
    };
    analysis: string;
  };

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
    // Default fallback
    const bestApy = opportunities.length > 0 ? opportunities[0].apy : 5;
    parsed = {
      bestYieldIndex: opportunities.length > 0 ? 0 : null,
      safestOptionIndex: opportunities.findIndex(o => o.risk === "low"),
      strategy: "Diversify across multiple pools to balance risk and reward.",
      projectedReturns: {
        conservative: { apy: bestApy * 0.5, monthly: 0, yearly: 0 },
        moderate: { apy: bestApy * 0.75, monthly: 0, yearly: 0 },
        aggressive: { apy: bestApy, monthly: 0, yearly: 0 },
      },
      analysis: "Consider your risk tolerance when selecting farming strategies.",
    };
  }

  // Calculate actual projected returns based on user balance
  const calculateReturns = (apy: number) => ({
    apy,
    monthly: userBalanceBtc * (apy / 100 / 12),
    yearly: userBalanceBtc * (apy / 100),
  });

  return {
    userBalance: userBalanceBtc,
    opportunities,
    recommendation: {
      bestYield: parsed.bestYieldIndex !== null && parsed.bestYieldIndex >= 0 && parsed.bestYieldIndex < opportunities.length
        ? opportunities[parsed.bestYieldIndex]
        : null,
      safestOption: parsed.safestOptionIndex !== null && parsed.safestOptionIndex >= 0 && parsed.safestOptionIndex < opportunities.length
        ? opportunities[parsed.safestOptionIndex]
        : opportunities.find(o => o.risk === "low") || null,
      strategy: parsed.strategy,
    },
    projectedReturns: {
      conservative: calculateReturns(parsed.projectedReturns?.conservative?.apy || 3),
      moderate: calculateReturns(parsed.projectedReturns?.moderate?.apy || 8),
      aggressive: calculateReturns(parsed.projectedReturns?.aggressive?.apy || 15),
    },
    analysis: parsed.analysis,
  };
}
