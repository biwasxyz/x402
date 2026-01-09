// Alex Arbitrage Scanner - Cross-pool arbitrage opportunity finder
//
// No parameters required - scans all Alex DEX pools for price discrepancies
//
// Example usage:
//   bun run scripts/alex-arbitrage-scan.ts

import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const api = await createApiClient();
  const response = await api.get("/api/alex/arbitrage-scan");
  printResponse(response);
}

run().catch(handleAxiosError);
