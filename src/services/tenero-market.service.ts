// Tenero Market Service - Market stats, gainers/losers, whales, netflow

import { teneroFetch } from "./tenero/client";
import {
  MarketStatsDay,
  TokenData,
  WhaleTradesResponse,
  WhaleTrade,
  HourlyNetflow,
} from "./tenero/types";

/**
 * Get aggregated market statistics for the Stacks DeFi ecosystem.
 * Returns daily trading metrics including volume, trader counts, and pool activity.
 */
export async function getMarketStats(): Promise<MarketStatsDay[]> {
  return teneroFetch<MarketStatsDay[]>("/market/stats");
}

/**
 * Get top gaining tokens by price change.
 * @param limit Maximum number of tokens to return (default 10)
 */
export async function getTopGainers(limit: number = 10): Promise<TokenData[]> {
  return teneroFetch<TokenData[]>(`/market/top_gainers?limit=${limit}`);
}

/**
 * Get top losing tokens by price change.
 * @param limit Maximum number of tokens to return (default 10)
 */
export async function getTopLosers(limit: number = 10): Promise<TokenData[]> {
  return teneroFetch<TokenData[]>(`/market/top_losers?limit=${limit}`);
}

/**
 * Get recent whale trades (large transactions).
 * @param limit Maximum number of trades to return (default 20)
 */
export async function getWhaleTrades(limit: number = 20): Promise<WhaleTrade[]> {
  const response = await teneroFetch<WhaleTradesResponse>(
    `/market/whale_trades?limit=${limit}`
  );
  return response.rows || [];
}

/**
 * Get hourly net flow of funds in/out of the market.
 */
export async function getHourlyNetflow(): Promise<HourlyNetflow[]> {
  return teneroFetch<HourlyNetflow[]>("/market/hourly_netflow");
}
