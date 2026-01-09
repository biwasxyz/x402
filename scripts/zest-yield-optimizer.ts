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
        "Example: bun run scripts/zest-yield-optimizer.ts 10000 moderate"
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
