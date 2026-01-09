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

  const result = await response.json() as { data: AlexPoolData[] };
  // Filter to Alex pools only (platform = alex)
  return result.data.filter((p: AlexPoolData) => p.platform?.toLowerCase() === "alex");
}

export interface AlexPoolData {
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

  const result = await response.json() as { data: TokenData[] };
  const priceMap = new Map<string, number>();

  for (const token of result.data) {
    if (token.token_address && token.price_usd) {
      priceMap.set(token.token_address, token.price_usd);
      if (token.symbol) {
        priceMap.set(token.symbol.toUpperCase(), token.price_usd);
      }
    }
  }

  return priceMap;
}

interface TokenData {
  token_address: string;
  symbol: string;
  price_usd: number;
}
