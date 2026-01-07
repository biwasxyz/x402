// Tenero Tokens Service - Token market summary and profile

import { teneroFetch } from "./tenero/client";
import { TokenMarketSummary, TokenProfile, TokenData } from "./tenero/types";

/**
 * Get token market summary with weighted price across all pools.
 * @param tokenAddress Token contract address (e.g., "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-abtc")
 */
export async function getTokenSummary(tokenAddress: string): Promise<TokenMarketSummary> {
  return teneroFetch<TokenMarketSummary>(
    `/tokens/${encodeURIComponent(tokenAddress)}/market_summary`
  );
}

/**
 * Get detailed token profile with metadata.
 * @param tokenAddress Token contract address
 */
export async function getTokenProfile(tokenAddress: string): Promise<TokenProfile> {
  return teneroFetch<TokenProfile>(
    `/tokens/${encodeURIComponent(tokenAddress)}/profile`
  );
}

/**
 * Get full token details including supply, holders, and market data.
 * @param tokenAddress Token contract address
 */
export async function getTokenDetails(tokenAddress: string): Promise<TokenData> {
  return teneroFetch<TokenData>(`/tokens/${encodeURIComponent(tokenAddress)}`);
}
