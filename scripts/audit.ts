import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const contractIdentifier = process.argv[2];

  if (!contractIdentifier) {
    throw new Error("Usage: bun run scripts/audit.ts <contractIdentifier>");
  }

  const api = await createApiClient();
  const response = await api.post("/api/audit", { contractIdentifier });
  printResponse(response);
}

run().catch(handleAxiosError);
