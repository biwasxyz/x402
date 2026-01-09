// Zest Interest Forecast - Predict interest rates for 24h and 7d
//
// No parameters required - analyzes all Zest lending markets
// Returns supply/borrow rate predictions for: STX, sBTC, stSTX, aeUSDC
//
// Example usage:
//   bun run scripts/zest-interest-forecast.ts

import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const api = await createApiClient();
  const response = await api.get("/api/zest/interest-forecast");
  printResponse(response);
}

run().catch(handleAxiosError);
