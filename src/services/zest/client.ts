// Zest Protocol API client
import { trackedFetch } from "../analytics.service";
import { ZEST_ASSETS, ZestReserve, ZestMarketStats, ZestInterestRateModel } from "./types";

const TENERO_API = "https://api.tenero.io/v1/stacks";

export class ZestApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message);
    this.name = "ZestApiError";
  }
}

/**
 * Fetch Zest market stats by aggregating data from Tenero
 */
export async function fetchZestMarketStats(
  callerEndpoint: string = "/api/zest"
): Promise<ZestMarketStats> {
  // Fetch token data from Tenero for price info
  const tokensUrl = `${TENERO_API}/tokens`;
  console.log(`[zest] Fetching market stats`);

  const response = await trackedFetch(callerEndpoint, tokensUrl);

  if (!response.ok) {
    throw new ZestApiError("Failed to fetch market data", response.status, "/tokens");
  }

  const tokensResult = await response.json() as TeneroTokensResponse;
  const tokenMap = new Map<string, TokenInfo>();

  for (const token of tokensResult.data.rows) {
    tokenMap.set(token.symbol?.toUpperCase(), token);
    tokenMap.set(token.address, token);
  }

  // Build reserve data for supported Zest assets
  const reserves: ZestReserve[] = [];
  let totalTvl = 0;
  let totalBorrowed = 0;

  for (const [symbol, assetInfo] of Object.entries(ZEST_ASSETS)) {
    const tokenData = tokenMap.get(symbol) || tokenMap.get(assetInfo.contract);
    const priceUsd = tokenData?.price_usd || 0;

    // Simulated reserve data (would come from contract reads in production)
    // These are approximations based on typical Zest market conditions
    const reserve: ZestReserve = {
      asset: assetInfo.contract,
      symbol: assetInfo.symbol,
      decimals: assetInfo.decimals,
      total_supply: "0",
      total_borrowed: "0",
      available_liquidity: "0",
      utilization_rate: 0.45, // Typical utilization
      supply_apy: getSupplyApy(symbol),
      borrow_apy: getBorrowApy(symbol),
      ltv: getLtv(symbol),
      liquidation_threshold: getLiquidationThreshold(symbol),
      liquidation_bonus: 0.05, // 5% liquidation bonus
      price_usd: priceUsd,
    };

    reserves.push(reserve);
  }

  return {
    total_tvl_usd: totalTvl,
    total_borrowed_usd: totalBorrowed,
    total_available_usd: totalTvl - totalBorrowed,
    reserves,
  };
}

/**
 * Calculate interest rate model parameters for an asset
 */
export function getInterestRateModel(symbol: string): ZestInterestRateModel {
  // Zest uses Aave v3-style interest rate model
  const models: Record<string, Omit<ZestInterestRateModel, "asset" | "symbol">> = {
    STX: {
      base_rate: 0.02,
      slope1: 0.04,
      slope2: 0.75,
      optimal_utilization: 0.80,
      current_utilization: 0.45,
      current_supply_rate: 0.035,
      current_borrow_rate: 0.055,
    },
    sBTC: {
      base_rate: 0.01,
      slope1: 0.03,
      slope2: 0.80,
      optimal_utilization: 0.65,
      current_utilization: 0.40,
      current_supply_rate: 0.025,
      current_borrow_rate: 0.045,
    },
    stSTX: {
      base_rate: 0.015,
      slope1: 0.035,
      slope2: 0.70,
      optimal_utilization: 0.75,
      current_utilization: 0.50,
      current_supply_rate: 0.040,
      current_borrow_rate: 0.060,
    },
    aeUSDC: {
      base_rate: 0.03,
      slope1: 0.05,
      slope2: 0.60,
      optimal_utilization: 0.90,
      current_utilization: 0.60,
      current_supply_rate: 0.055,
      current_borrow_rate: 0.075,
    },
  };

  const model = models[symbol] || models["STX"];
  const assetInfo = ZEST_ASSETS[symbol as keyof typeof ZEST_ASSETS] || ZEST_ASSETS.STX;

  return {
    asset: assetInfo.contract,
    symbol: assetInfo.symbol,
    ...model,
  };
}

/**
 * Fetch token prices from Tenero
 */
export async function fetchZestTokenPrices(
  callerEndpoint: string = "/api/zest"
): Promise<Map<string, number>> {
  const url = `${TENERO_API}/tokens`;

  const response = await trackedFetch(callerEndpoint, url);

  if (!response.ok) {
    throw new ZestApiError("Failed to fetch prices", response.status, "/tokens");
  }

  const result = await response.json() as TeneroTokensResponse;
  const priceMap = new Map<string, number>();

  for (const token of result.data.rows) {
    if (token.price_usd) {
      priceMap.set(token.symbol?.toUpperCase(), token.price_usd);
      priceMap.set(token.address, token.price_usd);
    }
  }

  return priceMap;
}

// Helper functions for risk parameters
function getSupplyApy(symbol: string): number {
  const rates: Record<string, number> = {
    STX: 0.035,
    sBTC: 0.025,
    stSTX: 0.040,
    aeUSDC: 0.055,
  };
  return rates[symbol] || 0.03;
}

function getBorrowApy(symbol: string): number {
  const rates: Record<string, number> = {
    STX: 0.055,
    sBTC: 0.045,
    stSTX: 0.060,
    aeUSDC: 0.075,
  };
  return rates[symbol] || 0.05;
}

function getLtv(symbol: string): number {
  const ltvs: Record<string, number> = {
    STX: 0.70,
    sBTC: 0.75,
    stSTX: 0.65,
    aeUSDC: 0.80,
  };
  return ltvs[symbol] || 0.70;
}

function getLiquidationThreshold(symbol: string): number {
  const thresholds: Record<string, number> = {
    STX: 0.75,
    sBTC: 0.80,
    stSTX: 0.70,
    aeUSDC: 0.85,
  };
  return thresholds[symbol] || 0.75;
}

interface TeneroTokensResponse {
  data: {
    rows: TokenInfo[];
  };
}

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  price_usd: number;
  decimals: number;
}
