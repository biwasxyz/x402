// Hiro Stacks API client for BNS, NFT, and transfer data
import { trackedFetch } from "../analytics.service";
import {
  BnsNameInfo,
  BnsAddressNamesResponse,
  NftHoldingsResponse,
  TransactionsWithTransfersResponse,
  BalancesResponse,
} from "./types";

const HIRO_BASE_URL = "https://api.mainnet.hiro.so";

export class HiroApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message);
    this.name = "HiroApiError";
  }
}

export async function hiroFetch<T>(
  path: string,
  callerEndpoint: string = "/api/hiro"
): Promise<T> {
  const url = `${HIRO_BASE_URL}${path}`;
  console.log(`[hiro] Fetching: ${url}`);

  const response = await trackedFetch(callerEndpoint, url);

  if (response.status === 404) {
    throw new HiroApiError(`Not found: ${path}`, 404, path);
  }

  if (!response.ok) {
    throw new HiroApiError(
      `Hiro API error: ${response.status} ${response.statusText}`,
      response.status,
      path
    );
  }

  return (await response.json()) as T;
}

// BNS Fetchers

export async function fetchBnsName(
  name: string,
  callerEndpoint: string = "/api/bns/valuation"
): Promise<BnsNameInfo | null> {
  const cleanName = name.replace(/\.btc$/, "");
  try {
    return await hiroFetch<BnsNameInfo>(
      `/v1/names/${cleanName}.btc`,
      callerEndpoint
    );
  } catch (error) {
    if (error instanceof HiroApiError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchAddressNames(
  address: string,
  callerEndpoint: string = "/api/bns/portfolio"
): Promise<string[]> {
  try {
    const response = await hiroFetch<BnsAddressNamesResponse>(
      `/v1/addresses/stacks/${address}/names`,
      callerEndpoint
    );
    return response.names || [];
  } catch (error) {
    if (error instanceof HiroApiError && error.statusCode === 404) {
      return [];
    }
    throw error;
  }
}

// NFT Fetchers

export async function fetchNftHoldings(
  address: string,
  limit: number = 50,
  offset: number = 0,
  callerEndpoint: string = "/api/nft/portfolio-valuation"
): Promise<NftHoldingsResponse> {
  return hiroFetch<NftHoldingsResponse>(
    `/extended/v1/tokens/nft/holdings?principal=${address}&limit=${limit}&offset=${offset}`,
    callerEndpoint
  );
}

// Transfer Fetchers

export async function fetchTokenTransfers(
  address: string,
  limit: number = 50,
  offset: number = 0,
  callerEndpoint: string = "/api/sbtc/whale-flows"
): Promise<TransactionsWithTransfersResponse> {
  return hiroFetch<TransactionsWithTransfersResponse>(
    `/extended/v1/address/${address}/transactions_with_transfers?limit=${limit}&offset=${offset}`,
    callerEndpoint
  );
}

// Balance Fetchers

export async function fetchBalances(
  address: string,
  callerEndpoint: string = "/api/wallet"
): Promise<BalancesResponse> {
  return hiroFetch<BalancesResponse>(
    `/extended/v1/address/${address}/balances`,
    callerEndpoint
  );
}

// sBTC specific helper
const SBTC_CONTRACT = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc";

export function isSbtcTransfer(assetIdentifier: string): boolean {
  return assetIdentifier === SBTC_CONTRACT;
}

export function getSbtcBalance(balances: BalancesResponse): string {
  const sbtcBalance = balances.fungible_tokens[SBTC_CONTRACT];
  return sbtcBalance?.balance || "0";
}
