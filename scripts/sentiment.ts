import {
  createApiClient,
  printResponse,
  handleAxiosError,
} from "../utils/x402";

async function run() {
  const topic = process.argv[2];

  if (!topic) {
    throw new Error("Usage: bun run scripts/sentiment.ts <topic>");
  }

  const api = await createApiClient();
  const response = await api.post("/api/sentiment", { topic });
  printResponse(response);
}

run().catch(handleAxiosError);
