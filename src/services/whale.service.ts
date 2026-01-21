// Smart Money Tracking Service
import { getWhaleTrades } from "./tenero-market.service";
import { getOpenRouter } from "./openrouter.service";
import { WhaleTrade } from "./tenero/types";

// Result types
export interface SmartMoneyWallet {
  address: string;
  label: string;
  category: "accumulator" | "trader" | "market-maker" | "institutional" | "unknown";
  recentActivity: {
    buyCount: number;
    sellCount: number;
    netBuyVolume: number;
    totalVolume: number;
  };
  tokens: Array<{
    symbol: string;
    action: "buying" | "selling" | "mixed";
    volume: number;
  }>;
  confidence: number;
}

export interface SmartMoneyAnalysis {
  timeframe: string;
  totalWhaleTransactions: number;
  totalVolumeUsd: number;
  smartMoneyWallets: SmartMoneyWallet[];
  marketSignals: {
    overallSentiment: "bullish" | "bearish" | "neutral";
    topBoughtTokens: Array<{ symbol: string; volume: number }>;
    topSoldTokens: Array<{ symbol: string; volume: number }>;
    netFlowDirection: "inflow" | "outflow" | "balanced";
  };
  insights: string[];
  tradingRecommendation: string;
}

// Aggregate wallet activity from whale trades
interface WalletActivity {
  address: string;
  name?: string;
  buys: WhaleTrade[];
  sells: WhaleTrade[];
  totalBuyVolume: number;
  totalSellVolume: number;
}

function aggregateWalletActivity(trades: WhaleTrade[]): Map<string, WalletActivity> {
  const walletMap = new Map<string, WalletActivity>();

  for (const trade of trades) {
    const address = trade.maker;
    if (!walletMap.has(address)) {
      walletMap.set(address, {
        address,
        name: trade.maker_name || undefined,
        buys: [],
        sells: [],
        totalBuyVolume: 0,
        totalSellVolume: 0,
      });
    }

    const wallet = walletMap.get(address)!;
    if (trade.event_type === "buy") {
      wallet.buys.push(trade);
      wallet.totalBuyVolume += trade.amount_usd;
    } else {
      wallet.sells.push(trade);
      wallet.totalSellVolume += trade.amount_usd;
    }
  }

  return walletMap;
}

// Get token activity for a wallet
function getTokenActivity(activity: WalletActivity): Array<{ symbol: string; action: "buying" | "selling" | "mixed"; volume: number }> {
  const tokenMap = new Map<string, { buyVolume: number; sellVolume: number }>();

  for (const trade of activity.buys) {
    const symbol = trade.base_token?.symbol || "UNKNOWN";
    if (!tokenMap.has(symbol)) {
      tokenMap.set(symbol, { buyVolume: 0, sellVolume: 0 });
    }
    tokenMap.get(symbol)!.buyVolume += trade.amount_usd;
  }

  for (const trade of activity.sells) {
    const symbol = trade.base_token?.symbol || "UNKNOWN";
    if (!tokenMap.has(symbol)) {
      tokenMap.set(symbol, { buyVolume: 0, sellVolume: 0 });
    }
    tokenMap.get(symbol)!.sellVolume += trade.amount_usd;
  }

  return Array.from(tokenMap.entries())
    .map(([symbol, data]) => ({
      symbol,
      action: (data.buyVolume > data.sellVolume * 1.5 ? "buying" :
        data.sellVolume > data.buyVolume * 1.5 ? "selling" : "mixed") as "buying" | "selling" | "mixed",
      volume: data.buyVolume + data.sellVolume,
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);
}

// Categorize wallet based on behavior
function categorizeWallet(activity: WalletActivity): "accumulator" | "trader" | "market-maker" | "institutional" | "unknown" {
  const totalTrades = activity.buys.length + activity.sells.length;
  const buyRatio = activity.buys.length / Math.max(totalTrades, 1);
  const totalVolume = activity.totalBuyVolume + activity.totalSellVolume;

  // High volume, balanced trading = likely market maker
  if (totalVolume > 100000 && Math.abs(buyRatio - 0.5) < 0.15) {
    return "market-maker";
  }

  // Very high volume = institutional
  if (totalVolume > 500000) {
    return "institutional";
  }

  // Mostly buying = accumulator
  if (buyRatio > 0.7) {
    return "accumulator";
  }

  // Active trading with some bias
  if (totalTrades >= 5) {
    return "trader";
  }

  return "unknown";
}

export async function trackSmartMoney(limit: number = 100): Promise<SmartMoneyAnalysis> {
  // Validate limit
  const validLimit = Math.min(Math.max(limit, 10), 200);

  // Fetch recent whale trades
  const trades = await getWhaleTrades(validLimit);

  if (trades.length === 0) {
    return {
      timeframe: "recent",
      totalWhaleTransactions: 0,
      totalVolumeUsd: 0,
      smartMoneyWallets: [],
      marketSignals: {
        overallSentiment: "neutral",
        topBoughtTokens: [],
        topSoldTokens: [],
        netFlowDirection: "balanced",
      },
      insights: ["No whale activity detected in the selected timeframe."],
      tradingRecommendation: "Monitor the market for whale activity before making trading decisions.",
    };
  }

  // Aggregate by wallet
  const walletActivity = aggregateWalletActivity(trades);

  // Calculate totals
  const totalVolumeUsd = trades.reduce((sum, t) => sum + t.amount_usd, 0);
  const totalBuyVolume = trades.filter(t => t.event_type === "buy").reduce((sum, t) => sum + t.amount_usd, 0);
  const totalSellVolume = trades.filter(t => t.event_type === "sell").reduce((sum, t) => sum + t.amount_usd, 0);

  // Get top wallets by volume
  const topWallets = Array.from(walletActivity.values())
    .sort((a, b) => (b.totalBuyVolume + b.totalSellVolume) - (a.totalBuyVolume + a.totalSellVolume))
    .slice(0, 20);

  // Build smart money wallet profiles
  const smartMoneyWallets: SmartMoneyWallet[] = topWallets.map(wallet => ({
    address: wallet.address,
    label: wallet.name || `Whale ${wallet.address.slice(0, 8)}...`,
    category: categorizeWallet(wallet),
    recentActivity: {
      buyCount: wallet.buys.length,
      sellCount: wallet.sells.length,
      netBuyVolume: wallet.totalBuyVolume - wallet.totalSellVolume,
      totalVolume: wallet.totalBuyVolume + wallet.totalSellVolume,
    },
    tokens: getTokenActivity(wallet),
    confidence: Math.min(1, (wallet.buys.length + wallet.sells.length) / 10),
  }));

  // Calculate token aggregates
  const tokenBuyVolumes = new Map<string, number>();
  const tokenSellVolumes = new Map<string, number>();

  for (const trade of trades) {
    const symbol = trade.base_token?.symbol || "UNKNOWN";
    if (trade.event_type === "buy") {
      tokenBuyVolumes.set(symbol, (tokenBuyVolumes.get(symbol) || 0) + trade.amount_usd);
    } else {
      tokenSellVolumes.set(symbol, (tokenSellVolumes.get(symbol) || 0) + trade.amount_usd);
    }
  }

  const topBoughtTokens = Array.from(tokenBuyVolumes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symbol, volume]) => ({ symbol, volume }));

  const topSoldTokens = Array.from(tokenSellVolumes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symbol, volume]) => ({ symbol, volume }));

  // Determine net flow direction
  const netFlow = totalBuyVolume - totalSellVolume;
  const netFlowDirection: "inflow" | "outflow" | "balanced" =
    netFlow > totalVolumeUsd * 0.1 ? "inflow" :
      netFlow < -totalVolumeUsd * 0.1 ? "outflow" : "balanced";

  // Build summary for AI analysis
  const summary = `
Smart Money Analysis (Last ${trades.length} whale trades):

Total Volume: $${totalVolumeUsd.toLocaleString()}
Buy Volume: $${totalBuyVolume.toLocaleString()}
Sell Volume: $${totalSellVolume.toLocaleString()}
Net Flow: $${netFlow.toLocaleString()} (${netFlowDirection})

Top Smart Money Wallets:
${smartMoneyWallets.slice(0, 10).map(w =>
  `- ${w.label} (${w.category}): ${w.recentActivity.buyCount} buys, ${w.recentActivity.sellCount} sells, Net: $${w.recentActivity.netBuyVolume.toLocaleString()}`
).join("\n")}

Top Bought Tokens:
${topBoughtTokens.map(t => `- ${t.symbol}: $${t.volume.toLocaleString()}`).join("\n")}

Top Sold Tokens:
${topSoldTokens.map(t => `- ${t.symbol}: $${t.volume.toLocaleString()}`).join("\n")}

Wallet Categories:
- Accumulators: ${smartMoneyWallets.filter(w => w.category === "accumulator").length}
- Traders: ${smartMoneyWallets.filter(w => w.category === "trader").length}
- Market Makers: ${smartMoneyWallets.filter(w => w.category === "market-maker").length}
- Institutional: ${smartMoneyWallets.filter(w => w.category === "institutional").length}

Provide:
1. Overall market sentiment based on smart money activity
2. 3-5 key insights about what smart money is doing
3. Trading recommendation based on whale behavior
`;

  const openrouter = getOpenRouter();
  const completion = await openrouter.chat.send({
    model: "x-ai/grok-4.1-fast",
    messages: [
      {
        role: "system",
        content: `You are a smart money analyst tracking whale activity on the Stacks blockchain.

Analyze whale trading patterns to:
- Identify market sentiment from large holder behavior
- Spot accumulation vs distribution phases
- Highlight tokens being bought/sold by smart money
- Provide actionable trading signals

Respond in valid JSON format only:
{
  "overallSentiment": "bullish" | "bearish" | "neutral",
  "insights": ["insight1", "insight2", "insight3"],
  "tradingRecommendation": "Actionable recommendation based on smart money behavior"
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

  let parsed: {
    overallSentiment: "bullish" | "bearish" | "neutral";
    insights: string[];
    tradingRecommendation: string;
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
    parsed = {
      overallSentiment: netFlowDirection === "inflow" ? "bullish" :
        netFlowDirection === "outflow" ? "bearish" : "neutral",
      insights: [
        `${trades.length} whale transactions tracked with $${totalVolumeUsd.toLocaleString()} total volume.`,
        `Net ${netFlowDirection}: ${netFlowDirection === "inflow" ? "Whales are accumulating" : netFlowDirection === "outflow" ? "Whales are distributing" : "Balanced activity"}.`,
      ],
      tradingRecommendation: "Follow smart money flows and monitor for continued accumulation or distribution patterns.",
    };
  }

  // Validate sentiment
  const validSentiments = ["bullish", "bearish", "neutral"];
  if (!validSentiments.includes(parsed.overallSentiment)) {
    parsed.overallSentiment = "neutral";
  }

  return {
    timeframe: "recent",
    totalWhaleTransactions: trades.length,
    totalVolumeUsd,
    smartMoneyWallets: smartMoneyWallets.slice(0, 15),
    marketSignals: {
      overallSentiment: parsed.overallSentiment,
      topBoughtTokens,
      topSoldTokens,
      netFlowDirection,
    },
    insights: parsed.insights || [],
    tradingRecommendation: parsed.tradingRecommendation || "Monitor whale activity for trading signals.",
  };
}
