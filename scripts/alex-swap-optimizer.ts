// Alex Swap Optimizer - AI-enhanced swap route optimization
//
// Example tokens (use symbol or full contract address):
//   STX  - SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-wstx-v2
//   ALEX - SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-alex
//   aBTC - SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-abtc
//   aUSD - SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-susdt
//
// Example usage:
//   bun run scripts/alex-swap-optimizer.ts STX ALEX 100
//   bun run scripts/alex-swap-optimizer.ts aBTC aUSD 0.1

import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const tokenIn = process.argv[2];
  const tokenOut = process.argv[3];
  const amountIn = parseFloat(process.argv[4]);

  if (!tokenIn || !tokenOut || isNaN(amountIn)) {
    throw new Error(
      "Usage: bun run scripts/alex-swap-optimizer.ts <tokenIn> <tokenOut> <amountIn>\n" +
        "Example: bun run scripts/alex-swap-optimizer.ts STX ALEX 100\n" +
        "         bun run scripts/alex-swap-optimizer.ts aBTC aUSD 0.1"
    );
  }

  const api = await createApiClient();
  const response = await api.post("/api/alex/swap-optimizer", {
    tokenIn,
    tokenOut,
    amountIn,
  });
  printResponse(response);
}

run().catch(handleAxiosError);
