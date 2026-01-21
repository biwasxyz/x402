import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const address = process.argv[2];

  if (!address) {
    throw new Error("Usage: bun run scripts/bns-portfolio.ts <address>\nExample: bun run scripts/bns-portfolio.ts SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE");
  }

  const api = await createApiClient();
  const response = await api.post("/api/bns/portfolio", { address });
  printResponse(response);
}

run().catch(handleAxiosError);
