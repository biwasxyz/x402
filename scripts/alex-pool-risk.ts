// Alex Pool Risk - AI-enhanced LP position risk analysis with IL scenarios
//
// Example Alex pool IDs (use hash format from Tenero):
//   aBTC/aUSD  - 0x051d7b3543df4c000189f466b570e0d29df55668c8bb914fd468ea434c741b57
//   STX/ALEX   - 0x5b5ccc41f222978fd73284c4c73483e19444cee1eca6a8e948f37a163792603b
//   aBTC/STX   - 0x88d2c0c350cae90ab46d304a859ec77a89e54ff6d09967ee1169eec3d705867c
//
// Example usage:
//   bun run scripts/alex-pool-risk.ts 0x051d7b3543df4c000189f466b570e0d29df55668c8bb914fd468ea434c741b57 1000
//   bun run scripts/alex-pool-risk.ts 0x5b5ccc41f222978fd73284c4c73483e19444cee1eca6a8e948f37a163792603b 5000

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
        "Example: bun run scripts/alex-pool-risk.ts 0x051d7b3543df4c000189f466b570e0d29df55668c8bb914fd468ea434c741b57 1000"
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
