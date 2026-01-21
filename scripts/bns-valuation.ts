import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const name = process.argv[2];

  if (!name) {
    throw new Error("Usage: bun run scripts/bns-valuation.ts <name>\nExample: bun run scripts/bns-valuation.ts satoshi");
  }

  const api = await createApiClient();
  const response = await api.post("/api/bns/valuation", { name });
  printResponse(response);
}

run().catch(handleAxiosError);
