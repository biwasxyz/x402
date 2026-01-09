// DeFi Strategy Builder - AI-generated DeFi strategy with execution plan
//
// Risk tolerance levels:
//   conservative - Low-risk strategies, minimal leverage
//   moderate     - Balanced risk/reward, light leverage
//   aggressive   - High-yield focus, higher leverage
//
// Time horizons:
//   short  - Days to weeks (focus on quick opportunities)
//   medium - Weeks to months (balanced approach)
//   long   - Months to years (compound growth focus)
//
// Example usage:
//   bun run scripts/defi-strategy-builder.ts 5000 conservative short
//   bun run scripts/defi-strategy-builder.ts 10000 moderate medium
//   bun run scripts/defi-strategy-builder.ts 50000 aggressive long

import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const capitalUsd = parseFloat(process.argv[2]);
  const riskTolerance = process.argv[3] as "conservative" | "moderate" | "aggressive";
  const timeHorizon = process.argv[4] as "short" | "medium" | "long";

  if (isNaN(capitalUsd) || !riskTolerance || !timeHorizon) {
    throw new Error(
      "Usage: bun run scripts/defi-strategy-builder.ts <capitalUsd> <riskTolerance> <timeHorizon>\n" +
        "Risk tolerance: conservative | moderate | aggressive\n" +
        "Time horizon: short | medium | long\n" +
        "Example: bun run scripts/defi-strategy-builder.ts 10000 moderate medium"
    );
  }

  if (!["conservative", "moderate", "aggressive"].includes(riskTolerance)) {
    throw new Error("riskTolerance must be: conservative, moderate, or aggressive");
  }

  if (!["short", "medium", "long"].includes(timeHorizon)) {
    throw new Error("timeHorizon must be: short, medium, or long");
  }

  const api = await createApiClient();
  const response = await api.post("/api/defi/strategy-builder", {
    capitalUsd,
    riskTolerance,
    goals: ["yield", "growth"],
    timeHorizon,
  });
  printResponse(response);
}

run().catch(handleAxiosError);
