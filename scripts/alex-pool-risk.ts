import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const poolId = process.argv[2];
  const investmentAmount = process.argv[3] ? parseFloat(process.argv[3]) : undefined;

  if (!poolId) {
    throw new Error(
      "Usage: bun run scripts/alex-pool-risk.ts <poolId> [investmentAmount]\n" +
        "Example: bun run scripts/alex-pool-risk.ts SM1793C4R5PZ4NS4VQ4WMP7SKKYVH8JZEWSZ9HCCR.xyk-pool-stx-alex 1000"
    );
  }

  const api = await createApiClient();
  const response = await api.post("/api/alex/pool-risk", {
    poolId,
    investmentAmount,
  });
  printResponse(response);
}

run().catch(handleAxiosError);
