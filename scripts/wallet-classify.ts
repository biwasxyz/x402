import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const address = process.argv[2];

  if (!address) {
    throw new Error("Usage: bun run scripts/wallet-classify.ts <address>");
  }

  const api = await createApiClient();
  const response = await api.post("/api/wallet/classify", { address });
  printResponse(response);
}

run().catch(handleAxiosError);
