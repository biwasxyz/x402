import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const poolId = process.argv[2];
  const period = process.argv[3] || "1h";
  const limit = process.argv[4] || "100";

  if (!poolId) {
    throw new Error(
      "Usage: bun run scripts/pools-ohlc.ts <poolId> [period] [limit]\n" +
        "Example: bun run scripts/pools-ohlc.ts SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-pool-leo-stx-v-1-1 1h 24"
    );
  }

  const api = await createApiClient();
  const response = await api.post("/api/pools/ohlc", {
    poolId,
    period,
    limit: parseInt(limit, 10),
  });
  printResponse(response);
}

run().catch(handleAxiosError);
