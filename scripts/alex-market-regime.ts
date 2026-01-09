// Alex Market Regime - Detects current market conditions (trending/ranging/volatile)
//
// No parameters required - analyzes all Alex DEX pools to determine market regime
//
// Example usage:
//   bun run scripts/alex-market-regime.ts

import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const api = await createApiClient();
  const response = await api.get("/api/alex/market-regime");
  printResponse(response);
}

run().catch(handleAxiosError);
