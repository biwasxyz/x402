// Tenero Wallets Service - AI-enhanced wallet trading analytics

import { getOpenRouter } from "./openrouter.service";
import { teneroFetch } from "./tenero/client";

// Tenero API response types
export interface WalletTradeStats {
  buy_count: number;
  sell_count: number;
  swap_count: number;
  add_liquidity_count: number;
  remove_liquidity_count: number;
  liquidity_count: number;
  total_trades: number;
  buy_volume_usd: number;
  sell_volume_usd: number;
  swap_volume_usd: number;
  add_volume_usd: number;
  remove_volume_usd: number;
  liquidity_volume_usd: number;
  total_volume_usd: number;
  avg_buy_volume_usd: number;
  avg_sell_volume_usd: number;
  avg_swap_volume_usd: number;
  avg_add_volume_usd: number;
  avg_remove_volume_usd: number;
  avg_liquidity_volume_usd: number;
  trade_netflow_usd: number;
  liquidity_netflow_usd: number;
  unique_pools_traded: number;
  unique_pools_liquidity: number;
  unique_pools_total: number;
  unique_tokens_traded: number;
  unique_tokens_liquidity: number;
  unique_tokens_total: number;
  unique_platforms_traded: number;
  unique_platforms_liquidity: number;
  unique_platforms_total: number;
}

export interface WalletPnlDistribution {
  wallet_address: string;
  winrate: number;
  pnl_lt_50_neg: number;
  pnl_neg50_to_0: number;
  pnl_0_to_200: number;
  pnl_200_to_500: number;
  pnl_gt_500: number;
  realized_pnl_lt_50_neg: number;
  realized_pnl_neg50_to_0: number;
  realized_pnl_0_to_200: number;
  realized_pnl_200_to_500: number;
  realized_pnl_gt_500: number;
  total_tokens_with_trade_data: number;
}

// AI Analysis types
export type RiskProfile = "conservative" | "moderate" | "aggressive" | "degen";
export type TradingStyle = "day_trader" | "swing_trader" | "hodler" | "liquidity_provider" | "mixed";

export interface TradingAnalysis {
  tradingStyle: TradingStyle;
  riskProfile: RiskProfile;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface PnlAnalysis {
  performanceRating: "excellent" | "good" | "average" | "poor" | "very_poor";
  riskRewardRatio: string;
  consistencyScore: number;
  keyInsights: string[];
  improvementSuggestions: string[];
}

// Combined result types
export interface WalletTradingResult {
  address: string;
  stats: WalletTradeStats;
  analysis: TradingAnalysis;
}

export interface WalletPnlResult {
  address: string;
  pnl: WalletPnlDistribution;
  analysis: PnlAnalysis;
}

/**
 * Fetch wallet trade stats from Tenero API.
 */
async function fetchTradeStats(walletAddress: string): Promise<WalletTradeStats> {
  return teneroFetch<WalletTradeStats>(
    `/wallets/${encodeURIComponent(walletAddress)}/trade_stats`
  );
}

/**
 * Fetch wallet PnL distribution from Tenero API.
 */
async function fetchPnlDistribution(walletAddress: string): Promise<WalletPnlDistribution> {
  return teneroFetch<WalletPnlDistribution>(
    `/wallets/${encodeURIComponent(walletAddress)}/pnl_distribution`
  );
}

/**
 * Analyze wallet trading behavior with AI.
 * Combines Tenero trade stats with OpenRouter AI analysis.
 */
export async function analyzeWalletTrading(walletAddress: string): Promise<WalletTradingResult> {
  // Validate address format
  if (!walletAddress.match(/^S[PM][A-Z0-9]{38,}$/i)) {
    throw new Error("Invalid Stacks address format");
  }

  // Fetch trade stats from Tenero
  const stats = await fetchTradeStats(walletAddress);

  // Build summary for AI
  const summary = `
Wallet: ${walletAddress}

Trading Activity:
- Total Trades: ${stats.total_trades}
- Buys: ${stats.buy_count} ($${stats.buy_volume_usd.toFixed(2)} volume, avg $${stats.avg_buy_volume_usd.toFixed(2)})
- Sells: ${stats.sell_count} ($${stats.sell_volume_usd.toFixed(2)} volume, avg $${stats.avg_sell_volume_usd.toFixed(2)})
- Swaps: ${stats.swap_count} ($${stats.swap_volume_usd.toFixed(2)} volume)
- Trade Netflow: $${stats.trade_netflow_usd.toFixed(2)}

Liquidity Activity:
- Add Liquidity: ${stats.add_liquidity_count} ($${stats.add_volume_usd.toFixed(2)})
- Remove Liquidity: ${stats.remove_liquidity_count} ($${stats.remove_volume_usd.toFixed(2)})
- Liquidity Netflow: $${stats.liquidity_netflow_usd.toFixed(2)}

Diversity:
- Unique Tokens Traded: ${stats.unique_tokens_traded}
- Unique Pools: ${stats.unique_pools_total}
- Unique Platforms: ${stats.unique_platforms_total}

Total Volume: $${stats.total_volume_usd.toFixed(2)}
`;

  // AI analysis via OpenRouter
  const openrouter = getOpenRouter();
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a DeFi trading analyst. Analyze wallet trading behavior and provide insights.

Classify trading style as ONE of:
- day_trader: High frequency, many small trades
- swing_trader: Medium frequency, holds for days/weeks
- hodler: Low frequency, long-term holds
- liquidity_provider: Primarily provides liquidity
- mixed: Combination of styles

Classify risk profile as ONE of:
- conservative: Low volume, diversified, careful
- moderate: Balanced approach
- aggressive: High volume, concentrated bets
- degen: Very high risk, meme coins, high frequency

Respond in valid JSON only:
{
  "tradingStyle": "day_trader|swing_trader|hodler|liquidity_provider|mixed",
  "riskProfile": "conservative|moderate|aggressive|degen",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendation": "Brief actionable recommendation"
}`,
      },
      {
        role: "user",
        content: `Analyze this Stacks wallet's trading behavior:\n${summary}`,
      },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  // Parse AI response
  let analysis: TradingAnalysis = {
    tradingStyle: "mixed",
    riskProfile: "moderate",
    strengths: ["Active trading presence"],
    weaknesses: ["Analysis unavailable"],
    recommendation: "Continue monitoring trading patterns",
  };

  if (content && typeof content === "string") {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validStyles: TradingStyle[] = ["day_trader", "swing_trader", "hodler", "liquidity_provider", "mixed"];
        const validRisks: RiskProfile[] = ["conservative", "moderate", "aggressive", "degen"];

        analysis = {
          tradingStyle: validStyles.includes(parsed.tradingStyle) ? parsed.tradingStyle : "mixed",
          riskProfile: validRisks.includes(parsed.riskProfile) ? parsed.riskProfile : "moderate",
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Active trading presence"],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ["Limited data"],
          recommendation: parsed.recommendation || "Continue monitoring trading patterns",
        };
      } catch {
        // Keep defaults
      }
    }
  }

  return {
    address: walletAddress,
    stats,
    analysis,
  };
}

/**
 * Analyze wallet PnL performance with AI.
 * Combines Tenero PnL distribution with OpenRouter AI analysis.
 */
export async function analyzeWalletPnl(walletAddress: string): Promise<WalletPnlResult> {
  // Validate address format
  if (!walletAddress.match(/^S[PM][A-Z0-9]{38,}$/i)) {
    throw new Error("Invalid Stacks address format");
  }

  // Fetch PnL distribution from Tenero
  const pnl = await fetchPnlDistribution(walletAddress);

  // Calculate totals for summary
  const totalTrades = pnl.total_tokens_with_trade_data;
  const bigLosses = pnl.pnl_lt_50_neg;
  const smallLosses = pnl.pnl_neg50_to_0;
  const smallWins = pnl.pnl_0_to_200;
  const mediumWins = pnl.pnl_200_to_500;
  const bigWins = pnl.pnl_gt_500;

  // Build summary for AI
  const summary = `
Wallet: ${walletAddress}

Win Rate: ${(pnl.winrate * 100).toFixed(1)}%
Total Tokens Traded: ${totalTrades}

PnL Distribution (by token count):
- Big Losses (< -50%): ${bigLosses} tokens
- Small Losses (-50% to 0%): ${smallLosses} tokens
- Small Wins (0% to 200%): ${smallWins} tokens
- Medium Wins (200% to 500%): ${mediumWins} tokens
- Big Wins (> 500%): ${bigWins} tokens

Realized PnL Distribution:
- Big Realized Losses (< -50%): ${pnl.realized_pnl_lt_50_neg}
- Small Realized Losses (-50% to 0%): ${pnl.realized_pnl_neg50_to_0}
- Small Realized Wins (0% to 200%): ${pnl.realized_pnl_0_to_200}
- Medium Realized Wins (200% to 500%): ${pnl.realized_pnl_200_to_500}
- Big Realized Wins (> 500%): ${pnl.realized_pnl_gt_500}
`;

  // AI analysis via OpenRouter
  const openrouter = getOpenRouter();
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a DeFi performance analyst. Analyze wallet profit/loss distribution and provide insights.

Rate performance as ONE of:
- excellent: High win rate, many big wins, few losses
- good: Above average win rate, positive overall
- average: ~50% win rate, balanced wins/losses
- poor: Below average win rate, more losses
- very_poor: Low win rate, many big losses

Provide a consistencyScore from 0-100 (100 = very consistent results).

Respond in valid JSON only:
{
  "performanceRating": "excellent|good|average|poor|very_poor",
  "riskRewardRatio": "Brief description like '2:1 favorable' or '1:3 unfavorable'",
  "consistencyScore": 0-100,
  "keyInsights": ["insight1", "insight2", "insight3"],
  "improvementSuggestions": ["suggestion1", "suggestion2"]
}`,
      },
      {
        role: "user",
        content: `Analyze this Stacks wallet's profit/loss performance:\n${summary}`,
      },
    ],
    temperature: 0.3,
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;

  // Parse AI response
  let analysis: PnlAnalysis = {
    performanceRating: "average",
    riskRewardRatio: "Unknown",
    consistencyScore: 50,
    keyInsights: ["Win rate data available"],
    improvementSuggestions: ["Continue tracking performance"],
  };

  if (content && typeof content === "string") {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validRatings = ["excellent", "good", "average", "poor", "very_poor"] as const;

        analysis = {
          performanceRating: validRatings.includes(parsed.performanceRating)
            ? parsed.performanceRating
            : "average",
          riskRewardRatio: parsed.riskRewardRatio || "Unknown",
          consistencyScore: Math.min(100, Math.max(0, parsed.consistencyScore || 50)),
          keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : ["Win rate data available"],
          improvementSuggestions: Array.isArray(parsed.improvementSuggestions)
            ? parsed.improvementSuggestions
            : ["Continue tracking performance"],
        };
      } catch {
        // Keep defaults
      }
    }
  }

  return {
    address: walletAddress,
    pnl,
    analysis,
  };
}
