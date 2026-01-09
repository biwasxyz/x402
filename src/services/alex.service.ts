// Alex Lab Service - AI-enhanced DEX analytics
import { getOpenRouter } from "./openrouter.service";
import { fetchAlexPools, fetchTokenPrices, AlexPoolData } from "./alex/client";

// ============================================================================
// Types
// ============================================================================

export interface SwapOptimizerRequest {
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
}

export interface SwapRoute {
  path: string[];
  pools: string[];
  expectedOutput: number;
  priceImpact: number;
  totalFees: number;
  effectivePrice: number;
}

export interface SwapOptimizerResult {
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  routes: SwapRoute[];
  bestRoute: SwapRoute | null;
  analysis: SwapAnalysis;
}

export interface SwapAnalysis {
  recommendation: string;
  executionStrategy: "single" | "split" | "wait";
  splitSuggestion?: { route: number; percentage: number }[];
  riskLevel: "low" | "medium" | "high";
  warnings: string[];
  insights: string[];
}

export interface PoolRiskRequest {
  poolId: string;
  investmentAmount?: number;
}

export interface PoolRiskResult {
  pool: AlexPoolData;
  riskMetrics: PoolRiskMetrics;
  analysis: PoolRiskAnalysis;
}

export interface PoolRiskMetrics {
  impermanentLossScenarios: {
    priceChange: number;
    ilPercent: number;
    ilUsd: number;
  }[];
  volatilityScore: number;
  liquidityDepth: number;
  volumeToTvlRatio: number;
  feeApy: number;
}

export interface PoolRiskAnalysis {
  riskRating: "very_low" | "low" | "medium" | "high" | "very_high";
  sustainabilityScore: number;
  recommendation: "strong_buy" | "buy" | "hold" | "reduce" | "exit";
  strengths: string[];
  risks: string[];
  optimalHoldingPeriod: string;
}

export interface ArbitrageScanResult {
  opportunities: ArbitrageOpportunity[];
  marketEfficiency: number;
  analysis: ArbitrageAnalysis;
}

export interface ArbitrageOpportunity {
  token: string;
  buyPool: string;
  sellPool: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  estimatedProfit: number;
  gasEstimate: number;
  netProfit: number;
  confidence: number;
}

export interface ArbitrageAnalysis {
  topOpportunities: string[];
  marketCondition: "efficient" | "moderate_inefficiency" | "high_inefficiency";
  riskAssessment: string;
  executionAdvice: string[];
}

export interface MarketRegimeResult {
  regime: "trending_up" | "trending_down" | "ranging" | "volatile" | "quiet";
  confidence: number;
  metrics: MarketMetrics;
  analysis: MarketRegimeAnalysis;
}

export interface MarketMetrics {
  totalVolume24h: number;
  totalTvl: number;
  volumeChange: number;
  avgPriceChange: number;
  volatilityIndex: number;
  activePools: number;
}

export interface MarketRegimeAnalysis {
  summary: string;
  tradingRecommendation: string;
  riskLevel: "low" | "medium" | "high";
  opportunities: string[];
  warnings: string[];
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * AI Swap Route Optimizer
 * Analyzes all possible routes and recommends optimal execution strategy
 */
export async function optimizeSwap(request: SwapOptimizerRequest): Promise<SwapOptimizerResult> {
  const { tokenIn, tokenOut, amountIn } = request;

  // Fetch pools and prices
  const [pools, prices] = await Promise.all([
    fetchAlexPools("/api/alex/swap-optimizer"),
    fetchTokenPrices("/api/alex/swap-optimizer"),
  ]);

  // Find direct and indirect routes
  const routes = findSwapRoutes(tokenIn, tokenOut, amountIn, pools, prices);

  // Calculate metrics for each route
  const calculatedRoutes = routes.map((route) => calculateRouteMetrics(route, amountIn, pools, prices));

  // Sort by expected output (best first)
  calculatedRoutes.sort((a, b) => b.expectedOutput - a.expectedOutput);

  const bestRoute = calculatedRoutes[0] || null;

  // Build summary for AI
  const summary = buildSwapSummary(tokenIn, tokenOut, amountIn, calculatedRoutes, prices);

  // AI analysis
  const analysis = await analyzeSwapWithAI(summary);

  return {
    tokenIn,
    tokenOut,
    amountIn,
    routes: calculatedRoutes.slice(0, 5), // Top 5 routes
    bestRoute,
    analysis,
  };
}

/**
 * LP Position Risk Analyzer
 * Calculates impermanent loss and assesses pool sustainability
 */
export async function analyzePoolRisk(request: PoolRiskRequest): Promise<PoolRiskResult> {
  const { poolId, investmentAmount = 1000 } = request;

  // Fetch pools
  const pools = await fetchAlexPools("/api/alex/pool-risk");
  const pool = pools.find((p) => p.pool_id === poolId || p.pool_address === poolId);

  if (!pool) {
    throw new Error(`Pool not found: ${poolId}`);
  }

  // Calculate risk metrics
  const riskMetrics = calculatePoolRiskMetrics(pool, investmentAmount);

  // Build summary for AI
  const summary = buildPoolRiskSummary(pool, riskMetrics, investmentAmount);

  // AI analysis
  const analysis = await analyzePoolRiskWithAI(summary);

  return {
    pool,
    riskMetrics,
    analysis,
  };
}

/**
 * Cross-Pool Arbitrage Scanner
 * Finds price discrepancies across Alex pools
 */
export async function scanArbitrage(): Promise<ArbitrageScanResult> {
  // Fetch all pools and prices
  const [pools, prices] = await Promise.all([
    fetchAlexPools("/api/alex/arbitrage-scan"),
    fetchTokenPrices("/api/alex/arbitrage-scan"),
  ]);

  // Find arbitrage opportunities
  const opportunities = findArbitrageOpportunities(pools, prices);

  // Calculate market efficiency
  const marketEfficiency = calculateMarketEfficiency(opportunities);

  // Build summary for AI
  const summary = buildArbitrageSummary(opportunities, marketEfficiency);

  // AI analysis
  const analysis = await analyzeArbitrageWithAI(summary);

  return {
    opportunities: opportunities.slice(0, 10), // Top 10 opportunities
    marketEfficiency,
    analysis,
  };
}

/**
 * Market Regime Detector
 * Analyzes overall market conditions on Alex DEX
 */
export async function detectMarketRegime(): Promise<MarketRegimeResult> {
  // Fetch market data
  const pools = await fetchAlexPools("/api/alex/market-regime");

  // Calculate market metrics
  const metrics = calculateMarketMetrics(pools);

  // Determine regime
  const regime = classifyRegime(metrics);

  // Build summary for AI
  const summary = buildMarketRegimeSummary(metrics, regime);

  // AI analysis
  const analysis = await analyzeMarketRegimeWithAI(summary);

  return {
    regime: regime.type,
    confidence: regime.confidence,
    metrics,
    analysis,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function findSwapRoutes(
  tokenIn: string,
  tokenOut: string,
  _amountIn: number,
  pools: AlexPoolData[],
  _prices: Map<string, number>
): { path: string[]; pools: string[] }[] {
  const routes: { path: string[]; pools: string[] }[] = [];
  const tokenInUpper = tokenIn.toUpperCase();
  const tokenOutUpper = tokenOut.toUpperCase();

  // Direct routes
  for (const pool of pools) {
    const t0 = pool.token_0_symbol?.toUpperCase();
    const t1 = pool.token_1_symbol?.toUpperCase();

    if ((t0 === tokenInUpper && t1 === tokenOutUpper) || (t1 === tokenInUpper && t0 === tokenOutUpper)) {
      routes.push({
        path: [tokenIn, tokenOut],
        pools: [pool.pool_address],
      });
    }
  }

  // Two-hop routes through common intermediaries
  const intermediaries = ["STX", "ALEX", "USDT", "sBTC"];

  for (const mid of intermediaries) {
    if (mid === tokenInUpper || mid === tokenOutUpper) continue;

    let firstPool: AlexPoolData | null = null;
    let secondPool: AlexPoolData | null = null;

    for (const pool of pools) {
      const t0 = pool.token_0_symbol?.toUpperCase();
      const t1 = pool.token_1_symbol?.toUpperCase();

      // First hop: tokenIn -> mid
      if ((t0 === tokenInUpper && t1 === mid) || (t1 === tokenInUpper && t0 === mid)) {
        firstPool = pool;
      }

      // Second hop: mid -> tokenOut
      if ((t0 === mid && t1 === tokenOutUpper) || (t1 === mid && t0 === tokenOutUpper)) {
        secondPool = pool;
      }
    }

    if (firstPool && secondPool) {
      routes.push({
        path: [tokenIn, mid, tokenOut],
        pools: [firstPool.pool_address, secondPool.pool_address],
      });
    }
  }

  return routes;
}

function calculateRouteMetrics(
  route: { path: string[]; pools: string[] },
  amountIn: number,
  pools: AlexPoolData[],
  prices: Map<string, number>
): SwapRoute {
  let currentAmount = amountIn;
  let totalFees = 0;
  let totalPriceImpact = 0;

  for (const poolId of route.pools) {
    const pool = pools.find((p) => p.pool_address === poolId);
    if (!pool) continue;

    const feeRate = pool.fee_rate || 0.003; // Default 0.3%
    const fee = currentAmount * feeRate;
    totalFees += fee;
    currentAmount -= fee;

    // Simplified price impact calculation
    const poolTvl = pool.tvl_usd || 100000;
    const tradeValue = currentAmount * (prices.get(route.path[0].toUpperCase()) || 1);
    const priceImpact = (tradeValue / poolTvl) * 0.5; // Simplified impact
    totalPriceImpact += priceImpact;
  }

  const inputPrice = prices.get(route.path[0].toUpperCase()) || 1;
  const outputPrice = prices.get(route.path[route.path.length - 1].toUpperCase()) || 1;
  const expectedOutput = (currentAmount * inputPrice * (1 - totalPriceImpact)) / outputPrice;

  return {
    path: route.path,
    pools: route.pools,
    expectedOutput,
    priceImpact: totalPriceImpact * 100,
    totalFees,
    effectivePrice: amountIn / expectedOutput,
  };
}

function calculatePoolRiskMetrics(pool: AlexPoolData, investment: number): PoolRiskMetrics {
  // Calculate impermanent loss scenarios
  const ilScenarios = [
    { priceChange: -50, ilPercent: 5.72 },
    { priceChange: -25, ilPercent: 1.03 },
    { priceChange: 0, ilPercent: 0 },
    { priceChange: 25, ilPercent: 0.62 },
    { priceChange: 50, ilPercent: 2.02 },
    { priceChange: 100, ilPercent: 5.72 },
    { priceChange: 200, ilPercent: 13.4 },
  ].map((s) => ({
    ...s,
    ilUsd: (s.ilPercent / 100) * investment,
  }));

  // Volume to TVL ratio (higher = more trading activity)
  const volumeToTvl = pool.tvl_usd > 0 ? pool.volume_24h_usd / pool.tvl_usd : 0;

  // Fee APY estimation
  const dailyFees = pool.volume_24h_usd * (pool.fee_rate || 0.003);
  const feeApy = pool.tvl_usd > 0 ? (dailyFees / pool.tvl_usd) * 365 * 100 : 0;

  // Volatility score (simplified - based on price ratio)
  const priceRatio = pool.token_0_price_usd / (pool.token_1_price_usd || 1);
  const volatilityScore = Math.min(100, Math.abs(Math.log(priceRatio)) * 20);

  return {
    impermanentLossScenarios: ilScenarios,
    volatilityScore,
    liquidityDepth: pool.tvl_usd,
    volumeToTvlRatio: volumeToTvl,
    feeApy,
  };
}

function findArbitrageOpportunities(pools: AlexPoolData[], _prices: Map<string, number>): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  // Group pools by token pairs
  const tokenPricesByPool = new Map<string, { pool: AlexPoolData; price: number }[]>();

  for (const pool of pools) {
    const token0 = pool.token_0_symbol?.toUpperCase();
    const token1 = pool.token_1_symbol?.toUpperCase();
    if (!token0 || !token1) continue;

    const price0 = pool.token_0_price_usd;
    const price1 = pool.token_1_price_usd;
    if (!price0 || !price1) continue;

    // Price of token0 in terms of token1
    const impliedPrice = price0 / price1;

    const key = [token0, token1].sort().join("-");
    if (!tokenPricesByPool.has(key)) {
      tokenPricesByPool.set(key, []);
    }
    tokenPricesByPool.get(key)!.push({ pool, price: impliedPrice });
  }

  // Find price discrepancies
  for (const [pair, poolPrices] of tokenPricesByPool) {
    if (poolPrices.length < 2) continue;

    poolPrices.sort((a, b) => a.price - b.price);
    const lowest = poolPrices[0];
    const highest = poolPrices[poolPrices.length - 1];

    const spreadPercent = ((highest.price - lowest.price) / lowest.price) * 100;

    if (spreadPercent > 0.5) {
      // Minimum 0.5% spread
      const estimatedProfit = spreadPercent - 0.6; // Subtract typical fees
      const gasEstimate = 0.1; // ~0.1 STX gas

      opportunities.push({
        token: pair,
        buyPool: lowest.pool.pool_address,
        sellPool: highest.pool.pool_address,
        buyPrice: lowest.price,
        sellPrice: highest.price,
        spreadPercent,
        estimatedProfit: Math.max(0, estimatedProfit),
        gasEstimate,
        netProfit: Math.max(0, estimatedProfit - gasEstimate),
        confidence: Math.min(100, spreadPercent * 10),
      });
    }
  }

  return opportunities.sort((a, b) => b.netProfit - a.netProfit);
}

function calculateMarketEfficiency(opportunities: ArbitrageOpportunity[]): number {
  if (opportunities.length === 0) return 100;

  const avgSpread = opportunities.reduce((sum, o) => sum + o.spreadPercent, 0) / opportunities.length;

  // Higher efficiency = fewer/smaller arbitrage opportunities
  return Math.max(0, 100 - avgSpread * 5);
}

function calculateMarketMetrics(pools: AlexPoolData[]): MarketMetrics {
  const totalVolume24h = pools.reduce((sum, p) => sum + (p.volume_24h_usd || 0), 0);
  const totalTvl = pools.reduce((sum, p) => sum + (p.tvl_usd || 0), 0);
  const activePools = pools.filter((p) => (p.volume_24h_usd || 0) > 100).length;

  // Simplified metrics
  const volumeChange = 0; // Would need historical data
  const avgPriceChange = 0; // Would need historical data
  const volatilityIndex = (totalVolume24h / totalTvl) * 100;

  return {
    totalVolume24h,
    totalTvl,
    volumeChange,
    avgPriceChange,
    volatilityIndex,
    activePools,
  };
}

function classifyRegime(metrics: MarketMetrics): { type: MarketRegimeResult["regime"]; confidence: number } {
  const { volatilityIndex, volumeChange } = metrics;

  if (volatilityIndex > 20) {
    return { type: "volatile", confidence: 80 };
  } else if (volumeChange > 50) {
    return { type: "trending_up", confidence: 70 };
  } else if (volumeChange < -30) {
    return { type: "trending_down", confidence: 70 };
  } else if (volatilityIndex < 5) {
    return { type: "quiet", confidence: 75 };
  } else {
    return { type: "ranging", confidence: 65 };
  }
}

// ============================================================================
// AI Analysis Functions
// ============================================================================

function buildSwapSummary(
  tokenIn: string,
  tokenOut: string,
  amountIn: number,
  routes: SwapRoute[],
  prices: Map<string, number>
): string {
  const inputPrice = prices.get(tokenIn.toUpperCase()) || 0;
  const outputPrice = prices.get(tokenOut.toUpperCase()) || 0;

  return `
SWAP ANALYSIS REQUEST
=====================
Input: ${amountIn} ${tokenIn} ($${(amountIn * inputPrice).toFixed(2)})
Output Token: ${tokenOut} (price: $${outputPrice.toFixed(4)})

Available Routes (${routes.length} found):
${routes
  .slice(0, 5)
  .map(
    (r, i) => `
Route ${i + 1}: ${r.path.join(" → ")}
- Expected Output: ${r.expectedOutput.toFixed(4)} ${tokenOut}
- Price Impact: ${r.priceImpact.toFixed(2)}%
- Total Fees: ${r.totalFees.toFixed(4)} ${tokenIn}
- Effective Price: ${r.effectivePrice.toFixed(6)}`
  )
  .join("\n")}

Trade Size vs Pool Liquidity:
- This is a ${amountIn * inputPrice > 10000 ? "LARGE" : amountIn * inputPrice > 1000 ? "MEDIUM" : "SMALL"} trade
`;
}

async function analyzeSwapWithAI(summary: string): Promise<SwapAnalysis> {
  const openrouter = getOpenRouter();

  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a DeFi swap optimization expert. Analyze swap routes and provide execution recommendations.

Respond in valid JSON only:
{
  "recommendation": "Clear recommendation on best approach",
  "executionStrategy": "single|split|wait",
  "splitSuggestion": [{"route": 0, "percentage": 70}, {"route": 1, "percentage": 30}] or null,
  "riskLevel": "low|medium|high",
  "warnings": ["warning1", "warning2"],
  "insights": ["insight1", "insight2"]
}`,
      },
      { role: "user", content: summary },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  // Default analysis
  let analysis: SwapAnalysis = {
    recommendation: "Execute swap via best available route",
    executionStrategy: "single",
    riskLevel: "medium",
    warnings: [],
    insights: ["Multiple routes analyzed"],
  };

  if (content && typeof content === "string") {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        analysis = {
          recommendation: parsed.recommendation || analysis.recommendation,
          executionStrategy: ["single", "split", "wait"].includes(parsed.executionStrategy)
            ? parsed.executionStrategy
            : "single",
          splitSuggestion: parsed.splitSuggestion || undefined,
          riskLevel: ["low", "medium", "high"].includes(parsed.riskLevel) ? parsed.riskLevel : "medium",
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
          insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        };
      } catch {
        // Keep defaults
      }
    }
  }

  return analysis;
}

function buildPoolRiskSummary(pool: AlexPoolData, metrics: PoolRiskMetrics, investment: number): string {
  return `
POOL RISK ANALYSIS
==================
Pool: ${pool.pool_address}
Pair: ${pool.token_0_symbol}/${pool.token_1_symbol}

Pool Metrics:
- TVL: $${pool.tvl_usd?.toLocaleString() || "N/A"}
- 24h Volume: $${pool.volume_24h_usd?.toLocaleString() || "N/A"}
- Fee Rate: ${((pool.fee_rate || 0.003) * 100).toFixed(2)}%
- Fee APY: ${metrics.feeApy.toFixed(2)}%
- Volume/TVL Ratio: ${metrics.volumeToTvlRatio.toFixed(4)}

Token Prices:
- ${pool.token_0_symbol}: $${pool.token_0_price_usd?.toFixed(4) || "N/A"}
- ${pool.token_1_symbol}: $${pool.token_1_price_usd?.toFixed(4) || "N/A"}

Impermanent Loss Scenarios (for $${investment} investment):
${metrics.impermanentLossScenarios.map((s) => `- ${s.priceChange >= 0 ? "+" : ""}${s.priceChange}% price change: ${s.ilPercent.toFixed(2)}% IL ($${s.ilUsd.toFixed(2)})`).join("\n")}

Volatility Score: ${metrics.volatilityScore.toFixed(1)}/100
`;
}

async function analyzePoolRiskWithAI(summary: string): Promise<PoolRiskAnalysis> {
  const openrouter = getOpenRouter();

  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a DeFi liquidity pool risk analyst. Assess pool risks and provide investment recommendations.

Respond in valid JSON only:
{
  "riskRating": "very_low|low|medium|high|very_high",
  "sustainabilityScore": 0-100,
  "recommendation": "strong_buy|buy|hold|reduce|exit",
  "strengths": ["strength1", "strength2"],
  "risks": ["risk1", "risk2"],
  "optimalHoldingPeriod": "e.g., '3-6 months' or 'short-term only'"
}`,
      },
      { role: "user", content: summary },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  let analysis: PoolRiskAnalysis = {
    riskRating: "medium",
    sustainabilityScore: 50,
    recommendation: "hold",
    strengths: ["Liquidity available"],
    risks: ["Standard market risks"],
    optimalHoldingPeriod: "1-3 months",
  };

  if (content && typeof content === "string") {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validRatings = ["very_low", "low", "medium", "high", "very_high"] as const;
        const validRecs = ["strong_buy", "buy", "hold", "reduce", "exit"] as const;

        analysis = {
          riskRating: validRatings.includes(parsed.riskRating) ? parsed.riskRating : "medium",
          sustainabilityScore: Math.min(100, Math.max(0, parsed.sustainabilityScore || 50)),
          recommendation: validRecs.includes(parsed.recommendation) ? parsed.recommendation : "hold",
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : analysis.strengths,
          risks: Array.isArray(parsed.risks) ? parsed.risks : analysis.risks,
          optimalHoldingPeriod: parsed.optimalHoldingPeriod || analysis.optimalHoldingPeriod,
        };
      } catch {
        // Keep defaults
      }
    }
  }

  return analysis;
}

function buildArbitrageSummary(opportunities: ArbitrageOpportunity[], efficiency: number): string {
  return `
ARBITRAGE SCAN RESULTS
======================
Market Efficiency: ${efficiency.toFixed(1)}%
Opportunities Found: ${opportunities.length}

Top Opportunities:
${opportunities
  .slice(0, 5)
  .map(
    (o, i) => `
${i + 1}. ${o.token}
   - Spread: ${o.spreadPercent.toFixed(2)}%
   - Buy Price: ${o.buyPrice.toFixed(6)}
   - Sell Price: ${o.sellPrice.toFixed(6)}
   - Est. Profit: ${o.estimatedProfit.toFixed(2)}%
   - Net Profit (after gas): ${o.netProfit.toFixed(2)}%
   - Confidence: ${o.confidence.toFixed(0)}%`
  )
  .join("\n")}
`;
}

async function analyzeArbitrageWithAI(summary: string): Promise<ArbitrageAnalysis> {
  const openrouter = getOpenRouter();

  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a DeFi arbitrage analyst. Assess arbitrage opportunities and provide execution advice.

Respond in valid JSON only:
{
  "topOpportunities": ["Brief description of best opportunity"],
  "marketCondition": "efficient|moderate_inefficiency|high_inefficiency",
  "riskAssessment": "Overall risk assessment",
  "executionAdvice": ["advice1", "advice2"]
}`,
      },
      { role: "user", content: summary },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  let analysis: ArbitrageAnalysis = {
    topOpportunities: ["Standard market conditions"],
    marketCondition: "efficient",
    riskAssessment: "Low arbitrage risk in efficient market",
    executionAdvice: ["Monitor for larger spreads"],
  };

  if (content && typeof content === "string") {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validConditions = ["efficient", "moderate_inefficiency", "high_inefficiency"] as const;

        analysis = {
          topOpportunities: Array.isArray(parsed.topOpportunities) ? parsed.topOpportunities : analysis.topOpportunities,
          marketCondition: validConditions.includes(parsed.marketCondition)
            ? parsed.marketCondition
            : "efficient",
          riskAssessment: parsed.riskAssessment || analysis.riskAssessment,
          executionAdvice: Array.isArray(parsed.executionAdvice) ? parsed.executionAdvice : analysis.executionAdvice,
        };
      } catch {
        // Keep defaults
      }
    }
  }

  return analysis;
}

function buildMarketRegimeSummary(metrics: MarketMetrics, regime: { type: string; confidence: number }): string {
  return `
MARKET REGIME ANALYSIS
======================
Current Regime: ${regime.type} (${regime.confidence}% confidence)

Market Metrics:
- Total 24h Volume: $${metrics.totalVolume24h.toLocaleString()}
- Total TVL: $${metrics.totalTvl.toLocaleString()}
- Active Pools: ${metrics.activePools}
- Volatility Index: ${metrics.volatilityIndex.toFixed(2)}
- Volume/TVL Ratio: ${(metrics.totalVolume24h / metrics.totalTvl * 100).toFixed(2)}%
`;
}

async function analyzeMarketRegimeWithAI(summary: string): Promise<MarketRegimeAnalysis> {
  const openrouter = getOpenRouter();

  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a DeFi market analyst. Analyze market conditions and provide trading recommendations.

Respond in valid JSON only:
{
  "summary": "Brief market condition summary",
  "tradingRecommendation": "Overall trading recommendation",
  "riskLevel": "low|medium|high",
  "opportunities": ["opportunity1", "opportunity2"],
  "warnings": ["warning1", "warning2"]
}`,
      },
      { role: "user", content: summary },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  let analysis: MarketRegimeAnalysis = {
    summary: "Market conditions normal",
    tradingRecommendation: "Standard trading conditions apply",
    riskLevel: "medium",
    opportunities: ["Monitor for volatility"],
    warnings: ["Standard market risks"],
  };

  if (content && typeof content === "string") {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);

        analysis = {
          summary: parsed.summary || analysis.summary,
          tradingRecommendation: parsed.tradingRecommendation || analysis.tradingRecommendation,
          riskLevel: ["low", "medium", "high"].includes(parsed.riskLevel) ? parsed.riskLevel : "medium",
          opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : analysis.opportunities,
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings : analysis.warnings,
        };
      } catch {
        // Keep defaults
      }
    }
  }

  return analysis;
}
