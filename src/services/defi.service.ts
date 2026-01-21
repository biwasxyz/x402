// Cross-Protocol DeFi Service - AI-enhanced portfolio and strategy analysis
import { getOpenRouter } from "./openrouter.service";
import { fetchAlexPools, fetchTokenPrices, AlexPoolData } from "./alex/client";
import { fetchZestMarketStats, fetchZestTokenPrices } from "./zest/client";
import { ZestReserve } from "./zest/types";

// ============================================================================
// Types
// ============================================================================

export interface PortfolioAnalyzerRequest {
  address: string;
  alexPositions?: AlexLpPosition[];
  zestPositions?: ZestLendingPosition[];
}

export interface AlexLpPosition {
  poolId: string;
  lpTokens: number;
  token0Symbol: string;
  token1Symbol: string;
}

export interface ZestLendingPosition {
  asset: string;
  supplied: number;
  borrowed: number;
}

export interface PortfolioAnalyzerResult {
  summary: PortfolioSummary;
  alexAnalysis: AlexPortfolioAnalysis;
  zestAnalysis: ZestPortfolioAnalysis;
  correlationRisk: CorrelationRisk;
  analysis: PortfolioIntelligence;
}

export interface PortfolioSummary {
  totalValueUsd: number;
  alexValueUsd: number;
  zestValueUsd: number;
  totalYieldApy: number;
  overallRiskScore: number;
  diversificationScore: number;
}

export interface AlexPortfolioAnalysis {
  positions: AlexPositionDetail[];
  totalLpValueUsd: number;
  totalFeeApy: number;
  avgImpermanentLossRisk: number;
}

export interface AlexPositionDetail {
  poolId: string;
  pair: string;
  valueUsd: number;
  feeApy: number;
  ilRisk: number;
  share: number;
}

export interface ZestPortfolioAnalysis {
  positions: ZestPositionDetail[];
  totalSuppliedUsd: number;
  totalBorrowedUsd: number;
  netWorthUsd: number;
  weightedSupplyApy: number;
  weightedBorrowApy: number;
  healthFactor: number;
}

export interface ZestPositionDetail {
  asset: string;
  suppliedUsd: number;
  borrowedUsd: number;
  supplyApy: number;
  borrowApy: number;
  netApy: number;
}

export interface CorrelationRisk {
  score: number;
  overlappingAssets: string[];
  concentrationRisk: "low" | "medium" | "high";
  systemicRiskExposure: number;
}

export interface PortfolioIntelligence {
  overallAssessment: string;
  riskRating: "conservative" | "balanced" | "aggressive" | "risky";
  recommendations: string[];
  optimizations: PortfolioOptimization[];
  warnings: string[];
}

export interface PortfolioOptimization {
  type: "rebalance" | "add" | "remove" | "hedge";
  description: string;
  expectedImpact: string;
  priority: "high" | "medium" | "low";
}

export interface StrategyBuilderRequest {
  capitalUsd: number;
  riskTolerance: "conservative" | "moderate" | "aggressive";
  goals: ("yield" | "growth" | "hedge" | "income")[];
  timeHorizon: "short" | "medium" | "long";
  preferences?: {
    preferredAssets?: string[];
    avoidAssets?: string[];
    maxLeverage?: number;
  };
}

export interface StrategyBuilderResult {
  strategy: DeFiStrategy;
  executionPlan: ExecutionStep[];
  projections: StrategyProjections;
  analysis: StrategyAnalysis;
}

export interface DeFiStrategy {
  name: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  expectedApy: number;
  allocations: StrategyAllocation[];
}

export interface StrategyAllocation {
  protocol: "alex" | "zest";
  type: "lp" | "supply" | "borrow";
  asset: string;
  amount: number;
  percentOfCapital: number;
  expectedYield: number;
  risk: string;
}

export interface ExecutionStep {
  step: number;
  action: string;
  protocol: "alex" | "zest";
  details: string;
  estimatedGas: number;
  warnings?: string[];
}

export interface StrategyProjections {
  monthlyYieldUsd: number;
  yearlyYieldUsd: number;
  breakEvenDays: number;
  bestCase: { apy: number; valueUsd: number };
  worstCase: { apy: number; valueUsd: number };
}

export interface StrategyAnalysis {
  summary: string;
  strengths: string[];
  risks: string[];
  alternatives: string[];
  marketConditionFit: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * DeFi Portfolio Intelligence
 * Analyzes combined Alex LP + Zest lending positions
 */
export async function analyzePortfolio(request: PortfolioAnalyzerRequest): Promise<PortfolioAnalyzerResult> {
  const { address, alexPositions = [], zestPositions = [] } = request;

  // Fetch market data
  const [alexPools, tokenPrices, zestStats, zestPrices] = await Promise.all([
    fetchAlexPools("/api/defi/portfolio-analyzer"),
    fetchTokenPrices("/api/defi/portfolio-analyzer"),
    fetchZestMarketStats("/api/defi/portfolio-analyzer"),
    fetchZestTokenPrices("/api/defi/portfolio-analyzer"),
  ]);

  // Analyze Alex positions
  const alexAnalysis = analyzeAlexPositions(alexPositions, alexPools, tokenPrices);

  // Analyze Zest positions
  const zestAnalysis = analyzeZestPositions(zestPositions, zestStats.reserves, zestPrices);

  // Calculate correlation risk
  const correlationRisk = calculateCorrelationRisk(alexPositions, zestPositions, tokenPrices);

  // Calculate portfolio summary
  const totalValueUsd = alexAnalysis.totalLpValueUsd + zestAnalysis.netWorthUsd;
  const totalYieldApy = calculateWeightedApy(alexAnalysis, zestAnalysis, totalValueUsd);
  const overallRiskScore = calculateOverallRisk(alexAnalysis, zestAnalysis, correlationRisk);
  const diversificationScore = calculateDiversification(alexPositions, zestPositions);

  const summary: PortfolioSummary = {
    totalValueUsd,
    alexValueUsd: alexAnalysis.totalLpValueUsd,
    zestValueUsd: zestAnalysis.netWorthUsd,
    totalYieldApy,
    overallRiskScore,
    diversificationScore,
  };

  // Build summary for AI
  const aiSummary = buildPortfolioSummary(address, summary, alexAnalysis, zestAnalysis, correlationRisk);

  // AI analysis
  const analysis = await analyzePortfolioWithAI(aiSummary);

  return {
    summary,
    alexAnalysis,
    zestAnalysis,
    correlationRisk,
    analysis,
  };
}

/**
 * AI Strategy Builder
 * Generates complete DeFi strategy across Alex and Zest
 */
export async function buildStrategy(request: StrategyBuilderRequest): Promise<StrategyBuilderResult> {
  const { capitalUsd, riskTolerance, goals, timeHorizon, preferences = {} } = request;

  // Fetch market data
  const [alexPools, tokenPrices, zestStats] = await Promise.all([
    fetchAlexPools("/api/defi/strategy-builder"),
    fetchTokenPrices("/api/defi/strategy-builder"),
    fetchZestMarketStats("/api/defi/strategy-builder"),
  ]);

  // Generate strategy based on inputs
  const strategy = generateStrategy(capitalUsd, riskTolerance, goals, timeHorizon, preferences, alexPools, zestStats.reserves, tokenPrices);

  // Create execution plan
  const executionPlan = createExecutionPlan(strategy);

  // Calculate projections
  const projections = calculateProjections(strategy, capitalUsd);

  // Build summary for AI
  const aiSummary = buildStrategySummary(request, strategy, projections);

  // AI analysis
  const analysis = await analyzeStrategyWithAI(aiSummary);

  return {
    strategy,
    executionPlan,
    projections,
    analysis,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function analyzeAlexPositions(
  positions: AlexLpPosition[],
  pools: AlexPoolData[],
  _prices: Map<string, number>
): AlexPortfolioAnalysis {
  const positionDetails: AlexPositionDetail[] = [];
  let totalLpValueUsd = 0;
  let totalFeeApy = 0;
  let totalIlRisk = 0;

  for (const pos of positions) {
    const pool = pools.find((p) => p.pool_address === pos.poolId);
    if (!pool) continue;

    const valueUsd = pool.tvl_usd > 0 ? (pos.lpTokens / 1e8) * (pool.tvl_usd / (parseFloat(pool.token_0_reserve) / 1e8)) : 0;
    const dailyFees = pool.volume_24h_usd * (pool.fee_rate || 0.003);
    const feeApy = pool.tvl_usd > 0 ? (dailyFees / pool.tvl_usd) * 365 * 100 : 0;

    // IL risk based on price correlation
    const price0 = pool.token_0_price_usd || 1;
    const price1 = pool.token_1_price_usd || 1;
    const priceRatio = price0 / price1;
    const ilRisk = Math.min(100, Math.abs(Math.log(priceRatio)) * 30);

    positionDetails.push({
      poolId: pos.poolId,
      pair: `${pos.token0Symbol}/${pos.token1Symbol}`,
      valueUsd,
      feeApy,
      ilRisk,
      share: 0, // Calculated after totals
    });

    totalLpValueUsd += valueUsd;
    totalFeeApy += feeApy * valueUsd;
    totalIlRisk += ilRisk * valueUsd;
  }

  // Calculate shares and weighted averages
  for (const detail of positionDetails) {
    detail.share = totalLpValueUsd > 0 ? (detail.valueUsd / totalLpValueUsd) * 100 : 0;
  }

  return {
    positions: positionDetails,
    totalLpValueUsd,
    totalFeeApy: totalLpValueUsd > 0 ? totalFeeApy / totalLpValueUsd : 0,
    avgImpermanentLossRisk: totalLpValueUsd > 0 ? totalIlRisk / totalLpValueUsd : 0,
  };
}

function analyzeZestPositions(
  positions: ZestLendingPosition[],
  reserves: ZestReserve[],
  prices: Map<string, number>
): ZestPortfolioAnalysis {
  const positionDetails: ZestPositionDetail[] = [];
  let totalSuppliedUsd = 0;
  let totalBorrowedUsd = 0;
  let weightedSupplyApy = 0;
  let weightedBorrowApy = 0;
  let weightedLtv = 0;

  for (const pos of positions) {
    const price = prices.get(pos.asset.toUpperCase()) || 1;
    const reserve = reserves.find((r) => r.symbol.toUpperCase() === pos.asset.toUpperCase());

    const suppliedUsd = pos.supplied * price;
    const borrowedUsd = pos.borrowed * price;
    const supplyApy = (reserve?.supply_apy || 0.03) * 100;
    const borrowApy = (reserve?.borrow_apy || 0.05) * 100;
    const netApy = pos.supplied > 0 ? supplyApy - (borrowedUsd / suppliedUsd) * borrowApy : 0;

    positionDetails.push({
      asset: pos.asset,
      suppliedUsd,
      borrowedUsd,
      supplyApy,
      borrowApy,
      netApy,
    });

    totalSuppliedUsd += suppliedUsd;
    totalBorrowedUsd += borrowedUsd;
    weightedSupplyApy += supplyApy * suppliedUsd;
    weightedBorrowApy += borrowApy * borrowedUsd;
    weightedLtv += (reserve?.ltv || 0.7) * suppliedUsd;
  }

  const avgLtv = totalSuppliedUsd > 0 ? weightedLtv / totalSuppliedUsd : 0.7;
  const healthFactor = totalBorrowedUsd > 0 ? (totalSuppliedUsd * (avgLtv + 0.05)) / totalBorrowedUsd : 999;

  return {
    positions: positionDetails,
    totalSuppliedUsd,
    totalBorrowedUsd,
    netWorthUsd: totalSuppliedUsd - totalBorrowedUsd,
    weightedSupplyApy: totalSuppliedUsd > 0 ? weightedSupplyApy / totalSuppliedUsd : 0,
    weightedBorrowApy: totalBorrowedUsd > 0 ? weightedBorrowApy / totalBorrowedUsd : 0,
    healthFactor: Math.min(healthFactor, 999),
  };
}

function calculateCorrelationRisk(
  alexPositions: AlexLpPosition[],
  zestPositions: ZestLendingPosition[],
  _prices: Map<string, number>
): CorrelationRisk {
  // Find overlapping assets
  const alexAssets = new Set<string>();
  for (const pos of alexPositions) {
    alexAssets.add(pos.token0Symbol.toUpperCase());
    alexAssets.add(pos.token1Symbol.toUpperCase());
  }

  const zestAssets = new Set(zestPositions.map((p) => p.asset.toUpperCase()));
  const overlappingAssets = [...alexAssets].filter((a) => zestAssets.has(a));

  // Calculate concentration
  const totalAssets = new Set([...alexAssets, ...zestAssets]).size;
  const concentration = overlappingAssets.length / Math.max(totalAssets, 1);

  // Systemic risk (exposure to major assets like STX, sBTC)
  const systemicAssets = ["STX", "SBTC", "ALEX"];
  const systemicExposure = [...alexAssets, ...zestAssets].filter((a) => systemicAssets.includes(a)).length / Math.max(totalAssets, 1);

  return {
    score: (concentration * 50 + systemicExposure * 50),
    overlappingAssets,
    concentrationRisk: concentration > 0.5 ? "high" : concentration > 0.25 ? "medium" : "low",
    systemicRiskExposure: systemicExposure * 100,
  };
}

function calculateWeightedApy(
  alexAnalysis: AlexPortfolioAnalysis,
  zestAnalysis: ZestPortfolioAnalysis,
  totalValue: number
): number {
  if (totalValue === 0) return 0;

  const alexContribution = (alexAnalysis.totalLpValueUsd / totalValue) * alexAnalysis.totalFeeApy;
  const zestContribution = (zestAnalysis.netWorthUsd / totalValue) * (zestAnalysis.weightedSupplyApy - (zestAnalysis.totalBorrowedUsd / zestAnalysis.totalSuppliedUsd) * zestAnalysis.weightedBorrowApy);

  return alexContribution + zestContribution;
}

function calculateOverallRisk(
  alexAnalysis: AlexPortfolioAnalysis,
  zestAnalysis: ZestPortfolioAnalysis,
  correlationRisk: CorrelationRisk
): number {
  // Weighted risk score
  const ilRisk = alexAnalysis.avgImpermanentLossRisk * 0.3;
  const healthRisk = zestAnalysis.healthFactor < 1.5 ? (1.5 - zestAnalysis.healthFactor) * 100 : 0;
  const corrRisk = correlationRisk.score * 0.3;

  return Math.min(100, ilRisk + healthRisk + corrRisk);
}

function calculateDiversification(
  alexPositions: AlexLpPosition[],
  zestPositions: ZestLendingPosition[]
): number {
  const allAssets = new Set<string>();
  for (const pos of alexPositions) {
    allAssets.add(pos.token0Symbol);
    allAssets.add(pos.token1Symbol);
  }
  for (const pos of zestPositions) {
    allAssets.add(pos.asset);
  }

  const protocols = (alexPositions.length > 0 ? 1 : 0) + (zestPositions.length > 0 ? 1 : 0);

  // Score based on asset count and protocol diversity
  return Math.min(100, allAssets.size * 15 + protocols * 20);
}

function generateStrategy(
  capital: number,
  risk: "conservative" | "moderate" | "aggressive",
  goals: string[],
  timeHorizon: string,
  preferences: { preferredAssets?: string[]; avoidAssets?: string[]; maxLeverage?: number },
  pools: AlexPoolData[],
  reserves: ZestReserve[],
  _prices: Map<string, number>
): DeFiStrategy {
  const allocations: StrategyAllocation[] = [];
  let totalExpectedYield = 0;

  // Strategy parameters based on risk
  const riskParams = {
    conservative: { lpPercent: 0.3, supplyPercent: 0.7, leverageMultiplier: 0 },
    moderate: { lpPercent: 0.5, supplyPercent: 0.4, leverageMultiplier: 0.3 },
    aggressive: { lpPercent: 0.6, supplyPercent: 0.2, leverageMultiplier: 0.6 },
  }[risk];

  // Filter preferred/avoided assets
  const filterAsset = (symbol: string) => {
    if (preferences.avoidAssets?.includes(symbol)) return false;
    if (preferences.preferredAssets?.length && !preferences.preferredAssets.includes(symbol)) return false;
    return true;
  };

  // Alex LP allocations
  const lpCapital = capital * riskParams.lpPercent;
  const eligiblePools = pools.filter(
    (p) => filterAsset(p.token_0_symbol) && filterAsset(p.token_1_symbol) && p.tvl_usd > 10000
  ).sort((a, b) => b.volume_24h_usd - a.volume_24h_usd);

  if (eligiblePools.length > 0) {
    const topPool = eligiblePools[0];
    const feeApy = topPool.tvl_usd > 0 ? (topPool.volume_24h_usd * 0.003 / topPool.tvl_usd) * 365 * 100 : 5;

    allocations.push({
      protocol: "alex",
      type: "lp",
      asset: `${topPool.token_0_symbol}/${topPool.token_1_symbol}`,
      amount: lpCapital,
      percentOfCapital: riskParams.lpPercent * 100,
      expectedYield: feeApy,
      risk: "Impermanent loss risk",
    });

    totalExpectedYield += feeApy * riskParams.lpPercent;
  }

  // Zest supply allocations
  const supplyCapital = capital * riskParams.supplyPercent;
  const eligibleReserves = reserves.filter((r) => filterAsset(r.symbol)).sort((a, b) => b.supply_apy - a.supply_apy);

  if (eligibleReserves.length > 0) {
    const topReserve = eligibleReserves[0];
    const supplyApy = topReserve.supply_apy * 100;

    allocations.push({
      protocol: "zest",
      type: "supply",
      asset: topReserve.symbol,
      amount: supplyCapital,
      percentOfCapital: riskParams.supplyPercent * 100,
      expectedYield: supplyApy,
      risk: "Smart contract risk",
    });

    totalExpectedYield += supplyApy * riskParams.supplyPercent;

    // Leverage if risk tolerance allows
    if (riskParams.leverageMultiplier > 0 && topReserve.ltv > 0) {
      const borrowAmount = supplyCapital * topReserve.ltv * riskParams.leverageMultiplier;
      const borrowApy = topReserve.borrow_apy * 100;

      allocations.push({
        protocol: "zest",
        type: "borrow",
        asset: topReserve.symbol,
        amount: borrowAmount,
        percentOfCapital: (borrowAmount / capital) * 100,
        expectedYield: -borrowApy,
        risk: "Liquidation risk",
      });

      totalExpectedYield -= borrowApy * (borrowAmount / capital);

      // Re-supply borrowed amount
      allocations.push({
        protocol: "zest",
        type: "supply",
        asset: topReserve.symbol,
        amount: borrowAmount,
        percentOfCapital: (borrowAmount / capital) * 100,
        expectedYield: supplyApy,
        risk: "Leveraged position risk",
      });

      totalExpectedYield += supplyApy * (borrowAmount / capital);
    }
  }

  const strategyNames = {
    conservative: "Safe Yield Strategy",
    moderate: "Balanced Growth Strategy",
    aggressive: "Maximum Yield Strategy",
  };

  return {
    name: strategyNames[risk],
    description: `${risk.charAt(0).toUpperCase() + risk.slice(1)} strategy optimized for ${goals.join(", ")} over ${timeHorizon}-term`,
    riskLevel: risk === "conservative" ? "low" : risk === "moderate" ? "medium" : "high",
    expectedApy: totalExpectedYield,
    allocations,
  };
}

function createExecutionPlan(strategy: DeFiStrategy): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  let stepNum = 1;

  // Sort allocations: supplies first, then borrows, then LP
  const sortedAllocations = [...strategy.allocations].sort((a, b) => {
    const order = { supply: 0, borrow: 1, lp: 2 };
    return order[a.type] - order[b.type];
  });

  for (const alloc of sortedAllocations) {
    if (alloc.type === "supply") {
      steps.push({
        step: stepNum++,
        action: `Supply ${alloc.asset} to Zest`,
        protocol: "zest",
        details: `Supply $${alloc.amount.toFixed(2)} worth of ${alloc.asset} to earn ${alloc.expectedYield.toFixed(2)}% APY`,
        estimatedGas: 0.05,
      });
    } else if (alloc.type === "borrow") {
      steps.push({
        step: stepNum++,
        action: `Borrow ${alloc.asset} from Zest`,
        protocol: "zest",
        details: `Borrow $${alloc.amount.toFixed(2)} worth of ${alloc.asset} at ${Math.abs(alloc.expectedYield).toFixed(2)}% APY`,
        estimatedGas: 0.05,
        warnings: ["Monitor health factor", "Set up liquidation alerts"],
      });
    } else if (alloc.type === "lp") {
      steps.push({
        step: stepNum++,
        action: `Add liquidity to ${alloc.asset} pool on Alex`,
        protocol: "alex",
        details: `Add $${alloc.amount.toFixed(2)} liquidity to earn ~${alloc.expectedYield.toFixed(2)}% fee APY`,
        estimatedGas: 0.1,
        warnings: ["Impermanent loss possible", "Monitor pool performance"],
      });
    }
  }

  return steps;
}

function calculateProjections(strategy: DeFiStrategy, capital: number): StrategyProjections {
  const yearlyYieldUsd = capital * (strategy.expectedApy / 100);
  const monthlyYieldUsd = yearlyYieldUsd / 12;

  // Estimate gas costs for setup
  const setupCosts = strategy.allocations.length * 0.1; // ~0.1 STX per tx
  const breakEvenDays = monthlyYieldUsd > 0 ? (setupCosts / monthlyYieldUsd) * 30 : 999;

  // Best/worst case scenarios
  const volatilityFactor = strategy.riskLevel === "low" ? 0.2 : strategy.riskLevel === "medium" ? 0.4 : 0.6;

  return {
    monthlyYieldUsd,
    yearlyYieldUsd,
    breakEvenDays,
    bestCase: {
      apy: strategy.expectedApy * (1 + volatilityFactor),
      valueUsd: capital * (1 + strategy.expectedApy * (1 + volatilityFactor) / 100),
    },
    worstCase: {
      apy: Math.max(0, strategy.expectedApy * (1 - volatilityFactor)),
      valueUsd: capital * (1 + Math.max(-0.3, strategy.expectedApy * (1 - volatilityFactor) / 100)),
    },
  };
}

// ============================================================================
// AI Analysis Functions
// ============================================================================

function buildPortfolioSummary(
  address: string,
  summary: PortfolioSummary,
  alex: AlexPortfolioAnalysis,
  zest: ZestPortfolioAnalysis,
  correlation: CorrelationRisk
): string {
  return `
PORTFOLIO INTELLIGENCE REPORT
=============================
Address: ${address}

Portfolio Summary:
- Total Value: $${summary.totalValueUsd.toFixed(2)}
- Alex LP Value: $${summary.alexValueUsd.toFixed(2)}
- Zest Net Worth: $${summary.zestValueUsd.toFixed(2)}
- Overall APY: ${summary.totalYieldApy.toFixed(2)}%
- Risk Score: ${summary.overallRiskScore.toFixed(0)}/100
- Diversification: ${summary.diversificationScore.toFixed(0)}/100

Alex DEX Positions (${alex.positions.length}):
${alex.positions.map((p) => `- ${p.pair}: $${p.valueUsd.toFixed(2)} | Fee APY: ${p.feeApy.toFixed(2)}% | IL Risk: ${p.ilRisk.toFixed(0)}/100`).join("\n")}
- Average IL Risk: ${alex.avgImpermanentLossRisk.toFixed(1)}/100

Zest Lending Positions (${zest.positions.length}):
${zest.positions.map((p) => `- ${p.asset}: Supply $${p.suppliedUsd.toFixed(2)} | Borrow $${p.borrowedUsd.toFixed(2)} | Net APY: ${p.netApy.toFixed(2)}%`).join("\n")}
- Health Factor: ${zest.healthFactor.toFixed(2)}
- Utilization: ${((zest.totalBorrowedUsd / zest.totalSuppliedUsd) * 100).toFixed(1)}%

Correlation Analysis:
- Risk Score: ${correlation.score.toFixed(1)}/100
- Overlapping Assets: ${correlation.overlappingAssets.join(", ") || "None"}
- Concentration Risk: ${correlation.concentrationRisk}
- Systemic Exposure: ${correlation.systemicRiskExposure.toFixed(1)}%
`;
}

async function analyzePortfolioWithAI(summary: string): Promise<PortfolioIntelligence> {
  const openrouter = getOpenRouter();

  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a DeFi portfolio analyst. Analyze cross-protocol positions and provide optimization recommendations.

Respond in valid JSON only:
{
  "overallAssessment": "Brief overall portfolio assessment",
  "riskRating": "conservative|balanced|aggressive|risky",
  "recommendations": ["rec1", "rec2", "rec3"],
  "optimizations": [
    {
      "type": "rebalance|add|remove|hedge",
      "description": "What to do",
      "expectedImpact": "Expected impact",
      "priority": "high|medium|low"
    }
  ],
  "warnings": ["warning1", "warning2"]
}`,
      },
      { role: "user", content: summary },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  let analysis: PortfolioIntelligence = {
    overallAssessment: "Portfolio requires review",
    riskRating: "balanced",
    recommendations: ["Monitor positions regularly"],
    optimizations: [],
    warnings: [],
  };

  if (content && typeof content === "string") {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validRatings = ["conservative", "balanced", "aggressive", "risky"] as const;

        analysis = {
          overallAssessment: parsed.overallAssessment || analysis.overallAssessment,
          riskRating: validRatings.includes(parsed.riskRating) ? parsed.riskRating : "balanced",
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : analysis.recommendations,
          optimizations: Array.isArray(parsed.optimizations) ? parsed.optimizations : [],
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        };
      } catch {
        // Keep defaults
      }
    }
  }

  return analysis;
}

function buildStrategySummary(
  request: StrategyBuilderRequest,
  strategy: DeFiStrategy,
  projections: StrategyProjections
): string {
  return `
STRATEGY BUILDER REQUEST
========================
Capital: $${request.capitalUsd.toLocaleString()}
Risk Tolerance: ${request.riskTolerance}
Goals: ${request.goals.join(", ")}
Time Horizon: ${request.timeHorizon}

Generated Strategy: ${strategy.name}
Risk Level: ${strategy.riskLevel}
Expected APY: ${strategy.expectedApy.toFixed(2)}%

Allocations:
${strategy.allocations.map((a) => `- ${a.protocol.toUpperCase()} ${a.type}: ${a.asset} - $${a.amount.toFixed(2)} (${a.percentOfCapital.toFixed(1)}%) - Expected: ${a.expectedYield.toFixed(2)}%`).join("\n")}

Projections:
- Monthly Yield: $${projections.monthlyYieldUsd.toFixed(2)}
- Yearly Yield: $${projections.yearlyYieldUsd.toFixed(2)}
- Break-even: ${projections.breakEvenDays.toFixed(0)} days
- Best Case APY: ${projections.bestCase.apy.toFixed(2)}%
- Worst Case APY: ${projections.worstCase.apy.toFixed(2)}%
`;
}

async function analyzeStrategyWithAI(summary: string): Promise<StrategyAnalysis> {
  const openrouter = getOpenRouter();

  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a DeFi strategy advisor. Analyze the generated strategy and provide expert assessment.

Respond in valid JSON only:
{
  "summary": "Strategy summary assessment",
  "strengths": ["strength1", "strength2"],
  "risks": ["risk1", "risk2"],
  "alternatives": ["alternative approach 1", "alternative approach 2"],
  "marketConditionFit": "Assessment of how this fits current market"
}`,
      },
      { role: "user", content: summary },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  let analysis: StrategyAnalysis = {
    summary: "Strategy generated successfully",
    strengths: ["Diversified across protocols"],
    risks: ["Market volatility"],
    alternatives: ["Consider adjusting based on market conditions"],
    marketConditionFit: "Suitable for current market",
  };

  if (content && typeof content === "string") {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);

        analysis = {
          summary: parsed.summary || analysis.summary,
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : analysis.strengths,
          risks: Array.isArray(parsed.risks) ? parsed.risks : analysis.risks,
          alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : analysis.alternatives,
          marketConditionFit: parsed.marketConditionFit || analysis.marketConditionFit,
        };
      } catch {
        // Keep defaults
      }
    }
  }

  return analysis;
}
