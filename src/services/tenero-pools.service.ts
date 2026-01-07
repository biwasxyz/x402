// Tenero Pools Service - Trending pools and OHLC data

import { teneroFetch } from "./tenero/client";
import { TrendingPool, PoolOhlc, TrendingTimeframe, OhlcParams } from "./tenero/types";

/**
 * Get trending pools by trading activity.
 * @param timeframe Time window: "1h", "4h", "1d", "7d"
 */
export async function getTrendingPools(
  timeframe: TrendingTimeframe = "1d"
): Promise<TrendingPool[]> {
  return teneroFetch<TrendingPool[]>(`/pools/trending/${timeframe}`);
}

/**
 * Get OHLCV candlestick data for a specific pool.
 * @param poolId Pool identifier (e.g., "SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-pool-leo-stx-v-1-1")
 * @param params OHLC parameters (period, from, to, limit)
 */
export async function getPoolOhlc(
  poolId: string,
  params: OhlcParams = {}
): Promise<PoolOhlc[]> {
  const queryParams = new URLSearchParams();
  if (params.period) queryParams.set("period", params.period);
  if (params.from) queryParams.set("from", params.from.toString());
  if (params.to) queryParams.set("to", params.to.toString());
  if (params.limit) queryParams.set("limit", params.limit.toString());

  const query = queryParams.toString();
  const path = `/pools/${encodeURIComponent(poolId)}/ohlc${query ? `?${query}` : ""}`;
  return teneroFetch<PoolOhlc[]>(path);
}
