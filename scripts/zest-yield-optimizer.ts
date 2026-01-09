// Zest Yield Optimizer - AI-generated lending yield strategies
//
// Risk tolerance levels:
//   conservative - Supply-only strategies, no leverage
//   moderate     - Light leverage, balanced risk/reward
//   aggressive   - Higher leverage, maximum yield potential
//
// Example usage:
//   bun run scripts/zest-yield-optimizer.ts 5000 moderate
//   bun run scripts/zest-yield-optimizer.ts 10000 conservative
//   bun run scripts/zest-yield-optimizer.ts 25000 aggressive

import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const capitalUsd = parseFloat(process.argv[2]);
  const riskTolerance = process.argv[3] as "conservative" | "moderate" | "aggressive";

  if (isNaN(capitalUsd) || !riskTolerance) {
    throw new Error(
      "Usage: bun run scripts/zest-yield-optimizer.ts <capitalUsd> <riskTolerance>\n" +
        "Risk tolerance: conservative | moderate | aggressive\n" +
        "Example: bun run scripts/zest-yield-optimizer.ts 5000 moderate"
    );
  }

  if (!["conservative", "moderate", "aggressive"].includes(riskTolerance)) {
    throw new Error("riskTolerance must be: conservative, moderate, or aggressive");
  }

  const api = await createApiClient();
  const response = await api.post("/api/zest/yield-optimizer", {
    capitalUsd,
    riskTolerance,
  });
  printResponse(response);
}

run().catch(handleAxiosError);
