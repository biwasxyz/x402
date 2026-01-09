// Alex Lab API client for Stacks DeFi
import { trackedFetch } from "../analytics.service";

const ALEX_API_BASE = "https://api.alexlab.co";

export class AlexApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message);
    this.name = "AlexApiError";
  }
}

/**
 * Fetch from Alex Lab API
 */
export async function alexFetch<T>(
  path: string,
  callerEndpoint: string = "/api/alex"
): Promise<T> {
  const url = `${ALEX_API_BASE}${path}`;
  console.log(`[alex] Fetching: ${url}`);

  const response = await trackedFetch(callerEndpoint, url);

  if (!response.ok) {
    throw new AlexApiError(
      `Alex API error: ${response.status} ${response.statusText}`,
      response.status,
      path
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch all Alex pools from Tenero (which indexes Alex)
 */
export async function fetchAlexPools(callerEndpoint: string = "/api/alex"): Promise<AlexPoolData[]> {
  const url = "https://api.tenero.io/v1/stacks/pools";
  console.log(`[alex] Fetching pools from Tenero`);

  const response = await trackedFetch(callerEndpoint, url);

  if (!response.ok) {
    throw new AlexApiError("Failed to fetch pools", response.status, "/pools");
  }

  const result = await response.json() as TeneroPoolsResponse;
  // Filter to Alex pools only (pool_platform = ALEX)
  const alexPools = result.data.rows.filter((p) => p.pool_platform?.toUpperCase() === "ALEX");

  // Map to our AlexPoolData format
  return alexPools.map((p): AlexPoolData => ({
    pool_id: p.pool_id,
    pool_address: p.pool_address || p.pool_id,
    platform: p.pool_platform,
    token_0_address: p.token0_address,
    token_1_address: p.token1_address,
    token_0_symbol: p.base_token?.symbol || "",
    token_1_symbol: p.quote_token?.symbol || "",
    token_0_reserve: String(p.base_token_reserve || 0),
    token_1_reserve: String(p.quote_token_reserve || 0),
    token_0_price_usd: p.base_token_price_usd || 0,
    token_1_price_usd: p.quote_token_price_usd || 0,
    tvl_usd: p.liquidity_usd || 0,
    volume_24h_usd: p.metrics?.volume_1d_usd || 0,
    fee_rate: p.fee_rate || 0.003,
  }));
}

interface TeneroPoolsResponse {
  data: {
    rows: TeneroPoolRow[];
  };
}

interface TeneroPoolRow {
  pool_id: string;
  pool_address: string;
  pool_platform: string;
  token0_address: string;
  token1_address: string;
  base_token?: { symbol: string };
  quote_token?: { symbol: string };
  base_token_reserve: number;
  quote_token_reserve: number;
  base_token_price_usd?: number;
  quote_token_price_usd?: number;
  liquidity_usd?: number;
  fee_rate?: number;
  metrics?: { volume_1d_usd?: number };
}

export interface AlexPoolData {
  pool_id: string;
  pool_address: string;
  platform: string;
  token_0_address: string;
  token_1_address: string;
  token_0_symbol: string;
  token_1_symbol: string;
  token_0_reserve: string;
  token_1_reserve: string;
  token_0_price_usd: number;
  token_1_price_usd: number;
  tvl_usd: number;
  volume_24h_usd: number;
  fee_rate: number;
}

/**
 * Fetch token prices from Tenero
 */
export async function fetchTokenPrices(callerEndpoint: string = "/api/alex"): Promise<Map<string, number>> {
  const url = "https://api.tenero.io/v1/stacks/tokens";
  console.log(`[alex] Fetching token prices`);

  const response = await trackedFetch(callerEndpoint, url);

  if (!response.ok) {
    throw new AlexApiError("Failed to fetch tokens", response.status, "/tokens");
  }

  const result = await response.json() as TeneroTokensResponse;
  const priceMap = new Map<string, number>();

  for (const token of result.data.rows) {
    if (token.address && token.price_usd) {
      priceMap.set(token.address, token.price_usd);
      if (token.symbol) {
        priceMap.set(token.symbol.toUpperCase(), token.price_usd);
      }
    }
  }

  return priceMap;
}

interface TeneroTokensResponse {
  data: {
    rows: TeneroTokenRow[];
  };
}

interface TeneroTokenRow {
  address: string;
  symbol: string;
  price_usd: number;
}
