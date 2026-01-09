// Zest Protocol Service - AI-enhanced lending analytics
import { getOpenRouter } from "./openrouter.service";
import { fetchZestMarketStats, fetchZestTokenPrices, getInterestRateModel } from "./zest/client";
import { ZEST_ASSETS, ZEST_RISK_PARAMS, ZestReserve } from "./zest/types";

// ============================================================================
// Types
// ============================================================================

export interface LiquidationRiskRequest {
  address: string;
  collateralAsset: string;
  collateralAmount: number;
  debtAsset: string;
  debtAmount: number;
}

export interface LiquidationRiskResult {
  position: PositionSummary;
  riskMetrics: LiquidationRiskMetrics;
  priceScenarios: PriceScenario[];
  analysis: LiquidationAnalysis;
}

export interface PositionSummary {
  address: string;
  collateralAsset: string;
  collateralAmount: number;
  collateralValueUsd: number;
  debtAsset: string;
  debtAmount: number;
  debtValueUsd: number;
  healthFactor: number;
  ltv: number;
  liquidationThreshold: number;
}

export interface LiquidationRiskMetrics {
  currentHealthFactor: number;
  liquidationPrice: number;
  safetyMargin: number;
  maxBorrowable: number;
  riskScore: number;
}

export interface PriceScenario {
  priceChange: number;
  newHealthFactor: number;
  liquidated: boolean;
  collateralValueUsd: number;
}

export interface LiquidationAnalysis {
  riskLevel: "safe" | "moderate" | "warning" | "danger" | "critical";
  liquidationProbability: number;
  recommendation: string;
  actions: string[];
  warnings: string[];
}

export interface YieldOptimizerRequest {
  capitalUsd: number;
  riskTolerance: "conservative" | "moderate" | "aggressive";
  preferredAssets?: string[];
}

export interface YieldOptimizerResult {
  markets: ZestReserve[];
  strategies: YieldStrategy[];
  bestStrategy: YieldStrategy | null;
  analysis: YieldAnalysis;
}

export interface YieldStrategy {
  name: string;
  type: "supply_only" | "leverage" | "loop";
  allocations: {
    asset: string;
    action: "supply" | "borrow";
    amount: number;
    apy: number;
  }[];
  expectedApy: number;
  riskScore: number;
  netYieldUsd: number;
}

export interface YieldAnalysis {
  recommendation: string;
  riskAssessment: string;
  marketOutlook: string;
  opportunities: string[];
  warnings: string[];
}

export interface InterestForecastResult {
  assets: AssetForecast[];
  marketTrend: "rising" | "stable" | "falling";
  analysis: InterestAnalysis;
}

export interface AssetForecast {
  asset: string;
  symbol: string;
  currentSupplyRate: number;
  currentBorrowRate: number;
  forecast24h: { supply: number; borrow: number };
  forecast7d: { supply: number; borrow: number };
  utilizationTrend: "increasing" | "stable" | "decreasing";
}

export interface InterestAnalysis {
  summary: string;
  supplyRecommendations: string[];
  borrowRecommendations: string[];
  timing: string;
}

export interface PositionHealthRequest {
  address: string;
  positions: {
    asset: string;
    supplied: number;
    borrowed: number;
  }[];
}

export interface PositionHealthResult {
  overallHealth: OverallHealth;
  positionDetails: PositionDetail[];
  analysis: HealthAnalysis;
}

export interface OverallHealth {
  healthFactor: number;
  totalCollateralUsd: number;
  totalDebtUsd: number;
  netWorthUsd: number;
  availableBorrowUsd: number;
  utilizationPercent: number;
}

export interface PositionDetail {
  asset: string;
  symbol: string;
  supplied: number;
  suppliedUsd: number;
  borrowed: number;
  borrowedUsd: number;
  supplyApy: number;
  borrowApy: number;
  netApy: number;
  contribution: number;
}

export interface HealthAnalysis {
  status: "excellent" | "good" | "fair" | "poor" | "critical";
  riskScore: number;
  recommendations: string[];
  rebalanceSuggestions: RebalanceSuggestion[];
  warnings: string[];
}

export interface RebalanceSuggestion {
  action: "add_collateral" | "repay_debt" | "withdraw" | "borrow_more";
  asset: string;
  amount: number;
  reason: string;
  impact: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Liquidation Risk Monitor
 * Fetches position health, simulates price scenarios, predicts liquidation probability
 */
export async function analyzeLiquidationRisk(request: LiquidationRiskRequest): Promise<LiquidationRiskResult> {
  const { address, collateralAsset, collateralAmount, debtAsset, debtAmount } = request;

  // Fetch prices
  const prices = await fetchZestTokenPrices("/api/zest/liquidation-risk");

  // Get asset parameters
  const collateralPrice = prices.get(collateralAsset.toUpperCase()) || 1;
  const debtPrice = prices.get(debtAsset.toUpperCase()) || 1;

  const collateralValueUsd = collateralAmount * collateralPrice;
  const debtValueUsd = debtAmount * debtPrice;

  // Get risk parameters for collateral asset
  const ltv = getLtvForAsset(collateralAsset);
  const liquidationThreshold = getLiquidationThreshold(collateralAsset);

  // Calculate health factor
  const healthFactor = debtValueUsd > 0 ? (collateralValueUsd * liquidationThreshold) / debtValueUsd : 999;

  const position: PositionSummary = {
    address,
    collateralAsset,
    collateralAmount,
    collateralValueUsd,
    debtAsset,
    debtAmount,
    debtValueUsd,
    healthFactor,
    ltv,
    liquidationThreshold,
  };

  // Calculate risk metrics
  const liquidationPrice = debtValueUsd / (collateralAmount * liquidationThreshold);
  const safetyMargin = ((collateralPrice - liquidationPrice) / collateralPrice) * 100;
  const maxBorrowable = collateralValueUsd * ltv - debtValueUsd;
  const riskScore = Math.max(0, Math.min(100, 100 - safetyMargin * 2));

  const riskMetrics: LiquidationRiskMetrics = {
    currentHealthFactor: healthFactor,
    liquidationPrice,
    safetyMargin,
    maxBorrowable: Math.max(0, maxBorrowable),
    riskScore,
  };

  // Calculate price scenarios
  const priceChanges = [-50, -30, -20, -10, 0, 10, 20];
  const priceScenarios: PriceScenario[] = priceChanges.map((change) => {
    const newCollateralPrice = collateralPrice * (1 + change / 100);
    const newCollateralValue = collateralAmount * newCollateralPrice;
    const newHealthFactor = debtValueUsd > 0 ? (newCollateralValue * liquidationThreshold) / debtValueUsd : 999;

    return {
      priceChange: change,
      newHealthFactor,
      liquidated: newHealthFactor < 1,
      collateralValueUsd: newCollateralValue,
    };
  });

  // Build summary for AI
  const summary = buildLiquidationSummary(position, riskMetrics, priceScenarios);

  // AI analysis
  const analysis = await analyzeLiquidationWithAI(summary);

  return {
    position,
    riskMetrics,
    priceScenarios,
    analysis,
  };
}

/**
 * Lending Yield Optimizer
 * Analyzes all Zest markets and recommends optimal strategy
 */
export async function optimizeYield(request: YieldOptimizerRequest): Promise<YieldOptimizerResult> {
  const { capitalUsd, riskTolerance, preferredAssets } = request;

  // Fetch market stats
  const marketStats = await fetchZestMarketStats("/api/zest/yield-optimizer");
  const markets = marketStats.reserves;

  // Generate strategies based on risk tolerance
  const strategies = generateYieldStrategies(capitalUsd, riskTolerance, markets, preferredAssets);

  // Sort by expected APY
  strategies.sort((a, b) => b.expectedApy - a.expectedApy);

  const bestStrategy = strategies[0] || null;

  // Build summary for AI
  const summary = buildYieldSummary(capitalUsd, riskTolerance, markets, strategies);

  // AI analysis
  const analysis = await analyzeYieldWithAI(summary);

  return {
    markets,
    strategies: strategies.slice(0, 5),
    bestStrategy,
    analysis,
  };
}

/**
 * Interest Rate Forecaster
 * Predicts future interest rates based on utilization trends
 */
export async function forecastInterestRates(): Promise<InterestForecastResult> {
  // Get current rates for all assets
  const assetForecasts: AssetForecast[] = [];

  for (const [symbol, assetInfo] of Object.entries(ZEST_ASSETS)) {
    const model = getInterestRateModel(symbol);

    // Simple forecast based on utilization trend
    const utilizationTrend = model.current_utilization > 0.7 ? "increasing" : model.current_utilization < 0.4 ? "decreasing" : "stable";

    // Forecast rates (simplified model)
    const trendMultiplier = utilizationTrend === "increasing" ? 1.1 : utilizationTrend === "decreasing" ? 0.9 : 1.0;

    assetForecasts.push({
      asset: assetInfo.contract,
      symbol,
      currentSupplyRate: model.current_supply_rate * 100,
      currentBorrowRate: model.current_borrow_rate * 100,
      forecast24h: {
        supply: model.current_supply_rate * 100 * trendMultiplier,
        borrow: model.current_borrow_rate * 100 * trendMultiplier,
      },
      forecast7d: {
        supply: model.current_supply_rate * 100 * Math.pow(trendMultiplier, 2),
        borrow: model.current_borrow_rate * 100 * Math.pow(trendMultiplier, 2),
      },
      utilizationTrend,
    });
  }

  // Determine overall market trend
  const avgTrend =
    assetForecasts.filter((a) => a.utilizationTrend === "increasing").length -
    assetForecasts.filter((a) => a.utilizationTrend === "decreasing").length;

  const marketTrend: "rising" | "stable" | "falling" = avgTrend > 0 ? "rising" : avgTrend < 0 ? "falling" : "stable";

  // Build summary for AI
  const summary = buildInterestForecastSummary(assetForecasts, marketTrend);

  // AI analysis
  const analysis = await analyzeInterestForecastWithAI(summary);

  return {
    assets: assetForecasts,
    marketTrend,
    analysis,
  };
}

/**
 * Position Health Analyzer
 * Comprehensive health check with AI recommendations
 */
export async function analyzePositionHealth(request: PositionHealthRequest): Promise<PositionHealthResult> {
  const { address, positions } = request;

  // Fetch prices
  const prices = await fetchZestTokenPrices("/api/zest/position-health");

  let totalCollateralUsd = 0;
  let totalDebtUsd = 0;
  let weightedLtv = 0;

  const positionDetails: PositionDetail[] = [];

  for (const pos of positions) {
    const price = prices.get(pos.asset.toUpperCase()) || 1;
    const suppliedUsd = pos.supplied * price;
    const borrowedUsd = pos.borrowed * price;

    const model = getInterestRateModel(pos.asset);
    const supplyApy = model.current_supply_rate * 100;
    const borrowApy = model.current_borrow_rate * 100;

    const netApy = pos.supplied > 0 ? supplyApy - (pos.borrowed / pos.supplied) * borrowApy : 0;

    totalCollateralUsd += suppliedUsd;
    totalDebtUsd += borrowedUsd;

    const ltv = getLtvForAsset(pos.asset);
    weightedLtv += suppliedUsd * ltv;

    positionDetails.push({
      asset: pos.asset,
      symbol: pos.asset,
      supplied: pos.supplied,
      suppliedUsd,
      borrowed: pos.borrowed,
      borrowedUsd,
      supplyApy,
      borrowApy,
      netApy,
      contribution: 0, // Will be calculated after totals
    });
  }

  // Calculate contributions
  for (const detail of positionDetails) {
    detail.contribution = totalCollateralUsd > 0 ? (detail.suppliedUsd / totalCollateralUsd) * 100 : 0;
  }

  // Calculate overall health
  const avgLtv = totalCollateralUsd > 0 ? weightedLtv / totalCollateralUsd : 0.7;
  const avgLiqThreshold = avgLtv + 0.05; // Simplified
  const healthFactor = totalDebtUsd > 0 ? (totalCollateralUsd * avgLiqThreshold) / totalDebtUsd : 999;
  const availableBorrowUsd = Math.max(0, totalCollateralUsd * avgLtv - totalDebtUsd);
  const utilizationPercent = totalCollateralUsd > 0 ? (totalDebtUsd / (totalCollateralUsd * avgLtv)) * 100 : 0;

  const overallHealth: OverallHealth = {
    healthFactor: Math.min(healthFactor, 999),
    totalCollateralUsd,
    totalDebtUsd,
    netWorthUsd: totalCollateralUsd - totalDebtUsd,
    availableBorrowUsd,
    utilizationPercent,
  };

  // Build summary for AI
  const summary = buildHealthSummary(address, overallHealth, positionDetails);

  // AI analysis
  const analysis = await analyzeHealthWithAI(summary);

  return {
    overallHealth,
    positionDetails,
    analysis,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getLtvForAsset(asset: string): number {
  const ltvs: Record<string, number> = {
    STX: 0.70,
    sBTC: 0.75,
    stSTX: 0.65,
    aeUSDC: 0.80,
    USDC: 0.80,
  };
  return ltvs[asset.toUpperCase()] || 0.70;
}

function getLiquidationThreshold(asset: string): number {
  const thresholds: Record<string, number> = {
    STX: 0.75,
    sBTC: 0.80,
    stSTX: 0.70,
    aeUSDC: 0.85,
    USDC: 0.85,
  };
  return thresholds[asset.toUpperCase()] || 0.75;
}

function generateYieldStrategies(
  capital: number,
  risk: "conservative" | "moderate" | "aggressive",
  markets: ZestReserve[],
  preferredAssets?: string[]
): YieldStrategy[] {
  const strategies: YieldStrategy[] = [];

  // Filter markets by preference
  const filteredMarkets = preferredAssets
    ? markets.filter((m) => preferredAssets.includes(m.symbol))
    : markets;

  const targetMarkets = filteredMarkets.length > 0 ? filteredMarkets : markets;

  // Strategy 1: Simple Supply (lowest risk)
  for (const market of targetMarkets) {
    strategies.push({
      name: `Supply ${market.symbol}`,
      type: "supply_only",
      allocations: [
        {
          asset: market.symbol,
          action: "supply",
          amount: capital,
          apy: market.supply_apy * 100,
        },
      ],
      expectedApy: market.supply_apy * 100,
      riskScore: 20,
      netYieldUsd: (capital * market.supply_apy),
    });
  }

  // Strategy 2: Leveraged (moderate risk) - only for moderate/aggressive
  if (risk !== "conservative") {
    for (const market of targetMarkets) {
      if (market.ltv > 0) {
        const borrowAmount = capital * market.ltv * 0.5; // 50% of max borrow
        const totalSupply = capital + borrowAmount;
        const netApy = market.supply_apy * (totalSupply / capital) - market.borrow_apy * (borrowAmount / capital);

        strategies.push({
          name: `Leverage ${market.symbol}`,
          type: "leverage",
          allocations: [
            { asset: market.symbol, action: "supply", amount: totalSupply, apy: market.supply_apy * 100 },
            { asset: market.symbol, action: "borrow", amount: borrowAmount, apy: -market.borrow_apy * 100 },
          ],
          expectedApy: netApy * 100,
          riskScore: 50,
          netYieldUsd: capital * netApy,
        });
      }
    }
  }

  // Strategy 3: Loop (highest risk) - only for aggressive
  if (risk === "aggressive") {
    for (const market of targetMarkets) {
      if (market.ltv > 0) {
        const loops = 3;
        let totalSupply = capital;
        let totalBorrow = 0;

        for (let i = 0; i < loops; i++) {
          const borrow = totalSupply * market.ltv * 0.8;
          totalBorrow += borrow;
          totalSupply += borrow;
        }

        const netApy = market.supply_apy * (totalSupply / capital) - market.borrow_apy * (totalBorrow / capital);

        strategies.push({
          name: `Loop ${market.symbol} (${loops}x)`,
          type: "loop",
          allocations: [
            { asset: market.symbol, action: "supply", amount: totalSupply, apy: market.supply_apy * 100 },
            { asset: market.symbol, action: "borrow", amount: totalBorrow, apy: -market.borrow_apy * 100 },
          ],
          expectedApy: netApy * 100,
          riskScore: 80,
          netYieldUsd: capital * netApy,
        });
      }
    }
  }

  return strategies;
}

// ============================================================================
// AI Analysis Functions
// ============================================================================

function buildLiquidationSummary(
  position: PositionSummary,
  metrics: LiquidationRiskMetrics,
  scenarios: PriceScenario[]
): string {
  return `
LIQUIDATION RISK ANALYSIS
=========================
Position:
- Collateral: ${position.collateralAmount} ${position.collateralAsset} ($${position.collateralValueUsd.toFixed(2)})
- Debt: ${position.debtAmount} ${position.debtAsset} ($${position.debtValueUsd.toFixed(2)})

Risk Metrics:
- Health Factor: ${metrics.currentHealthFactor.toFixed(2)} (${metrics.currentHealthFactor >= ZEST_RISK_PARAMS.SAFE_HEALTH_FACTOR ? "SAFE" : metrics.currentHealthFactor >= ZEST_RISK_PARAMS.WARNING_HEALTH_FACTOR ? "WARNING" : metrics.currentHealthFactor >= ZEST_RISK_PARAMS.MIN_HEALTH_FACTOR ? "DANGER" : "LIQUIDATABLE"})
- Liquidation Price: $${metrics.liquidationPrice.toFixed(4)}
- Safety Margin: ${metrics.safetyMargin.toFixed(1)}%
- Risk Score: ${metrics.riskScore.toFixed(0)}/100
- Max Additional Borrow: $${metrics.maxBorrowable.toFixed(2)}

Price Scenarios:
${scenarios.map((s) => `- ${s.priceChange >= 0 ? "+" : ""}${s.priceChange}%: HF=${s.newHealthFactor.toFixed(2)} ${s.liquidated ? "⚠️ LIQUIDATED" : "✓"}`).join("\n")}
`;
}

async function analyzeLiquidationWithAI(summary: string): Promise<LiquidationAnalysis> {
  const openrouter = getOpenRouter();

  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a DeFi lending risk analyst. Assess liquidation risk and provide actionable recommendations.

Respond in valid JSON only:
{
  "riskLevel": "safe|moderate|warning|danger|critical",
  "liquidationProbability": 0-100,
  "recommendation": "Main recommendation",
  "actions": ["action1", "action2"],
  "warnings": ["warning1", "warning2"]
}`,
      },
      { role: "user", content: summary },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  let analysis: LiquidationAnalysis = {
    riskLevel: "moderate",
    liquidationProbability: 30,
    recommendation: "Monitor position and maintain adequate collateral",
    actions: ["Set price alerts", "Prepare emergency collateral"],
    warnings: ["Market volatility can affect health factor"],
  };

  if (content && typeof content === "string") {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validLevels = ["safe", "moderate", "warning", "danger", "critical"] as const;

        analysis = {
          riskLevel: validLevels.includes(parsed.riskLevel) ? parsed.riskLevel : "moderate",
          liquidationProbability: Math.min(100, Math.max(0, parsed.liquidationProbability || 30)),
          recommendation: parsed.recommendation || analysis.recommendation,
          actions: Array.isArray(parsed.actions) ? parsed.actions : analysis.actions,
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings : analysis.warnings,
        };
      } catch {
        // Keep defaults
      }
    }
  }

  return analysis;
}

function buildYieldSummary(
  capital: number,
  risk: string,
  markets: ZestReserve[],
  strategies: YieldStrategy[]
): string {
  return `
YIELD OPTIMIZATION REQUEST
==========================
Capital: $${capital.toLocaleString()}
Risk Tolerance: ${risk}

Available Markets:
${markets.map((m) => `- ${m.symbol}: Supply ${(m.supply_apy * 100).toFixed(2)}% | Borrow ${(m.borrow_apy * 100).toFixed(2)}% | LTV ${(m.ltv * 100).toFixed(0)}%`).join("\n")}

Generated Strategies:
${strategies
  .slice(0, 5)
  .map(
    (s, i) => `
${i + 1}. ${s.name} (${s.type})
   - Expected APY: ${s.expectedApy.toFixed(2)}%
   - Net Yield: $${s.netYieldUsd.toFixed(2)}/year
   - Risk Score: ${s.riskScore}/100`
  )
  .join("\n")}
`;
}

async function analyzeYieldWithAI(summary: string): Promise<YieldAnalysis> {
  const openrouter = getOpenRouter();

  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a DeFi yield strategist. Analyze yield opportunities and provide recommendations.

Respond in valid JSON only:
{
  "recommendation": "Main strategy recommendation",
  "riskAssessment": "Risk assessment summary",
  "marketOutlook": "Market outlook",
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

  let analysis: YieldAnalysis = {
    recommendation: "Consider diversified supply strategy",
    riskAssessment: "Moderate risk with current market conditions",
    marketOutlook: "Stable yield environment",
    opportunities: ["Supply stablecoins for consistent yield"],
    warnings: ["Interest rates may fluctuate"],
  };

  if (content && typeof content === "string") {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        analysis = {
          recommendation: parsed.recommendation || analysis.recommendation,
          riskAssessment: parsed.riskAssessment || analysis.riskAssessment,
          marketOutlook: parsed.marketOutlook || analysis.marketOutlook,
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

function buildInterestForecastSummary(forecasts: AssetForecast[], trend: string): string {
  return `
INTEREST RATE FORECAST
======================
Overall Market Trend: ${trend}

Asset Forecasts:
${forecasts
  .map(
    (f) => `
${f.symbol}:
- Current Supply: ${f.currentSupplyRate.toFixed(2)}% → 24h: ${f.forecast24h.supply.toFixed(2)}% → 7d: ${f.forecast7d.supply.toFixed(2)}%
- Current Borrow: ${f.currentBorrowRate.toFixed(2)}% → 24h: ${f.forecast24h.borrow.toFixed(2)}% → 7d: ${f.forecast7d.borrow.toFixed(2)}%
- Utilization Trend: ${f.utilizationTrend}`
  )
  .join("\n")}
`;
}

async function analyzeInterestForecastWithAI(summary: string): Promise<InterestAnalysis> {
  const openrouter = getOpenRouter();

  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a DeFi interest rate analyst. Analyze rate trends and provide timing recommendations.

Respond in valid JSON only:
{
  "summary": "Overall rate forecast summary",
  "supplyRecommendations": ["rec1", "rec2"],
  "borrowRecommendations": ["rec1", "rec2"],
  "timing": "Best timing advice"
}`,
      },
      { role: "user", content: summary },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  let analysis: InterestAnalysis = {
    summary: "Interest rates expected to remain stable",
    supplyRecommendations: ["Consider locking in current rates"],
    borrowRecommendations: ["Variable rates favorable for short-term"],
    timing: "Current timing is neutral",
  };

  if (content && typeof content === "string") {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        analysis = {
          summary: parsed.summary || analysis.summary,
          supplyRecommendations: Array.isArray(parsed.supplyRecommendations)
            ? parsed.supplyRecommendations
            : analysis.supplyRecommendations,
          borrowRecommendations: Array.isArray(parsed.borrowRecommendations)
            ? parsed.borrowRecommendations
            : analysis.borrowRecommendations,
          timing: parsed.timing || analysis.timing,
        };
      } catch {
        // Keep defaults
      }
    }
  }

  return analysis;
}

function buildHealthSummary(address: string, health: OverallHealth, details: PositionDetail[]): string {
  return `
POSITION HEALTH CHECK
=====================
Address: ${address}

Overall Status:
- Health Factor: ${health.healthFactor.toFixed(2)}
- Total Collateral: $${health.totalCollateralUsd.toFixed(2)}
- Total Debt: $${health.totalDebtUsd.toFixed(2)}
- Net Worth: $${health.netWorthUsd.toFixed(2)}
- Utilization: ${health.utilizationPercent.toFixed(1)}%
- Available Borrow: $${health.availableBorrowUsd.toFixed(2)}

Position Details:
${details
  .map(
    (d) => `
${d.symbol}:
- Supplied: ${d.supplied} ($${d.suppliedUsd.toFixed(2)}) @ ${d.supplyApy.toFixed(2)}% APY
- Borrowed: ${d.borrowed} ($${d.borrowedUsd.toFixed(2)}) @ ${d.borrowApy.toFixed(2)}% APY
- Net APY: ${d.netApy.toFixed(2)}%
- Portfolio %: ${d.contribution.toFixed(1)}%`
  )
  .join("\n")}
`;
}

async function analyzeHealthWithAI(summary: string): Promise<HealthAnalysis> {
  const openrouter = getOpenRouter();

  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a DeFi portfolio health analyst. Assess position health and suggest rebalancing.

Respond in valid JSON only:
{
  "status": "excellent|good|fair|poor|critical",
  "riskScore": 0-100,
  "recommendations": ["rec1", "rec2"],
  "rebalanceSuggestions": [
    {
      "action": "add_collateral|repay_debt|withdraw|borrow_more",
      "asset": "SYMBOL",
      "amount": 100,
      "reason": "Why this action",
      "impact": "Expected impact"
    }
  ],
  "warnings": ["warning1"]
}`,
      },
      { role: "user", content: summary },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  let analysis: HealthAnalysis = {
    status: "good",
    riskScore: 30,
    recommendations: ["Maintain current positions"],
    rebalanceSuggestions: [],
    warnings: [],
  };

  if (content && typeof content === "string") {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validStatus = ["excellent", "good", "fair", "poor", "critical"] as const;

        analysis = {
          status: validStatus.includes(parsed.status) ? parsed.status : "good",
          riskScore: Math.min(100, Math.max(0, parsed.riskScore || 30)),
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : analysis.recommendations,
          rebalanceSuggestions: Array.isArray(parsed.rebalanceSuggestions)
            ? parsed.rebalanceSuggestions
            : [],
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        };
      } catch {
        // Keep defaults
      }
    }
  }

  return analysis;
}
