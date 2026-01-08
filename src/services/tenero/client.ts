// Tenero API client for Stacks DeFi market data
import { trackedFetch } from "../analytics.service";

const TENERO_BASE_URL = "https://api.tenero.io";
const DEFAULT_CHAIN = "stacks";

export class TeneroApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message);
    this.name = "TeneroApiError";
  }
}

interface TeneroResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export async function teneroFetch<T>(
  path: string,
  chain: string = DEFAULT_CHAIN,
  callerEndpoint: string = "/api/tenero"
): Promise<T> {
  const url = `${TENERO_BASE_URL}/v1/${chain}${path}`;
  console.log(`[tenero] Fetching: ${url}`);

  const response = await trackedFetch(callerEndpoint, url);

  if (!response.ok) {
    throw new TeneroApiError(
      `Tenero API error: ${response.status} ${response.statusText}`,
      response.status,
      path
    );
  }

  const result = (await response.json()) as TeneroResponse<T>;

  if (result.statusCode !== 200) {
    throw new TeneroApiError(
      `Tenero error: ${result.message}`,
      result.statusCode,
      path
    );
  }

  return result.data;
}
