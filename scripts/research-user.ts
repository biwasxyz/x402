import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const username = process.argv[2];

  if (!username) {
    throw new Error("Usage: bun run scripts/research-user.ts <username>");
  }

  const api = await createApiClient();
  const response = await api.post("/api/research/user", { username });
  printResponse(response);
}

run().catch(handleAxiosError);
