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
        "Example: bun run scripts/alex-swap-optimizer.ts STX ALEX 100"
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
